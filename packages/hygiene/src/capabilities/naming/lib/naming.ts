/**
 * packages/hygiene/src/capabilities/naming/lib/naming.ts
 * Renames identifiers according to the configured replacement rules.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, hasGeneratedSourceHeader, srcFiles } from '@terra-symposium/hygiene/core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// TYPES
import type { QualityAnalysis, QualityCfg } from '@terra-symposium/hygiene/core';
const R_U_REGEX = /\r$/u;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const C_M_JS_JSX_TS_TSX_U_REGEX = /\.(?:astro|(?:c|m)?(?:js|jsx|ts|tsx))$/u;

const A_Z_REGEX = /^[A-Z]/;
/**
 * Context used when shortening an identifier without changing its meaning.
 */
type RenameKind = { numericIndex?: boolean; callback?: boolean; reserved?: string[]; disabled?: boolean };
export const IDENTIFIER_REPLACEMENTS = replacementMap([
	[['administrator', 'administration'], 'admin'],
	['application', 'app'],
	['argument', 'arg'],
	['attribute', 'attr'],
	['intelligence', 'intel'],
	['image', 'img'],
	['command', 'cmd'],
	['column', 'col'],
	['component', 'comp'],
	['configuration', 'config'],
	[['compare', 'comp'], 'comp'],
	['difference', 'diff'],
	['directory', 'dir'],
	['description', 'desc'],
	['destination', 'dest'],
	['document', 'doc'],
	['element', 'el'],
	['environment', 'env'],
	['error', 'err'],
	['expression', 'expr'],
	['extension', 'ext'],
	[['format', 'formatted', 'formatting', 'formatter'], 'fmt'],
	['function', 'fn'],
	[['generation', 'generate', 'generated', 'generating'], 'gen'],
	[['identify', 'indentifier'], 'id'],
	[['initialise', 'initialised', 'initialises', 'initialising', 'initialisation', 'initialize', 'initialiser', 'initializer', 'initialized', 'initializes', 'initializing', 'initialization'], 'init'],
	['language', 'lang'],
	['maximum', 'max'],
	['message', 'msg'],
	['minimum', 'min'],
	['number', 'num'],
	[['organization', 'organisation'], 'org'],
	['operation', 'op'],
	['original', 'orig'],
	['parameter', 'param'],
	['previous', 'prev'],
	['property', 'prop'],
	['reference', 'ref'],
	['repository', 'repo'],
	['source', 'src'],
	[['temporary', 'temp'], 'tmp'],
	['target', 'tgt'],
]);
export const PREFIX_REPLACEMENTS = replacementMap([
	[['normalise', 'normalised', 'normalises', 'normalize', 'normalized', 'normalizes'], 'norm'],
	[['calculate', 'calculated'], 'calc'],
	[['validate', 'validated', 'validation'], 'valid'],
	[['sanitize', 'sanitized'], 'san'],
]);
export const CALLBACK_ALIASES = replacementMap([['index', 'i']], false);
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
/**
 * A naming issue or concise-name suggestion found in one source file.
 */
export type NamingFinding = { file: string; name: string; suggestion: string; severity: 'error'; start: number; safe?: boolean; reason?: string };

/*//////////////////////////////////////////////////
ALIASES
//////////////////////////////////////////////////*/

/**
 * A declaration that only gives a stable local binding a second local name.
 */
export type AliasFinding = { file: string; line: number; kind: 'const' | 'type'; name: string; replacement: string };
/**
 * Narrows an initializer to a property or element access that can be aliased safely.
 *
 * @param n Expression to inspect.
 *
 * @return Stable identifier or access expression, otherwise `undefined`.
 */
const aliasTgt = (n: ts.Expression): ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression | undefined =>
	ts.isIdentifier(n) || ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) ? n : undefined;

/**
 * Confirms that an identifier keeps the same local binding after its declaration.
 *
 * @param symbol Symbol resolved for the identifier.
 *
 * @return Whether the target remains a stable local binding.
 */
