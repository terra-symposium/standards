/**
 * packages/quality/src/naming.ts
 * Renames identifiers according to the configured replacement rules.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { readFileSync, writeFileSync } from 'node:fs';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const A_Z_REGEX = /^[A-Z]/;
/** Optional naming rules that adapt replacements for indexes, callbacks, and reserved words. */
type RenameKind = { numericIndex?: boolean; callback?: boolean; reserved?: string[] };
export const IDENTIFIER_REPLACEMENTS = replacementMap([
	[['administrator', 'administration'], 'admin'],
	['attribute', 'attr'],
	['category', 'cat'],
	['intelligence', 'intel'],
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
/** A proposed identifier rename with its source location and severity. */
export type NamingFinding = { file: string; name: string; suggestion: string; severity: 'error' | 'warning'; start: number };

/*//////////////////////////////////////////////////
ALIASES
//////////////////////////////////////////////////*/

/** A declaration that only gives an existing symbol a second local name. */
export type AliasFinding = { file: string; line: number; kind: 'const' | 'type'; name: string; replacement: string };
const aliasTgt = (n: ts.Expression): ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression | undefined =>
	ts.isIdentifier(n) || ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) ? n : undefined;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Builds a frozen lookup table of long identifier words and their concise replacements.
 *
 * @param groups Replacement groups where each left-hand word maps to one replacement.
 * @param pluralReplacements Whether inferred plural keys should receive plural replacements.
 *
 * @return Immutable replacement map including supported plural forms.
 */
function replacementMap(groups: readonly [names: string | readonly string[], replacement: string][], pluralReplacements = true): Readonly<Record<string, string>> {
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
 * Splits an identifier into words while preserving acronym and numeric boundaries.
 *
 * @param name Identifier to tokenize.
 *
 * @return Identifier word tokens in source order.
 */
export function identifierTokens(name: string): string[] {
	return name
		.split(/[_-]/)
		.flatMap((p) => p.match(/[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/g) ?? [p])
		.filter(Boolean);
}

/**
 * Reassembles replacement tokens using the original identifier's casing and separators.
 *
 * @param original Identifier whose formatting should be preserved.
 * @param tokens Replacement tokens to render.
 *
 * @return The replacement identifier in the original naming style.
 */
function renderIdentifier(original: string, tokens: string[]): string {
	if (/^[A-Z][A-Z0-9_]*$/.test(original)) return tokens.join(original.includes('_') ? '_' : '').toUpperCase();
	if (original.includes('_')) return tokens.join('_');
	if (original.includes('-')) return tokens.join('-');
	if (A_Z_REGEX.test(original)) return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
	return tokens.map((t, i) => (i === 0 ? t.toLowerCase() : t.charAt(0).toUpperCase() + t.slice(1))).join('');
}

/**
 * Applies the original token's uppercase, PascalCase, or lowercase style to a replacement word.
 *
 * @param original Original identifier token.
 * @param replacement Concise replacement token.
 *
 * @return Replacement token with casing matching the original.
 */
function tokenCase(original: string, replacement: string): string {
	if (original === original.toUpperCase()) return replacement.toUpperCase();
	if (original.charAt(0) === original.charAt(0).toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
	return replacement;
}

/**
 * Chooses the preferred one-letter alias for a callback parameter without colliding with local names.
 *
 * @param name Existing callback parameter name.
 * @param reserved Names already used in the callback scope.
 *
 * @return A concise available callback alias.
 */
export function callbackAlias(name: string, reserved: string[] = []): string {
	const preferred = CALLBACK_ALIASES[name.toLowerCase() as keyof typeof CALLBACK_ALIASES] ?? identifierTokens(name)[0]?.charAt(0).toLowerCase() ?? 'v';
	if (!reserved.includes(preferred)) return preferred;
	for (const fallback of ['v', 'r', 'x', 'd', 'n', 'e', 'c', 's']) if (!reserved.includes(fallback)) return fallback;
	return preferred;
}

/**
 * Produces the configured concise form of an identifier, including callback and numeric-index aliases.
 *
 * @param name Identifier to shorten.
 * @param kind Context flags controlling callback, index, and reserved-name handling.
 *
 * @return Concise identifier, or the original name when no safe replacement applies.
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
 * Determines whether an identifier parameter belongs to an inline or named callback.
 *
 * @param n Parameter identifier to classify.
 *
 * @return Callback rename context when the parameter is safely concise-able; otherwise `undefined`.
 */
function callbackKind(n: ts.Identifier): RenameKind | undefined {
	// JSX component bindings and explicit destructuring aliases encode syntax or
	// public property names; shortening them can produce invalid JSX or change
	// the inferred shape of a discriminated union.
	if (A_Z_REGEX.test(n.text) || (ts.isBindingElement(n.parent) && n.parent.propertyName)) return undefined;
	const param = ts.findAncestor(n, ts.isParameter);
	if (!param) return undefined;
	const callback = ts.findAncestor(
		param,
		(n): n is ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n),
	);
	if (!callback) return undefined;
	const isInlineCallback = !ts.isFunctionDeclaration(callback) && ts.isCallExpression(callback.parent) && callback.parent.arguments.includes(callback as ts.Expression);
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
	const isJsxCallback = ts.isJsxExpression(callback.parent) && callback.parent.expression === callback && ts.isJsxAttribute(callback.parent.parent);
	if (!isInlineCallback && !isNamedCallback && !isJsxCallback) return undefined;
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
			renameId(declaration.text, { callback: true, numericIndex: !!declarationParam && callback.parameters.indexOf(declarationParam) === 1 && declaration.text === 'index', reserved: [...reserved] }),
		);
	}
	return undefined;
}

/**
 * Returns whether a declaration belongs to a supported callback.
 *
 * @param node Identifier declaration to inspect.
 *
 * @return `true` when the declaration is a supported callback parameter.
 */
export function isCallbackDeclaration(node: ts.Identifier): boolean {
	return callbackKind(node) !== undefined;
}

/**
 * Returns the context-aware concise suggestion for one repository-owned declaration.
 *
 * @param n Identifier declaration whose context determines the suggestion.
 *
 * @return Concise name appropriate for the declaration's scope and callback role.
 */
export function renameDeclaration(n: ts.Identifier): string {
	return renameId(n.text, callbackKind(n));
}

/**
 * Checks whether an identifier starts with a configured prefix replacement.
 *
 * @param name Identifier to inspect.
 *
 * @return `true` when its first token has a configured concise prefix.
 */
export function hasPrefixReplacement(name: string): boolean {
	return Object.hasOwn(PREFIX_REPLACEMENTS, identifierTokens(name)[0]?.toLowerCase() ?? '');
}

/**
 * Checks whether a path is protected from symbol renaming because it is generated or framework-owned.
 *
 * @param fileName Path to inspect.
 *
 * @return `true` for declaration files and configured protected path segments.
 */
export function isProtectedPath(fileName: string): boolean {
	const norm = fileName.replaceAll('\\', '/');
	return (
		norm.endsWith('.d.ts') ||
		[...PROTECTED_PATH_PARTS].some((p) => (p.includes('/') ? norm === p || norm.endsWith(`/${p}`) || norm.startsWith(`${p}/`) || norm.includes(`/${p}/`) : norm.split('/').includes(p)))
	);
}

/**
 * Checks whether a filename is a framework convention whose declarations must retain their names.
 *
 * @param fileName Path or basename to inspect.
 *
 * @return `true` when the basename is a protected route or component filename.
 */
export function isProtectedFilename(fileName: string): boolean {
	return PROTECTED_FILENAMES.has(fileName.split(/[\\/]/).at(-1) ?? fileName);
}

/**
 * Reports whether an identifier already satisfies the configured concise-name rules.
 *
 * @param name Identifier to validate.
 * @param kind Context flags used when the identifier is a callback or index parameter.
 *
 * @return `true` when renaming would produce the same identifier.
 */
export function isApprovedId(name: string, kind: RenameKind = {}): boolean {
	return renameId(name, kind) === name;
}

/**
 * Returns whether an identifier declares a repository-owned symbol safe to rename with all references.
 *
 * @param n Identifier declaration to classify.
 *
 * @return `true` when all references can be updated as a repository-local rename.
 */
export function isRenamableDeclaration(n: ts.Identifier): boolean {
	if (
		ts.isParameter(n.parent) &&
		n.parent.modifiers?.some((m) => [ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(m.kind))
	)
		return false;
	const declaration = ts.findAncestor(n.parent, (a): a is ts.VariableDeclaration | ts.ParameterDeclaration => ts.isVariableDeclaration(a) || ts.isParameter(a));
	const varStatement =
		declaration && ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent) && ts.isVariableStatement(declaration.parent.parent)
			? declaration.parent.parent
			: undefined;
	return (
		(ts.isVariableDeclaration(n.parent) && n.parent.name === n && !varStatement?.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isParameter(n.parent) && n.parent.name === n) ||
		(ts.isBindingElement(n.parent) && n.parent.name === n && !!declaration && !varStatement?.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionExpression(n.parent) && n.parent.name === n) ||
		(ts.isClassDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isClassExpression(n.parent) && n.parent.name === n) ||
		(ts.isInterfaceDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isTypeAliasDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
	);
}

/**
 * Returns the function or source-file scope that owns a declaration.
 *
 * @param n Identifier whose owning function or source-file scope is required.
 *
 * @return The nearest function-like scope, or the source file when no function owns it.
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
 * @param cfg Quality configuration defining source scope and naming protections.
 * @param analysis Optional shared program and source cache for the current quality run.
 *
 * @return Concise-name findings for declarations that can be renamed safely.
 */
export function namingFindings(cfg: QualityCfg, analysis?: QualityAnalysis): NamingFinding[] {
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(cfg.protectedIdentifiers ?? [])]);
	const findings: NamingFinding[] = [];
	for (const f of analysis?.files ?? srcFiles(cfg)) {
		if (isProtectedPath(displayPath(cfg, f))) continue;
		const file = analysis?.sources.get(f) ?? ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
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

/**
 * Checks whether a symbol name appears in another source file's text.
 *
 * @param files Source files to scan.
 * @param srcTexts Cached source text keyed by absolute path.
 * @param src File being excluded from the search.
 * @param name Symbol name to search for as a complete word.
 *
 * @return `true` when another file references the name textually.
 */
function externallyReferenced(files: string[], srcTexts: Map<string, string>, src: string, name: string): boolean {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(`\\b${escaped}\\b`);
	return files.some((f) => f !== src && pattern.test(srcTexts.get(f) ?? ''));
}

/**
 * Finds and optionally removes declarations that only rename another symbol.
 *
 * @param cfg Quality configuration defining the source scope and protected identifiers.
 * @param analysisOrFix Shared analysis context, or the legacy boolean autofix flag.
 * @param legacyFix Autofix flag used when an analysis context is supplied.
 *
 * @return Alias declarations that can be removed, whether or not autofix is enabled.
 */
export function aliasFindings(cfg: QualityCfg, analysisOrFix: QualityAnalysis | boolean = false, legacyFix = false): AliasFinding[] {
	const analysis = typeof analysisOrFix === 'object' ? analysisOrFix : undefined;
	const fix = typeof analysisOrFix === 'boolean' ? analysisOrFix : legacyFix;
	const files = (analysis?.files ?? srcFiles(cfg)).filter((f) => /\.(?:c|m)?(?:js|ts)x?$/.test(f));
	const srcTexts = analysis?.texts ?? new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
	const program =
		analysis?.program ??
		ts.createProgram(files, {
			allowJs: true,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		});
	const checker = analysis?.checker ?? program.getTypeChecker();
	const exportedSymbols = new Set<ts.Symbol>();
	const exportedNames = new Set<string>();
	for (const file of program.getSourceFiles()) {
		const module = checker.getSymbolAtLocation(file);
		if (module)
			for (const symbol of checker.getExportsOfModule(module)) {
				exportedNames.add(symbol.name);
				exportedSymbols.add(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
			}
		for (const statement of file.statements) {
			if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
			for (const specifier of statement.exportClause.elements) exportedNames.add(specifier.name.text);
		}
	}
	const findings: AliasFinding[] = [];
	for (const src of program.getSourceFiles()) {
		if (!files.includes(src.fileName)) continue;
		const aliases: Array<{ statement: ts.Statement; name: ts.Identifier; symbol: ts.Symbol; replacement: string; kind: 'const' | 'type' }> = [];
		const inspect = (node: ts.Node): void => {
			if (
				ts.isVariableStatement(node) &&
				(node.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
				node.declarationList.declarations.length === 1 &&
				ts.isIdentifier(node.declarationList.declarations[0].name)
			) {
				const declaration = node.declarationList.declarations[0];
				const name = declaration.name as ts.Identifier;
				const tgt = declaration.initializer && aliasTgt(declaration.initializer);
				const symbol = tgt && checker.getSymbolAtLocation(name);
				const targetSymbol = tgt
					? (checker.getSymbolAtLocation(tgt) ??
						(ts.isElementAccessExpression(tgt) && ts.isStringLiteral(tgt.argumentExpression)
							? checker.getPropertyOfType(checker.getTypeAtLocation(tgt.expression), tgt.argumentExpression.text)
							: undefined))
					: undefined;
				if (
					tgt &&
					symbol &&
					targetSymbol &&
					symbol !== targetSymbol &&
					!tgt.getText(src).includes('?.') &&
					!exportedSymbols.has(symbol) &&
					!exportedNames.has(name.text) &&
					!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
				)
					aliases.push({ statement: node, name, symbol, replacement: tgt.getText(src), kind: 'const' });
			}
			if (ts.isTypeAliasDeclaration(node) && node.typeParameters === undefined && ts.isTypeReferenceNode(node.type) && node.type.typeArguments === undefined) {
				const symbol = checker.getSymbolAtLocation(node.name);
				const targetSymbol = checker.getSymbolAtLocation(node.type.typeName);
				if (
					symbol &&
					targetSymbol &&
					symbol !== targetSymbol &&
					!exportedSymbols.has(symbol) &&
					!exportedNames.has(node.name.text) &&
					!externallyReferenced(files, srcTexts, src.fileName, node.name.text)
				)
					aliases.push({ statement: node, name: node.name, symbol, replacement: node.type.getText(src), kind: 'type' });
			}
			ts.forEachChild(node, inspect);
		};
		inspect(src);
		if (!aliases.length) continue;
		const edits: Array<{ start: number; end: number; text: string }> = [];
		const symbols = new Map(aliases.map((a) => [a.symbol, a]));
		const visit = (node: ts.Node): void => {
			if (aliases.some((a) => a.statement === node)) return;
			if (ts.isIdentifier(node)) {
				const symbol =
					ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node
						? (checker.getShorthandAssignmentValueSymbol(node.parent) ?? checker.getSymbolAtLocation(node))
						: checker.getSymbolAtLocation(node);
				const alias = symbols.get(symbol as ts.Symbol);
				if (alias && node !== alias.name)
					edits.push({
						start: node.getStart(src),
						end: node.end,
						text: ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node ? `${node.text}: ${alias.replacement}` : alias.replacement,
					});
			}
			ts.forEachChild(node, visit);
		};
		visit(src);
		for (const alias of aliases) {
			findings.push({
				file: displayPath(cfg, src.fileName),
				line: src.getLineAndCharacterOfPosition(alias.name.getStart(src)).line + 1,
				kind: alias.kind,
				name: alias.name.text,
				replacement: alias.replacement,
			});
			edits.push({ start: alias.statement.getFullStart(), end: alias.statement.end, text: '' });
		}
		if (fix) {
			const original = readFileSync(src.fileName, 'utf8');
			const updated = edits.sort((a, b) => b.start - a.start).reduce((t, e) => `${t.slice(0, e.start)}${e.text}${t.slice(e.end)}`, original);
			if (updated !== original) writeFileSync(src.fileName, updated);
		}
	}
	return findings;
}
