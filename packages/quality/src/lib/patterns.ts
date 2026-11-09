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
import { dirname, relative, resolve } from 'node:path';
import { displayPath, srcFiles } from './files.js';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const D_U_REGEX = /_(\d+)$/u;
const T_R_N_ESLINT_DISABLE_NEXT_LINE_TS_IGNORE_TS_EXPECT_ERR_R_N_GM_REGEX = () => /^[ \t]*\/\/[^\r\n]*(?:eslint-disable-next-line|@ts-ignore|@ts-expect-error)[^\r\n]*/gm;
/** Creates a regular expression that extracts non-whitespace class tokens. */
const NONSPACE_G_REGEX = () => /\S+/g;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

/**
 * Creates a regular expression that removes non-alphanumeric runs from identifier text.
 * @return A fresh global regular expression.
 */
const A_ZA_Z0_9_G_REGEX = () => /[^A-Za-z0-9]+/g;
/**
 * Creates a regular expression that trims underscores from identifier boundaries.
 * @return A fresh global regular expression.
 */
const G_REGEX = () => /^_+|_+$/g;
/**
 * Creates a regular expression that matches backslashes in source text.
 * @return A fresh global regular expression.
 */
const G_CLASS_2 = () => /\\/g;
/**
 * Creates a regular expression that finds exported constant declarations.
 * @return A fresh multiline global regular expression.
 */
const EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX = () => /^export const ([A-Za-z_$][\w$]*)\b/gm;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

/**
 * Creates a regular expression that matches whitespace runs.
 * @return A fresh global regular expression.
 */
const S_G_REGEX = () => /\s+/g;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

/** Counts exact edits applied and conservative candidates left for review. */
export type PatternFixResult = { fixed: number; skipped: number };

/** A repeated collection lookup inside another collection callback. */
export type PerformancePatternFinding = { file: string; line: number; column: number; method: string; receiver: string; recommendation: string };
/**
 * Reports repeated linear lookups nested in collection callbacks without changing source.
 *
 * @param cfg Quality configuration defining pattern rules and source roots.
 * @param analysis Optional shared analysis context for reusing source text and ASTs.
 *
 * @return Repeated collection lookups that occur inside collection callbacks.
 */