function isStableLocalBinding(symbol: ts.Symbol): boolean {
	if (symbol.flags & ts.SymbolFlags.Alias) return false;
	const declaration = symbol.valueDeclaration;
	const list = (
		declaration && ts.isVariableDeclaration(declaration)
			? declaration
			: declaration && ts.isBindingElement(declaration) && ts.isVariableDeclaration(declaration.parent.parent)
				? declaration.parent.parent
				: undefined
	)?.parent;
	return Boolean(list && ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const) !== 0);
}

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
	const explicit = new Map(groups.flatMap(([n, r]) => (typeof n === 'string' ? [n] : n).map(n => [n, r] as const)));
	/**
	 * Infers the plural spelling used for replacement-map lookup keys.
	 *
	 * @param word Singular replacement key.
	 *
	 * @return Pluralized spelling using the supported English suffix rules.
	 */
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
		.flatMap(p => p.match(/[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/g) ?? [p])
		.filter(Boolean);
}

/**
 * Applies an explicit callback alias when its target is available.
 *
 * @param name Existing callback parameter name.
 * @param reserved Names already used in the callback scope.
 *
 * @return The configured alias, or the original descriptive name.
 */
export function callbackAlias(name: string, reserved: string[] = []): string {
	if (!name || name.startsWith('_')) return name;
	const preferred = CALLBACK_ALIASES[name.toLowerCase() as keyof typeof CALLBACK_ALIASES];
	return preferred && !reserved.includes(preferred) ? preferred : name;
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
	if (kind.disabled || PROTECTED_IDENTIFIERS.has(name) || name === '_') return name;
	if (kind.numericIndex && name === 'index') return callbackAlias(name, kind.reserved);
	if (kind.callback) {
		const alias = callbackAlias(name, kind.reserved);
		if (alias !== name) return alias;
	}
	const tokens = identifierTokens(name);
	if (!tokens.some(t => Object.hasOwn(IDENTIFIER_REPLACEMENTS, t.toLowerCase()) || Object.hasOwn(PREFIX_REPLACEMENTS, t.toLowerCase()))) return name;
	const replacement = (function renderIdentifier(orig: string, tokens: string[]): string {
		if (/^[A-Z][A-Z0-9_]*$/.test(orig)) return tokens.join(orig.includes('_') ? '_' : '').toUpperCase();
		if (orig.includes('_')) return tokens.join('_');
		if (orig.includes('-')) return tokens.join('-');
		if (A_Z_REGEX.test(orig)) return tokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('');
		return tokens.map((t, i) => (i === 0 ? t.toLowerCase() : t.charAt(0).toUpperCase() + t.slice(1))).join('');
	})(
		name,
		tokens.map((t, i) => {
			const lower = t.toLowerCase();
			const replacement =
				i === 0 && Object.hasOwn(PREFIX_REPLACEMENTS, lower)
					? PREFIX_REPLACEMENTS[lower as keyof typeof PREFIX_REPLACEMENTS]
					: Object.hasOwn(IDENTIFIER_REPLACEMENTS, lower)
						? IDENTIFIER_REPLACEMENTS[lower as keyof typeof IDENTIFIER_REPLACEMENTS]
						: t;
			return replacement === t
				? t
				: (function tokenCase(orig: string, replacement: string): string {
						if (orig === orig.toUpperCase()) return replacement.toUpperCase();
						if (orig.charAt(0) === orig.charAt(0).toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
						return replacement;
					})(t, replacement);
		}),
	);
	return kind.callback && kind.reserved?.includes(replacement) ? name : replacement;
}

/**
 * Determines whether an identifier parameter belongs to an inline or named callback.
 *
 * @param n Parameter identifier to classify.
 *
 * @return Callback rename context when the parameter is safely concise-able; otherwise `undefined`.
 */
function callbackKind(n: ts.Identifier): RenameKind | undefined {
	// JSX component bindings are syntax-bearing component names, not local callback
	// values. Leave them intact while shortening ordinary callback parameters.
	if (A_Z_REGEX.test(n.text)) return undefined;
	const param = ts.findAncestor(n, ts.isParameter);
	if (!param) return undefined;
	const callback = ts.findAncestor(
		param,
		(n): n is ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n),
	);
	if (!callback) return undefined;
	let isNamedCallback = false;
	if (ts.isFunctionDeclaration(callback) && callback.name) {
		const scan = (n: ts.Node): void => {
			if (isNamedCallback) return;
			const jsxAttr = ts.isJsxAttribute(n) ? n : undefined;
			const jsxExpr = jsxAttr?.initializer && ts.isJsxExpression(jsxAttr.initializer) ? jsxAttr.initializer.expression : undefined;
			if (
				ts.isCallExpression(n) &&
				ts.isPropertyAccessExpression(n.expression) &&
				CALLBACK_METHODS.has(n.expression.name.text) &&
				n.arguments.some(a => ts.isIdentifier(a) && a.text === callback.name?.text)
			) {
				isNamedCallback = true;
				return;
			}
			if (
				jsxAttr &&
				ts.isIdentifier(jsxAttr.name) &&
				/^on[A-Z]/.test(jsxAttr.name.text) &&
				jsxExpr &&
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
				})()
			) {
				isNamedCallback = true;
				return;
			}
			ts.forEachChild(n, scan);
		};
		scan(callback.parent);
	}
	if (
		!(!ts.isFunctionDeclaration(callback) && ts.isCallExpression(callback.parent) && callback.parent.arguments.includes(callback as ts.Expression)) &&
		!isNamedCallback &&
		!(ts.isJsxExpression(callback.parent) && callback.parent.expression === callback && ts.isJsxAttribute(callback.parent.parent)) &&
		!(!ts.isFunctionDeclaration(callback) && ts.isPropertyAssignment(callback.parent) && callback.parent.initializer === callback)
	)
		return undefined;
	for (let parent = callback.parent; parent; parent = parent.parent) {
		if (!ts.isArrowFunction(parent) && !ts.isFunctionExpression(parent)) continue;
		if (
			(ts.isCallExpression(parent.parent) && parent.parent.arguments.includes(parent)) ||
			(ts.isPropertyAssignment(parent.parent) && parent.parent.initializer === parent) ||
			(ts.isJsxExpression(parent.parent) && parent.parent.expression === parent && ts.isJsxAttribute(parent.parent.parent))
		)
			return { disabled: true };
	}
	const declarations: ts.Identifier[] = [];

	const collectBinding = (name: ts.BindingName): void => {
		if (ts.isIdentifier(name)) declarations.push(name);
		else for (const el of name.elements) if (ts.isBindingElement(el)) collectBinding(el.name);
	};
	for (const p of callback.parameters) collectBinding(p.name);
	// hygiene-ignore single-use -- Build declaration names once before the recursive reserved-name visitor runs.
	const declarationNames = new Set(declarations.map(d => d.text));
	const reserved = new Set<string>();

	const collect = (child: ts.Node): void => {
		if (ts.isIdentifier(child) && !declarationNames.has(child.text)) reserved.add(child.text);
		ts.forEachChild(child, collect);
	};
	collect(callback);
	const paramIndex = (declaration: ts.Identifier): boolean => {
		const declarationParam = ts.findAncestor(declaration, ts.isParameter);
		return !!declarationParam && callback.parameters.indexOf(declarationParam) === 1 && declaration.text === 'index';
	};
	const initialAlias = (declaration: ts.Identifier): string => renameId(declaration.text, { callback: true, numericIndex: paramIndex(declaration) });
	// Keep unshortened names and names already used in the callback body available
	// before assigning initials, so collisions are resolved consistently by order.
	const fixedDeclarations = new Set(declarations.filter(d => initialAlias(d) === d.text));
	for (const declaration of fixedDeclarations) reserved.add(declaration.text);
	for (const declaration of declarations) {
		const numericIndex = paramIndex(declaration);
		if (declaration === n) {
			const tgtReserved = new Set(reserved);
			if (fixedDeclarations.has(declaration)) tgtReserved.delete(declaration.text);
			return { callback: true, numericIndex, reserved: [...tgtReserved] };
		}
		if (!fixedDeclarations.has(declaration)) reserved.add(renameId(declaration.text, { callback: true, numericIndex, reserved: [...reserved] }));
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
	if (n.text === 'event' && ts.isVariableDeclaration(n.parent) && ts.isVariableDeclarationList(n.parent.parent) && ts.isForOfStatement(n.parent.parent.parent)) return 'e';
	return renameId(n.text, callbackKind(n));
}

