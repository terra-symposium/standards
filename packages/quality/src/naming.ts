/**
 * packages/quality/src/naming.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
import { displayPath, sourceFiles } from './files.js';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// TYPES
import type { QualityConfig } from './config.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/
type ReplacementGroup = readonly [names: string | readonly string[], replacement: string];
type RenameKind = { numericIndex?: boolean; callback?: boolean; reserved?: string[] };
export const IDENTIFIER_REPLACEMENTS = replacementMap([
	['current', 'curr'],
	['context', 'ctx'],
	['contexts', 'ctxs'],
	[['config', 'configuration'], 'cfg'],
	['configurations', 'cfgs'],
	['error', 'err'],
	['errors', 'errs'],
	[['format', 'formatted', 'formatting'], 'fmt'],
	['formats', 'fmts'],
	['formatter', 'fmt'],
	['formatters', 'fmts'],
	['image', 'img'],
	['images', 'imgs'],
	[['initialise', 'initialised', 'initialises', 'initialising', 'initialisation', 'initialize', 'initialized', 'initializes', 'initializing', 'initialization'], 'init'],
	[['initialiser', 'initializer'], 'init'],
	[['initialisers', 'initializers', 'initialisations', 'initializations'], 'inits'],
	['language', 'lang'],
	['languages', 'langs'],
	['member', 'mem'],
	['members', 'mems'],
	[['organization', 'organisation'], 'org'],
	[['organizations', 'organisations'], 'orgs'],
	['option', 'opt'],
	['options', 'opts'],
	['parameter', 'param'],
	['parameters', 'params'],
	['previous', 'prev'],
	['record', 'rec'],
	['records', 'recs'],
	['repository', 'repo'],
	['repositories', 'repos'],
	['request', 'req'],
	['requests', 'reqs'],
	['response', 'res'],
	['source', 'src'],
	['target', 'tgt'],
	['value', 'val'],
	['values', 'vals'],
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
export const CALLBACK_ALIASES = replacementMap([
	[['workshop', 'workshops'], 'w'],
	[['customer', 'customers', 'candidate', 'candidates', 'column', 'columns'], 'c'],
	[['opportunity', 'opportunities', 'organization', 'organisation', 'organizations', 'organisations', 'option', 'options'], 'o'],
	[['member', 'members'], 'm'],
	[['record', 'records', 'result', 'results', 'row', 'rows'], 'r'],
	[['stage', 'stages', 'section', 'sections'], 's'],
	[['item', 'items'], 'i'],
	[['entry', 'entries', 'event', 'events', 'edge', 'edges'], 'e'],
	[['value', 'values', 'intent', 'intents'], 'v'],
	[['group', 'groups'], 'g'],
	[['file', 'files'], 'f'],
	[['problem', 'problems'], 'p'],
	[['node', 'nodes'], 'n'],
	[['link', 'links'], 'l'],
	['data', 'd'],
]);
export const CALLBACK_METHODS = new Set(['map', 'flatMap', 'forEachChild']);
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
export const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
export type NamingFinding = { file: string; name: string; suggestion: string; severity: 'error' | 'warning'; start: number };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/
/**
 *
 * @param groups
 * @returns
 */
function replacementMap(groups: readonly ReplacementGroup[]): Readonly<Record<string, string>> {
	return Object.freeze(Object.fromEntries(groups.flatMap(([n, r]) => (typeof n === 'string' ? [n] : n).map((n) => [n, r]))));
}

/**
 *
 * @param name
 * @returns
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
 * @returns
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
 * @returns
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
 * @returns
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
 * @returns
 */
