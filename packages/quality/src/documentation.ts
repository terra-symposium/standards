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

const TYPE_S_REGEX = /^type\s+/;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const R_N_REGEX = /\r?\n/;
const S_S_G_REGEX = () => /\/\*\*[\s\S]*?\*\//g;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const T_R_N_S_S_R_N_T_T_R_N_REGEX = /^\/\*\*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\*\/[ \t]*(?:\r?\n)*/;
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
/**
 * Names the canonical sections used to sort imports.
 */
type ImportGroup = 'API' | 'COMPONENTS' | 'DATA' | 'TYPES';
/**
 * Names the source-file groups used by quality maintenance.
 */
type SrcGroup = 'CONFIG' | 'HELPERS';
/**
 * Configures which source declarations require TSDoc descriptions.
 */
export type DocumentationRequirements = { types?: boolean; functions?: boolean; exportedFunctions?: boolean; noInlineFunctions?: boolean };
/**
 * Identifies a repeated import that should be grouped with its peer.
 */
export type DuplicateImportFinding = { file: string; line: number; module: string };

/*//////////////////////////////////////////////////
DOCUMENTATION
//////////////////////////////////////////////////*/

/**
 * Describes a documentation-policy finding and its source location.
 */
export type DocumentationFinding = {
	file: string;
	line: number;
	column: number;
	name: string;
	kind: 'file' | 'summary' | 'param' | 'return' | 'tag' | 'type' | 'function' | 'inline' | 'orphan';
	reason: string;
	severity: 'warning' | 'error';
};
export const DOCUMENTATION_DESCRIPTION_NOTICE = 'Ask an agent for meaningful documentation prose; this check only reports missing descriptions and never generates them in bulk.';
/**
 * Stores the source range and text of one TSDoc block.
 */
type TSDocBlock = { start: number; end: number; text: string };
/**
 * Stores the source offset and content of one TSDoc line.
 */
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
 *
 * @return Nothing; throws before replacing the source when parsing fails.
 */
