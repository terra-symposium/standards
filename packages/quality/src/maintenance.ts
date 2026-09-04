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
 * @returns
 */
function srcKind(fileName: string): ts.ScriptKind {
	return /\.[cm]?tsx?$/.test(fileName) && fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/**
 *
 * @param node
 * @returns
 */
function importSrc(node: ts.ImportDeclaration): string {
	return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';
}

/**
 *
 * @param name
 * @returns
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
 * @returns
 */
function groupedImports(parsed: ts.SourceFile, imports: ts.ImportDeclaration[]): Record<ImportGroup, { source: string; text: string }[]> {
	const groups: Record<ImportGroup, { source: string; text: string }[]> = { API: [], COMPONENTS: [], DATA: [], TYPES: [] };
	const add = (group: ImportGroup, node: ts.ImportDeclaration, clause: string): void => {
		const module = node.moduleSpecifier.getText(parsed);
		groups[group].push({ source: importSrc(node), text: clause ? `import ${clause} from ${module};` : `import ${module};` });
	};
	for (const node of imports) {
		const clause = node.importClause;
		if (!clause) {
			add('API', node, '');
			continue;
		}
		if (clause.name) add(clause.isTypeOnly ? 'TYPES' : importGroup(clause.name.text), node, `${clause.isTypeOnly ? 'type ' : ''}${clause.name.text}`);
		const bindings = clause.namedBindings;
		if (bindings && ts.isNamespaceImport(bindings)) add(clause.isTypeOnly ? 'TYPES' : importGroup(bindings.name.text), node, `${clause.isTypeOnly ? 'type ' : ''}* as ${bindings.name.text}`);
		if (bindings && ts.isNamedImports(bindings)) {
			const names = new Map<ImportGroup, string[]>();
			for (const element of bindings.elements) {
				const group = clause.isTypeOnly || element.isTypeOnly ? 'TYPES' : importGroup(element.name.text);
				const elements = names.get(group) ?? [];
				elements.push(element.getText(parsed).replace(/^type\s+/, ''));
				names.set(group, elements);
			}
			for (const [group, elements] of names) add(group, node, `${group === 'TYPES' ? 'type ' : ''}{ ${elements.sort().join(', ')} }`);
		}
	}
	return groups;
}

/**
 *
 * @param node
 * @returns
 */
function srcGroup(node: ts.Statement): SrcGroup | undefined {
	if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node) || (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Const) !== 0))
		return 'CONFIG';
	if (ts.isFunctionDeclaration(node)) return 'HELPERS';
	return undefined;
}

/**
 *
 * @param label
 * @param statements
 * @param eol
 * @returns
 */
function srcSection(label: SrcGroup, statements: string[], eol: string): string {
	return `${OPEN}${eol}${label}${eol}${CLOSE}${eol}${eol}${statements.join(label === 'CONFIG' ? eol : `${eol}${eol}`)}`;
}

/**
 *
 * @param src
 * @param fileName
 * @returns
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
 * @returns
 */
function generatedFunctionDoc(node: ts.FunctionDeclaration, parsed: ts.SourceFile, eol: string): string {
	const params = node.parameters.map((p, i) => (ts.isIdentifier(p.name) ? p.name.text : ts.isObjectBindingPattern(p.name) ? 'props' : `param${i + 1}`));
	return ['/**', ' *', ...params.map((n) => ` * @param ${n}`), ' * @returns', ' */'].join(eol);
}

/**
 *
 * @param node
 * @param parsed
 * @param src
 * @param eol
 * @returns
 */
function statementText(node: ts.Statement, parsed: ts.SourceFile, src: string, eol: string): string {
	const leading = src.slice(node.getFullStart(), node.getStart(parsed)).trim();
	const text = src.slice(node.getStart(parsed), node.end);
	if (!ts.isFunctionDeclaration(node)) return [leading, text].filter(Boolean).join(eol);
	const generated = generatedFunctionDoc(node, parsed, eol);
	const generatedPattern = /\/\*\*\r?\n \*\r?\n(?: \* @param [^\r\n]+\r?\n)* \* @returns\r?\n \*\//;
	if (generatedPattern.test(leading)) return [leading.replace(generatedPattern, generated), text].filter(Boolean).join(eol);
	if (/\/\*\*/.test(leading)) return [leading, text].filter(Boolean).join(eol);
	return [leading, generated, text].filter(Boolean).join(eol);
}

