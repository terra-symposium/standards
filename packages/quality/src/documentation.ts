/**
 * packages/quality/src/documentation.ts
 * Create comments documenting the file, grouping imports, and sectioning code.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { extname, relative, sep } from 'node:path';
import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const T_R_N_S_S_R_N_T_T_R_N_REGEX = /^\/\*\*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\*\/[ \t]*(?:\r?\n)*/;
const COMPACT_TSDOC_HEADER_REGEX = /^\/\*\*[ \t]+([^\r\n]*?)[ \t]*\*\/[ \t]*(?:\r?\n)*/;
const R_N_REGEX = /\r?\n/;
const T_T_REGEX = /^[ \t]*\*[ \t]?/;
const S_REGEX = /^\s*/;
const S_CLASS_2 = /^\s*(?:\/\/|\/\*|\*\/|\*)/;
const S_CLASS_3 = /^\s*\* ?/;
const S_W_REGEX = /^\s*@\w+/;
const RETURNS_B_REGEX = /^@returns?\b/;
const UFEFF_REGEX = /^\uFEFF/;
const S_CLASS_4 = /\s*$/;
const C_M_JS_JSX_TS_TSX_REGEX = /(?:^|[\\/])[^\\/]+\.(?:c|m)?(?:js|jsx|ts|tsx)$/;
const S_CLASS_5 = /^\{[^}]+\}\s*/;
const OPEN = `/*${'/'.repeat(50)}`;
const CLOSE = `${'/'.repeat(50)}*/`;
const SUPPORTED = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
type ImportGroup = 'API' | 'COMPONENTS' | 'DATA' | 'TYPES';
type SrcGroup = 'CONFIG' | 'HELPERS';
export type DocumentationRequirements = { types?: boolean; functions?: boolean; exportedFunctions?: boolean; noInlineFunctions?: boolean };

/*//////////////////////////////////////////////////
DOCUMENTATION
//////////////////////////////////////////////////*/

export type DocumentationFinding = {
	file: string;
	line: number;
	column: number;
	name: string;
	kind: 'file' | 'summary' | 'param' | 'return' | 'tag' | 'type' | 'function' | 'inline';
	reason: string;
	severity: 'warning' | 'error';
};
export const DOCUMENTATION_DESCRIPTION_NOTICE =
	'Documentation descriptions must be meaningful and agentically authored; this check only reports missing prose and never generates descriptions in bulk.';
type TSDocBlock = { start: number; end: number; text: string };
type TSDocLine = { offset: number; text: string };
const DESCRIPTION_OPTIONAL_TAGS = new Set(['abstract', 'const', 'default', 'event', 'hideconstructor', 'internal', 'package', 'private', 'protected', 'public', 'readonly', 'sealed', 'virtual']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Writes a generated source update through a temporary file after validating
 * that the candidate still has no TypeScript or JavaScript parse errors.
 *
 * @param fileName Source file to replace.
 * @param src Candidate source text to validate and write.
 * @return Nothing; throws before replacing the source when parsing fails.
 */
function writeValidatedSrc(fileName: string, src: string): boolean {
	let result: ts.TranspileOutput;
	try {
		result = ts.transpileModule(src, { fileName, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } });
	} catch {
		return false;
	}
	if (result.diagnostics?.length) return false;
	const temp = `${fileName}.${process.pid}.quality.tmp`;
	try {
		writeFileSync(temp, src);
		renameSync(temp, fileName);
	} finally {
		try {
			unlinkSync(temp);
		} catch {
			// The temporary file was renamed successfully.
		}
	}
	return true;
}

/**
 * Repairs broken duplicate header fragments left by interrupted comment edits.
 * Only contiguous comments immediately following a valid path header are
 * merged, so declaration documentation elsewhere in the file is untouched.
 *
 * @param src Source text whose leading header may contain broken fragments.
 * @param path Canonical repository-relative path for the file header.
 * @param eol Line-ending sequence to emit.
 *
 * @return Source with one valid path-and-description header when healing applies.
 */