export function performancePatternFindings(cfg: QualityCfg, analysis?: QualityAnalysis): PerformancePatternFinding[] {
	const settings = cfg.performancePatterns;
	if (!settings) return [];
	const exts = new Set(settings.extensions ?? ['.js', '.jsx', '.ts', '.tsx']);
	const findings: PerformancePatternFinding[] = [];
	for (const file of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		if (!exts.has(file.slice(file.lastIndexOf('.')))) continue;
		const display = displayPath(cfg, file);
		if ((settings.ignoredFiles ?? []).includes(display)) continue;
		const source = analysis?.sources.get(file) ?? ts.createSourceFile(file, analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, regexScriptKind(file));
		if ((source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) continue;
		const stack: ts.Node[] = [source];
		while (stack.length) {
			const node = stack.pop()!;
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
				const method = node.expression.name.text;
				if (method === 'find' || method === 'filter' || method === 'includes' || method === 'indexOf' || method === 'some') {
					for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
						if (!ts.isFunctionLike(current)) continue;
						const call = current.parent;
						if (!ts.isCallExpression(call) || !call.arguments.includes(current as ts.Expression)) continue;
						if (
							!ts.isPropertyAccessExpression(call.expression) ||
							(call.expression.name.text !== 'filter' &&
								call.expression.name.text !== 'flatMap' &&
								call.expression.name.text !== 'forEach' &&
								call.expression.name.text !== 'map' &&
								call.expression.name.text !== 'reduce' &&
								call.expression.name.text !== 'some')
						)
							continue;
						const expr = node.expression.expression;
						const receiver = ts.isIdentifier(expr) ? expr.text : ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) ? expr.getText() : undefined;
						if (receiver) {
							findings.push({
								file: display,
								line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
								column: source.getLineAndCharacterOfPosition(node.getStart(source)).character + 1,
								method,
								receiver,
								recommendation: `Consider precomputing a Map or Set for ${receiver} before this collection callback; measure the representative path before changing it.`,
							});
						}
						break;
					}
				}
			}
			const children: ts.Node[] = [];
			ts.forEachChild(node, (child) => {
				children.push(child);
			});
			for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
		}
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
		.map(([v, l]) => ({ value: v, count: l.length, locations: l.sort((l, r) => l.localeCompare(r, undefined, { numeric: true })) }));
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
	while (used.has(name)) name = `${name.replace(/_\d+$/u, '')}_${Number(name.match(D_U_REGEX)?.[1] ?? 1) + 1}`;
	used.add(name);
	return name;
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
	const cfg = /\/\*\/{10,}\r?\n[ \t]*CONFIG[ \t]*\r?\n[ \t]*\/{10,}\*\//.exec(src);
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
		const matches = [...src.matchAll(/\b(class|className)(\s*=\s*)(['"])([^'"\n]+)\3/g)].map((m) => ({ match: m, value: m[4]!.replace(S_G_REGEX(), ' ').trim() }));
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
			for (const { match } of entries) edits.push({ start: match.index!, end: match.index! + match[0].length, replacement: `${match[1]}${match[2]}{${name}}` });
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
	return ((patterns) => {
		if (!patterns.length) return [];
		const exts = settings.extensions ?? ['.astro', '.html', '.jsx', '.tsx'];
		return (analysis?.files ?? srcFiles({ ...cfg, extensions: exts }))
			.filter((file) => exts.includes(file.slice(file.lastIndexOf('.'))))
			.flatMap((file) => {
				return patterns.filter(([, expression]) => expression.test(analysis?.texts.get(file) ?? readFileSync(file, 'utf8'))).map(([pattern]) => ({ file: displayPath(cfg, file), pattern }));
			});
	})((settings.forbidden ?? []).map((pattern) => [pattern, new RegExp(pattern, 'm')] as const));
}

/*//////////////////////////////////////////////////
TAILWIND
//////////////////////////////////////////////////*/

/**
 * Converts a source offset into the one-based line and column used by diagnostics.
 *
 * @param src Source text containing the offset.
 * @param offset Zero-based character offset in the source.
 *
 * @return One-based source location.
 */
/**
 * Runs the Tailwind v4 canonical-class diagnostic used by the quality CLI.
 *
 * @param cfg Quality configuration containing the Tailwind stylesheet and source roots.
 * @param fix Whether canonical replacements should be written to source files.
 * @param output Optional callbacks and output controls for reporting findings.
 *
 * @return Promise resolving to zero after diagnostics or fixes complete.
 */
export async function runTailwindCanonical(cfg: QualityCfg, fix = false, output: { quiet?: boolean; onFinding?: (message: string) => void; onSkip?: () => void } = {}): Promise<number> {
	if (!cfg.tailwindCanonical) return 0;
	const stylesheetPath = resolve(cfg.root, cfg.tailwindCanonical.stylesheet);
	if (!existsSync(stylesheetPath)) throw new Error(`Tailwind stylesheet not found: ${stylesheetPath}`);
	let tailwind: {
		__unstable__loadDesignSystem?: (
			css: string,
			opts: { from: string; loadStylesheet: (id: string, base: string) => Promise<{ path: string; base: string; content: string }> },
		) => Promise<{ canonicalizeCandidates: (candidates: string[]) => string[] }>;
	};
	try {
		const manifestPath = createRequire(resolve(cfg.root, 'package.json')).resolve('tailwindcss/package.json', {
			paths: [cfg.root, resolve(cfg.root, 'astro'), dirname(stylesheetPath), resolve(dirname(stylesheetPath), '..')],
		});
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { exports?: { '.': { import?: string } }; module?: string; main?: string };
		const entry = manifest.exports?.['.']?.import ?? manifest.module ?? manifest.main;
		if (!entry) throw new Error('Tailwind package does not expose an import entry.');
		tailwind = (await import(pathToFileURL(resolve(dirname(manifestPath), entry)).href)) as typeof tailwind;
	} catch {
		throw new Error('Tailwind canonical check could not load the consumer repository Tailwind package.');
	}
	if (!tailwind.__unstable__loadDesignSystem) {
		output.onSkip?.();
		if (!output.quiet) console.info('Tailwind canonical check skipped: installed Tailwind does not expose v4 canonical-class diagnostics.');
		return 0;
	}
	const designSystem = await tailwind.__unstable__loadDesignSystem(readFileSync(stylesheetPath, 'utf8'), {
		from: stylesheetPath,
		loadStylesheet: async (id, base) => {
			const stylesheetDir = dirname(stylesheetPath);
			const path = (() => {
				for (const candidate of [
					({ tailwindcss: 'tailwindcss/index.css', 'tw-animate-css': 'tw-animate-css/dist/tw-animate.css', 'shadcn/tailwind.css': 'shadcn/dist/tailwind.css' } as Record<string, string>)[id],
					id,
				].filter((candidate): candidate is string => Boolean(candidate))) {
					for (const directPath of [resolve(cfg.root, 'node_modules'), resolve(cfg.root, 'astro/node_modules'), resolve(stylesheetDir, 'node_modules'), resolve(stylesheetDir, '../node_modules')].map(
						(packageRoot) => resolve(packageRoot, candidate),
					))
						if (existsSync(directPath) && statSync(directPath).isFile()) return directPath;
					try {
						return createRequire(resolve(cfg.root, 'package.json')).resolve(candidate, { paths: [base, stylesheetDir, resolve(stylesheetDir, '..'), cfg.root, resolve(cfg.root, 'astro')] });
					} catch {
						// Try the next package-resolution strategy.
					}
				}
				return resolve(base, id);
			})();
			if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`Tailwind stylesheet import does not resolve to a file: ${id}`);
			return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
		},
	});
	const files = srcFiles(cfg.tailwindCanonical.sourceRoots ? { ...cfg, sourceRoots: cfg.tailwindCanonical.sourceRoots.map((r) => resolve(cfg.root, r)) } : cfg).filter((f) =>
		/\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f),
	);
	const findings: { file: string; start: number; end: number; original: string; replacement: string; line: number; column: number }[] = [];
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		for (const match of source.matchAll(/\b(?:class|className)\s*=\s*(?:(['"])([\s\S]*?)\1|\{\s*`([\s\S]*?)`\s*\})/g)) {
			const value = match[2] ?? match[3] ?? '';
			const start = match.index! + match[0].indexOf(value);
			let segmentStart = 0;
			for (const interpolation of value.matchAll(/\$\{[\s\S]*?\}/g)) {
				if (interpolation.index! > segmentStart)
					for (const token of value.slice(segmentStart, interpolation.index).matchAll(NONSPACE_G_REGEX())) {
						const original = token[0]!;
						const replacement = designSystem.canonicalizeCandidates([original])[0];
						if (!replacement || replacement === original || replacement.includes(' ')) continue;
						const candidateStart = start + segmentStart + token.index!;
						const before = source.slice(0, candidateStart);
						findings.push({
							file,
							start: candidateStart,
							end: candidateStart + original.length,
							original,
							replacement,
							line: before.split('\n').length,
							column: candidateStart - before.lastIndexOf('\n'),
						});
					}
				segmentStart = interpolation.index! + interpolation[0].length;
			}
			if (segmentStart < value.length)
				for (const token of value.slice(segmentStart).matchAll(NONSPACE_G_REGEX())) {
					const original = token[0]!;
					const replacement = designSystem.canonicalizeCandidates([original])[0];
					if (!replacement || replacement === original || replacement.includes(' ')) continue;
					const candidateStart = start + segmentStart + token.index!;
					const before = source.slice(0, candidateStart);
					findings.push({
						file,
						start: candidateStart,
						end: candidateStart + original.length,
						original,
						replacement,
						line: before.split('\n').length,
						column: candidateStart - before.lastIndexOf('\n'),
					});
				}
		}
		for (const call of source.matchAll(/\b(?:cn|clsx|classnames|cva)\s*\(/g)) {
			let depth = 1;
			let cursor = call.index! + call[0].length;
			while (cursor < source.length && depth > 0) {
				if (source[cursor] === '(') depth += 1;
				if (source[cursor] === ')') depth -= 1;
				cursor += 1;
			}
			for (const value of source.slice(call.index! + call[0].length, cursor - 1).matchAll(/(['"`])([\s\S]*?)\1/g)) {
				if (value[2]!.includes('${')) continue;
				for (const token of value[2]!.matchAll(NONSPACE_G_REGEX())) {
					const original = token[0]!;
					const replacement = designSystem.canonicalizeCandidates([original])[0];
					if (!replacement || replacement === original || replacement.includes(' ')) continue;
					const candidateStart = call.index! + call[0].length + value.index! + 1 + token.index!;
					const before = source.slice(0, candidateStart);
					findings.push({
						file,
						start: candidateStart,
						end: candidateStart + original.length,
						original,
						replacement,
						line: before.split('\n').length,
						column: candidateStart - before.lastIndexOf('\n'),
					});
				}
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
	const candidates: RegexCandidate[] = [];
	for (const file of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		if (!exts.has(file.slice(file.lastIndexOf('.'))) || file.endsWith('.d.mts') || (registryPath && resolve(file) === registryPath)) continue;
		const ast = analysis?.sources.get(file) ?? ts.createSourceFile(file, analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, regexScriptKind(file));
		const stack: ts.Node[] = [ast];
		while (stack.length) {
			const node = stack.pop()!;
			if (ts.isRegularExpressionLiteral(node)) {
				let declaration: ts.VariableDeclaration | undefined;
				for (let current: ts.Node | undefined = node; current && !ts.isSourceFile(current); current = current.parent) {
					if (ts.isVariableDeclaration(current)) {
						declaration = current;
						break;
					}
				}
				if (
					!declaration ||
					!ts.isIdentifier(declaration.name) ||
					!declaration.name.text.endsWith('_REGEX') ||
					[...ast.text.slice(0, declaration.getStart(ast)).matchAll(/\/\*\/{10,}\r?\n[ \t]*([A-Z][A-Z _-]*)[ \t]*\r?\n[ \t]*\/{10,}\*\//g)].at(-1)?.[1] !== 'REGEX'
				) {
					const literal = node.getText(ast);
					const end = literal.lastIndexOf('/');
					const pattern = literal.slice(1, end);
					const flags = literal.slice(end + 1);
					candidates.push({ file, source: flags ? `${pattern}/${flags}` : pattern, expression: literal, node, ast, rewritable: true });
				}
			} else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'RegExp' && !node.typeArguments?.length) {
				const [pattern, flags, ...rest] = node.arguments ?? [];
				if (!rest.length && (ts.isStringLiteral(pattern) || ts.isNoSubstitutionTemplateLiteral(pattern)) && (!flags || ts.isStringLiteral(flags))) {
					candidates.push({ file, source: flags ? `${pattern.getText(ast)}, ${flags.getText(ast)}` : pattern.getText(ast), expression: node.getText(ast), node, ast, rewritable: false });
				}
			}
			const children: ts.Node[] = [];
			ts.forEachChild(node, (child) => {
				children.push(child);
			});
			for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]!);
		}
		const bindingHasRegExp = (name: ts.BindingName): boolean => {
			if (ts.isIdentifier(name)) return name.text === 'RegExp';
			return name.elements.some((element) => ts.isBindingElement(element) && bindingHasRegExp(element.name));
		};
		let found = false;
		const bindingStack: ts.Node[] = [ast];
		while (bindingStack.length && !found) {
			const node = bindingStack.pop()!;
			if (
				(ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) &&
				node.name &&
				bindingHasRegExp(node.name as ts.BindingName)
			) {
				found = true;
				continue;
			}
			if ((ts.isImportClause(node) && node.name?.text === 'RegExp') || (ts.isImportSpecifier(node) && node.name.text === 'RegExp')) {
				found = true;
				continue;
			}
			if (ts.isCatchClause(node) && node.variableDeclaration && bindingHasRegExp(node.variableDeclaration.name)) {
				found = true;
				continue;
			}
			const children: ts.Node[] = [];
			ts.forEachChild(node, (child) => {
				children.push(child);
			});
			for (let index = children.length - 1; index >= 0; index--) bindingStack.push(children[index]!);
		}
		for (const candidate of candidates) if (candidate.ast === ast && ts.isNewExpression(candidate.node)) candidate.rewritable = !found;
	}
	return candidates;
}
/**
 * Groups parsed regex candidates by their exact source representation.
 *
 * @param cfg Quality configuration defining source roots and extensions.
 * @param analysis Optional shared analysis context for reusing parsed sources.
 * @param candidates Parsed regular-expression candidates to group.
 *
 * @return Candidate groups keyed by regex source and flags.
 */
function regexGroups(cfg: QualityCfg, analysis?: QualityAnalysis, candidates = regexCandidates(cfg, analysis)): Map<string, RegexCandidate[]> {
	if (!candidates.length) return new Map();
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
		.filter(([, c]) => c.length >= (cfg.regexDedup?.minimumCount ?? 2))
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
	const stack: ts.Node[] = [ast];
	while (stack.length) {
		const node = stack.pop()!;
		if (ts.isIdentifier(node)) names.add(node.text);
		const children: ts.Node[] = [];
		ts.forEachChild(node, (child) => {
			children.push(child);
		});
		for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]!);
	}
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
	if (cfg.regexDedup?.sharedModule) {
		const sharedModule = cfg.regexDedup!.sharedModule!;
		if (!sharedModule.endsWith('.mjs')) throw new Error('regexDedup.sharedModule must name an ESM .mjs file.');
		const modulePath = resolve(cfg.root, sharedModule);
		const moduleRelative = relative(cfg.root, modulePath);
		if (moduleRelative === '..' || moduleRelative.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('regexDedup.sharedModule must stay inside the repository root.');
		const declarationPath = modulePath.replace(/\.mjs$/, '.d.mts');
		const groups = [...regexGroups(cfg, analysis)].filter(([, c]) => c.length >= (cfg.regexDedup?.minimumCount ?? 2));
		if (!groups.length) return { fixed: 0, skipped: 0 };
		const registry = (() => {
			const moduleExists = existsSync(modulePath);
			const declarationExists = existsSync(declarationPath);
			const module = moduleExists ? readFileSync(modulePath, 'utf8') : `${REGEX_REGISTRY_MARKER}\n`;
			const declaration = declarationExists ? readFileSync(declarationPath, 'utf8') : `${REGEX_DECLARATION_MARKER}\n`;
			const owned = module.startsWith(REGEX_REGISTRY_MARKER) && declaration.startsWith(REGEX_DECLARATION_MARKER);
			if ((moduleExists || declarationExists) && !owned) return null;
			return {
				module,
				declaration,
				names: new Set([...module.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map((match) => match[1]!)),
				keys: new Map<string, string>(
					[...module.matchAll(/^\/\/ @terra-quality-regex-key (.+)\r?\nexport const ([A-Za-z_$][\w$]*)\b/gm)].flatMap((match) => {
						try {
							return [[JSON.parse(match[1]!) as string, match[2]!]];
						} catch {
							// An invalid generated annotation is not used as a key; the export remains collision-protected.
							return [];
						}
					}),
				),
				owned,
			};
		})();
		if (!registry) return { fixed: 0, skipped: groups.reduce((c, [, v]) => c + v.length, 0) };
		const rewritable = groups.filter(([, c]) => c.every((c) => c.rewritable && isEsmConsumer(cfg, c.file)));
		let skipped = groups.filter(([, c]) => !c.every((c) => c.rewritable && isEsmConsumer(cfg, c.file))).reduce((c, [, v]) => c + v.length, 0);
		if (!rewritable.length) return { fixed: 0, skipped };
		const usedExports = new Set(registry.names);
		const namesByKey = new Map(registry.keys);
		const newEntries: Array<{ key: string; name: string; expression: string }> = [];
		const groupNames = new Map<string, string>();
		for (const [key, candidates] of rewritable.sort(([l], [r]) => l.localeCompare(r))) {
			let name = namesByKey.get(key);
			if (!name) {
				const base = `REGEX_${key.replace(A_ZA_Z0_9_G_REGEX(), '_').replace(G_REGEX(), '').slice(0, 60).toUpperCase() || 'PATTERN'}_REGEX`;
				name = base;
				while (usedExports.has(name)) name = `${base}_${Number(name.match(D_U_REGEX)?.[1] ?? 1) + 1}`;
				usedExports.add(name);
				namesByKey.set(key, name);
				newEntries.push({ key, name, expression: candidates[0]!.expression });
			}
			groupNames.set(key, name);
		}
		const eol = '\n';
		const moduleAdditions = newEntries
			.map(
				({ key: k, name: n, expression: e }) =>
					`// @terra-quality-regex-key ${JSON.stringify(k)}\nexport const ${n} = () => (\n${e
						.split('\n')
						.map((l) => `\t${l}`)
						.join('\n')}\n);`,
			)
			.join(`${eol}${eol}`);
		const moduleSrc = `${registry.module.replace(/\s*$/, '')}${moduleAdditions ? `${eol}${eol}${moduleAdditions}${eol}` : `${eol}`}`;
		const declarationSrc = `${REGEX_DECLARATION_MARKER}\n${[...new Set([...moduleSrc.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map((match) => match[1]!))]
			.sort()
			.map((name) => `export declare const ${name}: () => RegExp;`)
			.join('\n')}${[...moduleSrc.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].length ? '\n' : ''}`;
		const srcEdits = new Map<string, { source: string; ast: ts.SourceFile; edits: Array<{ start: number; end: number; replacement: string }>; alias: string; specifier: string }>();
		let fixed = 0;
		for (const [key, candidates] of rewritable) {
			for (const candidate of candidates) {
				let fileEdits = srcEdits.get(candidate.file);
				if (!fileEdits) {
					const existingAlias = namespaceImport(candidate.ast, candidate.file, modulePath);
					let alias = existingAlias ?? 'TerraQualityRegex';
					while (!existingAlias && identifierNames(candidate.ast).has(alias)) alias = `TerraQualityRegex${alias === 'TerraQualityRegex' ? 2 : Number(alias.slice('TerraQualityRegex'.length)) + 1}`;
					fileEdits = {
						source: analysis?.texts.get(candidate.file) ?? readFileSync(candidate.file, 'utf8'),
						ast: candidate.ast,
						edits: [],
						alias,
						specifier: relative(dirname(candidate.file), modulePath)
							.replace(G_CLASS_2(), '/')
							.replace(/^(?!\.)/, './'),
					};
					srcEdits.set(candidate.file, fileEdits);
				}
				fileEdits.edits.push({ start: candidate.node.getStart(candidate.ast), end: candidate.node.end, replacement: `${fileEdits.alias}.${groupNames.get(key)!}()` });
				fixed++;
			}
		}
		const updatedSrcs = new Map<string, string>();
		for (const [file, fileEdits] of srcEdits) {
			let updated = fileEdits.source;
			for (const edit of fileEdits.edits.sort((l, r) => r.start - l.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
			if (!namespaceImport(fileEdits.ast, file, modulePath)) {
				const eol = updated.includes('\r\n') ? '\r\n' : '\n';
				let at = 0;
				let first: ts.Statement | undefined;
				for (const statement of ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, regexScriptKind(file)).statements) {
					first ??= statement;
					if (ts.isImportDeclaration(statement) || (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression))) at = statement.end;
					else break;
				}
				if (!at && first) {
					at = first.getStart();
					if ([...updated.slice(first.getFullStart(), first.getStart()).matchAll(T_R_N_ESLINT_DISABLE_NEXT_LINE_TS_IGNORE_TS_EXPECT_ERR_R_N_GM_REGEX())].at(-1)?.index !== undefined)
						at = first.getFullStart() + [...updated.slice(first.getFullStart(), first.getStart()).matchAll(T_R_N_ESLINT_DISABLE_NEXT_LINE_TS_IGNORE_TS_EXPECT_ERR_R_N_GM_REGEX())].at(-1)!.index!;
				}
				if (!at && updated.startsWith('#!')) {
					const shebangEnd = updated.indexOf('\n');
					at = shebangEnd < 0 ? updated.length : shebangEnd + 1;
				}
				updated = `${updated.slice(0, at)}${at && !updated.slice(0, at).endsWith('\n') ? eol : ''}import * as ${fileEdits.alias} from '${fileEdits.specifier}';${updated.slice(at).startsWith('\n') || updated.slice(at).startsWith('\r\n') ? '' : eol}${updated.slice(at)}`;
			}
			if (!validRegexOutput(file, updated)) {
				skipped += fileEdits.edits.length;
				fixed -= fileEdits.edits.length;
				continue;
			}
			updatedSrcs.set(file, updated);
		}
		if ([...updatedSrcs].length !== srcEdits.size || !validRegexOutput(modulePath, moduleSrc) || !validRegexOutput(declarationPath, declarationSrc))
			return { fixed: 0, skipped: groups.filter(([, c]) => c.every((c) => c.rewritable && isEsmConsumer(cfg, c.file))).reduce((c, [, v]) => c + v.length, 0) + skipped };
		mkdirSync(dirname(modulePath), { recursive: true });
		writeFileSync(modulePath, moduleSrc);
		writeFileSync(declarationPath, declarationSrc);
		for (const [file, source] of updatedSrcs) writeFileSync(file, source);
		return { fixed, skipped };
	}
	let fixed = 0;
	let skipped = 0;
	const files = new Map<string, RegexCandidate[]>();
	for (const candidate of [...regexGroups(cfg, analysis, regexCandidates(cfg, analysis)).values()].flat()) {
		if (!ts.isRegularExpressionLiteral(candidate.node)) continue;
		files.set(candidate.file, [...(files.get(candidate.file) ?? []), candidate]);
	}
	for (const [file, candidates] of files) {
		const localGroups = new Map<string, RegexCandidate[]>();
		for (const candidate of candidates) localGroups.set(candidate.source, [...(localGroups.get(candidate.source) ?? []), candidate]);
		const matches = [...localGroups].filter(([, n]) => n.length >= (cfg.regexDedup?.minimumCount ?? 2));
		const declarations: string[] = [];
		const edits: Array<{ start: number; end: number; replacement: string }> = [];
		for (const [, nodes] of matches) {
			const name = classConstName(
				nodes[0]!.expression.replace(/\W+/g, '_'),
				new Set([
					...identifierNames(candidates[0]!.ast),
					...declarations
						.join('\n')
						.replace(/^const /gmu, '')
						.replace(/ =.*$/gmu, '')
						.split('\n')
						.filter(Boolean),
				]),
			).replace(/_CLASS$/, '_REGEX');
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
		const withGroup = insertCfgGroup(updated, 'REGEX', declarations, file);
		if (withGroup === updated || !writePatternSrc(file, withGroup)) {
			fixed -= matchingCount;
			skipped += matchingCount;
		}
	}
	return { fixed, skipped };
}