/** Moves top-level configuration and helper declarations into canonical sections after imports. */
function organizeSrcSections(src: string, fileName: string, eol: string): string {
	const withoutManagedSections = removeManagedSections(src, fileName);
	const parsed = ts.createSourceFile(fileName, withoutManagedSections, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const imports = parsed.statements.filter(ts.isImportDeclaration);
	if (!imports.length) return src;
	const lastImport = imports.at(-1) as ts.ImportDeclaration;
	const statements = parsed.statements.filter((node) => !ts.isImportDeclaration(node) && node.getStart(parsed) >= lastImport.end);
	const groups: Record<SrcGroup, string[]> = { CONFIG: [], HELPERS: [] };
	const remaining: string[] = [];
	for (const node of statements) {
		const text = statementText(node, parsed, withoutManagedSections, eol);
		const group = srcGroup(node);
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

/** Adds the canonical header, grouped imports, and top-level source sections. */
export function maintainSourceFile(root: string, fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const eol = original.includes('\r\n') ? '\r\n' : '\n';
	let src = original.replace(/^\uFEFF/, '').replace(/^\s+/, '');
	const path = relative(root, fileName).split(sep).join('/');
	if (!src.startsWith('/**') && !src.startsWith('#!')) src = `/**${eol} * ${path}${eol} */${eol}${eol}${src}`;
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const imports = parsed.statements.filter(ts.isImportDeclaration);
	if (imports.length) {
		const first = imports[0];
		const last = imports.at(-1) as ts.ImportDeclaration;
		const groups = groupedImports(parsed, imports);
		const render = (label: ImportGroup): string[] => {
			const entries = groups[label].sort((a, b) => a.source.localeCompare(b.source) || a.text.localeCompare(b.text));
			return entries.length ? [`// ${label}`, '', ...entries.map((e) => e.text), ''] : [];
		};
		const block = `${OPEN}${eol}IMPORTS${eol}${CLOSE}${eol}${eol}${(['API', 'COMPONENTS', 'DATA', 'TYPES'] as ImportGroup[]).flatMap(render).join(eol)}`;
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
	const next = original.startsWith('\uFEFF') ? `\uFEFF${norm}` : norm;
	if (next === original) return false;
	writeFileSync(fileName, next);
	return true;
}

/** Adds Prettier protection to one-line imports that exceed the configured print width. */
export function protectLongImports(fileName: string, printWidth = 200): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const eol = original.includes('\r\n') ? '\r\n' : '\n';
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const lineStarts = parsed.getLineStarts();
	const insertions = new Set<number>();
	for (const node of parsed.statements.filter(ts.isImportDeclaration)) {
		const lineStart = lineStarts[parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line] ?? 0;
		const newline = original.indexOf('\n', node.end);
		const line = original.slice(lineStart, newline < 0 ? original.length : newline).replace(/\r$/, '');
		if (line.length <= printWidth || original.slice(lineStart, node.getStart(parsed)).trim()) continue;
		const prevLineEnd = lineStart > 0 ? lineStart - 1 : -1;
		const prevLineStart = prevLineEnd >= 0 ? original.lastIndexOf('\n', prevLineEnd - 1) + 1 : 0;
		if (original.slice(prevLineStart, prevLineEnd + 1).trim() === '// prettier-ignore') continue;
		insertions.add(lineStart);
	}
	if (!insertions.size) return false;
	let next = original;
	for (const offset of [...insertions].sort((a, b) => b - a)) {
		const newline = original.indexOf('\n', offset);
		const indent = original.slice(offset, newline < 0 ? original.length : newline).match(/^\s*/)?.[0] ?? '';
		next = `${next.slice(0, offset)}${indent}// prettier-ignore${eol}${next.slice(offset)}`;
	}
	writeFileSync(fileName, next);
	return true;
}
