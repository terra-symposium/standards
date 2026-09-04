/**
 * packages/quality/src/maintenance.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, relative, sep } from 'node:path';
import ts from 'typescript';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const OPEN = `/*${'/'.repeat(50)}`;
const CLOSE = `${'/'.repeat(50)}*/`;
const SUPPORTED = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
type ImportGroup = 'API' | 'COMPONENTS' | 'DATA' | 'TYPES';
type SrcGroup = 'CONFIG' | 'HELPERS';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param fileName
 *
 * @return
 */
function srcKind(fileName: string): ts.ScriptKind {
	return /\.[cm]?tsx?$/.test(fileName) && fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/**
 *
 * @param n
 *
 * @return
 */
function importSrc(n: ts.ImportDeclaration): string {
	return ts.isStringLiteral(n.moduleSpecifier) ? n.moduleSpecifier.text : '';
}

/**
 *
 * @param name
 *
 * @return
 */
function importGroup(name: string): ImportGroup {
	if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'DATA';
	if (/^[A-Z]/.test(name)) return 'COMPONENTS';
	return 'API';
}

/**
 *
 * @param parsed
 * @param imports
 *
 * @return
 */
function groupedImports(parsed: ts.SourceFile, imports: ts.ImportDeclaration[]): Record<ImportGroup, { source: string; text: string }[]> {
	const groups: Record<ImportGroup, { source: string; text: string }[]> = { API: [], COMPONENTS: [], DATA: [], TYPES: [] };
	const add = (group: ImportGroup, n: ts.ImportDeclaration, clause: string): void => {
		const module = n.moduleSpecifier.getText(parsed);
		groups[group].push({ source: importSrc(n), text: clause ? `import ${clause} from ${module};` : `import ${module};` });
	};
	for (const n of imports) {
		const clause = n.importClause;
		if (!clause) {
			add('API', n, '');
			continue;
		}
		if (clause.name) add(clause.isTypeOnly ? 'TYPES' : importGroup(clause.name.text), n, `${clause.isTypeOnly ? 'type ' : ''}${clause.name.text}`);
		const bindings = clause.namedBindings;
		if (bindings && ts.isNamespaceImport(bindings)) add(clause.isTypeOnly ? 'TYPES' : importGroup(bindings.name.text), n, `${clause.isTypeOnly ? 'type ' : ''}* as ${bindings.name.text}`);
		if (bindings && ts.isNamedImports(bindings)) {
			const names = new Map<ImportGroup, string[]>();
			for (const el of bindings.elements) {
				const group = clause.isTypeOnly || el.isTypeOnly ? 'TYPES' : importGroup(el.name.text);
				const els = names.get(group) ?? [];
				els.push(el.getText(parsed).replace(/^type\s+/, ''));
				names.set(group, els);
			}
			for (const [group, elements] of names) add(group, n, `${group === 'TYPES' ? 'type ' : ''}{ ${elements.sort().join(', ')} }`);
		}
	}
	return groups;
}

/**
 *
 * @param n
 *
 * @return
 */
function srcGroup(n: ts.Statement): SrcGroup | undefined {
	if (ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n) || ts.isEnumDeclaration(n) || (ts.isVariableStatement(n) && (n.declarationList.flags & ts.NodeFlags.Const) !== 0)) return 'CONFIG';
	if (ts.isFunctionDeclaration(n)) return 'HELPERS';
	return undefined;
}

/**
 *
 * @param label
 * @param statements
 * @param eol
 *
 * @return
 */
function srcSection(label: SrcGroup, statements: string[], eol: string): string {
	return `${OPEN}${eol}${label}${eol}${CLOSE}${eol}${statements.join(label === 'CONFIG' ? eol : `${eol}${eol}`)}`;
}

/**
 * Returns source spans whose whitespace is content rather than layout.
 *
 * @param src
 * @param fileName
 *
 * @return
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
 * @param src
 * @param fileName
 * @param eol
 *
 * @return
 */
function normCommentLayout(src: string, fileName: string, eol: string): string {
	const spans = literalSpans(src, fileName);
	const rawLines = src.split(/\r?\n/);
	const newlineSize = src.includes('\r\n') ? 2 : 1;
	let offset = 0;
	const lines = rawLines.map((t) => {
		const line = { text: t, start: offset };
		offset += t.length + newlineSize;
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
		const closesSection = sectionClose(i);
		if (!text && !protectedLine(lines[i])) {
			const prev = out.at(-1) ?? '';
			let next = i + 1;
			while (next < lines.length && !lines[next].text.trim() && !protectedLine(lines[next])) next++;
			const adjacentComment = /^\s*(?:\/\/|\/\*|\*\/|\*)/.test(prev) || (next < lines.length && /^\s*(?:\/\/|\/\*|\*\/|\*)/.test(lines[next].text));
			if (adjacentComment && out.length && out.at(-1) !== '') out.push('');
			continue;
		}
		if (sectionOpen(i)) pushBlank();
		if (lineGroup(i)) pushBlank();
		out.push(text);
		if (closesSection || lineGroup(i)) {
			while (i + 1 < lines.length && !lines[i + 1].text.trim() && !protectedLine(lines[i + 1])) i++;
			if (closesSection && i + 1 < lines.length) pushBlank();
		}
	}
	while (out.at(-1) === '') out.pop();
	// Keep blank lines only when they explicitly separate comments/groups.
	// This also removes stale whitespace inside function bodies while preserving
	// spacing around TSDoc, line groups, and section fences.
	const compact = out.filter((line, index) => {
		if (line !== '') return true;
		const prev = out[index - 1] ?? '';
		const following = out[index + 1] ?? '';
		const comment = (textVal: string): boolean => /^\s*(?:\/\/|\/\*|\*\/|\*)/.test(textVal);
		return comment(prev) || comment(following);
	});
	return `${compact.join(eol)}${eol}`;
}

/**
 *
 * @param src
 * @param fileName
 *
 * @return
 */
function removeManagedSections(src: string, fileName: string): string {
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const literals: { start: number; end: number }[] = [];
	const visit = (node: ts.Node): void => {
		if (
			ts.isStringLiteral(node) ||
			ts.isRegularExpressionLiteral(node) ||
			ts.isNoSubstitutionTemplateLiteral(node) ||
			ts.isTemplateHead(node) ||
			ts.isTemplateMiddle(node) ||
			ts.isTemplateTail(node) ||
			ts.isJsxText(node)
		) {
			literals.push({ start: node.getStart(parsed), end: node.end });
			return;
		}
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	const pattern = /^[ \t]*\/\*\/{10,}[ \t]*\r?\n[ \t]*(?:CONFIG|HELPERS)[ \t]*\r?\n[ \t]*\/{10,}\*\/[ \t]*(?:\r?\n)*/gm;
	const matches = [...src.matchAll(pattern)].filter((match) => !literals.some((literal) => match.index! >= literal.start && match.index! < literal.end));
	return matches.sort((a, b) => b.index! - a.index!).reduce((text, match) => `${text.slice(0, match.index!)}${text.slice(match.index! + match[0].length)}`, src);
}

/**
 *
 * @param node
 * @param parsed
 * @param eol
 * @param existing
 *
 * @return
 */
function genFnDoc(node: ts.FunctionDeclaration, parsed: ts.SourceFile, eol: string, existing = ''): string {
	const params = node.parameters.map((p, i) => (ts.isIdentifier(p.name) ? p.name.text : ts.isObjectBindingPattern(p.name) ? 'props' : `param${i + 1}`));
	const body = existing
		.slice(3, -2)
		.split(/\r?\n/)
		.map((l) => l.replace(/^\s*\* ?/, '').trim());
	while (body.length && !body.at(0)?.trim()) body.shift();
	while (body.length && !body.at(-1)?.trim()) body.pop();
	const firstTag = body.findIndex((line) => /^\s*@\w+/.test(line));
	const summary = (firstTag < 0 ? body : body.slice(0, firstTag)).map((l) => l.trim());
	while (summary.length && !summary.at(-1)?.trim()) summary.pop();
	const tagLines = firstTag < 0 ? [] : body.slice(firstTag).filter((line) => line.trim());
	const blocks: string[][] = [];
	for (const line of tagLines) {
		if (/^\s*@\w+/.test(line) || !blocks.length) blocks.push([line.trim()]);
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
		if (/^@returns?\b/.test(block[0] ?? '')) {
			returnBlock = [`${block[0]!.replace(/^@returns?\b/, '@return')}`, ...block.slice(1)];
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
 *
 * @param n
 * @param parsed
 * @param src
 * @param eol
 *
 * @return
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
 * @param src
 * @param fileName
 * @param eol
 *
 * @return
 */
function organizeSrcSections(src: string, fileName: string, eol: string): string {
	const withoutManagedSections = removeManagedSections(src, fileName);
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
 * @param root
 * @param fileName
 *
 * @return
 */
export function maintainSourceFile(root: string, fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const eol = original.includes('\r\n') ? '\r\n' : '\n';
	let src = original.replace(/^\uFEFF/, '').replace(/^\s+/, '');
	const path = relative(root, fileName).split(sep).join('/');
	const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const duplicateHeader = new RegExp(`^(\\/\\*\\*\\r?\\n \\* ${escapedPath}\\r?\\n \\*\\/)(?:\\r?\\n)+\\1(?:\\r?\\n)+`);
	src = src.replace(duplicateHeader, `$1${eol}${eol}`);
	if (!src.startsWith('/**') && !src.startsWith('#!')) src = `/**${eol} * ${path}${eol} */${eol}${eol}${src}`;
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const imports = parsed.statements.filter(ts.isImportDeclaration);
	if (imports.length) {
		const first = imports[0];
		const last = imports.at(-1) as ts.ImportDeclaration;
		const groups = groupedImports(parsed, imports);
		const render = (label: ImportGroup): string[] => {
			const entries = groups[label].sort((a, b) => a.source.localeCompare(b.source) || a.text.localeCompare(b.text));
			return entries.length ? [`// ${label}`, ...entries.map((e) => e.text), ''] : [];
		};
		const block = `${OPEN}${eol}IMPORTS${eol}${CLOSE}${eol}${(['API', 'COMPONENTS', 'DATA', 'TYPES'] as ImportGroup[]).flatMap(render).join(eol)}`;
		const prefix = src.slice(0, first.getStart(parsed));
		const fenceStart = prefix.search(/\/\*\/{10,}[ \t]*\r?\n[ \t]*IMPORTS[ \t]*\r?\n[ \t]*\/{10,}\*\//);
		const start = fenceStart >= 0 ? fenceStart : first.getStart(parsed);
		src = `${src.slice(0, start).replace(/\s*$/, `${eol}${eol}`)}${block}${src.slice(last.end).replace(/^\s*/, eol)}`;
	}
	src = organizeSrcSections(src, fileName, eol);
	const norm = src
		.replace(/^([ \t]*)\/\*\/{10,}[ \t]*$/gm, `$1${OPEN}`)
		.replace(/^([ \t]*)\/{10,}\*\/[ \t]*$/gm, `$1${CLOSE}`)
		.replace(/\s*$/, eol);
	const laidOut = normCommentLayout(norm, fileName, eol);
	const n = original.startsWith('\uFEFF') ? `\uFEFF${laidOut}` : laidOut;
	if (n === original) return false;
	writeFileSync(fileName, n);
	return true;
}

/**
 * Adds Prettier protection to one-line imports that exceed the configured print width.
 *
 * @param fileName
 * @param printWidth
 *
 * @return
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
		const indent = original.slice(offset, nLine < 0 ? original.length : nLine).match(/^\s*/)?.[0] ?? '';
		next = `${next.slice(0, offset)}${indent}// prettier-ignore${eol}${next.slice(offset)}`;
	}
	writeFileSync(fileName, next);
	return true;
}
