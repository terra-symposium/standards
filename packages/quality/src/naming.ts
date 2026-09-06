/**
 * packages/quality/src/naming.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { readFileSync } from 'node:fs';

// TYPES
import type { QualityCfg } from './config.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

type ReplacementGroup = readonly [names: string | readonly string[], replacement: string];
type RenameKind = { numericIndex?: boolean; callback?: boolean; reserved?: string[] };
export const IDENTIFIER_REPLACEMENTS = replacementMap([
	[['administrator', 'administration'], 'admin'],
	['attribute', 'attr'],
	['category', 'cat'],
	['current', 'curr'],
	['command', 'cmd'],
	['column', 'col'],
	['context', 'ctx'],
	[['config', 'configuration'], 'cfg'],
	['configured', 'cfgd'],
	[['compare', 'comp'], 'comp'],
	['definition', 'def'],
	['difference', 'diff'],
	['directory', 'dir'],
	['destination', 'dest'],
	['error', 'err'],
	['event', 'e'],
	['expression', 'expr'],
	['extension', 'ext'],
	[['format', 'formatted', 'formatting', 'formatter'], 'fmt'],
	['function', 'fn'],
	[['generation', 'generate', 'generated', 'generating'], 'gen'],
	['image', 'img'],
	[['identify', 'indentifier'], 'id'],
	['index', 'idx'],
	[['initialise', 'initialised', 'initialises', 'initialising', 'initialisation', 'initialize', 'initialized', 'initializes', 'initializing', 'initialization'], 'init'],
	[['initialiser', 'initializer'], 'init'],
	['language', 'lang'],
	['member', 'mem'],
	['message', 'msg'],
	[['organization', 'organisation'], 'org'],
	['operation', 'op'],
	['option', 'opt'],
	['parameter', 'param'],
	['previous', 'prev'],
	['position', 'pos'],
	['record', 'rec'],
	['repository', 'repo'],
	[['request', 'requested'], 'req'],
	['response', 'res'],
	['source', 'src'],
	['target', 'tgt'],
	['value', 'val'],
]);
export const PREFIX_REPLACEMENTS = replacementMap([
	['active', 'a'],
	['next', 'n'],
	['safe', 's'],
	[['normalise', 'normalised', 'normalises', 'normalize', 'normalized', 'normalizes'], 'norm'],
	[['clean', 'cleaned', 'cleaner'], 'c'],
	[['calculate', 'calculated'], 'calc'],
	[['validate', 'validated', 'validation'], 'valid'],
	[['sanitize', 'sanitized'], 'san'],
]);
export const CALLBACK_ALIASES = replacementMap(
	[
		['workshop', 'w'],
		[['customer', 'candidate', 'column'], 'c'],
		[['opportunity', 'organization', 'organisation', 'option'], 'o'],
		['member', 'm'],
		[['record', 'result', 'row'], 'r'],
		[['stage', 'section'], 's'],
		['item', 'i'],
		[['entry', 'event', 'edge'], 'e'],
		[['value', 'intent'], 'v'],
		['group', 'g'],
		['file', 'f'],
		['problem', 'p'],
		['node', 'n'],
		['link', 'l'],
		['line', 'l'],
		['data', 'd'],
	],
	false,
);
export const CALLBACK_METHODS = new Set([
	'addEventListener',
	'every',
	'filter',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'flatMap',
	'forEach',
	'forEachChild',
	'map',
	'reduce',
	'reduceRight',
	'some',
	'sort',
]);
export const PROTECTED_IDENTIFIERS = new Set([
	'GET',
	'HEAD',
	'OPTIONS',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'default',
	'FormData',
	'Headers',
	'NextRequest',
	'NextResponse',
	'Request',
	'Response',
	'URL',
	'URLSearchParams',
	'WebSocket',
	'CarouselContextProps',
	'ChartContextProps',
	'FormSelectOptionProps',
	'SidebarContextProps',
]);
export const PROTECTED_PATH_PARTS = new Set(['node_modules', '.next', 'out', 'build', 'coverage', 'src/components/ui']);
export const PROTECTED_FILENAMES = new Set(['page.tsx', 'page.ts', 'layout.tsx', 'layout.ts', 'route.ts', 'route.tsx', 'error.tsx', 'loading.tsx', 'not-found.tsx', 'index.ts', 'index.tsx']);
export const CODE_EXTS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
export type NamingFinding = { file: string; name: string; suggestion: string; severity: 'error' | 'warning'; start: number };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param groups
 * @param pluralReplacements
 *
 * @return
 */
