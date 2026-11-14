/**
 * packages/patterns/src/lib/patterns.ts
 * Generic source-pattern checks: repeated static classes and forbidden UI patterns.
 * Kept together because both are repository-wide text inventories.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { createQualityAnalysis, displayPath, srcFiles } from '@terra-symposium/standards-quality-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// TYPES
import type { QualityAnalysis, QualityCfg } from '@terra-symposium/standards-quality-core';

/**
 * Matches TSDoc blocks so generated declarations can preserve authored comments.
 *
 * @return A fresh global regular expression for TSDoc block comments.
 */
const S_S_G_REGEX = () => /\/\*\*[\s\S]*?\*\//g;

const SHARED_REGEX = /[\\/]/;

/**
 * Matches non-alphanumeric runs when deriving concise identifiers.
 *
 * @return A fresh regular expression for splitting non-alphanumeric runs.
 */
const A_ZA_Z0_9_G_REGEX = () => /[^A-Za-z0-9]+/g;
/**
 * Matches leading and trailing underscores for identifier cleanup.
 *
 * @return A fresh regular expression for trimming underscores.
 */
const G_REGEX = () => /^_+|_+$/g;
/**
 * Matches backslashes when escaping regular-expression text.
 *
 * @return A fresh regular expression for matching backslashes.
 */
const G_CLASS_2 = () => /\\/g;
/**
 * Captures exported constant names when scanning source sections.
 *
 * @return A fresh multiline regular expression for exported constants.
 */
const EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX = () => /^export const ([A-Za-z_$][\w$]*)\b/gm;

/**
 * Matches whitespace runs when normalizing source text.
 *
 * @return A fresh regular expression for matching whitespace runs.
 */
const S_G_REGEX = () => /\s+/g;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Counts exact edits applied and conservative candidates left for review. */
export type PatternFixResult = { fixed: number; skipped: number };

/** A repeated collection lookup inside another collection callback. */
export type PerformancePatternFinding = { file: string; line: number; column: number; method: string; receiver: string; recommendation: string };
const COLLECTION_CALLBACKS = new Set(['filter', 'flatMap', 'forEach', 'map', 'reduce', 'some']);
const REPEATED_LOOKUPS = new Set(['find', 'filter', 'includes', 'indexOf', 'some']);

/**
 * Returns a stable receiver expression suitable for a manual indexing recommendation.
 *
 * @param node Expression whose receiver may be used in a recommendation.
 *
 * @return The receiver text for a simple identifier/property access, otherwise `undefined`.
 */
function stableReceiver(node: ts.Expression): string | undefined {
	if (ts.isIdentifier(node)) return node.text;
	if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) return node.getText();
	return undefined;
}

/**
 * Confirms that a lookup receiver is statically an array or tuple.
 *
 * @param checker TypeScript checker used to resolve the receiver's value type.
 * @param expr Receiver expression of the lookup call.
 *
 * @return Whether the receiver supports the array lookup semantics this rule targets.
 */
function isArrayLookupReceiver(checker: ts.TypeChecker, expr: ts.Expression): boolean {
	const type = checker.getTypeAtLocation(expr);
	if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return false;
	const members = type.isUnionOrIntersection() ? type.types : [type];
	return members.length > 0 && members.every(member => checker.isArrayType(member) || checker.isTupleType(member));
}

/**
 * Finds the nearest enclosing function passed directly to a collection method.
 *
 * @param node AST node whose enclosing collection callback is being sought.
 *
 * @return The nearest collection call whose callback contains the node, if any.
 */
function collectionCallback(node: ts.Node): ts.CallExpression | undefined {
	for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
		if (!ts.isFunctionLike(current)) continue;
		const call = current.parent;
		if (!ts.isCallExpression(call) || !call.arguments.includes(current as ts.Expression)) continue;
		const callee = call.expression;
		if (ts.isPropertyAccessExpression(callee) && COLLECTION_CALLBACKS.has(callee.name.text)) return call;
	}
	return undefined;
}

/**
 * Reports repeated linear lookups nested in collection callbacks without changing source.
 *
 * @param cfg Quality configuration that selects source files and pattern options.
 * @param analysis Optional shared source analysis to reuse while scanning.
 *
 * @return Repeated linear-lookup findings, with source locations and recommendations.
 */
export function performancePatternFindings(cfg: QualityCfg, analysis?: QualityAnalysis): PerformancePatternFinding[] {
	const settings = cfg.performancePatterns;
	if (!settings) return [];
	const exts = new Set(settings.extensions ?? ['.js', '.jsx', '.ts', '.tsx']);
	const ignoredFiles = new Set(settings.ignoredFiles ?? []);
	const files = (analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })).filter(f => exts.has(f.slice(f.lastIndexOf('.'))));
	const checker = analysis?.checker ?? createQualityAnalysis({ ...cfg, extensions: [...exts] }).checker;
	const findings: PerformancePatternFinding[] = [];
	for (const file of files) {
		const display = displayPath(cfg, file);
		if (ignoredFiles.has(display)) continue;
		const source = analysis?.sources.get(file) ?? ts.createSourceFile(file, analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, regexScriptKind(file));
		if ((source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) continue;
		/**
		 * Walks the parsed file to find nested linear lookups.
		 *
		 * @param node Current AST node in the source file.
		 */
		const visit = (node: ts.Node): void => {
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && REPEATED_LOOKUPS.has(node.expression.name.text) && collectionCallback(node)) {
				const receiver = stableReceiver(node.expression.expression);
				if (receiver && isArrayLookupReceiver(checker, node.expression.expression)) {
					const position = source.getLineAndCharacterOfPosition(node.getStart(source));
					findings.push({
						file: display,
						line: position.line + 1,
						column: position.character + 1,
						method: node.expression.name.text,
						receiver,
						recommendation: `Consider precomputing a Map or Set for ${receiver} before this collection callback; measure the representative path before changing it.`,
					});
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
	}
	return findings;
}

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reports repeated static class strings without assuming a framework.
 *
 * @param cfg Quality configuration defining the source roots and repeated-class policy.
 * @param analysis Optional shared analysis context for reusing source text.
 *
 * @return Repeated static class strings that meet the configured minimum count.
 */
export function repeatedClassFindings(cfg: QualityCfg, analysis?: QualityAnalysis): { value: string; count: number; locations: string[] }[] {
	const settings = cfg.repeatedClasses ?? {};
	const minimum = settings.minimumCount ?? 3;
	const exts = new Set(settings.extensions ?? ['.astro', '.html', '.js', '.jsx', '.ts', '.tsx']);
	const vals = new Map<string, string[]>();
	for (const file of (analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })).filter(f => exts.has(f.slice(f.lastIndexOf('.'))))) {
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		for (const { value, offset } of repeatedClassAttrs(src, file)) {
			const val = value.replace(S_G_REGEX(), ' ').trim();
			if (val.includes('{') || val.split(' ').length < 2) continue;
			vals.set(val, [...(vals.get(val) ?? []), `${displayPath(cfg, file)}:${src.slice(0, offset).split('\n').length}`]);
		}
	}
	return [...vals.entries()].filter(([, l]) => l.length >= minimum).map(([v, l]) => ({ value: v, count: l.length, locations: l.sort((l, r) => l.localeCompare(r, undefined, { numeric: true })) }));
}

/**
 * Finds static class attributes in JSX/HTML syntax while excluding ordinary JavaScript strings.
 *
 * @param src Source text to inspect.
 * @param file Filename used to select the source syntax.
 *
 * @return Static class values with their source offsets.
 */
