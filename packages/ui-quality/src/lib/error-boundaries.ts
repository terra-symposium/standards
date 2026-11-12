/**
 * packages/ui-quality/src/lib/error-boundaries.ts
 * Finds unguarded React application roots and safely wraps them by default.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { srcFiles } from '@terra-symposium/standards-quality-core';
import { dirname, resolve } from 'node:path';

// TYPES
import type { QualityCfg } from '@terra-symposium/standards-quality-core';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const ERR_BOUNDAR_IU_REGEX = /error.?boundar/iu;
const ERR_BOUNDARY_IU_REGEX = /error.?boundary$/iu;
const BINTEGRATIONS_S_S_U_REGEX = /\bintegrations\s*:\s*\[/u;

/** One React root that is mounted without a top-level error boundary. */
export type ErrorBoundaryFinding = { file: string; line: number; column: number; message: string; fixable: boolean };
/** Describes one JSX render call that can receive the configured boundary wrapper. */
type RenderSite = { call: ts.CallExpression; expression: ts.Expression; index: number };
const SOURCE_EXTS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const FIXABLE_EXTS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx', '.mts']);
const ASTRO_CONFIG = /^astro\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u;
const IGNORED_CONFIG_DIRS = new Set(['.git', '.astro', '.next', '.nuxt', '.output', '.vercel', 'coverage', 'dist', 'node_modules', 'vendor']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Returns the terminal name from a call or property-access expression.
 *
 * @param expr Expression whose final identifier is needed.
 *
 * @return The final identifier, or an empty string for other expressions.
 */
function exprName(expr: ts.Expression): string {
	if (ts.isIdentifier(expr)) return expr.text;
	if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
	if (ts.isCallExpression(expr)) return exprName(expr.expression);
	return '';
}

/**
 * Removes TypeScript and parenthesized wrappers around an expression.
 *
 * @param expr Expression to unwrap.
 *
 * @return The underlying expression.
 */
function unwrap(expr: ts.Expression): ts.Expression {
	let current = expr;
	while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isSatisfiesExpression(current) || ts.isNonNullExpression(current))
		current = current.expression;
	return current;
}

/**
 * Collects local names that refer to an imported React error boundary.
 *
 * @param source Parsed source file.
 *
 * @return Local identifiers usable as an ErrorBoundary JSX tag.
 */