export function renameIdentifier(name: string, kind: RenameKind = {}): string {
	if (PROTECTED_IDENTIFIERS.has(name) || name === '_') return name;
	if (kind.numericIndex && name === 'index') return callbackAlias('item', kind.reserved);
	if (kind.callback) return callbackAlias(name, kind.reserved);
	const tokens = identifierTokens(name);
	if (!tokens.some((token) => Object.hasOwn(IDENTIFIER_REPLACEMENTS, token.toLowerCase()) || Object.hasOwn(PREFIX_REPLACEMENTS, token.toLowerCase()))) return name;
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
 * @param node
 * @returns
 */
function callbackKind(node: ts.Identifier): RenameKind | undefined {
	const param = ts.findAncestor(node, ts.isParameter);
	if (!param || (!ts.isArrowFunction(param.parent) && !ts.isFunctionExpression(param.parent))) return undefined;
	const callback = param.parent;
	const call = callback.parent;
	if (!ts.isCallExpression(call) || !call.arguments.includes(callback)) return undefined;
	const expression = call.expression;
	if (!ts.isPropertyAccessExpression(expression) || !CALLBACK_METHODS.has(expression.name.text)) return undefined;
	const declarations: ts.Identifier[] = [];
	const collectBinding = (name: ts.BindingName): void => {
		if (ts.isIdentifier(name)) declarations.push(name);
		else for (const element of name.elements) if (ts.isBindingElement(element)) collectBinding(element.name);
	};
	for (const parameter of callback.parameters) collectBinding(parameter.name);
	const declarationNames = new Set(declarations.map((d) => d.text));
	const reserved = new Set<string>();
	const collect = (child: ts.Node): void => {
		if (ts.isIdentifier(child) && !declarationNames.has(child.text)) reserved.add(child.text);
		ts.forEachChild(child, collect);
	};
	collect(callback);
	for (const declaration of declarations) {
		if (declaration === node) return { callback: true, numericIndex: callback.parameters.indexOf(param) === 1 && node.text === 'index', reserved: [...reserved] };
		const declarationParam = ts.findAncestor(declaration, ts.isParameter);
		reserved.add(
			renameIdentifier(declaration.text, {
				callback: true,
				numericIndex: !!declarationParam && callback.parameters.indexOf(declarationParam) === 1 && declaration.text === 'index',
				reserved: [...reserved],
			}),
		);
	}
	return undefined;
}

/** Returns whether a declaration belongs to a configured collection callback. */
export function isCallbackDeclaration(node: ts.Identifier): boolean {
	return callbackKind(node) !== undefined;
}

/** Returns the context-aware concise suggestion for one repository-owned declaration. */
export function renameDeclaration(node: ts.Identifier): string {
	return renameIdentifier(node.text, callbackKind(node));
}

/**
 *
 * @param name
 * @returns
 */
export function hasPrefixReplacement(name: string): boolean {
	return Object.hasOwn(PREFIX_REPLACEMENTS, identifierTokens(name)[0]?.toLowerCase() ?? '');
}

/**
 *
 * @param fileName
 * @returns
 */
export function isProtectedPath(fileName: string): boolean {
	const norm = fileName.replaceAll('\\', '/');
	return (
		norm.endsWith('.d.ts') ||
		[...PROTECTED_PATH_PARTS].some((part) => (part.includes('/') ? norm === part || norm.startsWith(`${part}/`) || norm.includes(`/${part}/`) : norm.split('/').includes(part)))
	);
}

/**
 *
 * @param fileName
 * @returns
 */
export function isProtectedFilename(fileName: string): boolean {
	return PROTECTED_FILENAMES.has(fileName.split(/[\\/]/).at(-1) ?? fileName);
}

/**
 *
 * @param name
 * @param kind
 * @returns
 */
export function isApprovedIdentifier(name: string, kind: RenameKind = {}): boolean {
	return renameIdentifier(name, kind) === name;
}

/** Returns whether an identifier declares a repository-owned symbol safe to rename with all references. */
export function isRenamableDeclaration(node: ts.Identifier): boolean {
	const parent = node.parent;
	const declaration = ts.findAncestor(parent, (ancestor): ancestor is ts.VariableDeclaration | ts.ParameterDeclaration => ts.isVariableDeclaration(ancestor) || ts.isParameter(ancestor));
	const variableStatement =
		declaration && ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent) && ts.isVariableStatement(declaration.parent.parent)
			? declaration.parent.parent
			: undefined;
	return (
		(ts.isVariableDeclaration(parent) && parent.name === node && !variableStatement?.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isParameter(parent) && parent.name === node) ||
		(ts.isBindingElement(parent) && parent.name === node && !!declaration && !variableStatement?.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionDeclaration(parent) && parent.name === node && !parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionExpression(parent) && parent.name === node) ||
		(ts.isClassDeclaration(parent) && parent.name === node && !parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isClassExpression(parent) && parent.name === node) ||
		(ts.isInterfaceDeclaration(parent) && parent.name === node && !parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isTypeAliasDeclaration(parent) && parent.name === node && !parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
	);
}

/** Reports concise-name drift without mutating the consumer repository. */
export function namingFindings(cfg: QualityConfig): NamingFinding[] {
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(cfg.protectedIdentifiers ?? [])]);
	const findings: NamingFinding[] = [];
	for (const fileName of sourceFiles(cfg)) {
		if (isProtectedPath(displayPath(cfg, fileName)) || isProtectedFilename(fileName)) continue;
		const file = ts.createSourceFile(fileName, readFileSync(fileName, 'utf8'), ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
		const exportedNames = new Set(
			file.statements.flatMap((s) => (ts.isExportDeclaration(s) && s.exportClause && ts.isNamedExports(s.exportClause) ? s.exportClause.elements.map((e) => (e.propertyName ?? e.name).text) : [])),
		);
		const declaredNames = new Set<string>();
		const proposalCounts = new Map<string, number>();
		const collect = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && isRenamableDeclaration(node)) {
				declaredNames.add(node.text);
				const suggestion = renameDeclaration(node);
				if (!node.text.startsWith('_') && suggestion !== node.text && !isCallbackDeclaration(node)) proposalCounts.set(suggestion, (proposalCounts.get(suggestion) ?? 0) + 1);
			}
			ts.forEachChild(node, collect);
		};
		collect(file);
		const inspect = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && isRenamableDeclaration(node) && !node.text.startsWith('_') && !protectedNames.has(node.text) && !exportedNames.has(node.text)) {
				const suggestion = renameDeclaration(node);
				if (!isCallbackDeclaration(node) && (declaredNames.has(suggestion) || (proposalCounts.get(suggestion) ?? 0) > 1)) return;
				if (suggestion !== node.text)
					findings.push({ file: displayPath(cfg, fileName), name: node.text, suggestion, severity: hasPrefixReplacement(node.text) ? 'warning' : 'error', start: node.getStart(file) });
			}
			ts.forEachChild(node, inspect);
		};
		inspect(file);
	}
	return findings;
}
