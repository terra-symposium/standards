/**
 * packages/quality/src/lib/patterns.ts
 * Generic source-pattern checks: repeated static classes and forbidden UI patterns.
 * Kept together because both are repository-wide text inventories.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { displayPath, srcFiles } from './files.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

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
export type PerformancePatternFinding = {
	file: string;
	line: number;
	column: number;
	method: string;
	receiver: string;
	recommendation: string;
};
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
	const findings: PerformancePatternFinding[] = [];
	for (const file of (analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })).filter((candidate) => exts.has(candidate.slice(candidate.lastIndexOf('.'))))) {
		const display = displayPath(cfg, file);
		if ((settings.ignoredFiles ?? []).includes(display)) continue;
		const source = analysis?.sources.get(file) ?? ts.createSourceFile(file, analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, regexScriptKind(file));
		if (
			(
				source as ts.SourceFile & {
					parseDiagnostics?: readonly ts.Diagnostic[];
				}
			).parseDiagnostics?.length
		)
			continue;
		/**
		 * Walks the parsed file to find nested linear lookups.
		 *
		 * @param node Current AST node in the source file.
		 */
		const visit = (node: ts.Node): void => {
			if (
				ts.isCallExpression(node) &&
				ts.isPropertyAccessExpression(node.expression) &&
				['find', 'filter', 'includes', 'indexOf', 'some'].includes(node.expression.name.text) &&
				(() => {
					for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
						if (!ts.isFunctionLike(current)) continue;
						const call = current.parent;
						if (!ts.isCallExpression(call) || !call.arguments.includes(current as ts.Expression)) continue;
						if (ts.isPropertyAccessExpression(call.expression) && ['filter', 'flatMap', 'forEach', 'map', 'reduce', 'some'].includes(call.expression.name.text)) return true;
					}
					return false;
				})()
			) {
				const receiver = ts.isIdentifier(node.expression.expression)
					? node.expression.expression.text
					: ts.isPropertyAccessExpression(node.expression.expression) && ts.isIdentifier(node.expression.expression.expression)
						? node.expression.expression.getText()
						: undefined;
				if (receiver) {
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
	const exts = new Set(settings.extensions ?? ['.astro', '.html', '.js', '.jsx', '.ts', '.tsx']);
	const vals = new Map<string, string[]>();
	for (const file of (analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })).filter((f) => exts.has(f.slice(f.lastIndexOf('.'))))) {
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		// Markup embedded in a template literal is generated data, not a live
		// attribute. The text-only inventory cannot safely rewrite it.
		if (src.includes('`')) continue;
		for (const match of src.matchAll(/\b(?:class|className)\s*=\s*(['"])([^'"\n]+)\1/g)) {
			const val = match[2].replace(S_G_REGEX(), ' ').trim();
			if (val.includes('{') || val.split(' ').length < 2) continue;
			vals.set(val, [...(vals.get(val) ?? []), `${displayPath(cfg, file)}:${src.slice(0, match.index ?? 0).split('\n').length}`]);
		}
	}
	return [...vals.entries()]
		.filter(([, l]) => l.length >= (settings.minimumCount ?? 3))
		.map(([v, l]) => ({
			value: v,
			count: l.length,
			locations: l.sort((l, r) => l.localeCompare(r, undefined, { numeric: true })),
		}));
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
			.map((t) => t.replace(A_ZA_Z0_9_G_REGEX(), '_').replace(G_REGEX(), ''))
			.filter(Boolean)
			.join('_') || 'SHARED'
	}_CLASS`.toUpperCase();
	if (/^\d/.test(name)) name = `CLASS_${name}`;
	if (name.length > 80)
		name = `${name.slice(0, 70)}_${Math.abs([...val].reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 0))
			.toString(36)
			.toUpperCase()}`;
	for (let suffix = 2; used.has(name); suffix++) name = `${name}_${suffix}`;
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
 * Adds generated declarations to the existing CONFIG boundary without changing imports or prose.
 *
 * @param src Source text to update.
 * @param label Generated subgroup label.
 * @param declarations Constant declarations to insert.
 * @param file Optional source filename used to preserve its syntax and formatting conventions.
 *
 * @return Source text containing the generated subgroup, or the original source when no CONFIG group exists.
 */
function insertCfgGroup(src: string, label: string, declarations: string[], file?: string): string {
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
	const group = [`/*${'/'.repeat(50)}`, label, `${'/'.repeat(50)}*/`, ...declarations].join(eol);
	if (cfg) {
		const at = cfg.index + cfg[0].length;
		return `${src.slice(0, at)}${eol}${group}${eol}${src.slice(at)}`;
	}
	// Add generated constants only to JavaScript-family sources, after imports
	// and directive prologues so module and directive semantics remain unchanged.
	if (!file || file.endsWith('.html')) return src;
	if (file.endsWith('.astro')) {
		const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
		if (frontmatter) {
			const at = frontmatter[0].lastIndexOf('---');
			return `${src.slice(0, at)}${group}${eol}${src.slice(at)}`;
		}
		return `---${eol}${group}${eol}---${eol}${src}`;
	}
	let at = 0;
	for (const statement of ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).statements) {
		if (ts.isImportDeclaration(statement) || (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression))) at = statement.end;
		else break;
	}
	return `${src.slice(0, at)}${at ? eol : ''}${group}${eol}${src.slice(at)}`;
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
		if (
			ts.transpileModule(src, {
				fileName: file,
				reportDiagnostics: true,
				compilerOptions: {
					allowJs: true,
					jsx: ts.JsxEmit.Preserve,
					target: ts.ScriptTarget.ESNext,
				},
			}).diagnostics?.length
		)
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
	const exts = new Set(settings.extensions ?? ['.astro', '.html', '.js', '.jsx', '.ts', '.tsx']);
	let fixed = 0;
	let skipped = 0;
	for (const file of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		if (!exts.has(file.slice(file.lastIndexOf('.')))) continue;
		if (file.endsWith('.html')) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		// A text matcher cannot safely distinguish live JSX/HTML attributes from
		// markup nested in template literals (including nested interpolations).
		// Leave those files unchanged rather than risking a literal `{CONST}` being
		// written into generated output.
		if (src.includes('`')) {
			skipped += 1;
			continue;
		}
		const matches = [...src.matchAll(/\b(class|className)(\s*=\s*)(['"])([^'"\n]+)\3/g)]
			.filter((m) => !isInsideTemplateLiteral(src, m.index ?? 0))
			.map((m) => ({
				match: m,
				value: m[4]!.replace(S_G_REGEX(), ' ').trim(),
			}));
		const groups = new Map<string, typeof matches>();
		for (const entry of matches) if (!entry.value.includes('{') && entry.value.split(' ').length >= 2) groups.set(entry.value, [...(groups.get(entry.value) ?? []), entry]);
		const candidates = [...groups.entries()].filter(([, e]) => e.length >= (settings.minimumCount ?? 3));
		if (!candidates.length) continue;
		const used = new Set<string>();
		(analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)).forEachChild((n) => {
			if (!ts.isVariableStatement(n)) return;
			for (const declaration of n.declarationList.declarations) if (ts.isIdentifier(declaration.name)) used.add(declaration.name.text);
		});
		const declarations: string[] = [];
		const edits: Array<{ start: number; end: number; replacement: string }> = [];
		for (const [val, entries] of candidates) {
			const name = classConstName(val, used);
			declarations.push(`const ${name} = '${val.replace(G_CLASS_2(), '\\\\').replace(/'/g, "\\'")}';`);
			for (const { match } of entries)
				edits.push({
					start: match.index!,
					end: match.index! + match[0].length,
					replacement: `${match[1]}${match[2]}{${name}}`,
				});
			fixed += entries.length;
		}
		let updated = src;
		for (const edit of edits.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		const withGroup = insertCfgGroup(updated, 'CLASSES', declarations, file);
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
	const exts = settings.extensions ?? ['.astro', '.html', '.jsx', '.tsx'];
	return ((patterns) =>
		(analysis?.files ?? srcFiles({ ...cfg, extensions: exts }))
			.filter((f) => exts.includes(f.slice(f.lastIndexOf('.'))))
			.flatMap((f) => ((src) => patterns.filter(([, pattern]) => pattern.test(src)).map(([pattern]) => ({ file: displayPath(cfg, f), pattern })))(analysis?.texts.get(f) ?? readFileSync(f, 'utf8'))))(
		(settings.forbidden ?? []).map((pattern) => [pattern, new RegExp(pattern, 'm')] as const),
	);
}

/*//////////////////////////////////////////////////
TAILWIND
//////////////////////////////////////////////////*/

/**
 * Runs the Tailwind v4 canonical-class diagnostic used by the quality CLI.
 *
 * @param cfg Quality configuration containing the Tailwind stylesheet and source roots.
 * @param fix Whether canonical replacements should be written to source files.
 * @param output Optional callbacks and quiet-mode control for diagnostic reporting.
 *
 * @return Promise resolving to zero after diagnostics or fixes complete.
 */
export async function runTailwindCanonical(
	cfg: QualityCfg,
	fix = false,
	output: {
		quiet?: boolean;
		onFinding?: (message: string) => void;
		onSkip?: () => void;
	} = {},
): Promise<number> {
	if (!cfg.tailwindCanonical) return 0;
	const stylesheetPath = resolve(cfg.root, cfg.tailwindCanonical.stylesheet);
	if (!existsSync(stylesheetPath)) throw new Error(`Tailwind stylesheet not found: ${stylesheetPath}`);
	const consumerRequire = createRequire(resolve(cfg.root, 'package.json'));
	let tailwind: {
		__unstable__loadDesignSystem?: (
			css: string,
			options: {
				base: string;
				from: string;
				loadStylesheet: (id: string, base: string) => Promise<{ base: string; content: string; path: string }>;
			},
		) => Promise<{
			canonicalizeCandidates: (candidates: string[]) => string[];
			candidatesToAst?: (candidates: string[]) => unknown[];
			resolveThemeValue?: (key: string, value?: string) => string | undefined;
		}>;
	};
	try {
		tailwind = (await import(
			pathToFileURL(
				(() => {
					const paths = [cfg.root, resolve(cfg.root, 'astro'), dirname(stylesheetPath), resolve(dirname(stylesheetPath), '..')];
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
					for (const integration of ['@tailwindcss/postcss', '@tailwindcss/vite', '@tailwindcss/cli'])
						try {
							return createRequire(consumerRequire.resolve(integration, { paths })).resolve('@tailwindcss/node');
						} catch {
							// Try the next supported Tailwind integration.
						}
					throw new Error('Tailwind v4 Node runtime could not be resolved from the consumer repository.');
				})(),
			).href
		)) as typeof tailwind;
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
		loadStylesheet: async (id, base) => {
			let importedPath = resolve(base, id);
			if (!existsSync(importedPath)) {
				try {
					importedPath = consumerRequire.resolve(id, {
						paths: [base, cfg.root, resolve(cfg.root, 'astro'), dirname(stylesheetPath), resolve(dirname(stylesheetPath), '..')],
					});
				} catch {
					throw new Error(`Tailwind stylesheet import not found: ${id}`);
				}
			}
			return {
				base: dirname(importedPath),
				content: readFileSync(importedPath, 'utf8'),
				path: importedPath,
			};
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
	const files = srcFiles(
		cfg.tailwindCanonical.sourceRoots
			? {
					...cfg,
					sourceRoots: cfg.tailwindCanonical.sourceRoots.map((root) => resolve(cfg.root, root)),
				}
			: cfg,
	).filter((f) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f));
	const findings: {
		file: string;
		start: number;
		end: number;
		original: string;
		replacement: string;
		line: number;
		column: number;
	}[] = [];
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		const vals: Array<{ start: number; value: string }> = [];
		for (const match of source.matchAll(/\b(?:class|className)\s*=\s*(?:(['"])([\s\S]*?)\1|\{\s*`([\s\S]*?)`\s*\})/g)) {
			const value = match[2] ?? match[3] ?? '';
			const valStart = match.index! + match[0].indexOf(value);
			let segmentStart = 0;
			for (const interpolation of value.matchAll(/\$\{[\s\S]*?\}/g)) {
				if (interpolation.index! > segmentStart)
					vals.push({
						start: valStart + segmentStart,
						value: value.slice(segmentStart, interpolation.index),
					});
				segmentStart = interpolation.index! + interpolation[0].length;
			}
			if (segmentStart < value.length)
				vals.push({
					start: valStart + segmentStart,
					value: value.slice(segmentStart),
				});
		}
		for (const call of source.matchAll(/\b(?:cn|clsx|classnames|cva)\s*\(/g)) {
			let depth = 1;
			let cursor = call.index! + call[0].length;
			while (cursor < source.length && depth > 0) {
				if (source[cursor] === '(') depth += 1;
				if (source[cursor] === ')') depth -= 1;
				cursor += 1;
			}
			const bodyStart = call.index! + call[0].length;
			for (const value of source.slice(bodyStart, cursor - 1).matchAll(/(['"`])([\s\S]*?)\1/g)) if (!value[2]!.includes('${')) vals.push({ start: bodyStart + value.index! + 1, value: value[2]! });
		}
		for (const val of vals) {
			for (const token of val.value.matchAll(/\S+/g)) {
				const original = token[0]!;
				const canonical = designSystem.canonicalizeCandidates([original])[0];
				const replacement =
					canonical && canonical !== original
						? canonical
						: ((candidate) => {
								if (spacingSuggestions.has(candidate)) return spacingSuggestions.get(candidate);
								const arbitrary = /^(?<utility>.+)-\[(?<value>-?\d+(?:\.\d+)?(?:px|rem))\](?<important>!)?$/.exec(candidate);
								const valueInPixels = arbitrary?.groups?.value ? lengthInPixels(arbitrary.groups.value) : undefined;
								const ratio = valueInPixels !== undefined && spacingInPixels ? valueInPixels / spacingInPixels : undefined;
								if (!arbitrary?.groups?.utility || valueInPixels === undefined || valueInPixels <= 0 || !spacingInPixels || !ratio || !Number.isInteger(ratio) || !designSystem.candidatesToAst)
									return spacingSuggestions.set(candidate, undefined).get(candidate);
								const declarations = (
									value: string,
								): {
									property: string;
									value: string;
									important: boolean;
								}[] => {
									const found: {
										property: string;
										value: string;
										important: boolean;
									}[] = [];
									const collect = (node: unknown): void => {
										if (Array.isArray(node)) {
											for (const child of node) collect(child);
											return;
										}
										if (!node || typeof node !== 'object') return;
										const record = node as Record<string, unknown>;
										if (record.kind === 'declaration' && typeof record.property === 'string' && typeof record.value === 'string') {
											found.push({
												property: record.property,
												value: record.value,
												important: record.important === true,
											});
											return;
										}
										if (Array.isArray(record.nodes)) collect(record.nodes);
									};
									collect(designSystem.candidatesToAst?.([value]));
									return found;
								};
								const spacingCandidate = `${arbitrary.groups.utility}-${ratio}${arbitrary.groups.important ?? ''}`;
								const before = declarations(candidate);
								const after = declarations(spacingCandidate);
								return spacingSuggestions
									.set(
										candidate,
										before.length > 0 &&
											before.length === after.length &&
											before.every((declaration, i) => {
												const replacement = after[i];
												if (!replacement || declaration.property !== replacement.property || declaration.important !== replacement.important) return false;
												const pixels = lengthInPixels(declaration.value);
												if (pixels === undefined) return declaration.value === replacement.value;
												const spacingScale = /^calc\(var\(--spacing\)\s\*\s*(-?\d+(?:\.\d+)?)\)$/.exec(replacement.value);
												return spacingScale !== null && Math.abs(Number(spacingScale[1]) * spacingInPixels - pixels) < 0.0001;
											})
											? spacingCandidate
											: undefined,
									)
									.get(candidate);
							})(original);
				if (!replacement || replacement === original || replacement.includes(' ')) continue;
				const start = val.start + token.index!;
				const before = source.slice(0, start);
				findings.push({
					file,
					start,
					end: start + original.length,
					original,
					replacement,
					line: before.split('\n').length,
					column: start - before.lastIndexOf('\n'),
				});
			}
		}
	}
	const uniqueFindings = findings.filter((f, i, a) => a.findIndex((c) => c.file === f.file && c.start === f.start && c.original === f.original) === i);
	if (fix) {
		for (const file of new Set(uniqueFindings.map((f) => f.file))) {
			let source = readFileSync(file, 'utf8');
			for (const finding of uniqueFindings.filter((c) => c.file === file).sort((l, r) => r.start - l.start))
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
/** Parsed regular-expression candidate and the source context needed to rewrite it safely. */
type RegexCandidate = {
	file: string;
	source: string;
	expr: string;
	node: ts.Node;
	ast: ts.SourceFile;
	rewritable: boolean;
};

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
 * Groups parsed regex candidates by their exact source representation.
 *
 * @param cfg Quality configuration defining source roots and extensions.
 * @param analysis Optional shared analysis context for reusing parsed sources.
 *
 * @return Candidate groups keyed by regex source and flags.
 */
function regexGroups(cfg: QualityCfg, analysis?: QualityAnalysis): Map<string, RegexCandidate[]> {
	const settings = cfg.regexDedup ?? {};
	const exts = new Set(settings.extensions ?? ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.mts', '.cts']);
	const candidates: RegexCandidate[] = [];
	for (const file of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		const absoluteFile = resolve(file);
		if (
			!exts.has(file.slice(file.lastIndexOf('.'))) ||
			file.endsWith('.d.mts') ||
			(settings.sharedModule && absoluteFile === resolve(cfg.root, settings.sharedModule)) ||
			(settings.skippedDirectories ?? []).some((dir) => {
				const relativePath = relative(resolve(cfg.root, dir), absoluteFile);
				return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
			})
		)
			continue;
		const ast = analysis?.sources.get(file) ?? ts.createSourceFile(file, analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, regexScriptKind(file));
		const visit = (node: ts.Node): void => {
			if (ts.isRegularExpressionLiteral(node)) {
				let declaration: ts.VariableDeclaration | undefined;
				for (let current: ts.Node | undefined = node; current && !ts.isSourceFile(current); current = current.parent) {
					if (ts.isVariableDeclaration(current)) {
						declaration = current;
						break;
					}
				}
				if (
					declaration &&
					ts.isIdentifier(declaration.name) &&
					declaration.name.text.endsWith('_REGEX') &&
					[...ast.text.slice(0, declaration.getStart(ast)).matchAll(/\/\*\/{10,}\r?\n[ \t]*([A-Z][A-Z _-]*)[ \t]*\r?\n[ \t]*\/{10,}\*\//g)].at(-1)?.[1] === 'REGEX'
				)
					return;
				const literal = node.getText(ast);
				const end = literal.lastIndexOf('/');
				const pattern = literal.slice(1, end);
				const flags = literal.slice(end + 1);
				candidates.push({
					file,
					source: flags ? `${pattern}/${flags}` : pattern,
					expr: literal,
					node,
					ast,
					rewritable: true,
				});
			} else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'RegExp' && !node.typeArguments?.length) {
				const [pattern, flags, ...rest] = node.arguments ?? [];
				if (!rest.length && (ts.isStringLiteral(pattern) || ts.isNoSubstitutionTemplateLiteral(pattern)) && (!flags || ts.isStringLiteral(flags))) {
					candidates.push({
						file,
						source: flags ? `${pattern.getText(ast)}, ${flags.getText(ast)}` : pattern.getText(ast),
						expr: node.getText(ast),
						node,
						ast,
						rewritable: !(() => {
							const bindingHasRegExp = (name: ts.BindingName): boolean => {
								if (ts.isIdentifier(name)) return name.text === 'RegExp';
								return name.elements.some((element) => ts.isBindingElement(element) && bindingHasRegExp(element.name));
							};
							let found = false;
							const inspect = (current: ts.Node): void => {
								if (found) return;
								if (
									(ts.isVariableDeclaration(current) || ts.isParameter(current) || ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current) || ts.isEnumDeclaration(current)) &&
									current.name &&
									bindingHasRegExp(current.name as ts.BindingName)
								) {
									found = true;
									return;
								}
								if (ts.isImportClause(current) && current.name?.text === 'RegExp') found = true;
								if (ts.isImportSpecifier(current) && current.name.text === 'RegExp') found = true;
								if (ts.isCatchClause(current) && current.variableDeclaration && bindingHasRegExp(current.variableDeclaration.name)) found = true;
								ts.forEachChild(current, inspect);
							};
							inspect(ast);
							return found;
						})(),
					});
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(ast);
	}
	const groups = new Map<string, RegexCandidate[]>();
	for (const candidate of candidates) groups.set(candidate.source, [...(groups.get(candidate.source) ?? []), candidate]);
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
	return [...regexGroups(cfg, analysis)]
		.filter(([, candidates]) => candidates.length >= (cfg.regexDedup?.minimumCount ?? 2))
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
		if (resolve(dirname(file), statement.moduleSpecifier.text) !== modulePath) continue;
		if (!statement.importClause || statement.importClause.isTypeOnly || !statement.importClause.namedBindings || !ts.isNamespaceImport(statement.importClause.namedBindings)) continue;
		return statement.importClause.namedBindings.name.text;
	}
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
	if (file.endsWith('.d.mts')) {
		return (ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length === 0;
	}
	if (
		ts.transpileModule(src, {
			fileName: file,
			reportDiagnostics: true,
			compilerOptions: {
				allowJs: true,
				jsx: ts.JsxEmit.Preserve,
				target: ts.ScriptTarget.ESNext,
				module: ts.ModuleKind.ESNext,
			},
		}).diagnostics?.length
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
	if (cfg.regexDedup?.sharedModule) {
		if (!cfg.regexDedup.sharedModule.endsWith('.mjs')) throw new Error('regexDedup.sharedModule must name an ESM .mjs file.');
		const modulePath = resolve(cfg.root, cfg.regexDedup.sharedModule);
		if (relative(cfg.root, modulePath) === '..' || relative(cfg.root, modulePath).startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`))
			throw new Error('regexDedup.sharedModule must stay inside the repository root.');
		const declarationPath = modulePath.replace(/\.mjs$/, '.d.mts');
		const groups = [...regexGroups(cfg, analysis)].filter(([, candidates]) => candidates.length >= (cfg.regexDedup?.minimumCount ?? 2));
		if (!groups.length) return { fixed: 0, skipped: 0 };
		const registry = ((moduleExists: boolean, declarationExists: boolean) => {
			const module = moduleExists ? readFileSync(modulePath, 'utf8') : `${REGEX_REGISTRY_MARKER}\n`;
			const declaration = declarationExists ? readFileSync(declarationPath, 'utf8') : `${REGEX_DECLARATION_MARKER}\n`;
			if ((moduleExists || declarationExists) && !(module.startsWith(REGEX_REGISTRY_MARKER) && declaration.startsWith(REGEX_DECLARATION_MARKER))) return null;
			const keys = new Map<string, string>();
			for (const match of module.matchAll(/^\/\/ @terra-quality-regex-key (.+)\r?\n(?:\/\*[\s\S]*?\*\/\r?\n)?export const ([A-Za-z_$][\w$]*)\b/gm)) {
				try {
					keys.set(JSON.parse(match[1]!) as string, match[2]!);
				} catch {
					// An invalid generated annotation is not used as a key; the export remains collision-protected.
				}
			}
			return { module, declaration, keys };
		})(existsSync(modulePath), existsSync(declarationPath));
		if (!registry)
			return {
				fixed: 0,
				skipped: groups.reduce((count, [, candidates]) => count + candidates.length, 0),
			};
		const rewritable = groups.filter(([, candidates]) => candidates.every((candidate) => candidate.rewritable && isEsmConsumer(cfg, candidate.file)));
		let skipped = groups
			.filter(([, candidates]) => !candidates.every((candidate) => candidate.rewritable && isEsmConsumer(cfg, candidate.file)))
			.reduce((count, [, candidates]) => count + candidates.length, 0);
		if (!rewritable.length) return { fixed: 0, skipped };
		const usedExports = new Set([...registry.module.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map((match) => match[1]!));
		const namesByKey = new Map(registry.keys);
		const newEntries: Array<{ key: string; name: string; expr: string }> = [];
		const groupNames = new Map<string, string>();
		for (const [key, candidates] of rewritable.sort(([left], [right]) => left.localeCompare(right))) {
			let name = namesByKey.get(key);
			if (!name) {
				const base = `REGEX_${key.replace(A_ZA_Z0_9_G_REGEX(), '_').replace(G_REGEX(), '').slice(0, 60).toUpperCase() || 'PATTERN'}_REGEX`;
				name = base;
				for (let suffix = 2; usedExports.has(name); suffix++) name = `${base}_${suffix}`;
				usedExports.add(name);
				namesByKey.set(key, name);
				newEntries.push({ key, name, expr: candidates[0]!.expr });
			}
			groupNames.set(key, name);
		}
		const moduleAdditions = newEntries
			.map(
				({ key, name, expr }) =>
					`// @terra-quality-regex-key ${JSON.stringify(key)}\n/**\n * Creates a fresh regular expression instance for the shared pattern.\n *\n * @returns A new RegExp instance.\n */\nexport const ${name} = () => (\n${expr
						.split('\n')
						.map((line) => `\t${line}`)
						.join('\n')}\n);`,
			)
			.join('\n\n');
		const moduleSrc = `${registry.module.replace(/\s*$/, '')}${moduleAdditions ? `\n\n${moduleAdditions}\n` : `\n`}`;
		const declarationSrc = `${REGEX_DECLARATION_MARKER}\n${[...new Set([...moduleSrc.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map((match) => match[1]!))]
			.sort()
			.map((name) => `export declare const ${name}: () => RegExp;`)
			.join('\n')}${[...new Set([...moduleSrc.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map((match) => match[1]!))].length ? '\n' : ''}`;
		const srcEdits = new Map<
			string,
			{
				source: string;
				ast: ts.SourceFile;
				edits: Array<{ start: number; end: number; replacement: string }>;
				alias: string;
				specifier: string;
			}
		>();
		let fixed = 0;
		for (const [key, candidates] of rewritable) {
			for (const candidate of candidates) {
				let fileEdits = srcEdits.get(candidate.file);
				if (!fileEdits) {
					fileEdits = {
						source: analysis?.texts.get(candidate.file) ?? readFileSync(candidate.file, 'utf8'),
						ast: candidate.ast,
						edits: [],
						alias: ((existingAlias, names) => {
							let alias = existingAlias ?? 'TerraQualityRegex';
							for (let suffix = 2; !existingAlias && names.has(alias); suffix++) alias = `TerraQualityRegex${suffix}`;
							return alias;
						})(namespaceImport(candidate.ast, candidate.file, modulePath), identifierNames(candidate.ast)),
						specifier: ((specifier) => (specifier.startsWith('.') ? specifier : `./${specifier}`))(relative(dirname(candidate.file), modulePath).replace(G_CLASS_2(), '/')),
					};
					srcEdits.set(candidate.file, fileEdits);
				}
				fileEdits.edits.push({
					start: candidate.node.getStart(candidate.ast),
					end: candidate.node.end,
					replacement: `${fileEdits.alias}.${groupNames.get(key)!}()`,
				});
				fixed++;
			}
		}
		const updatedSrcs = new Map<string, string>();
		for (const [file, fileEdits] of srcEdits) {
			let updated = fileEdits.source;
			for (const edit of fileEdits.edits.sort((left, right) => right.start - left.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
			if (!namespaceImport(fileEdits.ast, file, modulePath)) {
				const ast = ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, regexScriptKind(file));
				const eol = updated.includes('\r\n') ? '\r\n' : '\n';
				let at = 0;
				for (const statement of ast.statements) {
					if (ts.isImportDeclaration(statement) || (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression))) at = statement.end;
					else break;
				}
				if (!at && ast.statements.length) {
					const first = ast.statements[0]!;
					at = first.getStart(ast);
					const directive = [...updated.slice(first.getFullStart(), first.getStart(ast)).matchAll(/^[ \t]*\/\/[^\r\n]*(?:eslint-disable-next-line|@ts-ignore|@ts-expect-error)[^\r\n]*/gm)].at(-1);
					if (directive?.index !== undefined) at = first.getFullStart() + directive.index;
				}
				if (!at && updated.startsWith('#!')) {
					const shebangEnd = updated.indexOf('\n');
					at = shebangEnd < 0 ? updated.length : shebangEnd + 1;
				}
				const before = updated.slice(0, at);
				const after = updated.slice(at);
				updated = `${before}${at && !before.endsWith('\n') ? eol : ''}import * as ${fileEdits.alias} from '${fileEdits.specifier}';${after.startsWith('\n') || after.startsWith('\r\n') ? '' : eol}${after}`;
			}
			if (!validRegexOutput(file, updated)) {
				skipped += fileEdits.edits.length;
				fixed -= fileEdits.edits.length;
				continue;
			}
			updatedSrcs.set(file, updated);
		}
		if ([...updatedSrcs].length !== srcEdits.size || !validRegexOutput(modulePath, moduleSrc) || !validRegexOutput(declarationPath, declarationSrc))
			return {
				fixed: 0,
				skipped:
					groups
						.filter(([, candidates]) => candidates.every((candidate) => candidate.rewritable && isEsmConsumer(cfg, candidate.file)))
						.reduce((count, [, candidates]) => count + candidates.length, 0) + skipped,
			};
		mkdirSync(dirname(modulePath), { recursive: true });
		writeFileSync(modulePath, moduleSrc);
		writeFileSync(declarationPath, declarationSrc);
		for (const [file, source] of updatedSrcs) writeFileSync(file, source);
		return { fixed, skipped };
	}
	let fixed = 0;
	let skipped = 0;
	const files = new Map<string, RegexCandidate[]>();
	for (const candidate of [...regexGroups(cfg, analysis).values()].flat()) {
		if (!ts.isRegularExpressionLiteral(candidate.node)) continue;
		files.set(candidate.file, [...(files.get(candidate.file) ?? []), candidate]);
	}
	for (const [file, candidates] of files) {
		const localGroups = new Map<string, RegexCandidate[]>();
		for (const candidate of candidates) localGroups.set(candidate.source, [...(localGroups.get(candidate.source) ?? []), candidate]);
		const matches = [...localGroups].filter(([, nodes]) => nodes.length >= (cfg.regexDedup?.minimumCount ?? 2));
		const classData = matches.reduce(
			(state, [, nodes]) => {
				const name = classConstName(nodes[0]!.expr.replace(/\W+/g, '_'), state.used).replace(/_CLASS$/, '_REGEX');
				const flags = nodes[0]!.expr.slice(nodes[0]!.expr.lastIndexOf('/') + 1);
				const stateful = flags.includes('g') || flags.includes('y');
				state.declarations.push(`const ${name} = ${stateful ? `() => ${nodes[0]!.expr}` : nodes[0]!.expr};`);
				for (const candidate of nodes)
					state.edits.push({
						start: candidate.node.getStart(candidate.ast),
						end: candidate.node.end,
						replacement: stateful ? `${name}()` : name,
					});
				state.fixed += nodes.length;
				return state;
			},
			{
				used: identifierNames(candidates[0]!.ast),
				declarations: [] as string[],
				edits: [] as Array<{ start: number; end: number; replacement: string }>,
				fixed: 0,
			},
		);
		fixed += classData.fixed;
		const matchingCount = matches.reduce((count, [, nodes]) => count + nodes.length, 0);
		if (!classData.edits.length) continue;
		let updated = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		for (const edit of classData.edits.sort((left, right) => right.start - left.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		const withGroup = insertCfgGroup(updated, 'REGEX', classData.declarations, file);
		if (withGroup === updated || !writePatternSrc(file, withGroup)) {
			fixed -= matchingCount;
			skipped += matchingCount;
		}
	}
	return { fixed, skipped };
}