function importedBoundaries(source: ts.SourceFile): Set<string> {
	const names = new Set<string>();
	for (const statement of source.statements) {
		if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
		const clause = statement.importClause;
		if (clause.name && ERR_BOUNDAR_IU_REGEX.test(statement.moduleSpecifier.text)) names.add(clause.name.text);
		if (!clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
		for (const specifier of clause.namedBindings.elements) {
			const original = specifier.propertyName?.text ?? specifier.name.text;
			if (ERR_BOUNDAR_IU_REGEX.test(original) || (ERR_BOUNDAR_IU_REGEX.test(statement.moduleSpecifier.text) && original === 'default')) names.add(specifier.name.text);
		}
	}
	return names;
}

/**
 * Checks whether a JSX tag is an error-boundary component.
 *
 * @param tag JSX tag syntax.
 * @param boundaries Imported boundary identifiers.
 *
 * @return True when the tag names a boundary component.
 */
function isBoundaryTag(tag: ts.JsxTagNameExpression, boundaries: Set<string>): boolean {
	if (ts.isIdentifier(tag)) return boundaries.has(tag.text) || ERR_BOUNDARY_IU_REGEX.test(tag.text);
	return ts.isPropertyAccessExpression(tag) && ERR_BOUNDARY_IU_REGEX.test(tag.name.text);
}

/**
 * Checks whether a JavaScript expression references a recognized boundary.
 *
 * @param expr Expression expected to name a boundary.
 * @param boundaries Imported boundary identifiers.
 *
 * @return True when the expression names an error boundary.
 */
function isBoundaryReference(expr: ts.Expression | undefined, boundaries: Set<string>): boolean {
	if (!expr) return false;
	const node = unwrap(expr);
	if (ts.isIdentifier(node)) return boundaries.has(node.text) || ERR_BOUNDARY_IU_REGEX.test(node.text);
	return ts.isPropertyAccessExpression(node) && ERR_BOUNDARY_IU_REGEX.test(node.name.text);
}

/**
 * Checks whether a render expression is protected at its outermost JSX level.
 *
 * @param expr React root render expression.
 * @param boundaries Imported boundary identifiers.
 *
 * @return True when the root expression is an error-boundary element.
 */
function isBoundaryExpr(expr: ts.Expression, boundaries: Set<string>): boolean {
	const node = unwrap(expr);
	if (ts.isJsxElement(node)) return isBoundaryTag(node.openingElement.tagName, boundaries);
	if (ts.isJsxSelfClosingElement(node)) return isBoundaryTag(node.tagName, boundaries);
	return ts.isCallExpression(node) && /createElement$/iu.test(exprName(node.expression)) && isBoundaryReference(node.arguments[0], boundaries);
}

/**
 * Finds direct React root renders and records their mounted element arguments.
 *
 * @param source Parsed source file.
 *
 * @return Root render expressions with their argument positions.
 */
function reactRootRenders(source: ts.SourceFile): RenderSite[] {
	const roots = new Set<string>();
	const sites: RenderSite[] = [];
	const isFactory = (expr: ts.Expression, name: 'createRoot' | 'hydrateRoot'): boolean => exprName(expr) === name;
	const visit = (node: ts.Node): void => {
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
			const init = unwrap(node.initializer);
			if (ts.isCallExpression(init) && isFactory(init.expression, 'createRoot')) roots.add(node.name.text);
		}
		if (ts.isCallExpression(node)) {
			if (isFactory(node.expression, 'hydrateRoot') && node.arguments.length > 1) sites.push({ call: node, expression: node.arguments[1]!, index: 1 });
			if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'render' && node.arguments.length > 0) {
				const receiver = unwrap(node.expression.expression);
				if (ts.isIdentifier(receiver) ? roots.has(receiver.text) : ts.isCallExpression(receiver) && isFactory(receiver.expression, 'createRoot'))
					sites.push({ call: node, expression: node.arguments[0]!, index: 0 });
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return sites;
}

/**
 * Parses each configured JavaScript and TypeScript source file once for this check.
 *
 * @param cfg Quality configuration defining source roots and extensions.
 *
 * @return Parsed source files with root render sites.
 */
function sourceInfos(cfg: QualityCfg): { file: string; text: string; source: ts.SourceFile; boundaries: Set<string>; renderSites: RenderSite[] }[] {
	return srcFiles(cfg)
		.filter((f) => SOURCE_EXTS.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
		.map((f) => {
			const text = readFileSync(f, 'utf8');
			const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
			const scriptKind = ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : /\.[cm]?ts$/iu.test(ext) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
			const source = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, scriptKind);
			return { file: f, text, source, boundaries: importedBoundaries(source), renderSites: reactRootRenders(source) };
		});
}

/**
 * Finds React root mounts whose top-level element does not use an error boundary.
 *
 * @param cfg Quality configuration defining source roots and extensions.
 *
 * @return Actionable findings for unguarded client-rendered app roots.
 */
export function errorBoundaryFindings(cfg: QualityCfg): ErrorBoundaryFinding[] {
	const findings: ErrorBoundaryFinding[] = [];
	for (const info of sourceInfos(cfg)) {
		for (const site of info.renderSites) {
			if (isBoundaryExpr(site.expression, info.boundaries)) continue;
			const point = info.source.getLineAndCharacterOfPosition(site.expression.getStart(info.source));
			findings.push({
				file: info.file,
				line: point.line + 1,
				column: point.character + 1,
				message: 'React application roots must render inside an ErrorBoundary so component failures leave the rest of the page available.',
				fixable: FIXABLE_EXTS.has(info.file.slice(info.file.lastIndexOf('.')).toLowerCase()),
			});
		}
	}
	for (const file of astroConfigFiles(cfg.root)) {
		if (hasAstroBoundaryIntegration(readFileSync(file, 'utf8'))) continue;
		const integration = astroIntegrationSpecifier(file, cfg.root);
		findings.push({
			file,
			line: 1,
			column: 1,
			message: integration
				? 'Astro configs must install the shared hydration error-boundary integration so failed islands leave the rest of the page available.'
				: 'Declare and install a shared error-boundary package that exports the Astro integration before adding it to this config.',
			fixable: Boolean(integration),
		});
	}
	return findings;
}

/**
 * Wraps unguarded JSX React roots and adds the shared boundary import when needed.
 *
 * @param cfg Quality configuration defining source roots and extensions.
 *
 * @return Number of source files updated.
 */
export function fixErrorBoundaries(cfg: QualityCfg): number {
	let fixedFiles = fixAstroBoundaryIntegrations(cfg.root);
	for (const info of sourceInfos(cfg)) {
		const unguarded = info.renderSites.filter((s) => !isBoundaryExpr(s.expression, info.boundaries));
		if (!unguarded.length || !FIXABLE_EXTS.has(info.file.slice(info.file.lastIndexOf('.')).toLowerCase())) continue;
		const ext = info.file.slice(info.file.lastIndexOf('.')).toLowerCase();
		const supportsJsx = ext === '.jsx' || ext === '.tsx';
		const identifiers = new Set<string>();
		const collectIdentifiers = (node: ts.Node): void => {
			if (ts.isIdentifier(node)) identifiers.add(node.text);
			ts.forEachChild(node, collectIdentifiers);
		};
		collectIdentifiers(info.source);
		const uniqueName = (base: string): string => {
			let candidate = base;
			let suffix = 2;
			while (identifiers.has(candidate)) candidate = `${base}${suffix++}`;
			identifiers.add(candidate);
			return candidate;
		};
		const needsBoundaryImport = info.boundaries.size === 0;
		const boundaryName = info.boundaries.values().next().value ?? uniqueName('TerraRootErrorBoundary');
		const createElementName = supportsJsx ? '' : uniqueName('terraCreateElement');
		const edits = unguarded.map((s) => ({
			start: s.expression.getStart(info.source),
			end: s.expression.getEnd(),
			text: supportsJsx
				? `<${boundaryName} name="Application root">${info.text.slice(s.expression.getStart(info.source), s.expression.getEnd())}</${boundaryName}>`
				: `${createElementName}(${boundaryName}, { name: 'Application root' }, (${info.text.slice(s.expression.getStart(info.source), s.expression.getEnd())}))`,
		}));
		if (needsBoundaryImport || !supportsJsx) {
			const prefixStatements = info.source.statements.filter((s) => ts.isImportDeclaration(s) || (ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression)));
			const insertion = prefixStatements.at(-1)?.end ?? 0;
			const imports = [
				...(needsBoundaryImport ? [`import { ErrorBoundary as ${boundaryName} } from '${'@terra-symposium/standards-error-boundaries/react'}';`] : []),
				...(!supportsJsx ? [`import { createElement as ${createElementName} } from 'react';`] : []),
			].join('\n');
			edits.push({ start: insertion, end: insertion, text: `${insertion ? '\n' : ''}${imports}\n` });
		}
		let text = info.text;
		for (const edit of edits.sort((l, r) => r.start - l.start)) text = `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`;
		writeFileSync(info.file, text);
		fixedFiles += 1;
	}
	return fixedFiles;
}

/**
 * Finds local Astro configuration files while excluding dependency and build trees.
 *
 * @param root Repository root to inspect.
 *
 * @return Repository-owned Astro config paths.
 */
function astroConfigFiles(root: string): string[] {
	const found: string[] = [];
	const visit = (dir: string, depth: number): void => {
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const path = `${dir}/${entry.name}`;
			if (entry.isFile() && ASTRO_CONFIG.test(entry.name)) found.push(path);
			else if (entry.isDirectory() && depth < 4 && !IGNORED_CONFIG_DIRS.has(entry.name)) visit(path, depth + 1);
		}
	};
	visit(root, 0);
	return found.sort();
}