function replacementMap(groups: readonly ReplacementGroup[], pluralReplacements = true): Readonly<Record<string, string>> {
	const explicit = new Map(groups.flatMap(([n, r]) => (typeof n === 'string' ? [n] : n).map((n) => [n, r] as const)));
	const plural = (word: string): string => {
		if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
		if (/(?:s|x|z|ch|sh)$/i.test(word)) return word.length <= 4 ? word : `${word}es`;
		return `${word}s`;
	};
	const entries = [...explicit];
	for (const [name, replacement] of explicit) {
		const pluralName = plural(name);
		if (!explicit.has(pluralName)) entries.push([pluralName, pluralReplacements ? plural(replacement) : replacement]);
	}
	return Object.freeze(Object.fromEntries(entries));
}

/**
 *
 * @param name
 *
 * @return
 */
export function identifierTokens(name: string): string[] {
	return name
		.split(/[_-]/)
		.flatMap((p) => p.match(/[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/g) ?? [p])
		.filter(Boolean);
}

/**
 *
 * @param original
 * @param tokens
 *
 * @return
 */
function renderIdentifier(original: string, tokens: string[]): string {
	if (/^[A-Z][A-Z0-9_]*$/.test(original)) return tokens.join(original.includes('_') ? '_' : '').toUpperCase();
	if (original.includes('_')) return tokens.join('_');
	if (original.includes('-')) return tokens.join('-');
	if (/^[A-Z]/.test(original)) return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
	return tokens.map((t, i) => (i === 0 ? t.toLowerCase() : t.charAt(0).toUpperCase() + t.slice(1))).join('');
}

/**
 *
 * @param original
 * @param replacement
 *
 * @return
 */
function tokenCase(original: string, replacement: string): string {
	if (original === original.toUpperCase()) return replacement.toUpperCase();
	if (original.charAt(0) === original.charAt(0).toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
	return replacement;
}

/**
 *
 * @param name
 * @param reserved
 *
 * @return
 */
export function callbackAlias(name: string, reserved: string[] = []): string {
	const preferred = CALLBACK_ALIASES[name.toLowerCase() as keyof typeof CALLBACK_ALIASES] ?? identifierTokens(name)[0]?.charAt(0).toLowerCase() ?? 'v';
	if (!reserved.includes(preferred)) return preferred;
	for (const fallback of ['v', 'r', 'x', 'd', 'n', 'e', 'c', 's']) if (!reserved.includes(fallback)) return fallback;
	return preferred;
}

/**
 *
 * @param name
 * @param kind
 *
 * @return
 */
export function renameId(name: string, kind: RenameKind = {}): string {
	if (PROTECTED_IDENTIFIERS.has(name) || name === '_') return name;
	if (kind.numericIndex && name === 'index') return callbackAlias('item', kind.reserved);
	if (kind.callback) return callbackAlias(name, kind.reserved);
	const tokens = identifierTokens(name);
	if (!tokens.some((t) => Object.hasOwn(IDENTIFIER_REPLACEMENTS, t.toLowerCase()) || Object.hasOwn(PREFIX_REPLACEMENTS, t.toLowerCase()))) return name;
	return renderIdentifier(
		name,
		tokens.map((t, i) => {
			const lower = t.toLowerCase();
			const replacement =
				i === 0 && Object.hasOwn(PREFIX_REPLACEMENTS, lower)
					? PREFIX_REPLACEMENTS[lower as keyof typeof PREFIX_REPLACEMENTS]
					: (IDENTIFIER_REPLACEMENTS[lower as keyof typeof IDENTIFIER_REPLACEMENTS] ?? t);
			return replacement === t ? t : tokenCase(t, replacement);
		}),
	);
}

/**
 *
 * @param n
 *
 * @return
 */
function callbackKind(n: ts.Identifier): RenameKind | undefined {
	const param = ts.findAncestor(n, ts.isParameter);
	if (!param) return undefined;
	const callback = ts.findAncestor(
		param,
		(n): n is ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n),
	);
	if (!callback) return undefined;
	const call = callback.parent;
	const isCollectionCallback =
		!ts.isFunctionDeclaration(callback) &&
		ts.isCallExpression(call) &&
		call.arguments.includes(callback as ts.Expression) &&
		ts.isPropertyAccessExpression(call.expression) &&
		CALLBACK_METHODS.has(call.expression.name.text);
	let isNamedCallback = false;
	if (ts.isFunctionDeclaration(callback) && callback.name) {
		const scan = (n: ts.Node): void => {
			if (isNamedCallback) return;
			const jsxAttr = ts.isJsxAttribute(n) ? n : undefined;
			const jsxExpr = jsxAttr?.initializer && ts.isJsxExpression(jsxAttr.initializer) ? jsxAttr.initializer.expression : undefined;
			const isJsxHandler =
				!!jsxAttr &&
				ts.isIdentifier(jsxAttr.name) &&
				/^on[A-Z]/.test(jsxAttr.name.text) &&
				!!jsxExpr &&
				(() => {
					let refs = false;
					const findRef = (c: ts.Node): void => {
						if (refs) return;
						if (ts.isIdentifier(c) && c.text === callback.name?.text) {
							refs = true;
							return;
						}
						ts.forEachChild(c, findRef);
					};
					findRef(jsxExpr);
					return refs;
				})();
			if (
				ts.isCallExpression(n) &&
				ts.isPropertyAccessExpression(n.expression) &&
				CALLBACK_METHODS.has(n.expression.name.text) &&
				n.arguments.some((a) => ts.isIdentifier(a) && a.text === callback.name?.text)
			) {
				isNamedCallback = true;
				return;
			}
			if (isJsxHandler) {
				isNamedCallback = true;
				return;
			}
			ts.forEachChild(n, scan);
		};
		scan(callback.parent);
	}
	const isJsxCallback = ts.isJsxExpression(call) && call.expression === callback && ts.isJsxAttribute(call.parent);
	if (!isCollectionCallback && !isNamedCallback && !isJsxCallback) return undefined;
	const declarations: ts.Identifier[] = [];
	const collectBinding = (name: ts.BindingName): void => {
		if (ts.isIdentifier(name)) declarations.push(name);
		else for (const element of name.elements) if (ts.isBindingElement(element)) collectBinding(element.name);
	};
	for (const p of callback.parameters) collectBinding(p.name);
	const declarationNames = new Set(declarations.map((d) => d.text));
	const reserved = new Set<string>();
	const collect = (child: ts.Node): void => {
		if (ts.isIdentifier(child) && !declarationNames.has(child.text)) reserved.add(child.text);
		ts.forEachChild(child, collect);
	};
	collect(callback);
	for (const declaration of declarations) {
		if (declaration === n) return { callback: true, numericIndex: callback.parameters.indexOf(param) === 1 && n.text === 'index', reserved: [...reserved] };
		const declarationParam = ts.findAncestor(declaration, ts.isParameter);
		reserved.add(
			renameId(declaration.text, {
				callback: true,
				numericIndex: !!declarationParam && callback.parameters.indexOf(declarationParam) === 1 && declaration.text === 'index',
				reserved: [...reserved],
			}),
		);
	}
	return undefined;
}

/**
 * Returns whether a declaration belongs to a configured collection callback.
 *
 * @param node
 *
 * @return
 */
export function isCallbackDeclaration(node: ts.Identifier): boolean {
	return callbackKind(node) !== undefined;
}

/**
 * Returns the context-aware concise suggestion for one repository-owned declaration.
 *
 * @param n
 *
 * @return
 */
export function renameDeclaration(n: ts.Identifier): string {
	return renameId(n.text, callbackKind(n));
}

/**
 *
 * @param name
 *
 * @return
 */
export function hasPrefixReplacement(name: string): boolean {
	return Object.hasOwn(PREFIX_REPLACEMENTS, identifierTokens(name)[0]?.toLowerCase() ?? '');
}

/**
 *
 * @param fileName
 *
 * @return
 */
export function isProtectedPath(fileName: string): boolean {
	const norm = fileName.replaceAll('\\', '/');
	return norm.endsWith('.d.ts') || [...PROTECTED_PATH_PARTS].some((p) => (p.includes('/') ? norm === p || norm.startsWith(`${p}/`) || norm.includes(`/${p}/`) : norm.split('/').includes(p)));
}

/**
 *
 * @param fileName
 *
 * @return
 */
export function isProtectedFilename(fileName: string): boolean {
	return PROTECTED_FILENAMES.has(fileName.split(/[\\/]/).at(-1) ?? fileName);
}

/**
 *
 * @param name
 * @param kind
 *
 * @return
 */
export function isApprovedId(name: string, kind: RenameKind = {}): boolean {
	return renameId(name, kind) === name;
}

/**
 * Returns whether an identifier declares a repository-owned symbol safe to rename with all references.
 *
 * @param n
 *
 * @return
 */
export function isRenamableDeclaration(n: ts.Identifier): boolean {
	const p = n.parent;
	if (ts.isParameter(p) && p.modifiers?.some((m) => [ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(m.kind)))
		return false;
	const declaration = ts.findAncestor(p, (a): a is ts.VariableDeclaration | ts.ParameterDeclaration => ts.isVariableDeclaration(a) || ts.isParameter(a));
	const varStatement =
		declaration && ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent) && ts.isVariableStatement(declaration.parent.parent)
			? declaration.parent.parent
			: undefined;
	return (
		(ts.isVariableDeclaration(p) && p.name === n && !varStatement?.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isParameter(p) && p.name === n) ||
		(ts.isBindingElement(p) && p.name === n && !!declaration && !varStatement?.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionDeclaration(p) && p.name === n && !p.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionExpression(p) && p.name === n) ||
		(ts.isClassDeclaration(p) && p.name === n && !p.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isClassExpression(p) && p.name === n) ||
		(ts.isInterfaceDeclaration(p) && p.name === n && !p.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isTypeAliasDeclaration(p) && p.name === n && !p.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
	);
}

/**
 * Returns the function or source-file scope that owns a declaration.
 *
 * @param n
 *
 * @return
 */
export function declarationScope(n: ts.Identifier): ts.Node {
	let scope: ts.Node = n.parent;
	while (!ts.isSourceFile(scope)) {
		if (
			ts.isArrowFunction(scope) ||
			ts.isFunctionDeclaration(scope) ||
			ts.isFunctionExpression(scope) ||
			ts.isMethodDeclaration(scope) ||
			ts.isConstructorDeclaration(scope) ||
			ts.isGetAccessorDeclaration(scope) ||
			ts.isSetAccessorDeclaration(scope)
		)
			return scope;
		scope = scope.parent;
	}
	return scope;
}

/**
 * Reports concise-name drift without mutating the consumer repository.
 *
 * @param cfg
 *
 * @return
 */
export function namingFindings(cfg: QualityCfg): NamingFinding[] {
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(cfg.protectedIdentifiers ?? [])]);
	const findings: NamingFinding[] = [];
	for (const f of srcFiles(cfg)) {
		if (isProtectedPath(displayPath(cfg, f))) continue;
		const file = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
		const exportedNames = new Set(
			file.statements.flatMap((s) => (ts.isExportDeclaration(s) && s.exportClause && ts.isNamedExports(s.exportClause) ? s.exportClause.elements.map((e) => (e.propertyName ?? e.name).text) : [])),
		);
		const safetyByScope = new Map<ts.Node, { declared: Set<string>; proposals: Map<string, number> }>();
		const declaredNames = new Set<string>();
		const collect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n)) {
				const scope = declarationScope(n);
				const safety = safetyByScope.get(scope) ?? { declared: new Set<string>(), proposals: new Map<string, number>() };
				safety.declared.add(n.text);
				declaredNames.add(n.text);
				const suggestion = renameDeclaration(n);
				if (!n.text.startsWith('_') && suggestion !== n.text && !isCallbackDeclaration(n)) safety.proposals.set(suggestion, (safety.proposals.get(suggestion) ?? 0) + 1);
				safetyByScope.set(scope, safety);
			}
			ts.forEachChild(n, collect);
		};
		collect(file);
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n) && !n.text.startsWith('_') && !protectedNames.has(n.text) && !exportedNames.has(n.text)) {
				const suggestion = renameDeclaration(n);
				const safety = safetyByScope.get(declarationScope(n));
				if (!isCallbackDeclaration(n) && (safety?.declared.has(suggestion) || declaredNames.has(suggestion) || (safety?.proposals.get(suggestion) ?? 0) > 1)) return;
				if (suggestion !== n.text) findings.push({ file: displayPath(cfg, f), name: n.text, suggestion, severity: hasPrefixReplacement(n.text) ? 'warning' : 'error', start: n.getStart(file) });
			}
			ts.forEachChild(n, inspect);
		};
		inspect(file);
	}
	return findings;
}