function writeValidatedSrc(fileName: string, src: string): boolean {
	try {
		if (/\.d\.[cm]?ts$/.test(fileName)) {
			const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
			if ((parsed as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) return false;
		} else {
			const result = ts.transpileModule(src, {
				fileName,
				reportDiagnostics: true,
				compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
			});
			if (result.diagnostics?.length) return false;
		}
	} catch {
		return false;
	}
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
			continue;
		}
		const doc = rest.slice(prefix.length).match(docPattern);
		if (!doc) break;
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
 * Finds repeated named bindings that the source maintainer can merge without
 * changing import evaluation order or side-effect-only imports.
 *
 * @param files Configured source files to inspect.
 *
 * @return One finding for each later import declaration that repeats a binding.
 */
export function duplicateImportFindings(files: string[]): DuplicateImportFinding[] {
	const findings: DuplicateImportFinding[] = [];
	for (const file of files) {
		if (!SUPPORTED.has(extname(file))) continue;
		const text = readFileSync(file, 'utf8');
		const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, srcKind(file));
		const seen = new Set<string>();
		for (const declaration of parsed.statements.filter(ts.isImportDeclaration)) {
			if (!declaration.importClause || !ts.isStringLiteral(declaration.moduleSpecifier)) continue;
			const keys: string[] = [];
			if (declaration.importClause.name)
				keys.push(
					`${declaration.moduleSpecifier.text}|${importGroup(declaration.importClause.name.text)}|${declaration.importClause.isTypeOnly ? 'type' : 'value'}|default:${declaration.importClause.name.text}`,
				);
			if (declaration.importClause.namedBindings && ts.isNamespaceImport(declaration.importClause.namedBindings))
				keys.push(
					`${declaration.moduleSpecifier.text}|${importGroup(declaration.importClause.namedBindings.name.text)}|${declaration.importClause.isTypeOnly ? 'type' : 'value'}|namespace:${declaration.importClause.namedBindings.name.text}`,
				);
			if (declaration.importClause.namedBindings && ts.isNamedImports(declaration.importClause.namedBindings)) {
				for (const element of declaration.importClause.namedBindings.elements) {
					const typeOnly = declaration.importClause.isTypeOnly || element.isTypeOnly;
					const group = typeOnly ? 'TYPES' : importGroup(element.name.text);
					const binding = element.getText(parsed).replace(TYPE_S_REGEX, '');
					keys.push(`${declaration.moduleSpecifier.text}|${group}|${typeOnly ? 'type' : 'value'}|${binding}`);
				}
			}
			if (keys.some((key) => seen.has(key))) {
				const { line } = parsed.getLineAndCharacterOfPosition(declaration.getStart(parsed));
				findings.push({ file, line: line + 1, module: declaration.moduleSpecifier.text });
			}
			for (const key of keys) seen.add(key);
		}
	}
	return findings;
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
	/**
	 * Describes the merged import data used by the quality tooling.
	 */
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
				get(group, n, elTypeOnly).named.add(el.getText(parsed).replace(TYPE_S_REGEX, ''));
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
 * Returns the parameter identifier used for generated TSDoc tags.
 *
 * @param p Function parameter whose name should be rendered in a TSDoc tag.
 * @param i Zero-based parameter position used when the parameter is destructured.
 *
 * @return The identifier name or a stable fallback for the parameter position.
 */
function fnParamName(p: ts.ParameterDeclaration, i: number): string {
	return ts.isIdentifier(p.name) ? p.name.text : ts.isObjectBindingPattern(p.name) ? 'props' : `param${i + 1}`;
}
/**
 * Generates a TSDoc block for a function declaration while preserving existing prose.
 *
 * @param n Function declaration whose parameter list determines required tags.
 * @param parsed Parsed source file containing the declaration.
 * @param eol Line-ending sequence used in the generated block.
 * @param existing Existing TSDoc text to retain where possible.
 *
 * @return TSDoc text with parameter tags aligned to the declaration.
 */
function genFnDoc(n: ts.FunctionDeclaration, parsed: ts.SourceFile, eol: string, existing = ''): string {
	const params = n.parameters.map(fnParamName);
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
	for (const [name, block] of paramBlocks) if (!params.includes(name)) content.push(...block);
	if (returnBlock || returnsVal(n)) {
		if (content.at(-1) !== '') content.push('');
		content.push(...(returnBlock ?? ['@return']));
	}
	for (const block of otherBlocks) content.push('', ...block);
	const norm = ['/**', ...content.map((l) => (l ? ` * ${l}` : ' *')), ' */'].join(eol);
	return existing === norm ? existing : norm;
}

/**
 * Adds missing parameter and return tags to existing function TSDoc without inventing prose.
 *
 * @param src Source text being parsed or inspected.
 * @param fileName Source file path being read or updated.
 * @param eol Line-ending sequence retained in the generated source.
 *
 * @return Whether the requested source update was applied successfully.
 */
function maintainFnDocs(src: string, fileName: string, eol: string): string {
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const updates: { start: number; end: number; text: string }[] = [];
	const fns: ts.FunctionDeclaration[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isFunctionDeclaration(node)) fns.push(node);
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	for (const node of fns) {
		const leading = src.slice(node.getFullStart(), node.getStart(parsed));
		const doc = [...leading.matchAll(S_S_G_REGEX())].at(-1);
		if (!doc || doc.index === undefined) continue;
		const start = node.getFullStart() + doc.index;
		const indentation = src.slice(src.lastIndexOf('\n', start - 1) + 1, start);
		const text = genFnDoc(node, parsed, eol, doc[0]).replace(/\r?\n/g, `${eol}${indentation}`);
		if (text !== doc[0]) updates.push({ start, end: start + doc[0].length, text });
	}
	return updates.sort((a, b) => b.start - a.start).reduce((c, u) => `${c.slice(0, u.start)}${u.text}${c.slice(u.end)}`, src);
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
	const docs = [...leading.matchAll(S_S_G_REGEX())];
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
	src = maintainFnDocs(src, fileName, eol);
	if ([...src.matchAll(/\/\*\/{10,}\s*\n\s*([A-Z][A-Z _-]*)\s*\n\s*\/{10,}\*\//g)].some((m) => !['IMPORTS', 'CONFIG', 'HELPERS'].includes(m[1]!.trim()))) return src;
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
	src = src.replace(/^\/\*\*[ \t]+([^\r\n]*?)\s*\*\/[ \t]*(?:\r?\n)*/, (_match, d: string) => `/**${eol} * ${d}${eol} */${eol}`);
	src = healHeaderFragments(src, path, eol);
	const existingHeader = src.match(T_R_N_S_S_R_N_T_T_R_N_REGEX);
	const headerLines =
		existingHeader?.[1]
			.split(R_N_REGEX)
			.map((l) => l.replace(T_T_REGEX, '').trim())
			.filter(Boolean) ?? [];
	const hasPathHeader = headerLines[0]?.includes('/') || /\.(?:c|m)?(?:js|ts)x?$/.test(headerLines[0] ?? '');
	const headerDescription = hasPathHeader ? headerLines.slice(1) : headerLines;
	const header = ['/**', path, ...headerDescription, ' */'].map((l, i) => (i === 0 ? l : i === headerDescription.length + 2 ? l : ` * ${l}`)).join(eol);
	if (existingHeader) {
		src = src.replace(T_R_N_S_S_R_N_T_T_R_N_REGEX, `${header}${eol}${eol}`);
		const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const duplicateHeader = new RegExp(`^(\\/\\*\\*\\r?\\n \\* ${escapedPath}\\r?\\n \\*\\/)(?:\\r?\\n)+\\1(?:\\r?\\n)+`);
		src = src.replace(duplicateHeader, `$1${eol}${eol}`);
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
			const seen = new Set<string>();
			const uniqueEntries = entries.filter((e) => {
				if (seen.has(e.text)) return false;
				seen.add(e.text);
				return true;
			});
			return uniqueEntries.length ? [`// ${label}`, ...uniqueEntries.map((e) => e.text), ''] : [];
		};
		const sortedGroups = (Object.keys(groups) as ImportGroup[]).sort(comp);
		const block = `${OPEN}${eol}IMPORTS${eol}${CLOSE}${eol}${sortedGroups.flatMap(render).join(eol)}`;
		const prefix = src.slice(0, first.getStart(parsed));
		const fenceStart = prefix.search(/\/\*\/{10,}[ \t]*\r?\n[ \t]*IMPORTS[ \t]*\r?\n[ \t]*\/{10,}\*\//);
		const start = fenceStart >= 0 ? fenceStart : first.getStart(parsed);
		src = `${src.slice(0, start).replace(S_CLASS_4, `${eol}${eol}`)}${block}${src.slice(last.end).replace(S_REGEX, eol)}`;
	}
	src = organizeSrcSects(src, fileName, eol);
	const norm = src
		.replace(/^([ \t]*)\/\*\/{10,}[ \t]*$/gm, `$1${OPEN}`)
		.replace(/^([ \t]*)\/{10,}\*\/[ \t]*$/gm, `$1${CLOSE}`)
		.replace(S_CLASS_4, eol);
	const laidOut = normCommentLayout(norm, fileName, eol);
	const n = original.startsWith('\uFEFF') ? `\uFEFF${laidOut}` : laidOut;
	if (n === original) return false;
	return writeValidatedSrc(fileName, n);
}

/**
 * Removes generated section scaffolding and empty or detached TSDoc after source edits.
 *
 * @param fileName Source file path being read or updated.
 *
 * @return The removenoncodecomments result used by the caller.
 */
export function removeNonCodeComments(fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const src = readFileSync(fileName, 'utf8');
	const original = src.replace(/(^|\n)([ \t]*(?:CONFIG|TESTS|HELPERS|IMPORTS)[ \t]*\r?\n[ \t]*\/{10,}\*\/[ \t]*(?=\r?\n|$))/g, (m, p: string, _fragment: string, o: number) => {
		const precedingLine = src
			.slice(0, o + p.length)
			.trimEnd()
			.split(R_N_REGEX)
			.at(-1)
			?.trim();
		return precedingLine && /^\/\*\/{10,}$/.test(precedingLine) ? m : p;
	});
	if (original !== src) writeValidatedSrc(fileName, original);
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const removals: { start: number; end: number }[] = [];
	const nodeStarts: number[] = [];
	const codeStarts: number[] = [];
	const inspect = (node: ts.Node): void => {
		codeStarts.push(node.getStart(parsed));
		if (ts.isVariableStatement(node)) nodeStarts.push(node.getStart(parsed));
		if (
			ts.isClassLike(node) ||
			ts.isFunctionLike(node) ||
			ts.isVariableDeclaration(node) ||
			ts.isTypeAliasDeclaration(node) ||
			ts.isInterfaceDeclaration(node) ||
			ts.isEnumDeclaration(node) ||
			ts.isModuleDeclaration(node) ||
			ts.isPropertyDeclaration(node) ||
			ts.isMethodDeclaration(node) ||
			ts.isParameter(node)
		)
			nodeStarts.push(node.getStart(parsed));
		ts.forEachChild(node, inspect);
	};
	inspect(parsed);
	const comments: { start: number; end: number; text: string }[] = [];
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, parsed.languageVariant, original);
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan())
		if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia)
			comments.push({ start: scanner.getTokenPos(), end: scanner.getTextPos(), text: scanner.getTokenText() });
	for (const block of tsdocBlocks(original, parsed)) {
		const followingDeclaration = nodeStarts.filter((s) => s >= block.end).sort((a, b) => a - b)[0];
		const detached = followingDeclaration === undefined || !S_REGEX.test(original.slice(block.end, followingDeclaration));
		const empty = !block.text
			.replace(/^\/\*\*|\*\/$/g, '')
			.replace(/^\s*\* ?/gm, '')
			.trim();
		if ((detached || empty) && !fileHeaderBlock(original, [block])) removals.push({ start: block.start, end: block.end });
	}
	const headings = comments.filter(({ text: t }) => /^\/\*\/{10,}/.test(t) || /^\/\/\s*[A-Z][A-Z _-]*\s*$/.test(t));
	for (const [idx, heading] of headings.entries()) {
		const section = heading.text.startsWith('/*');
		const n = headings.slice(idx + 1).find((c) => c.text.startsWith('/*') === section)?.start ?? original.length;
		if (!codeStarts.some((s) => s >= heading.end && s < n)) removals.push({ start: heading.start, end: heading.end });
	}
	if (!removals.length) return false;
	let updated = original;
	for (const { start, end } of removals.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, start)}${updated.slice(end)}`;
	updated = updated.replace(/\n{3,}/g, '\n\n');
	return updated === original ? false : writeValidatedSrc(fileName, updated);
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
	const docs = [...leading.matchAll(S_S_G_REGEX())];
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
function tsdocBlocks(src: string, parsed: ts.SourceFile): TSDocBlock[] {
	const blocks = new Map<number, TSDocBlock>();
	const add = (ranges: ts.CommentRange[] | undefined): void => {
		for (const range of ranges ?? []) {
			const text = src.slice(range.pos, range.end);
			if (text.startsWith('/**')) blocks.set(range.pos, { start: range.pos, end: range.end, text });
		}
	};
	const visit = (node: ts.Node): void => {
		add(ts.getLeadingCommentRanges(src, node.getFullStart()));
		add(ts.getTrailingCommentRanges(src, node.end));
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	return [...blocks.values()].sort((l, r) => l.start - r.start);
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
 * Determines whether a function exposes a value through its return type or body.
 *
 * @param node Function declaration whose return contract is being checked.
 *
 * @return `true` when callers can receive a value rather than only completion.
 */
function returnsVal(node: ts.FunctionDeclaration): boolean {
	const returnType = node.type?.getText().replace(/\s+/g, '') ?? '';
	if (returnType === 'void' || returnType === 'Promise<void>') return false;
	if (node.type) return true;
	let valReturn = false;
	const visit = (child: ts.Node): void => {
		if (valReturn) return;
		if (ts.isReturnStatement(child) && child.expression) valReturn = true;
		ts.forEachChild(child, visit);
	};
	if (node.body) visit(node.body);
	return valReturn;
}

/**
 * Finds the TSDoc block directly attached to a declaration.
 *
 * @param src Source text containing the declaration and its comments.
 * @param node Declaration whose leading documentation is required.
 *
 * @return The attached TSDoc block, or `undefined` when the declaration is undocumented.
 */
function documentationBlockFor(src: string, node: ts.Node): TSDocBlock | undefined {
	const ranges = ts.getLeadingCommentRanges(src, node.getFullStart()) ?? [];
	const range = ranges.at(-1);
	if (!range || range.kind !== ts.SyntaxKind.MultiLineCommentTrivia || !src.slice(range.pos, range.end).startsWith('/**')) return undefined;
	return { start: range.pos, end: range.end, text: src.slice(range.pos, range.end) };
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
	const attached = new Set<number>();
	const markAttached = (node: ts.Node): void => {
		if (
			ts.isDeclarationStatement(node) ||
			ts.isFunctionLike(node) ||
			ts.isClassLike(node) ||
			ts.isEnumMember(node) ||
			ts.isPropertySignature(node) ||
			ts.isMethodSignature(node) ||
			ts.isCallSignatureDeclaration(node) ||
			ts.isConstructSignatureDeclaration(node) ||
			ts.isIndexSignatureDeclaration(node) ||
			ts.isTypeParameterDeclaration(node) ||
			ts.isVariableStatement(node)
		)
			for (const range of ts.getLeadingCommentRanges(src, node.getFullStart()) ?? [])
				if (src.slice(range.pos, range.end).startsWith('/**') && S_REGEX.test(src.slice(range.end, node.getStart(parsed)))) attached.add(range.pos);
		ts.forEachChild(node, markAttached);
	};
	markAttached(parsed);
	for (const block of blocks) {
		if (block === header) continue;
		if (!attached.has(block.start)) {
			const finding = documentationCommentReport(file, parsed, block.start, '<detached TSDoc>', 'orphan', 'remove or attach this TSDoc to a declaration', cfg);
			findings.push({ ...finding, severity: 'warning' });
			continue;
		}
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
			if (needsDoc) {
				if (!documented(node, src)) {
					findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'function', 'add TSDoc for this function', cfg));
				} else {
					const block = documentationBlockFor(src, node);
					if (block) {
						const entries = tsdocTagEntries(tsdocLines(block));
						const documentedParams = new Set(entries.filter((e) => e.tag.toLowerCase() === 'param').map((e) => e.subject));
						for (const [idx, param] of node.parameters.entries()) {
							const name = fnParamName(param, idx);
							if (!documentedParams.has(name)) findings.push(documentationReport(file, parsed, node, `@param ${name}`, 'param', `document the ${name} parameter`, cfg));
						}
						const hasReturnTag = entries.some((e) => ['return', 'returns'].includes(e.tag.toLowerCase()));
						if (returnsVal(node) && !hasReturnTag) findings.push(documentationReport(file, parsed, node, '@return', 'return', 'document the value returned by this function', cfg));
					}
				}
			}
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