function healHeaderFragments(src: string, path: string, eol: string): string {
	const header = src.match(T_R_N_S_S_R_N_T_T_R_N_REGEX);
	if (!header) return src;
	const lines = header[1]!
		.split(R_N_REGEX)
		.map((l) => l.replace(T_T_REGEX, '').trim())
		.filter(Boolean);
	if (lines[0] !== path && lines[0] !== path.replace(/^.*\//, '')) return src;
	const descriptions = lines.slice(1);
	let cursor = header[0].length;
	let rest = src.slice(cursor);
	const orphanPattern = /^(?:[ \t]*\*[ \t]?[^\r\n]*\r?\n)+[ \t]*\*\/[ \t]*(?:\r?\n)*/;
	const docPattern = /^\/\*\*(?:[ \t]*([^\r\n]*?)[ \t]*\*\/[ \t]*(?:\r?\n)*|[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\*\/[ \t]*(?:\r?\n)*)/;
	let changed = false;
	let healedOrphanFragment = false;
	while (true) {
		const whitespace = rest.match(/^(?:\s*)/);
		const prefix = whitespace?.[0] ?? '';
		const orphan = rest.slice(prefix.length).match(orphanPattern);
		if (orphan) {
			const orphanLines = orphan[0]
				.split(R_N_REGEX)
				.map((l) =>
					l
						.replace(T_T_REGEX, '')
						.replace(/[ \t]*\*\/?[ \t]*$/, '')
						.trim(),
				)
				.map((l) => (l === '/' ? '' : l))
				.filter(Boolean);
			for (const line of orphanLines) if (line !== path && !descriptions.includes(line)) descriptions.push(line);
			cursor += prefix.length + orphan[0].length;
			rest = rest.slice(prefix.length + orphan[0].length);
			changed = true;
			healedOrphanFragment = true;
			continue;
		}
		const doc = rest.slice(prefix.length).match(docPattern);
		if (!doc || !healedOrphanFragment) break;
		const docLines = (doc[1] ?? doc[2] ?? '')
			.split(R_N_REGEX)
			.map((l) => l.replace(T_T_REGEX, '').trim())
			.filter(Boolean);
		for (const line of docLines) if (line !== path && !descriptions.includes(line)) descriptions.push(line);
		cursor += prefix.length + doc[0].length;
		rest = rest.slice(prefix.length + doc[0].length);
		changed = true;
	}
	if (!changed) return src;
	const norm = ['/**', path, ...descriptions, ' */'].map((l, i, a) => (i === 0 || i === a.length - 1 ? l : ` * ${l}`)).join(eol);
	return `${norm}${eol}${eol}${rest.replace(S_REGEX, '')}`;
}

/**
 * Selects the TypeScript parser mode for a JavaScript or TypeScript filename.
 *
 * @param fileName Source filename whose extension determines the parser mode.
 *
 * @return TypeScript compiler script kind for the filename.
 */
function srcKind(fileName: string): ts.ScriptKind {
	return /\.[cm]?tsx?$/.test(fileName) && fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/**
 * Reads the module specifier text from an import declaration.
 *
 * @param n Import declaration to inspect.
 *
 * @return Module specifier text, or an empty string for a non-string specifier.
 */
function importSrc(n: ts.ImportDeclaration): string {
	return ts.isStringLiteral(n.moduleSpecifier) ? n.moduleSpecifier.text : '';
}

/**
 * Returns whether an import would collide with a declaration in the file.
 * This also handles self-imports and duplicate local component declarations.
 *
 * @param parsed Parsed source file whose top-level declarations define local names.
 * @param n Import declaration to test.
 *
 * @return `true` when the import would collide with a local declaration.
 */
function selfImportConflicts(parsed: ts.SourceFile, n: ts.ImportDeclaration): boolean {
	const localNames = new Set<string>();
	for (const s of parsed.statements) {
		if (ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isEnumDeclaration(s)) if (s.name) localNames.add(s.name.text);
		if (ts.isVariableStatement(s)) for (const dec of s.declarationList.declarations) if (ts.isIdentifier(dec.name)) localNames.add(dec.name.text);
	}
	if (!n.importClause) return false;
	if (n.importClause.name && localNames.has(n.importClause.name.text)) return true;
	if (n.importClause.namedBindings && ts.isNamespaceImport(n.importClause.namedBindings) && localNames.has(n.importClause.namedBindings.name.text)) return true;
	return Boolean(n.importClause.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some((e) => localNames.has(e.name.text)));
}

/**
 * Assigns an import to the canonical group used by the source-maintenance layout.
 *
 * @param name Local import name whose casing indicates its category.
 *
 * @return Import group for API, component, or uppercase data names.
 */
function importGroup(name: string): ImportGroup {
	if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'DATA';
	if (/^[A-Z]/.test(name)) return 'COMPONENTS';
	return 'API';
}

/**
 * Merges and renders imports into deterministic groups while preserving type-only imports.
 *
 * @param parsed Parsed source file used to recover exact module-specifier text.
 * @param imports Import declarations selected for maintenance.
 *
 * @return Renderable import entries grouped by their canonical section.
 */
function groupedImports(parsed: ts.SourceFile, imports: ts.ImportDeclaration[]): Record<ImportGroup, { source: string; text: string }[]> {
	const groups: Record<ImportGroup, { source: string; text: string }[]> = { API: [], COMPONENTS: [], DATA: [], TYPES: [] };
	type MergedImport = { group: ImportGroup; source: string; module: string; typeOnly: boolean; defaultName?: string; namespace?: string; named: Set<string> };
	const merged = new Map<string, MergedImport>();
	const get = (group: ImportGroup, n: ts.ImportDeclaration, typeOnly: boolean) => {
		const src = importSrc(n);
		const key = `${group}|${typeOnly ? 'type|' : ''}${src}`;
		const existing = merged.get(key);
		if (existing) return existing;
		const created: MergedImport = { group, source: src, module: n.moduleSpecifier.getText(parsed), typeOnly, named: new Set<string>() };
		merged.set(key, created);
		return created;
	};
	for (const n of imports) {
		if (!n.importClause) {
			const entry = get('API', n, false);
			entry.named.add('');
			continue;
		}
		if (n.importClause.name) get(n.importClause.isTypeOnly ? 'TYPES' : importGroup(n.importClause.name.text), n, n.importClause.isTypeOnly).defaultName = n.importClause.name.text;
		if (n.importClause.namedBindings && ts.isNamespaceImport(n.importClause.namedBindings))
			get(n.importClause.isTypeOnly ? 'TYPES' : importGroup(n.importClause.namedBindings.name.text), n, n.importClause.isTypeOnly).namespace = n.importClause.namedBindings.name.text;
		if (n.importClause.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
			for (const el of n.importClause.namedBindings.elements) {
				const elTypeOnly = n.importClause.isTypeOnly || el.isTypeOnly;
				const group = elTypeOnly ? 'TYPES' : importGroup(el.name.text);
				get(group, n, elTypeOnly).named.add(el.getText(parsed).replace(/^type\s+/, ''));
			}
		}
	}
	for (const v of merged.values()) {
		const prefix = v.typeOnly ? 'import type ' : 'import ';
		if (v.named.has('')) {
			groups[v.group].push({ source: v.source, text: `import ${v.module};` });
			continue;
		}
		if (v.namespace) {
			const namespaceParts = [v.defaultName, `* as ${v.namespace}`].filter(Boolean);
			groups[v.group].push({ source: v.source, text: `${prefix}${namespaceParts.join(', ')} from ${v.module};` });
			if (!v.named.size) continue;
		}
		const named = v.named.size ? `{ ${[...v.named].sort().join(', ')} }` : undefined;
		const clause = v.namespace ? named : [v.defaultName, named].filter(Boolean).join(', ');
		if (v.typeOnly && v.defaultName && named) {
			groups[v.group].push({ source: v.source, text: `${prefix}${v.defaultName} from ${v.module};` });
			groups[v.group].push({ source: v.source, text: `${prefix}${named} from ${v.module};` });
		} else if (clause) groups[v.group].push({ source: v.source, text: `${prefix}${clause} from ${v.module};` });
	}
	return groups;
}

/**
 * Classifies a top-level statement for source-section organization.
 *
 * @param n Top-level statement to classify.
 *
 * @return `CONFIG` for declarations/constants, `HELPERS` for functions, or `undefined` otherwise.
 */
function srcGroup(n: ts.Statement): SrcGroup | undefined {
	if (ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n) || ts.isEnumDeclaration(n) || (ts.isVariableStatement(n) && (n.declarationList.flags & ts.NodeFlags.Const) !== 0)) return 'CONFIG';
	if (ts.isFunctionDeclaration(n)) return 'HELPERS';
	return undefined;
}

/**
 * Renders one managed source section and its statements using the requested line ending.
 *
 * @param label Section label to emit.
 * @param statements Statements belonging to the section.
 * @param eol Line-ending sequence used by the source file.
 *
 * @return Formatted section text.
 */
function srcSection(label: SrcGroup, statements: string[], eol: string): string {
	return `${OPEN}${eol}${label}${eol}${CLOSE}${eol}${statements.join(label === 'CONFIG' ? eol : `${eol}${eol}`)}`;
}

/**
 * Returns source spans whose whitespace is content rather than layout.
 *
 * @param src Source text to parse for literals.
 * @param fileName Filename used to choose the parser mode.
 *
 * @return Sorted source spans occupied by literals or JSX text.
 */
function literalSpans(src: string, fileName: string): { start: number; end: number }[] {
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const spans: { start: number; end: number }[] = [];
	const visit = (n: ts.Node): void => {
		if (ts.isStringLiteral(n) || ts.isRegularExpressionLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n) || ts.isJsxText(n)) {
			spans.push({ start: n.getStart(parsed), end: n.end });
			return;
		}
		ts.forEachChild(n, visit);
	};
	visit(parsed);
	return spans.sort((a, b) => a.start - b.start);
}

/**
 * Normalizes structural comment spacing without changing literal content.
 *
 * @param src Source text whose structural whitespace should be normalized.
 * @param fileName Filename used to protect literal content during parsing.
 * @param eol Line-ending sequence to emit.
 *
 * @return Source text with managed comment spacing normalized.
 */
function normCommentLayout(src: string, fileName: string, eol: string): string {
	const spans = literalSpans(src, fileName);
	const rawLines = src.split(R_N_REGEX);
	const nlineSize = src.includes('\r\n') ? 2 : 1;
	let offset = 0;
	const lines = rawLines.map((t) => {
		const line = { text: t, start: offset };
		offset += t.length + nlineSize;
		return line;
	});
	const protectedLine = (line: { start: number }): boolean => {
		let low = 0;
		let high = spans.length - 1;
		while (low <= high) {
			const mid = (low + high) >> 1;
			const span = spans[mid];
			if (line.start < span.start) high = mid - 1;
			else if (line.start >= span.end) low = mid + 1;
			else return true;
		}
		return false;
	};
	const sectionOpen = (i: number): boolean => !protectedLine(lines[i]) && /^\s*\/\*\/{10,}\s*$/.test(lines[i].text);
	const sectionClose = (i: number): boolean => !protectedLine(lines[i]) && /^\s*\/{10,}\*\/\s*$/.test(lines[i].text);
	const lineGroup = (i: number): boolean => !protectedLine(lines[i]) && /^\s*\/\/ [A-Z][A-Z0-9 _-]*\s*$/.test(lines[i].text);

	// Remove an empty section immediately followed by another section.
	for (let i = 0; i + 5 < lines.length; i++) {
		if (!sectionOpen(i) || !sectionClose(i + 2)) continue;
		let n = i + 3;
		while (n < lines.length && !lines[n].text.trim()) n++;
		if (n < lines.length && sectionOpen(n)) {
			lines.splice(i, n - i);
			i = Math.max(-1, i - 2);
		}
	}
	const out: string[] = [];
	const pushBlank = (): void => {
		if (out.length && out.at(-1) !== '') out.push('');
	};
	for (let i = 0; i < lines.length; i++) {
		const text = lines[i].text.replace(/[ \t]+$/, '');
		const closesSect = sectionClose(i);
		if (!text && !protectedLine(lines[i])) {
			const prev = out.at(-1) ?? '';
			let next = i + 1;
			while (next < lines.length && !lines[next].text.trim() && !protectedLine(lines[next])) next++;
			const adjacentComment = S_CLASS_2.test(prev) || (next < lines.length && S_CLASS_2.test(lines[next].text));
			if (adjacentComment && out.length && out.at(-1) !== '') out.push('');
			continue;
		}
		if (sectionOpen(i)) pushBlank();
		if (lineGroup(i)) pushBlank();
		out.push(text);
		if (closesSect || lineGroup(i)) {
			while (i + 1 < lines.length && !lines[i + 1].text.trim() && !protectedLine(lines[i + 1])) i++;
			if (closesSect && i + 1 < lines.length) pushBlank();
		}
	}
	while (out.at(-1) === '') out.pop();
	// Keep blank lines only when they explicitly separate comments/groups.
	// This also removes stale whitespace inside function bodies while preserving
	// spacing around TSDoc, line groups, and section fences.
	const compact = out.filter((l, i) => {
		if (l !== '') return true;
		const prev = out[i - 1] ?? '';
		const following = out[i + 1] ?? '';
		const comment = (textVal: string): boolean => S_CLASS_2.test(textVal);
		return comment(prev) || comment(following);
	});
	return `${compact.join(eol)}${eol}`;
}

/**
 * Removes managed CONFIG and HELPERS fences without touching matching text inside literals.
 *
 * @param src Source text containing possible managed sections.
 * @param fileName Filename used to identify literal spans.
 *
 * @return Source text with existing managed sections removed.
 */
function removeManagedSects(src: string, fileName: string): string {
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const literals: { start: number; end: number }[] = [];
	const visit = (n: ts.Node): void => {
		if (
			ts.isStringLiteral(n) ||
			ts.isRegularExpressionLiteral(n) ||
			ts.isNoSubstitutionTemplateLiteral(n) ||
			ts.isTemplateHead(n) ||
			ts.isTemplateMiddle(n) ||
			ts.isTemplateTail(n) ||
			ts.isJsxText(n)
		) {
			literals.push({ start: n.getStart(parsed), end: n.end });
			return;
		}
		ts.forEachChild(n, visit);
	};
	visit(parsed);
	const pattern = /^[ \t]*\/\*\/{10,}[ \t]*\r?\n[ \t]*(?:CONFIG|HELPERS)[ \t]*\r?\n[ \t]*\/{10,}\*\/[ \t]*(?:\r?\n)*/gm;
	const matches = [...src.matchAll(pattern)].filter((m) => !literals.some((l) => m.index! >= l.start && m.index! < l.end));
	return matches.sort((a, b) => b.index! - a.index!).reduce((t, m) => `${t.slice(0, m.index!)}${t.slice(m.index! + m[0].length)}`, src);
}

/**
 * Removes managed sections whose body contains only comments and whitespace.
 *
 * @param src Source text containing possible managed sections.
 * @param fileName Filename used to protect section-shaped text inside literals.
 *
 * @return Source text without empty managed sections.
 */
function removeEmptyManagedSects(src: string, fileName: string): string {
	const spans = literalSpans(src, fileName);
	const comments = sourceCommentRanges(src, ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, documentationScriptKind(fileName)));
	const isLiteral = (position: number): boolean => spans.some((span) => position >= span.start && position < span.end);
	const sectionPattern = /^[ \t]*\/\*\/{10,}[ \t]*\r?\n[ \t]*(IMPORTS|CONFIG|HELPERS)[ \t]*\r?\n[ \t]*\/{10,}\*\/[ \t]*(?:\r?\n)?/gm;
	const sections = [...src.matchAll(sectionPattern)]
		.filter((m) => !isLiteral(m.index ?? 0))
		.map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, label: m[1]! }));
	const removals: { start: number; end: number }[] = [];
	for (let index = 0; index < sections.length; index += 1) {
		const section = sections[index]!;
		const bodyEnd = sections[index + 1]?.start ?? src.length;
		let body = src.slice(section.end, bodyEnd);
		const bodyStart = section.end;
		const edits = comments
			.filter((comment) => comment.start >= bodyStart && comment.end <= bodyEnd)
			.sort((a, b) => b.start - a.start);
		for (const comment of edits) body = `${body.slice(0, comment.start - bodyStart)}${body.slice(comment.end - bodyStart)}`;
		if (!body.trim()) removals.push({ start: section.start, end: bodyEnd });
	}
	return removals.sort((a, b) => b.start - a.start).reduce((text, removal) => `${text.slice(0, removal.start)}${text.slice(removal.end)}`, src);
}

