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

const OPEN = `/*${'/'.repeat(50)}`;
const CLOSE = `${'/'.repeat(50)}*/`;
const SUPPORTED = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

function srcKind(fileName: string): ts.ScriptKind {
	return /\.[cm]?tsx?$/.test(fileName) && fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function importSrc(node: ts.ImportDeclaration): string {
	return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';
}

type ImportGroup = 'API' | 'COMPONENTS' | 'DATA' | 'TYPES';

function importGroup(name: string): ImportGroup {
	if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'DATA';
	if (/^[A-Z]/.test(name)) return 'COMPONENTS';
	return 'API';
}

function groupedImports(parsed: ts.SourceFile, imports: ts.ImportDeclaration[]): Record<ImportGroup, { source: string; text: string }[]> {
	const groups: Record<ImportGroup, { source: string; text: string }[]> = {
		API: [],
		COMPONENTS: [],
		DATA: [],
		TYPES: [],
	};
	const add = (group: ImportGroup, node: ts.ImportDeclaration, clause: string): void => {
		const module = node.moduleSpecifier.getText(parsed);
		groups[group].push({
			source: importSrc(node),
			text: clause ? `import ${clause} from ${module};` : `import ${module};`,
		});
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

/** Adds the canonical file header and grouped import section, and sorts imports deterministically. */
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
			return entries.length ? [`// ${label}`, '', ...entries.map((entry) => entry.text), ''] : [];
		};
		const block = `${OPEN}${eol}IMPORTS${eol}${CLOSE}${eol}${eol}${(['API', 'COMPONENTS', 'DATA', 'TYPES'] as ImportGroup[]).flatMap(render).join(eol)}`;
		const prefix = src.slice(0, first.getStart(parsed));
		const fenceStart = prefix.search(/\/\*\/{10,}[ \t]*\r?\n[ \t]*IMPORTS[ \t]*\r?\n[ \t]*\/{10,}\*\//);
		const start = fenceStart >= 0 ? fenceStart : first.getStart(parsed);
		src = `${src.slice(0, start).replace(/\s*$/, `${eol}${eol}`)}${block}${src.slice(last.end).replace(/^\s*/, eol)}`;
	}
	const norm = src
		.replace(/^([ \t]*)\/\*\/{10,}[ \t]*$/gm, `$1${OPEN}`)
		.replace(/^([ \t]*)\/{10,}\*\/[ \t]*$/gm, `$1${CLOSE}`)
		.replace(/\s*$/, eol);
	const next = original.startsWith('\uFEFF') ? `\uFEFF${norm}` : norm;
	if (next === original) return false;
	writeFileSync(fileName, next);
	return true;
}