/**
 * Checks whether a parameter rename would capture a free reference in its default initializer.
 *
 * @param declaration Parameter identifier being considered for renaming.
 * @param suggestion Proposed parameter name.
 * @param checker TypeScript checker used to distinguish outer references from initializer-local bindings.
 *
 * @return Whether the initializer contains a reference that the proposed parameter would shadow.
 */
export function parameterRenameCapturesDefault(declaration: ts.Identifier, suggestion: string, checker: ts.TypeChecker): boolean {
	if (!ts.isParameter(declaration.parent) || !declaration.parent.initializer) return false;
	const init = declaration.parent.initializer;
	const withinInit = (node: ts.Node): boolean => {
		for (let current: ts.Node | undefined = node; current; current = current.parent) {
			if (current === init) return true;
		}
		return false;
	};
	// hygiene-ignore single-use -- Reuse the property-name classifier across every identifier visited below.
	const isPropName = (node: ts.Identifier): boolean =>
		(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) ||
		(ts.isQualifiedName(node.parent) && node.parent.right === node) ||
		((ts.isPropertyAssignment(node.parent) || ts.isMethodDeclaration(node.parent) || ts.isMethodSignature(node.parent) || ts.isPropertyDeclaration(node.parent)) && node.parent.name === node) ||
		(ts.isLabeledStatement(node.parent) && node.parent.label === node) ||
		((ts.isBreakStatement(node.parent) || ts.isContinueStatement(node.parent)) && node.parent.label === node);
	let captures = false;
	const visit = (node: ts.Node): void => {
		if (captures) return;
		if (ts.isIdentifier(node) && node.text === suggestion && !isPropName(node) && !ts.findAncestor(node.parent, ts.isTypeNode)) {
			const symbol = ts.isShorthandPropertyAssignment(node.parent) ? checker.getShorthandAssignmentValueSymbol(node.parent) : checker.getSymbolAtLocation(node);
			const declarations = symbol?.declarations ?? [];
			if (!symbol || !declarations.length || declarations.some(srcDeclaration => !withinInit(srcDeclaration))) captures = true;
		}
		ts.forEachChild(node, visit);
	};
	visit(init);
	return captures;
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
		[...PROTECTED_PATH_PARTS].some(p => (p.includes('/') ? norm === p || norm.endsWith(`/${p}`) || norm.startsWith(`${p}/`) || norm.includes(`/${p}/`) : norm.split('/').includes(p)))
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
		n.parent.modifiers?.some(m => [ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(m.kind))
	)
		return false;
	const declaration = ts.findAncestor(n.parent, (a): a is ts.VariableDeclaration | ts.ParameterDeclaration => ts.isVariableDeclaration(a) || ts.isParameter(a));
	const varStatement =
		declaration && ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent) && ts.isVariableStatement(declaration.parent.parent)
			? declaration.parent.parent
			: undefined;
	return (
		(ts.isVariableDeclaration(n.parent) && n.parent.name === n && !varStatement?.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isParameter(n.parent) && n.parent.name === n) ||
		(ts.isBindingElement(n.parent) && n.parent.name === n && !!declaration && !varStatement?.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isFunctionExpression(n.parent) && n.parent.name === n) ||
		(ts.isClassDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isClassExpression(n.parent) && n.parent.name === n) ||
		(ts.isInterfaceDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) ||
		(ts.isTypeAliasDeclaration(n.parent) && n.parent.name === n && !n.parent.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
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
	let scope: ts.Node =
		(ts.isFunctionDeclaration(n.parent) || ts.isClassDeclaration(n.parent) || ts.isInterfaceDeclaration(n.parent) || ts.isTypeAliasDeclaration(n.parent)) && n.parent.name === n
			? n.parent.parent
			: n.parent;
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
	const files = (analysis?.files ?? srcFiles(cfg)).filter(file => C_M_JS_JSX_TS_TSX_U_REGEX.test(file));
	const program =
		analysis?.program ??
		ts.createProgram({
			rootNames: files.filter(file => CODE_EXTS.has(file.slice(file.lastIndexOf('.')))),
			options: {
				allowNonTsExtensions: true,
				allowJs: true,
				checkJs: false,
				jsx: ts.JsxEmit.Preserve,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.Bundler,
				skipLibCheck: true,
				target: ts.ScriptTarget.ESNext,
			},
		});
	const checker = analysis?.checker ?? program.getTypeChecker();
	for (const f of files) {
		if (isProtectedPath(displayPath(cfg, f))) continue;
		const srcText = analysis?.texts.get(f) ?? readFileSync(f, 'utf8');
		const frontmatter = f.endsWith('.astro') ? astroFrontmatter(srcText) : undefined;
		if (f.endsWith('.astro') && !frontmatter) continue;
		const file = frontmatter
			? ts.createSourceFile(f, frontmatter.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
			: (analysis?.sources.get(f) ?? program.getSourceFile(f) ?? ts.createSourceFile(f, srcText, ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
		const srcOffset = frontmatter?.offset ?? 0;
		// hygiene-ignore single-use -- Build the exported-name set once before visiting each declaration in this file.
		const exportedNames = new Set(
			file.statements.flatMap(s => (ts.isExportDeclaration(s) && s.exportClause && ts.isNamedExports(s.exportClause) ? s.exportClause.elements.map(e => (e.propertyName ?? e.name).text) : [])),
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
				if (suggestion !== n.text && parameterRenameCapturesDefault(n, suggestion, checker)) {
					findings.push({
						file: displayPath(cfg, f),
						name: n.text,
						suggestion,
						severity: 'error',
						start: srcOffset + n.getStart(file),
						safe: false,
						reason: `renaming would capture the free identifier ${suggestion} in this parameter's default initializer`,
					});
					return;
				}
				if (!isCallbackDeclaration(n) && (safety?.declared.has(suggestion) || declaredNames.has(suggestion) || (safety?.proposals.get(suggestion) ?? 0) > 1)) return;
				if (suggestion !== n.text) findings.push({ file: displayPath(cfg, f), name: n.text, suggestion, severity: 'error', start: srcOffset + n.getStart(file) });
			}
			ts.forEachChild(n, inspect);
		};
		inspect(file);
	}
	return findings;
}

/**
 * Extracts an Astro frontmatter script and its source offset for TypeScript's rename service.
 *
 * @param src Complete Astro page source.
 *
 * @return Frontmatter source and its start offset, or `undefined` when delimiters are invalid.
 */
function astroFrontmatter(src: string): { offset: number; source: string } | undefined {
	const firstLineEnd = src.indexOf('\n');
	if (firstLineEnd < 0 || src.slice(0, firstLineEnd).replace(R_U_REGEX, '').trim() !== '---') return undefined;
	const offset = firstLineEnd + 1;
	let lineStart = offset;
	while (lineStart <= src.length) {
		const nextLineEnd = src.indexOf('\n', lineStart);
		if (
			src
				.slice(lineStart, nextLineEnd < 0 ? src.length : nextLineEnd)
				.replace(R_U_REGEX, '')
				.trim() === '---'
		)
			return { offset, source: src.slice(offset, lineStart) };
		if (nextLineEnd < 0) break;
		lineStart = nextLineEnd + 1;
	}
	return undefined;
}

/**
 * Confirms that an Astro naming finding belongs to a frontmatter callback parameter.
 *
 * @param file Virtual TypeScript filename used for the frontmatter.
 * @param src Frontmatter source containing the declaration.
 * @param start Declaration offset relative to that frontmatter.
 *
 * @return `true` when renaming stays inside a callback and cannot change template bindings.
 */
function isAstroCallbackFinding(file: string, src: string, start: number): boolean {
	const ast = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	let found = false;
	const inspect = (node: ts.Node): void => {
		if (ts.isIdentifier(node) && node.getStart(ast) === start && isCallbackDeclaration(node)) found = true;
		if (!found) ts.forEachChild(node, inspect);
	};
	inspect(ast);
	return found;
}

/**
 * Applies safe renames identified by namingFindings and updates bound references and parameter docs.
 *
 * @param cfg Quality configuration defining the source files and protected names eligible for safe renaming.
 *
 * @return Number of source files whose declarations or parameter documentation changed.
 */
export function fixNaming(cfg: QualityCfg): number {
	const files = srcFiles(cfg).filter(f => C_M_JS_JSX_TS_TSX_U_REGEX.test(f));
	const findings = namingFindings(cfg).filter(f => f.safe !== false && C_M_JS_JSX_TS_TSX_U_REGEX.test(f.file));
	if (!findings.length) return 0;
	const astroByFile = new Map<string, { file: string; virtualFile: string; offset: number; source: string }>();
	const virtualFiles = new Map<string, { file: string; offset: number; source: string }>();
	for (const file of files.filter(f => f.endsWith('.astro'))) {
		const absoluteFile = resolve(cfg.root, file);
		const frontmatter = astroFrontmatter(readFileSync(absoluteFile, 'utf8'));
		if (!frontmatter) continue;
		const virtualFile = `${absoluteFile}.__terra_astro_frontmatter__.ts`;
		astroByFile.set(absoluteFile, { file: absoluteFile, virtualFile, offset: frontmatter.offset, source: frontmatter.source });
		virtualFiles.set(resolve(virtualFile), { file: absoluteFile, offset: frontmatter.offset, source: frontmatter.source });
	}
	const virtualSrcs = new Map([...virtualFiles].map(([file, entry]) => [file, entry.source]));
	const fileNames = new Set(
		files.map(file => {
			const absoluteFile = resolve(cfg.root, file);
			return astroByFile.get(absoluteFile)?.virtualFile ?? absoluteFile;
		}),
	);
	// hygiene-ignore single-use -- Keep one compiler-options object for every language-service host callback.
	const options: ts.CompilerOptions = {
		allowJs: true,
		checkJs: false,
		jsx: ts.JsxEmit.Preserve,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		skipLibCheck: true,
		target: ts.ScriptTarget.ESNext,
	};
	const service = ts.createLanguageService(
		{
			getCompilationSettings: () => options,
			getScriptFileNames: () => [...fileNames],
			getScriptVersion: () => '0',
			getScriptSnapshot: f => {
				const text = virtualSrcs.get(resolve(f)) ?? ts.sys.readFile(f);
				return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
			},
			getCurrentDirectory: () => cfg.root,
			getDefaultLibFileName: ts.getDefaultLibFilePath,
			fileExists: f => virtualSrcs.has(resolve(f)) || ts.sys.fileExists(f),
			readFile: f => virtualSrcs.get(resolve(f)) ?? ts.sys.readFile(f),
			readDirectory: ts.sys.readDirectory,
		} satisfies ts.LanguageServiceHost,
		ts.createDocumentRegistry(),
	);
	const edits = new Map<string, Map<string, { start: number; length: number; text: string }>>();
	const identifiersByFile = new Map<string, Set<string>>();
	for (const finding of findings) {
		const srcFile = resolve(cfg.root, finding.file);
		const astro = astroByFile.get(srcFile);
		if (finding.file.endsWith('.astro') && !astro) continue;
		const fileName = astro?.virtualFile ?? srcFile;
		const start = astro ? finding.start - astro.offset : finding.start;
		if (astro && !isAstroCallbackFinding(fileName, astro.source, start)) continue;
		if (!fileNames.has(fileName)) continue;
		const locations = service.findRenameLocations(fileName, start, false, false, true) ?? [];
		for (const location of locations) {
			const locationFile = resolve(location.fileName);
			const virtual = virtualFiles.get(locationFile);
			const file = virtual?.file ?? locationFile;
			let identifierSpans = identifiersByFile.get(locationFile);
			if (!identifierSpans) {
				identifierSpans = new Set<string>();
				const src = ts.createSourceFile(
					locationFile,
					virtual?.source ?? readFileSync(file, 'utf8'),
					ts.ScriptTarget.Latest,
					true,
					/\.(?:tsx|jsx)$/u.test(locationFile) ? ts.ScriptKind.TSX : /\.(?:mjs|cjs|js)$/u.test(locationFile) ? ts.ScriptKind.JS : ts.ScriptKind.TS,
				);
				const collectIdentifiers = (node: ts.Node): void => {
					if (ts.isJSDoc(node)) return;
					if (ts.isIdentifier(node)) {
						const start = node.getStart(src);
						identifierSpans!.add(`${start}:${node.end - start}`);
					}
					ts.forEachChild(node, collectIdentifiers);
				};
				collectIdentifiers(src);
				identifiersByFile.set(locationFile, identifierSpans);
			}
			if (!identifierSpans.has(`${location.textSpan.start}:${location.textSpan.length}`)) continue;
			const keyed = edits.get(file) ?? new Map<string, { start: number; length: number; text: string }>();
			const edit = { start: location.textSpan.start + (virtual?.offset ?? 0), length: location.textSpan.length, text: `${location.prefixText ?? ''}${finding.suggestion}${location.suffixText ?? ''}` };
			keyed.set(`${edit.start}:${edit.length}`, edit);
			edits.set(file, keyed);
		}
	}
	let changedFiles = 0;
	for (const [file, replacements] of edits) {
		const orig = readFileSync(file, 'utf8');
		if (hasGeneratedSourceHeader(orig)) continue;
		const updated = [...replacements.values()].sort((a, b) => b.start - a.start).reduce((s, e) => `${s.slice(0, e.start)}${e.text}${s.slice(e.start + e.length)}`, orig);
		if (updated === orig) continue;
		writeFileSync(file, updated);
		changedFiles += 1;
	}
	service.dispose();
	return changedFiles;
}

/**
 * Finds and optionally removes declarations that only rename another symbol.
 *
 * @param cfg Quality configuration defining the source scope and protected identifiers.
 * @param analysisOrFix Shared analysis context, or the legacy boolean autofix flag.
 * @param legacyFix Autofix flag used when an analysis context is supplied.
 *
 * @return Safe local-binding aliases that can be removed, whether or not autofix is enabled.
 */
export function aliasFindings(cfg: QualityCfg, analysisOrFix: QualityAnalysis | boolean = false, legacyFix = false): AliasFinding[] {
	const analysis = typeof analysisOrFix === 'object' ? analysisOrFix : undefined;
	const files = (analysis?.files ?? srcFiles(cfg)).filter(f => /\.(?:c|m)?(?:js|ts)x?$/.test(f));
	const srcTexts = analysis?.texts ?? new Map(files.map(f => [f, readFileSync(f, 'utf8')]));
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
		const aliases: Array<{ statement: ts.Statement; name: ts.Identifier; symbol: ts.Symbol; replacement: string; kind: 'const' | 'type'; targetSymbol?: ts.Symbol; targetName?: string }> = [];

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
					ts.isIdentifier(tgt) &&
					symbol &&
					targetSymbol &&
					symbol !== targetSymbol &&
					isStableLocalBinding(targetSymbol) &&
					!exportedSymbols.has(symbol) &&
					!exportedNames.has(name.text) &&
					!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
				)
					aliases.push({ statement: node, name, symbol, replacement: tgt.getText(src), kind: 'const', targetSymbol, targetName: tgt.text });
			}
			if (ts.isTypeAliasDeclaration(node) && node.typeParameters === undefined && ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName) && node.type.typeArguments === undefined) {
				const symbol = checker.getSymbolAtLocation(node.name);
				const targetSymbol = checker.getSymbolAtLocation(node.type.typeName);
				if (
					symbol &&
					targetSymbol &&
					symbol !== targetSymbol &&
					!exportedSymbols.has(symbol) &&
					!exportedNames.has(node.name.text) &&
					!(function externallyReferenced(files: string[], srcTexts: Map<string, string>, src: string, name: string): boolean {
						const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
						return files.some(f => f !== src && pattern.test(srcTexts.get(f) ?? ''));
					})(files, srcTexts, src.fileName, node.name.text)
				)
					aliases.push({ statement: node, name: node.name, symbol, replacement: node.type.getText(src), kind: 'type', targetSymbol, targetName: node.type.typeName.getText(src) });
			}
			ts.forEachChild(node, inspect);
		};
		inspect(src);
		if (!aliases.length) continue;
		const edits: Array<{ start: number; end: number; text: string; alias: (typeof aliases)[number] }> = [];
		const symbols = new Map(aliases.map(a => [a.symbol, a]));
		const shadowed = new Set<(typeof aliases)[number]>();
		const chained = new Set<(typeof aliases)[number]>();
		for (const alias of aliases) {
			const tgtAlias = alias.targetSymbol && symbols.get(alias.targetSymbol);
			if (tgtAlias) {
				chained.add(alias);
				chained.add(tgtAlias);
			}
		}

		const visit = (node: ts.Node): void => {
			if (aliases.some(a => a.statement === node)) return;
			if (ts.isIdentifier(node)) {
				const alias = symbols.get(
					(ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node
						? (checker.getShorthandAssignmentValueSymbol(node.parent) ?? checker.getSymbolAtLocation(node))
						: checker.getSymbolAtLocation(node)) as ts.Symbol,
				);
				if (alias && node !== alias.name) {
					if (alias.targetSymbol && checker.getSymbolsInScope(node, ts.SymbolFlags.Type | ts.SymbolFlags.Value).find(c => c.name === alias.targetName) !== alias.targetSymbol) {
						shadowed.add(alias);
						return;
					}
					edits.push({
						start: node.getStart(src),
						end: node.end,
						text: ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node ? `${node.text}: ${alias.replacement}` : alias.replacement,
						alias,
					});
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(src);
		const sAliases = aliases.filter(a => !shadowed.has(a) && !chained.has(a));
		if (!sAliases.length) continue;
		const sAliasSet = new Set(sAliases);
		edits.splice(0, edits.length, ...edits.filter(e => sAliasSet.has(e.alias)));
		for (const alias of sAliases) {
			findings.push({
				file: displayPath(cfg, src.fileName),
				line: src.getLineAndCharacterOfPosition(alias.name.getStart(src)).line + 1,
				kind: alias.kind,
				name: alias.name.text,
				replacement: alias.replacement,
			});
			edits.push({ start: alias.statement.getFullStart(), end: alias.statement.end, text: '', alias });
		}
		if (typeof analysisOrFix === 'boolean' ? analysisOrFix : legacyFix) {
			const orig = readFileSync(src.fileName, 'utf8');
			if (hasGeneratedSourceHeader(orig)) continue;
			const updated = edits.sort((a, b) => b.start - a.start).reduce((t, e) => `${t.slice(0, e.start)}${e.text}${t.slice(e.end)}`, orig);
			if (updated !== orig) writeFileSync(src.fileName, updated);
		}
	}
	return findings;
}