/**
 * Detects the shared Astro boundary integration import and invocation.
 *
 * @param text Astro config source.
 *
 * @return True when the integration is installed in the config.
 */
function hasAstroBoundaryIntegration(text: string): boolean {
	const imported = text.match(
		/import\s*\{\s*terraErrorBoundaryIntegration(?:\s+as\s+(\w+))?\s*\}\s*from\s*['"]@terra-symposium\/(?:standards-error-boundaries|standards-quality)\/astro-integration['"]/u,
	);
	if (!imported) return false;
	return new RegExp(`\\b${imported[1] ?? 'terraErrorBoundaryIntegration'}\\s*\\(`, 'u').test(text);
}

/**
 * Selects an installed Astro integration exported by the package owning the config.
 *
 * @param configFile Astro config whose nearest package manifest owns dependencies.
 * @param root Repository boundary for manifest and node_modules discovery.
 *
 * @return Import specifier when the declared dependency exports an installed entry.
 */
function astroIntegrationSpecifier(configFile: string, root: string): string | undefined {
	let packageRoot = dirname(configFile);
	let packageJson: Record<string, unknown> | undefined;
	while (packageRoot === root || packageRoot.startsWith(`${root}/`)) {
		const manifestPath = resolve(packageRoot, 'package.json');
		if (existsSync(manifestPath)) {
			try {
				packageJson = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
				break;
			} catch {
				return;
			}
		}
		if (packageRoot === root) break;
		packageRoot = dirname(packageRoot);
	}
	if (!packageJson) return;
	const dependencies = [packageJson.dependencies, packageJson.devDependencies, packageJson.peerDependencies].filter((value): value is Record<string, unknown> => !!value && typeof value === 'object');
	for (const name of ['@terra-symposium/standards-error-boundaries', '@terra-symposium/standards-quality']) {
		if (!dependencies.some((group) => typeof group[name] === 'string')) continue;
		const parts = name.split('/');
		let installedPath: string | undefined;
		for (let dir = packageRoot; dir === root || dir.startsWith(`${root}/`); dir = dirname(dir)) {
			const candidate = resolve(dir, 'node_modules', ...parts, 'package.json');
			if (existsSync(candidate)) {
				installedPath = dirname(candidate);
				break;
			}
			if (dir === root) break;
		}
		if (!installedPath) continue;
		try {
			const exportEntry = (JSON.parse(readFileSync(resolve(installedPath, 'package.json'), 'utf8')) as { exports?: Record<string, unknown> }).exports?.['./astro-integration'];
			const target = typeof exportEntry === 'string' ? exportEntry : undefined;
			if (target && existsSync(resolve(installedPath, target))) return `${name}/astro-integration`;
		} catch {
			continue;
		}
	}
}

/**
 * Adds the shared Astro integration to every local config that does not have it.
 *
 * @param root Repository root to update.
 *
 * @return Number of Astro config files updated.
 */
function fixAstroBoundaryIntegrations(root: string): number {
	let fixed = 0;
	for (const file of astroConfigFiles(root)) {
		let text = readFileSync(file, 'utf8');
		if (hasAstroBoundaryIntegration(text)) continue;
		const specifier = astroIntegrationSpecifier(file, root);
		if (!specifier) continue;
		const alias = '__terraErrorBoundaryIntegration';
		const importLine = `import { terraErrorBoundaryIntegration as ${alias} } from '${specifier}';`;
		if (BINTEGRATIONS_S_S_U_REGEX.test(text)) text = text.replace(BINTEGRATIONS_S_S_U_REGEX, (m) => `${m}${alias}(), `);
		else {
			const objectStart = /(?:defineConfig\s*\(\s*|export\s+default\s*)\{/u;
			if (!objectStart.test(text)) continue;
			text = text.replace(objectStart, (m) => `${m}\n\tintegrations: [${alias}()],`);
		}
		text = `${importLine}\n${text}`;
		writeFileSync(file, text);
		fixed += 1;
	}
	return fixed;
}