/**
 * Rebuilds a function's TSDoc layout while preserving existing summary and tag prose.
 *
 * @param n Function declaration whose current parameter list controls required parameter tags.
 * @param parsed Source file containing the declaration.
 * @param eol Line-ending sequence to emit.
 * @param existing Existing TSDoc block, when one is present.
 *
 * @return Normalized TSDoc text; missing prose remains intentionally blank for agent-authored documentation.
 */
function genFnDoc(n: ts.FunctionDeclaration, parsed: ts.SourceFile, eol: string, existing = ''): string {
	if (existing.trim()) return existing;
	const params = n.parameters.map((p, i) => (ts.isIdentifier(p.name) ? p.name.text : ts.isObjectBindingPattern(p.name) ? 'props' : `param${i + 1}`));
	const body = existing
		.slice(3, -2)
		.split(R_N_REGEX)
		.map((l) => l.replace(S_CLASS_3, '').trim());
	while (body.length && !body.at(0)?.trim()) body.shift();
	while (body.length && !body.at(-1)?.trim()) body.pop();
	const firstTag = body.findIndex((l) => S_W_REGEX.test(l));
	const summary = (firstTag < 0 ? body : body.slice(0, firstTag)).map((l) => l.trim());
	while (summary.length && !summary.at(-1)?.trim()) summary.pop();
	const tagLines = firstTag < 0 ? [] : body.slice(firstTag).filter((l) => l.trim());
	const blocks: string[][] = [];
	for (const line of tagLines) {
		if (S_W_REGEX.test(line) || !blocks.length) blocks.push([line.trim()]);
		else blocks.at(-1)!.push(line);
	}
	const paramBlocks = new Map<string, string[]>();
	let returnBlock: string[] | undefined;
	const otherBlocks: string[][] = [];
	for (const block of blocks) {
		const param = block[0]?.match(/^@param\s+(?:\{[^}]*\}\s*)?(\S+)/);
		if (param) {
			paramBlocks.set(param[1]!.replace(/^\[|\]$/g, '').split('=')[0]!, block);
			continue;
		}
		if (RETURNS_B_REGEX.test(block[0] ?? '')) {
			returnBlock = [`${block[0]!.replace(RETURNS_B_REGEX, '@return')}`, ...block.slice(1)];
			continue;
		}
		otherBlocks.push(block);
	}
	const content = [...summary];
	if (!content.length || content.at(-1) !== '') content.push('');
	for (const name of params) content.push(...(paramBlocks.get(name) ?? [`@param ${name}`]));
	if (content.at(-1) !== '') content.push('');
	content.push(...(returnBlock ?? ['@return']));
	for (const block of otherBlocks) content.push('', ...block);
	return ['/**', ...content.map((l) => (l ? ` * ${l}` : ' *')), ' */'].join(eol);
}