function repeatedClassAttrs(src: string, file: string): { value: string; offset: number; text: string }[] {
	if (file.endsWith('.html')) return [...src.matchAll(/\b(class|className)(\s*=\s*)(['"])([^'"\n]+)\3/g)].map(match => ({ value: match[4]!, offset: match.index!, text: match[0] }));
	const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	const attrs: { value: string; offset: number; text: string }[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && (node.name.text === 'class' || node.name.text === 'className') && node.initializer && ts.isStringLiteral(node.initializer))
			attrs.push({ value: node.initializer.text, offset: node.getStart(source), text: node.getText(source) });
		ts.forEachChild(node, visit);
	};
	visit(source);
	return attrs;
}

/**
 * Converts a static class string into a stable, collision-resistant constant identifier.
 *
 * @param val Normalized class string being named.
 * @param used Identifiers already present in the file.
 *
 * @return Upper-case identifier suitable for a generated class constant.
 */
function classConstName(val: string, used: Set<string>): string {
	let name = `${
		val
			.split(/\s+/)
			.map(t => t.replace(A_ZA_Z0_9_G_REGEX(), '_').replace(G_REGEX(), ''))
			.filter(Boolean)
			.join('_') || 'SHARED'
	}_CLASS`.toUpperCase();
	if (/^\d/.test(name)) name = `CLASS_${name}`;
	if (name.length > 80)
		name = `${name.slice(0, 70)}_${Math.abs([...val].reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 0))
			.toString(36)
			.toUpperCase()}`;
	let suffix = 2;
	while (used.has(name)) name = `${name}_${suffix++}`;
	used.add(name);
	return name;
}

/**
 * Determines whether a source offset is inside a JavaScript template literal.
 * Template-generated markup is data, so replacing its class text with a source
 * identifier would change the generated markup rather than reference a value.
 *
 * @param src Source text containing the candidate match.
 * @param offset Candidate offset in the source text.
 *
 * @return Whether the offset is enclosed by an unescaped backtick.
 */
function isInsideTemplateLiteral(src: string, offset: number): boolean {
	let open = false;
	for (let i = 0; i < offset; i++) {
		if (src[i] !== '`' || (i > 0 && src[i - 1] === '\\')) continue;
		open = !open;
	}
	return open;
}

/**
 * Inserts generated declarations at a CONFIG boundary or after the import group.
 *
 * @param src Source text to update.
 * @param declarations Constant declarations to insert.
 * @param file Optional source filename used to preserve its syntax and formatting conventions.
 *
 * @return Source text containing the declarations, or the original source when insertion is unsupported.
 */
function insertGenDeclarations(src: string, declarations: string[], file?: string): string {
	if (!declarations.length) return src;
	const cfgPattern = /\/\*\/{10,}\r?\n[ \t]*CONFIG[ \t]*\r?\n[ \t]*\/{10,}\*\//g;
	let cfg: RegExpExecArray | null = null;
	for (let match = cfgPattern.exec(src); match; match = cfgPattern.exec(src)) {
		if (!isInsideTemplateLiteral(src, match.index)) {
			cfg = match;
			break;
		}
	}
	const eol = src.includes('\r\n') ? '\r\n' : '\n';
	const gen = declarations.join(eol);
	if (cfg) {
		const at = cfg.index + cfg[0].length;
		return `${src.slice(0, at)}${eol}${gen}${eol}${src.slice(at)}`;
	}
	// Add generated constants only to JavaScript-family sources, after imports
	// and directive prologues so module and directive semantics remain unchanged.
	if (!file || file.endsWith('.html')) return src;
	if (file.endsWith('.astro')) {
		const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
		if (frontmatter) {
			const at = frontmatter[0].lastIndexOf('---');
			return `${src.slice(0, at)}${gen}${eol}${src.slice(at)}`;
		}
		return `---${eol}${gen}${eol}---${eol}${src}`;
	}
	const ast = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	let at = 0;
	for (const statement of ast.statements) {
		if (ts.isImportDeclaration(statement) || (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression))) at = statement.end;
		else break;
	}
	return `${src.slice(0, at)}${at ? eol : ''}${gen}${eol}${src.slice(at)}`;
}

/**
 * Writes a generated JavaScript-family update only after TypeScript accepts its syntax.
 * Astro files are validated structurally by the narrowly scoped attribute edits instead.
 *
 * @param file Source file to update.
 * @param src Candidate source text.
 *
 * @return `true` when the candidate was written.
 */
function writePatternSrc(file: string, src: string): boolean {
	if (!file.endsWith('.astro')) {
		if (ts.transpileModule(src, { fileName: file, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext } }).diagnostics?.length)
			return false;
	}
	writeFileSync(file, src);
	return true;
}

/**
 * Replaces repeated static class attributes with file-local constants in the CONFIG/CLASSES group.
 * Dynamic expressions, HTML files, and files without an existing CONFIG boundary are left unchanged.
 *
 * @param cfg Quality configuration defining the class threshold and source scope.
 * @param analysis Optional shared analysis context used for discovery.
 *
 * @return Counts of replacements made and candidates left unchanged for safety.
 */
export function fixRepeatedClasses(cfg: QualityCfg, analysis?: QualityAnalysis): PatternFixResult {
	const settings = cfg.repeatedClasses ?? {};
	const minimum = settings.minimumCount ?? 3;
	const exts = new Set(settings.extensions ?? ['.astro', '.html', '.js', '.jsx', '.ts', '.tsx']);
	let fixed = 0;
	let skipped = 0;
	for (const file of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		if (!exts.has(file.slice(file.lastIndexOf('.')))) continue;
		if (file.endsWith('.html')) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		const matches = repeatedClassAttrs(src, file).flatMap(({ value, offset, text }) => {
			const match = /^(class|className)(\s*=\s*)(['"])([^\n]*)\3$/.exec(text);
			if (!match || match[4] !== value) return [];
			return [{ match: Object.assign(match, { index: offset }), value: value.replace(S_G_REGEX(), ' ').trim() }];
		});
		const groups = new Map<string, typeof matches>();
		for (const entry of matches) if (!entry.value.includes('{') && entry.value.split(' ').length >= 2) groups.set(entry.value, [...(groups.get(entry.value) ?? []), entry]);
		const candidates = [...groups.entries()].filter(([, e]) => e.length >= minimum);
		if (!candidates.length) continue;
		const used = new Set<string>();
		(analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)).forEachChild(n => {
			if (!ts.isVariableStatement(n)) return;
			for (const declaration of n.declarationList.declarations) if (ts.isIdentifier(declaration.name)) used.add(declaration.name.text);
		});
		const declarations: string[] = [];
		const edits: Array<{ start: number; end: number; replacement: string }> = [];
		for (const [val, entries] of candidates) {
			const name = classConstName(val, used);
			declarations.push(`const ${name} = '${val.replace(G_CLASS_2(), '\\\\').replace(/'/g, "\\'")}';`);
			for (const { match } of entries) edits.push({ start: match.index!, end: match.index! + match[0].length, replacement: `${match[1]}${match[2]}{${name}}` });
			fixed += entries.length;
		}
		let updated = src;
		for (const edit of edits.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		const withGroup = insertGenDeclarations(updated, declarations, file);
		const candidateCount = candidates.reduce((n, [, e]) => n + e.length, 0);
		if (withGroup === updated) {
			fixed -= candidateCount;
			skipped += candidateCount;
		} else if (!writePatternSrc(file, withGroup)) {
			fixed -= candidateCount;
			skipped += candidateCount;
		}
	}
	return { fixed, skipped };
}

/**
 * Reports configured UI patterns that should use a shared primitive.
 *
 * @param cfg Quality configuration defining forbidden UI patterns and source scope.
 * @param analysis Optional shared analysis context for reusing discovered files and text.
 *
 * @return Matching file/pattern pairs that should use shared UI primitives.
 */
export function uiPatternFindings(cfg: QualityCfg, analysis?: QualityAnalysis): { file: string; pattern: string }[] {
	const settings = cfg.uiPatterns ?? {};
	const patterns = (settings.forbidden ?? []).map(p => [p, new RegExp(p, 'm')] as const);
	const exts = settings.extensions ?? ['.astro', '.html', '.jsx', '.tsx'];
	return (analysis?.files ?? srcFiles({ ...cfg, extensions: exts }))
		.filter(f => exts.includes(f.slice(f.lastIndexOf('.'))))
		.flatMap(f => {
			const name = displayPath(cfg, f);
			const src = analysis?.texts.get(f) ?? readFileSync(f, 'utf8');
			return patterns.filter(([, p]) => p.test(src)).map(([p]) => ({ file: name, pattern: p }));
		});
}

/*//////////////////////////////////////////////////
TAILWIND
//////////////////////////////////////////////////*/

// terra-quality-ignore single-use -- Keep the documented resolveTailwindNodeImport declaration so its parameter and return contract remains attached.
/**
 * Resolves Tailwind's Node runtime from the consumer's installed integration.
 *
 * @param consumerRequire CommonJS resolver rooted at the consumer package.
 * @param root Repository root whose dependency tree should be searched.
 * @param stylesheetPath Configured stylesheet whose workspace dependencies should also be searched.
 *
 * @return Absolute path to Tailwind's Node runtime entry.
 */
function resolveTailwindNodeImport(consumerRequire: NodeRequire, root: string, stylesheetPath: string): string {
	const stylesheetDir = dirname(stylesheetPath);
	const paths = [root, resolve(root, 'astro'), stylesheetDir, resolve(stylesheetDir, '..')];
	try {
		return consumerRequire.resolve('tailwindcss', { paths });
	} catch {
		// Try the v4 Node runtime exposed by the installed integration below.
	}
	try {
		return consumerRequire.resolve('@tailwindcss/node', { paths });
	} catch {
		// The Node runtime is usually a transitive dependency of the selected v4 integration.
	}
	for (const integration of ['@tailwindcss/postcss', '@tailwindcss/vite', '@tailwindcss/cli']) {
		try {
			return createRequire(consumerRequire.resolve(integration, { paths })).resolve('@tailwindcss/node');
		} catch {
			// Try the next supported Tailwind integration.
		}
	}
	throw new Error('Tailwind v4 Node runtime could not be resolved from the consumer repository.');
}

/**
 * Runs the Tailwind v4 canonical-class diagnostic used by the quality CLI.
 *
 * @param cfg Quality configuration containing the Tailwind stylesheet and source roots.
 * @param fix Whether canonical replacements should be written to source files.
 * @param output Optional callbacks and quiet-mode control for diagnostic reporting.
 *
 * @return Promise resolving to zero after diagnostics or fixes complete.
 */
export async function runTailwindCanonical(cfg: QualityCfg, fix = false, output: { quiet?: boolean; onFinding?: (message: string) => void; onSkip?: () => void } = {}): Promise<number> {
	if (!cfg.tailwindCanonical) return 0;
	const stylesheetPath = resolve(cfg.root, cfg.tailwindCanonical.stylesheet);
	if (!existsSync(stylesheetPath)) throw new Error(`Tailwind stylesheet not found: ${stylesheetPath}`);
	const consumerRequire = createRequire(resolve(cfg.root, 'package.json'));
	let tailwind: {
		__unstable__loadDesignSystem?: (
			css: string,
			options: { base: string; from: string; loadStylesheet: (id: string, base: string) => Promise<{ base: string; content: string; path: string }> },
		) => Promise<{
			canonicalizeCandidates: (candidates: string[]) => string[];
			candidatesToAst?: (candidates: string[]) => unknown[];
			resolveThemeValue?: (key: string, value?: string) => string | undefined;
		}>;
	};
	try {
		tailwind = (await import(pathToFileURL(resolveTailwindNodeImport(consumerRequire, cfg.root, stylesheetPath)).href)) as typeof tailwind;
	} catch {
		throw new Error('Tailwind canonical check could not load the consumer repository Tailwind v4 Node runtime.');
	}
	if (!tailwind.__unstable__loadDesignSystem) {
		output.onSkip?.();
		if (!output.quiet) console.info('Tailwind canonical check skipped: installed Tailwind does not expose v4 canonical-class diagnostics.');
		return 0;
	}
	const designSystem = await tailwind.__unstable__loadDesignSystem(readFileSync(stylesheetPath, 'utf8'), {
		base: dirname(stylesheetPath),
		from: stylesheetPath,
		loadStylesheet: async (id: string, base: string): Promise<{ base: string; content: string; path: string }> => {
			let importedPath = resolve(base, id);
			if (!existsSync(importedPath)) {
				try {
					importedPath = consumerRequire.resolve(id, { paths: [base, cfg.root, resolve(cfg.root, 'astro'), dirname(stylesheetPath), resolve(dirname(stylesheetPath), '..')] });
				} catch {
					throw new Error(`Tailwind stylesheet import not found: ${id}`);
				}
			}
			return { base: dirname(importedPath), content: readFileSync(importedPath, 'utf8'), path: importedPath };
		},
	});
	const lengthInPixels = (value: string): number | undefined => {
		const match = /^(-?\d+(?:\.\d+)?)(px|rem)$/.exec(value);
		if (!match) return undefined;
		const amount = Number(match[1]);
		return match[2] === 'rem' ? amount * 16 : amount;
	};
	const spacing = designSystem.resolveThemeValue?.('--spacing');
	const spacingInPixels = spacing ? lengthInPixels(spacing) : undefined;
	const spacingSuggestions = new Map<string, string | undefined>();
	const spacingSuggestion = (original: string): string | undefined => {
		if (spacingSuggestions.has(original)) return spacingSuggestions.get(original);
		const arbitrary = /^(?<utility>.+)-\[(?<value>-?\d+(?:\.\d+)?(?:px|rem))\](?<important>!)?$/.exec(original);
		const valueInPixels = arbitrary?.groups?.value ? lengthInPixels(arbitrary.groups.value) : undefined;
		const ratio = valueInPixels !== undefined && spacingInPixels ? valueInPixels / spacingInPixels : undefined;
		if (!arbitrary?.groups?.utility || valueInPixels === undefined || valueInPixels <= 0 || !spacingInPixels || !ratio || !Number.isInteger(ratio) || !designSystem.candidatesToAst) {
			spacingSuggestions.set(original, undefined);
			return undefined;
		}
		const proposal = `${arbitrary.groups.utility}-${ratio}${arbitrary.groups.important ?? ''}`;
		const declarations = (candidate: string): { property: string; value: string; important: boolean }[] => {
			const found: { property: string; value: string; important: boolean }[] = [];
			const collect = (node: unknown): void => {
				if (Array.isArray(node)) {
					for (const child of node) collect(child);
					return;
				}
				if (!node || typeof node !== 'object') return;
				const record = node as Record<string, unknown>;
				if (record.kind === 'declaration' && typeof record.property === 'string' && typeof record.value === 'string') {
					found.push({ property: record.property, value: record.value, important: record.important === true });
					return;
				}
				if (Array.isArray(record.nodes)) collect(record.nodes);
			};
			collect(designSystem.candidatesToAst?.([candidate]));
			return found;
		};
		const before = declarations(original);
		const after = declarations(proposal);
		const replacement =
			before.length > 0 &&
			before.length === after.length &&
			before.every((d, i) => {
				const replacement = after[i];
				if (!replacement || d.property !== replacement.property || d.important !== replacement.important) return false;
				const pixels = lengthInPixels(d.value);
				if (pixels === undefined) return d.value === replacement.value;
				const spacingScale = /^calc\(var\(--spacing\)\s\*\s*(-?\d+(?:\.\d+)?)\)$/.exec(replacement.value);
				return spacingScale !== null && Math.abs(Number(spacingScale[1]) * spacingInPixels - pixels) < 0.0001;
			})
				? proposal
				: undefined;
		spacingSuggestions.set(original, replacement);
		return replacement;
	};
	const files = srcFiles(cfg.tailwindCanonical.sourceRoots ? { ...cfg, sourceRoots: cfg.tailwindCanonical.sourceRoots.map(r => resolve(cfg.root, r)) } : cfg).filter(f =>
		/\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f),
	);
	const findings: { file: string; start: number; end: number; original: string; replacement: string; line: number; column: number }[] = [];
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		for (const val of (function classVals(src: string): Array<{ start: number; value: string }> {
			const vals: Array<{ start: number; value: string }> = [];
			const attrPattern = /\b(?:class|className)\s*=\s*(?:(['"])([\s\S]*?)\1|\{\s*`([\s\S]*?)`\s*\})/g;
			for (const match of src.matchAll(attrPattern)) {
				const value = match[2] ?? match[3] ?? '';
				const valStart = match.index! + match[0].indexOf(value);
				let segmentStart = 0;
				for (const interpolation of value.matchAll(/\$\{[\s\S]*?\}/g)) {
					if (interpolation.index! > segmentStart) vals.push({ start: valStart + segmentStart, value: value.slice(segmentStart, interpolation.index) });
					segmentStart = interpolation.index! + interpolation[0].length;
				}
				if (segmentStart < value.length) vals.push({ start: valStart + segmentStart, value: value.slice(segmentStart) });
			}
			const callPattern = /\b(?:cn|clsx|classnames|cva)\s*\(/g;
			for (const call of src.matchAll(callPattern)) {
				let depth = 1;
				let cursor = call.index! + call[0].length;
				while (cursor < src.length && depth > 0) {
					if (src[cursor] === '(') depth += 1;
					if (src[cursor] === ')') depth -= 1;
					cursor += 1;
				}
				const bodyStart = call.index! + call[0].length;
				for (const value of src.slice(bodyStart, cursor - 1).matchAll(/(['"`])([\s\S]*?)\1/g)) if (!value[2]!.includes('${')) vals.push({ start: bodyStart + value.index! + 1, value: value[2]! });
			}
			return vals;
		})(source)) {
			for (const token of val.value.matchAll(/\S+/g)) {
				const original = token[0]!;
				const canonical = designSystem.canonicalizeCandidates([original])[0];
				const replacement = canonical && canonical !== original ? canonical : spacingSuggestion(original);
				if (!replacement || replacement === original || replacement.includes(' ')) continue;
				const start = val.start + token.index!;
				findings.push({
					file,
					start,
					end: start + original.length,
					original,
					replacement,
					...(function locationAt(src: string, offset: number): { line: number; column: number } {
						const before = src.slice(0, offset);
						return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
					})(source, start),
				});
			}
		}
	}
	const uniqueFindings = findings.filter((f, i, a) => a.findIndex(c => c.file === f.file && c.start === f.start && c.original === f.original) === i);
	if (fix) {
		for (const file of new Set(uniqueFindings.map(f => f.file))) {
			let source = readFileSync(file, 'utf8');
			for (const finding of uniqueFindings.filter(c => c.file === file).sort((l, r) => r.start - l.start))
				source = `${source.slice(0, finding.start)}${finding.replacement}${source.slice(finding.end)}`;
			writeFileSync(file, source);
		}
		if (!output.quiet) console.info(`Tailwind canonical classes fixed: ${uniqueFindings.length}`);
		return 0;
	}
	for (const finding of uniqueFindings) {
		const message = `${relative(cfg.root, finding.file)}:${finding.line}:${finding.column} ${finding.original} -> ${finding.replacement}`;
		if (output.onFinding) output.onFinding(message);
		else console.error(message);
	}
	if (uniqueFindings.length) throw new Error(`Tailwind canonical class check failed with ${uniqueFindings.length} suggestion${uniqueFindings.length === 1 ? '' : 's'}.`);
	if (!output.quiet) console.info(`Tailwind canonical class check passed: ${files.length} source files scanned.`);
	return 0;
}
const REGEX_REGISTRY_MARKER = '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.';
const REGEX_DECLARATION_MARKER = '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.';

/**
 * Checks whether a generated-file marker appears before any source content.
 *
 * @param source File contents to inspect.
 * @param marker Expected generated-file marker.
 *
 * @return Whether only leading comments and whitespace precede the marker.
 */
function hasLeadingGenMarker(source: string, marker: string): boolean {
	let cursor = source.startsWith('\uFEFF') ? 1 : 0;
	while (cursor < source.length) {
		while (/\s/u.test(source[cursor] ?? '')) cursor++;
		if (source.startsWith(marker, cursor)) return true;
		if (!source.startsWith('/*', cursor) && !source.startsWith('//', cursor)) return false;
		const block = source.startsWith('/*', cursor);
		const end = block ? source.indexOf('*/', cursor + 2) : source.indexOf('\n', cursor + 2);
		if (end < 0) return false;
		cursor = block ? end + 2 : end + 1;
	}
	return false;
}

// terra-quality-ignore single-use -- Keep the documented genFilePrefix declaration so its parameter and return contract remains attached.
/**
 * Preserves the generated marker and any leading file documentation.
 *
 * @param source Existing generated-file contents.
 * @param marker Expected generated-file marker.
 *
 * @return The preserved leading documentation and marker as a newline-terminated prefix.
 */
function genFilePrefix(source: string, marker: string): string {
	const markerIndex = source.indexOf(marker);
	if (markerIndex < 0) return `${marker}\n`;
	const leadingDocumentation = source.slice(0, markerIndex);
	return `${leadingDocumentation}${leadingDocumentation && !leadingDocumentation.endsWith('\n') ? '\n' : ''}${marker}\n`;
}
/** Parsed regular-expression candidate and the source context needed to rewrite it safely. */
type RegexCandidate = { file: string; source: string; expression: string; node: ts.Node; ast: ts.SourceFile; rewritable: boolean };

/**
 * Selects the TypeScript parser mode for the given source extension.
 *
 * @param file Source filename used to identify JavaScript, JSX, or TypeScript syntax.
 *
 * @return The matching TypeScript compiler script kind.
 */
function regexScriptKind(file: string): ts.ScriptKind {
	if (/\.tsx$/.test(file)) return ts.ScriptKind.TSX;
	if (/\.jsx$/.test(file)) return ts.ScriptKind.JSX;
	return /\.(?:mjs|cjs|js)$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}

/**
 * Collects the supported literal and static-constructor candidates used by both reporting and fixing.
 *
 * @param cfg Quality configuration defining the regex source scope.
 * @param analysis Optional shared analysis context for reusing source text and ASTs.
 *
 * @return Regex candidates with exact source keys and source locations.
 */
function regexCandidates(cfg: QualityCfg, analysis?: QualityAnalysis): RegexCandidate[] {
	const settings = cfg.regexDedup ?? {};
	const exts = new Set(settings.extensions ?? ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.mts', '.cts']);
	const registryPath = settings.sharedModule ? resolve(cfg.root, settings.sharedModule) : '';
	const skippedDirs = (settings.skippedDirectories ?? []).map(d => resolve(cfg.root, d));
	const candidates: RegexCandidate[] = [];
	for (const discoveredFile of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		const file = resolve(discoveredFile);
		if (
			!exts.has(file.slice(file.lastIndexOf('.'))) ||
			file.endsWith('.d.mts') ||
			(registryPath && file === registryPath) ||
			skippedDirs.some(d => {
				const relativePath = relative(d, file);
				return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
			})
		)
			continue;
		const ast =
			analysis?.sources.get(discoveredFile) ??
			analysis?.sources.get(file) ??
			ts.createSourceFile(file, analysis?.texts.get(discoveredFile) ?? analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, regexScriptKind(file));
		// terra-quality-ignore single-use -- Analyze RegExp shadowing once before the AST visitor checks each candidate.
		const shadowedRegExp = hasRegExpBinding(ast);
		/**
		 * Collects regex literals and supported `RegExp` constructions from the file.
		 *
		 * @param node Current AST node being inspected.
		 */
		const visit = (node: ts.Node): void => {
			if (ts.isRegularExpressionLiteral(node) && !isGenLocalRegex(node) && !isInlineTestRegex(cfg, file, node)) {
				const literal = node.getText(ast);
				const end = literal.lastIndexOf('/');
				const pattern = literal.slice(1, end);
				const flags = literal.slice(end + 1);
				candidates.push({ file, source: flags ? `${pattern}/${flags}` : pattern, expression: literal, node, ast, rewritable: true });
			} else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'RegExp' && !node.typeArguments?.length && !isInlineTestRegex(cfg, file, node)) {
				const [pattern, flags, ...rest] = node.arguments ?? [];
				if (!rest.length && (ts.isStringLiteral(pattern) || ts.isNoSubstitutionTemplateLiteral(pattern)) && (!flags || ts.isStringLiteral(flags))) {
					candidates.push({ file, source: flags ? `${pattern.getText(ast)}, ${flags.getText(ast)}` : pattern.getText(ast), expression: node.getText(ast), node, ast, rewritable: !shadowedRegExp });
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(ast);
	}
	return candidates;
}

/**
 * Checks whether a regex in a test source is an inline matcher or fixture expression.
 *
 * Moving one-off test expressions into the application-wide regex registry makes assertions harder to read
 * without reducing duplicated runtime behavior. Named regex bindings remain candidates so shared reusable
 * test patterns still receive the same deduplication analysis as production patterns.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param file Source file containing the regex expression.
 * @param node Regex literal or static `RegExp` construction to classify.
 *
 * @return Whether this is an inline regex expression in a test source file.
 */
function isInlineTestRegex(cfg: QualityCfg, file: string, node: ts.RegularExpressionLiteral | ts.NewExpression): boolean {
	if (!/(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relative(cfg.root, file).replaceAll('\\', '/'))) return false;
	const parent = node.parent;
	return !(ts.isVariableDeclaration(parent) && parent.initializer === node) && !(ts.isPropertyDeclaration(parent) && parent.initializer === node);
}
/**
 * Checks whether a regex literal belongs to a generated local `_REGEX` declaration.
 *
 * @param node Regular-expression literal to classify.
 *
 * @return Whether the literal initializes a generated local regex constant.
 */
function isGenLocalRegex(node: ts.RegularExpressionLiteral): boolean {
	let declaration: ts.VariableDeclaration | undefined;
	for (let curr: ts.Node | undefined = node; curr && !ts.isSourceFile(curr); curr = curr.parent) {
		if (ts.isVariableDeclaration(curr)) {
			declaration = curr;
			break;
		}
	}
	if (!declaration || !declaration.initializer || !ts.isIdentifier(declaration.name) || !declaration.name.text.endsWith('_REGEX')) return false;
	return declaration.initializer === node || (ts.isArrowFunction(declaration.initializer) && declaration.initializer.body === node);
}
/**
 * Detects bindings that shadow the global `RegExp` constructor.
 *
 * @param ast Parsed source file to inspect.
 *
 * @return Whether the file declares, imports, or catches a binding named `RegExp`.
 */
function hasRegExpBinding(ast: ts.SourceFile): boolean {
	/**
	 * Checks whether a binding pattern contains a `RegExp` name.
	 *
	 * @param name Binding name, including nested destructuring patterns.
	 *
	 * @return Whether any bound identifier is named `RegExp`.
	 */
	const bindingHasRegExp = (name: ts.BindingName): boolean => {
		if (ts.isIdentifier(name)) return name.text === 'RegExp';
		return name.elements.some(e => ts.isBindingElement(e) && bindingHasRegExp(e.name));
	};
	let found = false;
	/**
	 * Searches declarations and imports for a binding that shadows global `RegExp`.
	 *
	 * @param node Current AST node being inspected.
	 */
	const visit = (node: ts.Node): void => {
		if (found) return;
		if (
			(ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) &&
			node.name &&
			bindingHasRegExp(node.name as ts.BindingName)
		) {
			found = true;
			return;
		}
		if (ts.isImportClause(node) && node.name?.text === 'RegExp') found = true;
		if (ts.isImportSpecifier(node) && node.name.text === 'RegExp') found = true;
		if (ts.isCatchClause(node) && node.variableDeclaration && bindingHasRegExp(node.variableDeclaration.name)) found = true;
		ts.forEachChild(node, visit);
	};
	visit(ast);
	return found;
}
/**
 * Groups parsed regex candidates by their exact source representation.
 *
 * @param cfg Quality configuration defining source roots and extensions.
 * @param analysis Optional shared analysis context for reusing parsed sources.
 *
 * @return Candidate groups keyed by regex source and flags.
 */
function regexGroups(cfg: QualityCfg, analysis?: QualityAnalysis): Map<string, RegexCandidate[]> {
	const groups = new Map<string, RegexCandidate[]>();
	for (const candidate of regexCandidates(cfg, analysis)) groups.set(candidate.source, [...(groups.get(candidate.source) ?? []), candidate]);
	return groups;
}

/**
 * Reports exact duplicate regular-expression sources across source files.
 *
 * @param cfg Quality configuration defining regex extensions and threshold.
 * @param analysis Optional shared analysis context for reusing source text and ASTs.
 *
 * @return Duplicate regular-expression sources and their source locations.
 */
export function regexFindings(cfg: QualityCfg, analysis?: QualityAnalysis): { source: string; count: number; locations: string[] }[] {
	const minimum = cfg.regexDedup?.minimumCount ?? 2;
	return [...regexGroups(cfg, analysis)]
		.filter(([, c]) => c.length >= minimum)
		.map(([s, c]) => ({
			source: s,
			count: c.length,
			locations: c
				.map(({ file: f, ast: a, node: n }) => `${displayPath(cfg, f)}:${a.getLineAndCharacterOfPosition(n.getStart(a)).line + 1}`)
				.sort((l, r) => l.localeCompare(r, undefined, { numeric: true })),
		}));
}
/**
 * Determines whether a consumer file uses ECMAScript module syntax.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param file Consumer source filename whose nearest package metadata is inspected.
 *
 * @return Whether the file is an ESM consumer.
 */
function isEsmConsumer(cfg: QualityCfg, file: string): boolean {
	if (/\.(?:mjs|mts)$/.test(file)) return true;
	if (/\.(?:cjs|cts)$/.test(file)) return false;
	for (let dir = dirname(file); dir.startsWith(cfg.root); dir = dirname(dir)) {
		const packageFile = resolve(dir, 'package.json');
		if (existsSync(packageFile)) {
			try {
				return JSON.parse(readFileSync(packageFile, 'utf8')).type === 'module';
			} catch {
				return false;
			}
		}
		if (dir === cfg.root) break;
	}
	return false;
}

// terra-quality-ignore single-use -- Keep the documented readRegexRegistry declaration so its parameter and return contract remains attached.
/**
 * Reads the generated shared-regex registry when both files are owned by this tool.
 *
 * @param modulePath Shared ECMAScript module path.
 * @param declarationPath TypeScript declaration path paired with the module.
 *
 * @return Parsed registry state, or `null` when an existing file is user-owned.
 */
function readRegexRegistry(modulePath: string, declarationPath: string): { module: string; declaration: string; names: Set<string>; keys: Map<string, string>; owned: boolean } | null {
	const moduleExists = existsSync(modulePath);
	const declarationExists = existsSync(declarationPath);
	const module = moduleExists ? readFileSync(modulePath, 'utf8') : `${REGEX_REGISTRY_MARKER}\n`;
	const declaration = declarationExists ? readFileSync(declarationPath, 'utf8') : `${REGEX_DECLARATION_MARKER}\n`;
	const owned = hasLeadingGenMarker(module, REGEX_REGISTRY_MARKER) && hasLeadingGenMarker(declaration, REGEX_DECLARATION_MARKER);
	if ((moduleExists || declarationExists) && !owned) return null;
	const keys = new Map<string, string>();
	const ast = ts.createSourceFile(modulePath, module, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	for (const statement of ast.statements) {
		const entry = regexRegistryEntry(module, statement);
		if (entry) keys.set(entry.key, entry.name);
	}
	return { module, declaration, names: new Set([...module.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map(m => m[1]!)), keys, owned };
}

/**
 * Returns the key and export name attached to one generated registry declaration.
 *
 * @param source Registry module source.
 * @param s Export statement to inspect.
 *
 * @return Generated metadata when the statement has a valid registry key.
 */
function regexRegistryEntry(source: string, s: ts.Statement): { key: string; name: string; annotationStart: number } | undefined {
	if (!ts.isVariableStatement(s) || !s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || s.declarationList.declarations.length !== 1) return;
	const declaration = s.declarationList.declarations[0]!;
	if (!ts.isIdentifier(declaration.name)) return;
	const annotation = [...source.slice(s.getFullStart(), s.getStart()).matchAll(/^\/\/ @terra-quality-regex-key (.+)$/gm)].at(-1);
	if (annotation?.index === undefined) return;
	try {
		const key = JSON.parse(annotation[1]!) as unknown;
		return typeof key === 'string' ? { key, name: declaration.name.text, annotationStart: s.getFullStart() + annotation.index } : undefined;
	} catch {
		return;
	}
}

/**
 * Resolves a local or configured alias import to the shared regex module path.
 *
 * @param cfg Quality configuration containing the alias map and repository root.
 * @param importer Absolute path of the file containing the import.
 * @param specifier Import specifier to resolve.
 * @param modulePath Absolute path of the shared regex module.
 *
 * @return Whether the import resolves to the shared regex module.
 */
function resolvesRegexModule(cfg: QualityCfg, importer: string, specifier: string, modulePath: string): boolean {
	const alias = Object.entries(cfg.aliases ?? {})
		.sort(([left], [right]) => right.length - left.length)
		.find(([prefix]) => specifier.startsWith(prefix));
	const importedPath = alias ? resolve(cfg.root, alias[1], specifier.slice(alias[0].length)) : specifier.startsWith('.') ? resolve(dirname(importer), specifier) : undefined;
	if (!importedPath) return false;
	const normImport = resolve(importedPath);
	const normModule = resolve(modulePath);
	return normImport === normModule || (!extname(normImport) && `${normImport}.mjs` === normModule);
}

// terra-quality-ignore single-use -- Keep the documented referencedRegexExports declaration so its parameter and return contract remains attached.
/**
 * Finds keyed registry exports that source files reference, conservatively retaining dynamic uses.
 *
 * @param cfg Quality configuration defining the source scope and regex extensions.
 * @param modulePath Absolute shared-registry path.
 * @param names Registry export names eligible for pruning.
 * @param analysis Optional parsed-source context to reuse.
 *
 * @return Names that are referenced or may be used dynamically.
 */
function referencedRegexExports(cfg: QualityCfg, modulePath: string, names: Set<string>, analysis?: QualityAnalysis): Set<string> {
	const referenced = new Set<string>();
	const exts = cfg.regexDedup?.extensions ?? ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.mts', '.cts'];
	// A changed-file run narrows cfg.sourceRoots to changed paths. Registry exports
	// can still be used by any unchanged source in the repository.
	for (const discoveredFile of srcFiles({ ...cfg, sourceRoots: [cfg.root], includeRoots: [], extensions: exts })) {
		const file = resolve(discoveredFile);
		if (file === modulePath || file.endsWith('.d.mts')) continue;
		const ast =
			analysis?.sources.get(discoveredFile) ??
			analysis?.sources.get(file) ??
			ts.createSourceFile(file, analysis?.texts.get(discoveredFile) ?? analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, regexScriptKind(file));
		const namespaces = new Set<string>();
		for (const s of ast.statements) {
			if (
				!(ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) ||
				!s.moduleSpecifier ||
				!ts.isStringLiteral(s.moduleSpecifier) ||
				!resolvesRegexModule(cfg, file, s.moduleSpecifier.text, modulePath)
			)
				continue;
			if (ts.isExportDeclaration(s)) for (const name of names) referenced.add(name);
			else if (s.importClause?.namedBindings && ts.isNamespaceImport(s.importClause.namedBindings)) namespaces.add(s.importClause.namedBindings.name.text);
			else if (s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings))
				for (const specifier of s.importClause.namedBindings.elements) {
					const imported = (specifier.propertyName ?? specifier.name).text;
					if (names.has(imported)) referenced.add(imported);
				}
		}
		const visit = (node: ts.Node): void => {
			if (
				ts.isCallExpression(node) &&
				(node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
				node.arguments[0] &&
				ts.isStringLiteralLike(node.arguments[0]) &&
				resolvesRegexModule(cfg, file, node.arguments[0].text, modulePath)
			)
				for (const name of names) referenced.add(name);
			if (ts.isIdentifier(node) && namespaces.has(node.text) && !ts.isImportClause(node.parent) && !ts.isNamespaceImport(node.parent)) {
				const parent = node.parent;
				if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
					if (names.has(parent.name.text)) referenced.add(parent.name.text);
				} else if (ts.isElementAccessExpression(parent) && parent.expression === node) {
					const argument = parent.argumentExpression;
					if (argument && ts.isStringLiteralLike(argument) && names.has(argument.text)) referenced.add(argument.text);
					else for (const name of names) referenced.add(name);
				} else for (const name of names) referenced.add(name);
			}
			ts.forEachChild(node, visit);
		};
		visit(ast);
	}
	return referenced;
}

// terra-quality-ignore single-use -- Keep the documented pruneUnusedRegexExports declaration so its parameter and return contract remains attached.
/**
 * Removes only keyed generated declarations with no source references.
 *
 * @param source Generated registry module source.
 * @param unusedNames Keyed export names proven to have no references.
 *
 * @return Updated registry module source.
 */
function pruneUnusedRegexExports(source: string, unusedNames: Set<string>): string {
	if (!unusedNames.size) return source;
	const removals = ts.createSourceFile('regex.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS).statements.flatMap(s => {
		const entry = regexRegistryEntry(source, s);
		return entry && unusedNames.has(entry.name) ? [{ start: entry.annotationStart, end: s.end }] : [];
	});
	let updated = source;
	for (const removal of removals.sort((l, r) => r.start - l.start)) updated = `${updated.slice(0, removal.start)}${updated.slice(removal.end)}`;
	return updated;
}

// terra-quality-ignore single-use -- Keep the documented pruneUnusedRegexBindings declaration so its parameter and return contract remains attached.
/**
 * Removes unreferenced declarations left by earlier generated-registry formats.
 *
 * @param source Generated registry module source.
 * @param referencedNames Export names used by consumers or new replacements.
 *
 * @return Registry source containing only live generated regular-expression factories.
 */
function pruneUnusedRegexBindings(source: string, referencedNames: Set<string>): string {
	const ast = ts.createSourceFile('regex.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	const declarations = new Map<string, { statement: ts.VariableStatement; initializer: ts.Expression; start: number; exported: boolean }[]>();
	for (const statement of ast.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name) || !/^REGEX_.*_REGEX(?:_\d+)?$/u.test(declaration.name.text) || !declaration.initializer) continue;
			const leading = source.slice(statement.getFullStart(), statement.getStart(ast));
			const metadataStart = [...leading.matchAll(/^\/\/ @terra-quality-regex-key .+$/gm)].at(-1)?.index;
			const documentationStart = [...leading.matchAll(S_S_G_REGEX())].at(-1)?.index;
			const markerIndex = leading.indexOf(REGEX_REGISTRY_MARKER);
			declarations.set(declaration.name.text, [
				...(declarations.get(declaration.name.text) ?? []),
				{
					statement,
					initializer: declaration.initializer,
					start:
						metadataStart !== undefined
							? statement.getFullStart() + metadataStart
							: documentationStart !== undefined && statement.getFullStart() + documentationStart >= (markerIndex < 0 ? -1 : markerIndex + REGEX_REGISTRY_MARKER.length)
								? statement.getFullStart() + documentationStart
								: statement.getStart(ast),
					exported: Boolean(statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)),
				},
			]);
		}
	}
	if (!declarations.size) return source;
	const live = new Set([...referencedNames].filter(name => declarations.has(name)));
	const dependencies = new Map<string, Set<string>>();
	for (const [name, entries] of declarations) {
		const used = new Set<string>();
		const visit = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && declarations.has(node.text)) used.add(node.text);
			ts.forEachChild(node, visit);
		};
		for (const { initializer: init } of entries) visit(init);
		dependencies.set(name, used);
	}
	for (const statement of ast.statements) {
		if (ts.isVariableStatement(statement) && statement.declarationList.declarations.every(declaration => ts.isIdentifier(declaration.name) && declarations.has(declaration.name.text))) continue;
		const visit = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && declarations.has(node.text)) live.add(node.text);
			ts.forEachChild(node, visit);
		};
		visit(statement);
	}
	const pending = [...live];
	while (pending.length) {
		const name = pending.pop()!;
		for (const dependency of dependencies.get(name) ?? []) {
			if (live.has(dependency)) continue;
			live.add(dependency);
			pending.push(dependency);
		}
	}
	const removals = [...declarations].flatMap(([name, entries]) =>
		entries.flatMap(entry => ((entries.some(candidate => candidate.exported) && !entry.exported) || !live.has(name) ? [{ start: entry.start, end: entry.statement.end }] : [])),
	);
	let updated = source;
	for (const removal of removals.sort((left, right) => right.start - left.start)) updated = `${updated.slice(0, removal.start)}${updated.slice(removal.end)}`;
	return updated;
}

/**
 * Removes the stock return sentence used by older regex-registry generators.
 *
 * @param source Generated TSDoc or registry source.
 *
 * @return Source without templated return documentation.
 */
function removeTemplateRegexReturnDocs(source: string): string {
	return source.replace(/^[ \t]*\* @return A fresh RegExp instance so each caller owns its match state\.\r?\n/gm, '').replace(/\r?\n[ \t]*\*[ \t]*\r?\n([ \t]*\*\/)/g, '\n$1');
}

/**
 * Removes empty TSDoc blocks emitted by older regex-registry generators.
 *
 * @param source Generated registry or declaration source.
 *
 * @return Source without empty documentation comments.
 */
function removeEmptyRegexDocs(source: string): string {
	return source.replace(/\/\*\*(?:\r?\n[ \t]*\*[ \t]*)*\r?\n[ \t]*\*\//g, '');
}

/**
 * Carries an agent-authored comment directly attached to a regex declaration into the shared registry.
 *
 * @param candidate Regex source expression and its parsed source file.
 *
 * @return The nearest directly attached variable or property TSDoc, if the source provides one.
 */
function regexCandidateDocumentation(candidate: RegexCandidate): string | undefined {
	let statement: ts.VariableStatement | ts.PropertyDeclaration | undefined;
	for (let node: ts.Node | undefined = candidate.node.parent; node && !ts.isSourceFile(node); node = node.parent) {
		if (ts.isVariableStatement(node) || ts.isPropertyDeclaration(node)) {
			statement = node;
			break;
		}
	}
	const sourceText = candidate.ast.text;
	const directlyAttached = (node: ts.Node): string | undefined => {
		const start = node.getStart(candidate.ast);
		const match = [...(ts.getLeadingCommentRanges(sourceText, node.getFullStart()) ?? [])]
			.reverse()
			.find(range => sourceText.slice(range.pos, range.end).startsWith('/**') && sourceText.slice(range.end, start).trim() === '');
		return match ? sourceText.slice(match.pos, match.end) : undefined;
	};
	return (statement ? directlyAttached(statement) : undefined) ?? directlyAttached(candidate.node);
}

// terra-quality-ignore single-use -- Keep the documented regexExportDeclarations declaration so its parameter and return contract remains attached.
/**
 * Preserves existing declaration statements and their meaningful TSDoc.
 *
 * @param source Existing declaration-file source.
 *
 * @return Original declaration statements, including their leading comments.
 */
function regexExportDeclarations(source: string): Map<string, string> {
	const ast = ts.createSourceFile('regex.d.mts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const declarations = new Map<string, string>();
	for (const s of ast.statements) {
		if (!ts.isVariableStatement(s) || !s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || s.declarationList.declarations.length !== 1) continue;
		const declaration = s.declarationList.declarations[0]!;
		if (!ts.isIdentifier(declaration.name)) continue;
		const headerDocumentation = [...source.slice(0, source.indexOf(REGEX_DECLARATION_MARKER)).matchAll(S_S_G_REGEX())].map(match => match[0]);
		let statement = source.slice(s.getFullStart(), s.end).replace(REGEX_DECLARATION_MARKER, '');
		for (const comment of headerDocumentation) statement = statement.replaceAll(comment, '');
		declarations.set(declaration.name.text, removeEmptyRegexDocs(removeTemplateRegexReturnDocs(statement.trim())));
	}
	return declarations;
}

// terra-quality-ignore single-use -- Keep the documented regexExportDocumentation declaration so its parameter and return contract remains attached.
/**
 * Reads authored TSDoc attached to generated regex exports, keyed by export name.
 *
 * @param source Generated registry module source.
 *
 * @return Exact TSDoc blocks already present in the registry.
 */
function regexExportDocumentation(source: string): Map<string, string> {
	const documentation = new Map<string, string>();
	const ast = ts.createSourceFile('regex.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	for (const statement of ast.statements) {
		const entry = regexRegistryEntry(source, statement);
		if (!entry) continue;
		const leading = source.slice(statement.getFullStart(), statement.getStart(ast));
		for (const match of [...leading.matchAll(S_S_G_REGEX())].reverse()) {
			const comment = removeEmptyRegexDocs(removeTemplateRegexReturnDocs(match[0]));
			if (!comment) continue;
			documentation.set(entry.name, comment);
			break;
		}
	}
	return documentation;
}

/**
 * Uses runtime TSDoc as the declaration source of truth, preserving declaration-only docs when absent at runtime.
 *
 * @param declarationDocumentation Existing declaration TSDoc, if present.
 * @param moduleDocumentation TSDoc attached to the corresponding runtime factory.
 *
 * @return Existing declaration TSDoc or the runtime TSDoc when the declaration has none.
 */
function regexDeclarationDocumentation(declarationDocumentation: string | undefined, moduleDocumentation: string | undefined): string | undefined {
	return moduleDocumentation ?? declarationDocumentation;
}

/**
 * Creates the module specifier from a consumer file to the shared registry module.
 *
 * @param file Consumer source filename.
 * @param modulePath Shared module filename.
 *
 * @return A normalized relative module specifier.
 */
function moduleSpecifier(file: string, modulePath: string): string {
	let specifier = relative(dirname(resolve(file)), resolve(modulePath)).replace(G_CLASS_2(), '/');
	if (!specifier.startsWith('.')) specifier = `./${specifier}`;
	return specifier;
}

/**
 * Finds the nearest package boundary for a file without leaving the configured repository root.
 *
 * @param file Absolute source or registry path.
 * @param repoRoot Configured repository root that bounds the package.json search.
 *
 * @return The nearest ancestor containing package.json, or the repository root when none exists.
 */
function packageRootFor(file: string, repoRoot: string): string | undefined {
	const absoluteFile = resolve(file);
	const root = resolve(repoRoot);
	const relativePath = relative(root, absoluteFile);
	if (relativePath.split(SHARED_REGEX)[0] === '..' || isAbsolute(relativePath)) return;
	let dir = dirname(absoluteFile);
	while (true) {
		if (existsSync(resolve(dir, 'package.json'))) return dir;
		if (dir === root) return root;
		const relativeDir = relative(root, dir);
		if (relativeDir.split(SHARED_REGEX)[0] === '..' || isAbsolute(relativeDir)) return;
		dir = dirname(dir);
	}
}

/**
 * Finds the nearest Git worktree boundary for a source or registry path.
 *
 * @param file Source or shared-registry path; the file itself may not exist yet.
 *
 * @return The Git worktree root, or `undefined` when no repository boundary is present.
 */
function gitRootFor(file: string): string | undefined {
	let dir = dirname(resolve(file));
	while (true) {
		if (existsSync(resolve(dir, '.git'))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return;
		dir = parent;
	}
}

/**
 * Checks whether a consumer and shared registry belong to the same package boundary.
 *
 * @param file Absolute consumer source path.
 * @param modulePath Absolute shared registry path.
 * @param repoRoot Configured repository root used as the package-boundary fallback.
 *
 * @return Whether both paths resolve inside the same package.
 */
function sharesPackageBoundary(file: string, modulePath: string, repoRoot: string): boolean {
	const consumerRoot = gitRootFor(file) ?? packageRootFor(file, repoRoot);
	return consumerRoot !== undefined && consumerRoot === (gitRootFor(modulePath) ?? packageRootFor(modulePath, repoRoot));
}

/**
 * Finds an existing namespace import for the shared registry module.
 *
 * @param ast Parsed consumer source file.
 * @param file Consumer source filename used to resolve import specifiers.
 * @param modulePath Resolved shared module filename.
 *
 * @return The imported namespace identifier, if the module is already imported.
 */
function namespaceImport(ast: ts.SourceFile, file: string, modulePath: string): string | undefined {
	for (const statement of ast.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
		if (resolve(dirname(resolve(file)), statement.moduleSpecifier.text) !== resolve(modulePath)) continue;
		if (!statement.importClause || statement.importClause.isTypeOnly || !statement.importClause.namedBindings || !ts.isNamespaceImport(statement.importClause.namedBindings)) continue;
		return statement.importClause.namedBindings.name.text;
	}
}
/**
 * Adds a namespace import after directives and existing imports.
 *
 * @param src Consumer source text to update.
 * @param ast Parsed consumer source used to locate the import boundary.
 * @param alias Local name for the shared module namespace.
 * @param specifier Module specifier to import.
 *
 * @return Source text with the import inserted in the existing import group.
 */
function insertNamespaceImport(src: string, ast: ts.SourceFile, alias: string, specifier: string): string {
	const eol = src.includes('\r\n') ? '\r\n' : '\n';
	let at = 0;
	for (const statement of ast.statements) {
		if (ts.isImportDeclaration(statement) || (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression))) at = statement.end;
		else break;
	}
	if (!at && ast.statements.length) {
		const first = ast.statements[0]!;
		at = first.getStart(ast);
		const directive = [...src.slice(first.getFullStart(), first.getStart(ast)).matchAll(/^[ \t]*\/\/[^\r\n]*(?:eslint-disable-next-line|@ts-ignore|@ts-expect-error)[^\r\n]*/gm)].at(-1);
		if (directive?.index !== undefined) at = first.getFullStart() + directive.index;
	}
	if (!at && src.startsWith('#!')) {
		const shebangEnd = src.indexOf('\n');
		at = shebangEnd < 0 ? src.length : shebangEnd + 1;
	}
	const before = src.slice(0, at);
	const after = src.slice(at);
	return `${before}${at && !before.endsWith('\n') ? eol : ''}${`import * as ${alias} from '${specifier}';`}${after.startsWith('\n') || after.startsWith('\r\n') ? '' : eol}${after}`;
}
/**
 * Collects every identifier spelling already used in a source file.
 *
 * @param ast Parsed source file to inspect.
 *
 * @return Identifier names used for collision checks.
 */
function identifierNames(ast: ts.SourceFile): Set<string> {
	const names = new Set<string>();
	/**
	 * Adds each identifier spelling found in the source tree.
	 *
	 * @param node Current AST node being inspected.
	 */
	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node)) names.add(node.text);
		ts.forEachChild(node, visit);
	};
	visit(ast);
	return names;
}
/**
 * Checks that generated JavaScript or TypeScript source parses successfully.
 *
 * @param file Output filename used to select the parser mode.
 * @param src Candidate source text to validate.
 *
 * @return Whether the candidate has no parse diagnostics.
 */
function validRegexOutput(file: string, src: string): boolean {
	if (file.endsWith('.d.mts'))
		return (ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length === 0;
	if (
		ts.transpileModule(src, { fileName: file, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } })
			.diagnostics?.length
	)
		return false;
	return true;
}

/**
 * Replaces duplicate regex candidates with file-local constants or a configured shared ESM registry.
 * Shared factories preserve a fresh RegExp instance at every original evaluation site.
 *
 * @param cfg Quality configuration defining the regex threshold, source scope, and optional registry.
 * @param analysis Optional shared analysis context used for discovery.
 *
 * @return Counts of regex expressions replaced and candidates left unchanged for safety.
 */
export function fixRegexDedup(cfg: QualityCfg, analysis?: QualityAnalysis): PatternFixResult {
	if (cfg.regexDedup?.sharedModule) return fixRegexDedupShared(cfg, analysis);
	const minimum = (cfg.regexDedup ?? {}).minimumCount ?? 2;
	const groups = regexGroups(cfg, analysis);
	let fixed = 0;
	let skipped = 0;
	const files = new Map<string, RegexCandidate[]>();
	for (const candidate of [...groups.values()].flat()) {
		if (!ts.isRegularExpressionLiteral(candidate.node)) continue;
		files.set(candidate.file, [...(files.get(candidate.file) ?? []), candidate]);
	}
	for (const [file, candidates] of files) {
		const localGroups = new Map<string, RegexCandidate[]>();
		for (const candidate of candidates) localGroups.set(candidate.source, [...(localGroups.get(candidate.source) ?? []), candidate]);
		const matches = [...localGroups].filter(([, n]) => n.length >= minimum);
		const used = identifierNames(candidates[0]!.ast);
		const declarations: string[] = [];
		const edits: Array<{ start: number; end: number; replacement: string }> = [];
		for (const [, nodes] of matches) {
			const name = classConstName(nodes[0]!.expression.replace(/\W+/g, '_'), used).replace(/_CLASS$/, '_REGEX');
			const flags = nodes[0]!.expression.slice(nodes[0]!.expression.lastIndexOf('/') + 1);
			const stateful = flags.includes('g') || flags.includes('y');
			declarations.push(`const ${name} = ${stateful ? `() => ${nodes[0]!.expression}` : nodes[0]!.expression};`);
			for (const candidate of nodes) edits.push({ start: candidate.node.getStart(candidate.ast), end: candidate.node.end, replacement: stateful ? `${name}()` : name });
			fixed += nodes.length;
		}
		const matchingCount = matches.reduce((c, [, n]) => c + n.length, 0);
		if (!edits.length) continue;
		let updated = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		for (const edit of edits.sort((l, r) => r.start - l.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		const withGroup = insertGenDeclarations(updated, declarations, file);
		if (withGroup === updated || !writePatternSrc(file, withGroup)) {
			fixed -= matchingCount;
			skipped += matchingCount;
		}
	}
	return { fixed, skipped };
}
// terra-quality-ignore single-use -- Keep the documented fixRegexDedupShared declaration so its parameter and return contract remains attached.
/**
 * Rewrites eligible duplicate regexes to factories in the configured shared module.
 *
 * @param cfg Quality configuration containing the shared module and source scope.
 * @param analysis Optional shared analysis context for reusing parsed sources.
 *
 * @return Counts of shared fixes applied and candidates left for review.
 */
function fixRegexDedupShared(cfg: QualityCfg, analysis?: QualityAnalysis): PatternFixResult {
	const sharedModule = cfg.regexDedup!.sharedModule!;
	if (!sharedModule.endsWith('.mjs')) throw new Error('regexDedup.sharedModule must name an ESM .mjs file.');
	const modulePath = resolve(cfg.root, sharedModule);
	const moduleRelative = relative(cfg.root, modulePath);
	if (moduleRelative === '..' || moduleRelative.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('regexDedup.sharedModule must stay inside the repository root.');
	const declarationPath = modulePath.replace(/\.mjs$/, '.d.mts');
	const minimum = cfg.regexDedup?.minimumCount ?? 2;
	const groups = [...regexGroups(cfg, analysis)].filter(([, c]) => c.length >= minimum);
	const registry = readRegexRegistry(modulePath, declarationPath);
	if (!registry) return { fixed: 0, skipped: groups.reduce((c, [, v]) => c + v.length, 0) };
	const rewritable = groups.filter(([, candidates]) =>
		candidates.every(candidate => candidate.rewritable && isEsmConsumer(cfg, candidate.file) && sharesPackageBoundary(candidate.file, modulePath, cfg.root)),
	);
	let skipped = groups
		.filter(([, candidates]) => !candidates.every(candidate => candidate.rewritable && isEsmConsumer(cfg, candidate.file) && sharesPackageBoundary(candidate.file, modulePath, cfg.root)))
		.reduce((count, [, candidates]) => count + candidates.length, 0);
	const usedExports = new Set(registry.names);
	const namesByKey = new Map(registry.keys);
	const newEntries: Array<{ key: string; name: string; expression: string; documentation?: string }> = [];
	const groupNames = new Map<string, string>();
	for (const [key, candidates] of rewritable.sort(([l], [r]) => l.localeCompare(r))) {
		let name = namesByKey.get(key);
		if (!name) {
			name = (function regexExportName(src: string, used: Set<string>): string {
				const base = `REGEX_${src.replace(A_ZA_Z0_9_G_REGEX(), '_').replace(G_REGEX(), '').slice(0, 60).toUpperCase() || 'PATTERN'}_REGEX`;
				let name = base;
				let suffix = 2;
				while (used.has(name)) name = `${base}_${suffix++}`;
				used.add(name);
				return name;
			})(key, usedExports);
			namesByKey.set(key, name);
			newEntries.push({ key, name, expression: candidates[0]!.expression, documentation: candidates.map(regexCandidateDocumentation).find(comment => Boolean(comment)) });
		}
		groupNames.set(key, name);
	}
	const eol = '\n';
	let moduleBase = removeEmptyRegexDocs(removeTemplateRegexReturnDocs(registry.module));
	const referenced = referencedRegexExports(cfg, modulePath, registry.names, analysis);
	for (const n of groupNames.values()) referenced.add(n);
	moduleBase = pruneUnusedRegexExports(moduleBase, new Set([...registry.keys.values()].filter(n => !referenced.has(n))));
	moduleBase = pruneUnusedRegexBindings(moduleBase, referenced);
	moduleBase = moduleBase.replace(/\n{3,}/gu, '\n\n');
	const moduleAdditions = newEntries
		.map(
			({ key: k, name: n, expression: e, documentation }) =>
				`// @terra-quality-regex-key ${JSON.stringify(k)}\n${documentation ? `${documentation}\n` : ''}export const ${n} = () => (\n${e
					.split('\n')
					.map(l => `\t${l}`)
					.join('\n')}\n);`,
		)
		.join(`${eol}${eol}`);
	const moduleSrc = moduleAdditions ? `${moduleBase.replace(/\s*$/, '')}${eol}${eol}${moduleAdditions}${eol}` : moduleBase;
	const declarationSrc = (function declarationFor(module: string): string {
		const names = [...new Set([...module.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map(m => m[1]!))].sort();
		const existingDeclarations = regexExportDeclarations(registry.declaration);
		const moduleDocumentation = regexExportDocumentation(module);
		return `${genFilePrefix(registry.declaration, REGEX_DECLARATION_MARKER)}${names
			.map(n => {
				const existing = existingDeclarations.get(n);
				if (existing) {
					const existingDocumentation = /^\/\*\*[\s\S]*?\*\//.exec(existing)?.[0];
					const completedDocumentation = regexDeclarationDocumentation(existingDocumentation, moduleDocumentation.get(n));
					if (existingDocumentation && completedDocumentation !== existingDocumentation) return `${existing.replace(existingDocumentation, completedDocumentation!)}`;
					if (!existingDocumentation && completedDocumentation) return `${completedDocumentation}\n${existing}`;
					return existing;
				}
				const documentation = moduleDocumentation.get(n);
				return `${documentation ? `${documentation}\n` : ''}export declare const ${n}: () => RegExp;`;
			})
			.join('\n')}${names.length ? '\n' : ''}`;
	})(moduleSrc);
	const srcEdits = new Map<string, { source: string; ast: ts.SourceFile; edits: Array<{ start: number; end: number; replacement: string }>; alias: string; specifier: string }>();
	let fixed = 0;
	for (const [key, candidates] of rewritable) {
		const name = groupNames.get(key)!;
		for (const candidate of candidates) {
			let fileEdits = srcEdits.get(candidate.file);
			if (!fileEdits) {
				// terra-quality-ignore single-use -- Capture source bytes before resolving imports and choosing a collision-free alias.
				const source = analysis?.texts.get(candidate.file) ?? readFileSync(candidate.file, 'utf8');
				const existingAlias = namespaceImport(candidate.ast, candidate.file, modulePath);
				const names = identifierNames(candidate.ast);
				let alias = existingAlias ?? 'TerraQualityRegex';
				let suffix = 2;
				while (!existingAlias && names.has(alias)) alias = `TerraQualityRegex${suffix++}`;
				fileEdits = { source, ast: candidate.ast, edits: [], alias, specifier: moduleSpecifier(candidate.file, modulePath) };
				srcEdits.set(candidate.file, fileEdits);
			}
			fileEdits.edits.push({ start: candidate.node.getStart(candidate.ast), end: candidate.node.end, replacement: `${fileEdits.alias}.${name}()` });
			fixed++;
		}
	}
	const updatedSrcs = new Map<string, string>();
	for (const [file, fileEdits] of srcEdits) {
		let updated = fileEdits.source;
		for (const edit of fileEdits.edits.sort((l, r) => r.start - l.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		if (!namespaceImport(fileEdits.ast, file, modulePath))
			updated = insertNamespaceImport(updated, ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, regexScriptKind(file)), fileEdits.alias, fileEdits.specifier);
		if (!validRegexOutput(file, updated)) {
			skipped += fileEdits.edits.length;
			fixed -= fileEdits.edits.length;
			continue;
		}
		updatedSrcs.set(file, updated);
	}
	if ([...updatedSrcs].length !== srcEdits.size || !validRegexOutput(modulePath, moduleSrc) || !validRegexOutput(declarationPath, declarationSrc))
		return { fixed: 0, skipped: groups.filter(([, c]) => c.every(c => c.rewritable && isEsmConsumer(cfg, c.file))).reduce((c, [, v]) => c + v.length, 0) + skipped };
	if (!(moduleSrc !== registry.module || declarationSrc !== registry.declaration || newEntries.length > 0) && !srcEdits.size) return { fixed, skipped };
	mkdirSync(dirname(modulePath), { recursive: true });
	if (moduleSrc !== registry.module || newEntries.length) writeFileSync(modulePath, moduleSrc);
	if (declarationSrc !== registry.declaration || newEntries.length) writeFileSync(declarationPath, declarationSrc);
	for (const [file, source] of updatedSrcs) writeFileSync(file, source);
	return { fixed, skipped };
}