/**
 * Renders a top-level statement with its existing comments and normalized function documentation.
 *
 * @param n Statement being rendered.
 * @param parsed Source file containing the statement.
 * @param src Original source text used to recover leading comments.
 * @param eol Line-ending sequence to emit.
 *
 * @return Statement text with preserved leading comments and normalized TSDoc.
 */
function statementText(n: ts.Statement, parsed: ts.SourceFile, src: string, eol: string): string {
	const leading = src.slice(n.getFullStart(), n.getStart(parsed)).trim();
	const text = src.slice(n.getStart(parsed), n.end);
	if (!ts.isFunctionDeclaration(n)) return [leading, text].filter(Boolean).join(eol);
	const docs = [...leading.matchAll(/\/\*\*[\s\S]*?\*\//g)];
	const doc = docs.at(-1);
	const gen = genFnDoc(n, parsed, eol, doc?.[0]);
	if (doc?.index !== undefined) return [`${leading.slice(0, doc.index)}${gen}${leading.slice(doc.index + doc[0].length)}`.trim(), text].filter(Boolean).join(eol);
	return [leading, gen, text].filter(Boolean).join(eol);
}

/**
 * Moves top-level configuration and helper declarations into canonical sections after imports.
 *
 * @param src Source text whose managed sections should be rebuilt.
 * @param fileName Filename used for parsing and literal protection.
 * @param eol Line-ending sequence to emit.
 *
 * @return Source text with canonical CONFIG and HELPERS sections.
 */
function organizeSrcSects(src: string, fileName: string, eol: string): string {
	const withoutManagedSections = removeManagedSects(src, fileName);
	const parsed = ts.createSourceFile(fileName, withoutManagedSections, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const imports = parsed.statements.filter(ts.isImportDeclaration);
	if (!imports.length) return src;
	const lastImport = imports.at(-1) as ts.ImportDeclaration;
	const statements = parsed.statements.filter((n) => !ts.isImportDeclaration(n) && n.getStart(parsed) >= lastImport.end);
	const groups: Record<SrcGroup, string[]> = { CONFIG: [], HELPERS: [] };
	const remaining: string[] = [];
	for (const n of statements) {
		const text = statementText(n, parsed, withoutManagedSections, eol);
		const group = srcGroup(n);
		if (group) groups[group].push(text);
		else remaining.push(text);
	}
	if (!groups.CONFIG.length && !groups.HELPERS.length) return withoutManagedSections;
	const tail = statements.length ? withoutManagedSections.slice(statements.at(-1)!.end).trim() : withoutManagedSections.slice(lastImport.end).trim();
	const sections = (['CONFIG', 'HELPERS'] as SrcGroup[]).flatMap((l) => (groups[l].length ? [srcSection(l, groups[l], eol)] : []));
	if (remaining.length) sections.push(remaining.join(`${eol}${eol}`));
	if (tail) sections.push(tail);
	return `${withoutManagedSections.slice(0, lastImport.end).trimEnd()}${eol}${eol}${sections.join(`${eol}${eol}`)}${eol}`;
}

/**
 * Adds the canonical header, grouped imports, and top-level source sections.
 *
 * @param root Repository root used to create the file header path.
 * @param fileName Absolute path to the source file to maintain.
 *
 * @return `true` when the file was rewritten; otherwise `false`.
 */
export function maintainSrcFile(root: string, fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const eol = original.includes('\r\n') ? '\r\n' : '\n';
	let src = original.replace(UFEFF_REGEX, '').replace(/^\s+/, '');
	const path = relative(root, fileName).split(sep).join('/');
	src = healHeaderFragments(src, path, eol);
	src = removeDetachedTSDoc(src, fileName);
	src = removeEmptyManagedSects(src, fileName);
	const existingHeader = src.match(T_R_N_S_S_R_N_T_T_R_N_REGEX);
	const compactHeader = existingHeader ? null : src.match(COMPACT_TSDOC_HEADER_REGEX);
	const headerLines =
		existingHeader?.[1]
			.split(R_N_REGEX)
			.map((l) => l.replace(T_T_REGEX, '').trim())
			.filter(Boolean) ?? (compactHeader?.[1].trim() ? [compactHeader[1].trim()] : []);
	const headerDescription = existingHeader ? headerLines.slice(1) : headerLines;
	const header = ['/**', path, ...headerDescription, ' */'].map((l, i) => (i === 0 ? l : i === headerDescription.length + 2 ? l : ` * ${l}`)).join(eol);
	if (existingHeader && (headerLines[0]?.includes('/') || /\.(?:c|m)?(?:js|ts)x?$/.test(headerLines[0] ?? ''))) {
		src = src.replace(T_R_N_S_S_R_N_T_T_R_N_REGEX, `${header}${eol}${eol}`);
		const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const duplicateHeader = new RegExp(`^(\\/\\*\\*\\r?\\n \\* ${escapedPath}\\r?\\n \\*\\/)(?:\\r?\\n)+\\1(?:\\r?\\n)+`);
		src = src.replace(duplicateHeader, `$1${eol}${eol}`);
	} else if (compactHeader) {
		src = src.replace(COMPACT_TSDOC_HEADER_REGEX, `${header}${eol}${eol}`);
	} else if (!src.startsWith('#!') && !src.startsWith('/**')) src = `${header}${eol}${eol}${src}`;
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const imports = parsed.statements.filter((n): n is ts.ImportDeclaration => ts.isImportDeclaration(n) && !selfImportConflicts(parsed, n));
	if (imports.length) {
		const first = imports[0];
		const last = imports.at(-1) as ts.ImportDeclaration;
		const groups = groupedImports(parsed, imports);
		const comp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
		const render = (label: ImportGroup): string[] => {
			const entries = groups[label].sort((a, b) => comp(a.text, b.text) || comp(a.source, b.source));
			return entries.length ? [`// ${label}`, ...entries.map((e) => e.text), ''] : [];
		};
		const sortedGroups = (Object.keys(groups) as ImportGroup[]).sort(comp);
		const block = `${OPEN}${eol}IMPORTS${eol}${CLOSE}${eol}${sortedGroups.flatMap(render).join(eol)}`;
		const prefix = src.slice(0, first.getStart(parsed));
		const fenceStart = prefix.search(/\/\*\/{10,}[ \t]*\r?\n[ \t]*IMPORTS[ \t]*\r?\n[ \t]*\/{10,}\*\//);
		const start = fenceStart >= 0 ? fenceStart : first.getStart(parsed);
		src = `${src.slice(0, start).replace(S_CLASS_4, `${eol}${eol}`)}${block}${src.slice(last.end).replace(S_REGEX, eol)}`;
	}
	src = organizeSrcSects(src, fileName, eol);
	src = removeEmptyManagedSects(src, fileName);
	const postOrganizationHeader = src.match(T_R_N_S_S_R_N_T_T_R_N_REGEX)?.[0] ?? '';
	const postOrganizationBody = postOrganizationHeader ? src.slice(postOrganizationHeader.length) : src;
	src = `${postOrganizationHeader}${removeDetachedTSDoc(postOrganizationBody, fileName)}`;
	const norm = src
		.replace(/^([ \t]*)\/\*\/{10,}[ \t]*$/gm, `$1${OPEN}`)
		.replace(/^([ \t]*)\/{10,}\*\/[ \t]*$/gm, `$1${CLOSE}`)
		.replace(S_CLASS_4, eol);
	const formatted = normCommentLayout(norm, fileName, eol);
	const finalHeader = formatted.match(T_R_N_S_S_R_N_T_T_R_N_REGEX)?.[0] ?? '';
	const finalBody = finalHeader ? formatted.slice(finalHeader.length) : formatted;
	const laidOut = `${finalHeader}${removeAdjacentTSDocBlocks(finalBody)}`;
	const n = original.startsWith('\uFEFF') ? `\uFEFF${laidOut}` : laidOut;
	if (n === original) return false;
	return writeValidatedSrc(fileName, n);
}

/**
 * Adds Prettier protection to one-line imports that exceed the configured print width.
 *
 * @param fileName Absolute path to the source file whose imports are inspected.
 * @param printWidth Maximum line width before a Prettier ignore marker is inserted.
 *
 * @return `true` when one or more ignore markers were inserted.
 */
export function protectLongImports(fileName: string, printWidth = 200): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const eol = original.includes('\r\n') ? '\r\n' : '\n';
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const lineStarts = parsed.getLineStarts();
	const insertions = new Set<number>();
	for (const n of parsed.statements.filter(ts.isImportDeclaration)) {
		const lineStart = lineStarts[parsed.getLineAndCharacterOfPosition(n.getStart(parsed)).line] ?? 0;
		const nline = original.indexOf('\n', n.end);
		const line = original.slice(lineStart, nline < 0 ? original.length : nline).replace(/\r$/, '');
		if (line.length <= printWidth || original.slice(lineStart, n.getStart(parsed)).trim()) continue;
		const prevLineEnd = lineStart > 0 ? lineStart - 1 : -1;
		const prevLineStart = prevLineEnd >= 0 ? original.lastIndexOf('\n', prevLineEnd - 1) + 1 : 0;
		if (original.slice(prevLineStart, prevLineEnd + 1).trim() === '// prettier-ignore') continue;
		insertions.add(lineStart);
	}
	if (!insertions.size) return false;
	let next = original;
	for (const offset of [...insertions].sort((a, b) => b - a)) {
		const nLine = original.indexOf('\n', offset);
		const indent = original.slice(offset, nLine < 0 ? original.length : nLine).match(S_REGEX)?.[0] ?? '';
		next = `${next.slice(0, offset)}${indent}// prettier-ignore${eol}${next.slice(offset)}`;
	}
	return writeValidatedSrc(fileName, next);
}

/**
 * Selects the TypeScript parser mode used by documentation checks.
 *
 * @param fileName Filename whose extension determines the parser mode.
 *
 * @return TypeScript compiler script kind for the filename.
 */
function documentationScriptKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

/**
 * Checks whether a filename is supported by the documentation policy.
 *
 * @param fileName Source filename to test.
 *
 * @return `true` for supported JavaScript and TypeScript extensions.
 */
function documentationSupported(fileName: string): boolean {
	return /\.(?:c|m)?(?:js|jsx|ts|tsx)$/.test(fileName);
}

/**
 * Checks whether a node has a JSDoc or TSDoc block in its leading trivia.
 *
 * @param node Declaration node to inspect.
 * @param src Source text containing the node.
 *
 * @return `true` when a documentation comment directly precedes the node.
 */
function documented(node: ts.Node, src: string): boolean {
	const leading = src.slice(node.getFullStart(), node.getStart());
	const docs = [...leading.matchAll(/\/\*\*[\s\S]*?\*\//g)];
	const doc = docs.at(-1);
	if (!doc) return false;
	// The generated file header is source-level metadata, not documentation for
	// the first declaration. Only exclude it when the block is the first
	// path-bearing TSDoc in the file; a declaration's own later TSDoc remains
	// valid even when the file also has a header.
	const blockStart = node.getFullStart() + doc.index!;
	let prefix = src.slice(0, blockStart).replace(UFEFF_REGEX, '');
	if (prefix.startsWith('#!')) prefix = prefix.slice(prefix.indexOf('\n') + 1);
	const docLines = doc[0]!
		.slice(3, -2)
		.split(R_N_REGEX)
		.map((l) => l.replace(S_CLASS_3, '').trim());
	const isFileHeader = prefix.trim() === '' && docLines.some((l) => C_M_JS_JSX_TS_TSX_REGEX.test(l));
	return !isFileHeader;
}

/**
 * Checks whether a declaration carries an export modifier.
 *
 * @param node Declaration node to inspect.
 *
 * @return `true` when the node is explicitly exported.
 */
function exported(node: ts.Node): boolean {
	return !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

/**
 * Gets the declared identifier used in a documentation diagnostic.
 *
 * @param node Declaration node whose name should be reported.
 *
 * @return Identifier text, or `<anonymous>` when the declaration has no identifier.
 */
function documentationNodeName(node: ts.Node): string {
	const candidate = (node as unknown as { name?: ts.Node }).name ?? node;
	return ts.isIdentifier(candidate) ? candidate.text : '<anonymous>';
}

/**
 * Scans source text for TSDoc blocks without treating comment-shaped text inside literals as documentation.
 *
 * @param src Source text to scan.
 * @param parsed Parsed source file whose language variant should be respected.
 *
 * @return TSDoc blocks with their source offsets and original text.
 */
function sourceCommentRanges(src: string, parsed: ts.SourceFile): { start: number; end: number; kind: ts.CommentKind; text: string }[] {
	const ranges = new Map<number, { start: number; end: number; kind: ts.CommentKind; text: string }>();
	const add = (range: ts.CommentRange): void => {
		const text = src.slice(range.pos, range.end);
		if (!text.startsWith('//') && !text.startsWith('/*')) return;
		ranges.set(range.pos, { start: range.pos, end: range.end, kind: range.kind, text });
	};
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, parsed.languageVariant, src);
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
		const text = scanner.getTokenText();
		if (text.startsWith('//') || text.startsWith('/*')) add({ pos: scanner.getTokenPos(), end: scanner.getTextPos(), kind: token as ts.CommentKind });
	}
	const visit = (node: ts.Node): void => {
		if (node.kind !== ts.SyntaxKind.EndOfFileToken) {
			for (const range of ts.getLeadingCommentRanges(src, node.getFullStart()) ?? []) add(range);
			for (const range of ts.getTrailingCommentRanges(src, node.end) ?? []) add(range);
		}
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	return [...ranges.values()].sort((a, b) => a.start - b.start);
}

function tsdocBlocks(src: string, parsed: ts.SourceFile): TSDocBlock[] {
	return sourceCommentRanges(src, parsed)
		.filter((comment) => comment.text.startsWith('/**'))
		.map((comment) => ({ start: comment.start, end: comment.end, text: comment.text }));
}

/**
 * Returns whether a node can own a TSDoc block under the source-maintenance policy.
 * Expression statements and imports are deliberately excluded so comments left
 * behind by a mutation cannot be reassigned to unrelated syntax.
 *
 * @param node AST node to classify.
 *
 * @return `true` when the node represents a documented symbol.
 */
function isDocumentableNode(node: ts.Node): boolean {
	return (
		ts.isClassDeclaration(node) ||
		ts.isEnumDeclaration(node) ||
		ts.isInterfaceDeclaration(node) ||
		ts.isTypeAliasDeclaration(node) ||
		ts.isFunctionDeclaration(node) ||
		ts.isVariableStatement(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node) ||
		ts.isPropertyDeclaration(node) ||
		ts.isPropertySignature(node) ||
		ts.isMethodSignature(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isParameter(node)
	);
}

/**
 * Removes TSDoc blocks that no longer belong to a symbol and keeps only the
 * nearest TSDoc block when a mutation leaves several blocks before one symbol.
 * File headers remain owned by the source file rather than by its first node.
 *
 * @param src Source text to clean.
 * @param fileName Filename used to parse the source.
 *
 * @return Source text without detached or superseded TSDoc blocks.
 */
function removeDetachedTSDoc(src: string, fileName: string): string {
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, documentationScriptKind(fileName));
	const comments = sourceCommentRanges(src, parsed);
	const blocks = comments.filter((comment) => comment.text.startsWith('/**')).map((comment) => ({ start: comment.start, end: comment.end, text: comment.text }));
	if (!comments.length) return src;
	const adjacent = new Set<number>();
	for (let i = 0; i < blocks.length - 1; i++) {
		const current = blocks[i]!;
		const next = blocks[i + 1]!;
		if (!src.slice(current.end, next.start).trim()) adjacent.add(current.start);
	}
	const keep = new Set<number>();
	const superseded = new Set<number>();
	const attached = new Set<number>();
	const header = fileHeaderBlock(src, blocks) ?? topLevelTSDocBlock(src, blocks);
	if (header) keep.add(header.start);
	const visit = (node: ts.Node): void => {
		if (node.kind !== ts.SyntaxKind.EndOfFileToken)
			for (const range of [...(ts.getLeadingCommentRanges(src, node.getFullStart()) ?? []), ...(ts.getTrailingCommentRanges(src, node.end) ?? [])]) attached.add(range.pos);
		if (isDocumentableNode(node)) {
			const leading = ts.getLeadingCommentRanges(src, node.getFullStart()) ?? [];
			const docs = leading
				.filter((r) => src.slice(r.pos, r.end).startsWith('/**'))
				.map((r) => ({ start: r.pos, end: r.end, text: src.slice(r.pos, r.end) }));
			const final = docs.at(-1);
			if (final) {
				keep.add(final.start);
				for (const prior of docs.slice(0, -1)) superseded.add(prior.start);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	const removals = comments.filter((comment) => comment.text.startsWith('/**' ) ? adjacent.has(comment.start) || superseded.has(comment.start) || !keep.has(comment.start) : !attached.has(comment.start)).sort((a, b) => b.start - a.start);
	return removals.reduce((t, b) => `${t.slice(0, b.start)}${t.slice(b.end)}`, src);
}

/**
 * Removes earlier blocks from a contiguous TSDoc chain after source re-layout.
 *
 * @param src Source text whose adjacent TSDoc blocks should be collapsed.
 * @return Source with only the final block in each contiguous chain.
 */
function removeAdjacentTSDocBlocks(src: string): string {
	let next = src;
	let previous = '';
	while (next !== previous) {
		previous = next;
		next = next.replace(/\/\*\*[\s\S]*?\*\/(?:[ \t]*\r?\n[ \t]*)+(?=\/\*\*)/g, '');
	}
	return next;
}

/**
 * Converts a TSDoc block into normalized content lines while retaining each line's source offset.
 *
 * @param block TSDoc block to split.
 *
 * @return TSDoc content lines with comment markers removed.
 */
function tsdocLines(block: TSDocBlock): TSDocLine[] {
	const body = block.text.slice(3, -2);
	const lineSize = body.includes('\r\n') ? 2 : 1;
	let offset = block.start + 3;
	return body.split(R_N_REGEX).map((l) => {
		const result = { offset, text: l.replace(S_CLASS_3, '').trim() };
		offset += l.length + lineSize;
		return result;
	});
}

/**
 * Finds the generated path-bearing mock-TSDoc block at the top of a source file, allowing a shebang and whitespace before it.
 *
 * @param src Source text to inspect.
 * @param blocks TSDoc blocks found in the source.
 *
 * @return The top-level file-header block, or `undefined` when it is missing.
 */
function fileHeaderBlock(src: string, blocks: TSDocBlock[]): TSDocBlock | undefined {
	return blocks.find((b) => {
		let prefix = src.slice(0, b.start).replace(UFEFF_REGEX, '');
		if (prefix.startsWith('#!')) prefix = prefix.slice(prefix.indexOf('\n') + 1);
		return prefix.trim() === '' && tsdocLines(b).some((l) => C_M_JS_JSX_TS_TSX_REGEX.test(l.text));
	});
}

/**
 * Finds the first top-level TSDoc block, including compact file comments that
 * do not contain the generated path header.
 *
 * @param src Source text to inspect.
 * @param blocks TSDoc blocks found in the source.
 *
 * @return The first top-level TSDoc block, or `undefined` when none exists.
 */
function topLevelTSDocBlock(src: string, blocks: TSDocBlock[]): TSDocBlock | undefined {
	return blocks.find((block) => {
		let prefix = src.slice(0, block.start).replace(UFEFF_REGEX, '');
		if (prefix.startsWith('#!')) prefix = prefix.slice(prefix.indexOf('\n') + 1);
		return prefix.trim() === '';
	});
}

/**
 * Extracts a tag's human-written description after removing its optional type and parameter name.
 *
 * @param tag TSDoc tag name without the leading `@`.
 * @param content Text following the tag name, including any continuation lines.
 *
 * @return Tag description, or an empty string when only syntax is present.
 */
function tagDescription(tag: string, content: string): string {
	let description = content.trim().replace(S_CLASS_5, '');
	if (tag.toLowerCase() === 'param' || tag.toLowerCase() === 'typeparam') description = description.replace(/^\[[^\]]+\]\s*/, '').replace(/^\S+\s*/, '');
	return description.replace(/^[-:]\s*/, '').trim();
}

/**
 * Parses TSDoc tags and joins continuation lines with their leading tag line.
 *
 * @param lines Normalized TSDoc content lines.
 *
 * @return Parsed tag names, subjects, descriptions, and source offsets.
 */
function tsdocTagEntries(lines: TSDocLine[]): { tag: string; subject: string; description: string; offset: number }[] {
	const entries: { tag: string; subject: string; description: string; offset: number }[] = [];
	for (let idx = 0; idx < lines.length; idx += 1) {
		const match = lines[idx]!.text.match(/^@(\S+)(?:\s+(.*))?$/);
		if (!match) continue;
		const tag = match[1]!;
		const content = [match[2] ?? ''];
		let n = idx + 1;
		while (n < lines.length && !lines[n]!.text.startsWith('@')) {
			if (lines[n]!.text) content.push(lines[n]!.text);
			n += 1;
		}
		const rawContent = content.join(' ').trim();
		const subject = tag.toLowerCase() === 'param' || tag.toLowerCase() === 'typeparam' ? (rawContent.replace(S_CLASS_5, '').split(/\s+/)[0] ?? '') : '';
		entries.push({ tag, subject, description: tagDescription(tag, rawContent), offset: lines[idx]!.offset });
		idx = n - 1;
	}
	return entries;
}

/**
 * Audits existing TSDoc prose without inventing replacement text. Generated file
 * path headers are source metadata and are intentionally excluded from this audit.
 *
 * @param cfg Quality configuration used to render repository-relative paths.
 * @param file Absolute source path being inspected.
 * @param src Source text containing the documentation blocks.
 * @param parsed Parsed source file used for locations and comment scanning.
 *
 * @return Warning findings for missing file, summary, or tag descriptions.
 */
function descriptionFindingsForFile(cfg: QualityCfg, file: string, src: string, parsed: ts.SourceFile): DocumentationFinding[] {
	const blocks = tsdocBlocks(src, parsed);
	const findings: DocumentationFinding[] = [];
	const header = fileHeaderBlock(src, blocks);
	for (const block of blocks) {
		if (block === header) continue;
		const lines = tsdocLines(block);
		const firstTag = lines.findIndex((l) => l.text.startsWith('@'));
		const summary = lines
			.slice(0, firstTag < 0 ? lines.length : firstTag)
			.map((l) => l.text)
			.filter(Boolean);
		if (!summary.length) findings.push(documentationCommentReport(file, parsed, block.start, '<TSDoc summary>', 'summary', 'add a meaningful description for this TSDoc block', cfg));
		for (const entry of tsdocTagEntries(lines)) {
			if (DESCRIPTION_OPTIONAL_TAGS.has(entry.tag.toLowerCase()) || entry.description) continue;
			const kind = entry.tag.toLowerCase() === 'param' ? 'param' : entry.tag.toLowerCase() === 'return' || entry.tag.toLowerCase() === 'returns' ? 'return' : 'tag';
			const name = `@${entry.tag}${entry.subject ? ` ${entry.subject}` : ''}`;
			findings.push(documentationCommentReport(file, parsed, entry.offset, name, kind, `add a meaningful description for ${name}`, cfg));
		}
	}
	return findings;
}

/**
 * Creates a warning finding anchored to a TSDoc comment offset.
 *
 * @param file Absolute source path containing the comment.
 * @param parsed Parsed source file used to calculate the location.
 * @param offset Zero-based source offset for the comment or tag.
 * @param name Display name for the missing documentation.
 * @param kind Documentation audit category.
 * @param reason Human-readable remediation reason.
 * @param cfg Quality configuration defining the repository root.
 *
 * @return Warning documentation finding.
 */
function documentationCommentReport(file: string, parsed: ts.SourceFile, offset: number, name: string, kind: DocumentationFinding['kind'], reason: string, cfg: QualityCfg): DocumentationFinding {
	const pos = parsed.getLineAndCharacterOfPosition(offset);
	return { file: displayPath(cfg, file), line: pos.line + 1, column: pos.character + 1, name, kind, reason, severity: 'warning' };
}

/**
 * Creates a documentation finding with a repository-relative source location.
 *
 * @param file Absolute path to the source file.
 * @param parsed Parsed source file used to calculate the location.
 * @param node Undocumented node that triggered the finding.
 * @param name Display name for the node.
 * @param kind Documentation category for the finding.
 * @param reason Human-readable remediation reason.
 * @param cfg Quality configuration defining the repository root.
 *
 * @return Structured documentation finding.
 */
function documentationReport(file: string, parsed: ts.SourceFile, node: ts.Node, name: string, kind: DocumentationFinding['kind'], reason: string, cfg: QualityCfg): DocumentationFinding {
	const pos = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
	return { file: displayPath(cfg, file), line: pos.line + 1, column: pos.character + 1, name, kind, reason, severity: 'error' };
}

/**
 * Evaluates documentation requirements for one source file.
 *
 * @param cfg Quality configuration used to render diagnostic paths.
 * @param file Absolute source path to inspect.
 * @param requirements Enabled documentation policies.
 * @param analysis Optional shared program and source cache for the current run.
 *
 * @return Documentation findings for the file.
 */
function documentationFindingsForFile(cfg: QualityCfg, file: string, requirements: DocumentationRequirements, analysis?: QualityAnalysis): DocumentationFinding[] {
	if (!documentationSupported(file)) return [];
	const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
	const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, documentationScriptKind(file));
	const findings = descriptionFindingsForFile(cfg, file, src, parsed);
	const visit = (node: ts.Node): void => {
		const isType = ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
		if (requirements.types && isType && !documented(node, src)) findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'type', 'add TSDoc for this type', cfg));
		if (ts.isFunctionDeclaration(node)) {
			const needsDoc = requirements.functions || (requirements.exportedFunctions && exported(node));
			if (needsDoc && !documented(node, src)) findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'function', 'add TSDoc for this function', cfg));
		}
		if (requirements.noInlineFunctions && (ts.isArrowFunction(node) || ts.isFunctionExpression(node)))
			findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'inline', 'move this function to a named declaration', cfg));
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	return findings;
}

/**
 * Finds documentation-policy violations for the configured source scope.
 *
 * @param cfg Quality configuration containing required documentation policies.
 * @param analysis Optional shared program and source cache for the current run.
 *
 * @return Documentation findings across the configured source scope.
 */
export function documentationFindings(cfg: QualityCfg, analysis?: QualityAnalysis): DocumentationFinding[] {
	const requirements = cfg.documentation?.required ?? {};
	return analysis?.files
		? analysis.files.flatMap((f) => documentationFindingsForFile(cfg, f, requirements, analysis))
		: srcFiles(cfg).flatMap((f) => documentationFindingsForFile(cfg, f, requirements));
}

/**
 * Inserts an empty TSDoc scaffold before declarations required to be documented.
 * The scaffold never invents a description; prose must be authored after understanding the declaration.
 *
 * @param cfg Quality configuration containing documentation requirements.
 * @param file Absolute source path to update.
 *
 * @return `true` when one or more scaffolds were inserted.
 */
export function documentSrcFile(cfg: QualityCfg, file: string): boolean {
	if (!documentationSupported(file)) return false;
	const requirements = cfg.documentation?.required;
	if (!requirements) return false;
	const src = readFileSync(file, 'utf8');
	const parsed = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, documentationScriptKind(file));
	const insertions: number[] = [];
	const visit = (node: ts.Node): void => {
		const isType = ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
		const isFn = ts.isFunctionDeclaration(node);
		const needsFn = isFn && (requirements.functions || (requirements.exportedFunctions && exported(node)));
		if (((requirements.types && isType) || needsFn) && !documented(node, src)) insertions.push(node.getStart(parsed));
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	if (!insertions.length) return false;
	const eol = src.includes('\r\n') ? '\r\n' : '\n';
	const updated = insertions.sort((a, b) => b - a).reduce((t, p) => `${t.slice(0, p)}/**${eol} *${eol} */${eol}${t.slice(p)}`, src);
	return writeValidatedSrc(file, updated);
}
