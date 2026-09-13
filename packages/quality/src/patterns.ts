/**
 * packages/quality/src/patterns.ts
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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type RepeatedClassFinding = { value: string; count: number; locations: string[] };
export type UiPatternFinding = { file: string; pattern: string };

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

export type RegexFinding = { source: string; count: number; locations: string[] };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reports repeated static class strings without assuming a framework.
 *
 * @param cfg Quality configuration defining the source roots and repeated-class policy.
 *
 * @return Repeated static class strings that meet the configured minimum count.
 */
export function repeatedClassFindings(cfg: QualityCfg): RepeatedClassFinding[] {
	const settings = cfg.repeatedClasses ?? {};
	const minimum = settings.minimumCount ?? 3;
	const exts = new Set(settings.extensions ?? ['.astro', '.html', '.js', '.jsx', '.ts', '.tsx']);
	const ignored = new Set(['test', 'tests', ...(settings.ignoredDirectories ?? ['node_modules', 'dist', 'build', 'coverage'])]);
	const vals = new Map<string, string[]>();
	for (const file of srcFiles({ ...cfg, extensions: [...exts] })) {
		if ([...ignored].some((d) => file.split('/').includes(d))) continue;
		const source = readFileSync(file, 'utf8');
		for (const match of source.matchAll(/\b(?:class|className)\s*=\s*(['"])([^'"\n]+)\1/g)) {
			const val = match[2].replace(/\s+/g, ' ').trim();
			if (val.includes('{') || val.split(' ').length < 2) continue;
			const location = `${displayPath(cfg, file)}:${source.slice(0, match.index ?? 0).split('\n').length}`;
			vals.set(val, [...(vals.get(val) ?? []), location]);
		}
	}
	return [...vals.entries()].filter(([, l]) => l.length >= minimum).map(([v, l]) => ({ value: v, count: l.length, locations: l }));
}

/**
 * Reports configured UI patterns that should use a shared primitive.
 *
 * @param cfg Quality configuration defining forbidden UI patterns and source scope.
 *
 * @return Matching file/pattern pairs that should use shared UI primitives.
 */
export function uiPatternFindings(cfg: QualityCfg): UiPatternFinding[] {
	const settings = cfg.uiPatterns ?? {};
	const patterns = (settings.forbidden ?? []).map((p) => [p, new RegExp(p, 'm')] as const);
	const exts = settings.extensions ?? ['.astro', '.html', '.jsx', '.tsx'];
	const ignored = new Set(settings.ignoredFiles ?? []);
	return srcFiles({ ...cfg, extensions: exts }).flatMap((f) => {
		const name = displayPath(cfg, f);
		if (ignored.has(name)) return [];
		const src = readFileSync(f, 'utf8');
		return patterns.filter(([, p]) => p.test(src)).map(([p]) => ({ file: name, pattern: p }));
	});
}

/*//////////////////////////////////////////////////
TAILWIND
//////////////////////////////////////////////////*/

/**
 * Resolves a stylesheet identifier using known package locations and Node's module resolver.
 *
 * @param root Repository root from which package resolution should begin.
 * @param id Stylesheet package identifier or path.
 * @param base Directory used for relative fallback resolution.
 *
 * @return Absolute path to the stylesheet candidate.
 */
function resolveStylesheet(root: string, id: string, base: string): string {
	const require = createRequire(resolve(root, 'package.json'));
	const known = { tailwindcss: 'tailwindcss/index.css', 'tw-animate-css': 'tw-animate-css/dist/tw-animate.css', 'shadcn/tailwind.css': 'shadcn/dist/tailwind.css' } as Record<string, string>;
	const candidates = [known[id], id].filter((c): c is string => Boolean(c));
	for (const candidate of candidates) {
		for (const packageRoot of [resolve(root, 'node_modules'), resolve(root, 'astro/node_modules')]) {
			const directPath = resolve(packageRoot, candidate);
			if (existsSync(directPath)) return directPath;
		}
		try {
			return require.resolve(candidate, { paths: [base, root, resolve(root, 'astro')] });
		} catch {
			// Try the next package-resolution strategy.
		}
	}
	return resolve(base, id);
}

/**
 * Loads a stylesheet and records the directory used to resolve its nested imports.
 *
 * @param root Repository root used for package resolution.
 * @param id Stylesheet package identifier or path.
 * @param base Base directory for fallback resolution.
 *
 * @return Loaded stylesheet path, resolution base, and source content.
 */
async function loadStylesheet(root: string, id: string, base: string): Promise<{ path: string; base: string; content: string }> {
	const path = resolveStylesheet(root, id, base);
	return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
}

/**
 * Resolves the consumer repository's Tailwind package entry from its package manifest.
 *
 * @param consumerRequire CommonJS resolver rooted at the consumer package.
 * @param root Repository root whose dependency tree should be searched.
 *
 * @return Absolute path to the Tailwind import entry.
 */
function resolveConsumerImport(consumerRequire: NodeRequire, root: string): string {
	const paths = [root, resolve(root, 'astro')];
	const manifestPath = consumerRequire.resolve('tailwindcss/package.json', { paths });
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { exports?: { '.': { import?: string } }; module?: string; main?: string };
	const entry = manifest.exports?.['.']?.import ?? manifest.module ?? manifest.main;
	if (!entry) throw new Error('Tailwind package does not expose an import entry.');
	return resolve(dirname(manifestPath), entry);
}

/**
 * Extracts static class-string segments from class attributes and common class-composition calls.
 *
 * @param src Source text to scan.
 *
 * @return Class segments and their offsets in the source text.
 */
function classVals(src: string): Array<{ start: number; value: string }> {
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
		const body = src.slice(bodyStart, cursor - 1);
		for (const value of body.matchAll(/(['"`])([\s\S]*?)\1/g)) if (!value[2]!.includes('${')) vals.push({ start: bodyStart + value.index! + 1, value: value[2]! });
	}
	return vals;
}

/**
 * Converts a source offset into the one-based line and column used by diagnostics.
 *
 * @param src Source text containing the offset.
 * @param offset Zero-based character offset in the source.
 *
 * @return One-based source location.
 */
function locationAt(src: string, offset: number): { line: number; column: number } {
	const before = src.slice(0, offset);
	return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}

/**
 * Runs the Tailwind v4 canonical-class diagnostic used by the quality CLI.
 *
 * @param cfg Quality configuration containing the Tailwind stylesheet and source roots.
 * @param fix Whether canonical replacements should be written to source files.
 *
 * @return Promise resolving to zero after diagnostics or fixes complete.
 */
export async function runTailwindCanonical(cfg: QualityCfg, fix = false): Promise<number> {
	if (!cfg.tailwindCanonical) return 0;
	const stylesheetPath = resolve(cfg.root, cfg.tailwindCanonical.stylesheet);
	if (!existsSync(stylesheetPath)) throw new Error(`Tailwind stylesheet not found: ${stylesheetPath}`);
	const consumerRequire = createRequire(resolve(cfg.root, 'package.json'));
	let tailwind: {
		__unstable__loadDesignSystem?: (
			css: string,
			opts: { from: string; loadStylesheet: (id: string, base: string) => Promise<{ path: string; base: string; content: string }> },
		) => Promise<{ canonicalizeCandidates: (candidates: string[]) => string[] }>;
	};
	try {
		const packagePath = resolveConsumerImport(consumerRequire, cfg.root);
		tailwind = (await import(pathToFileURL(packagePath).href)) as typeof tailwind;
	} catch {
		throw new Error('Tailwind canonical check could not load the consumer repository Tailwind package.');
	}
	if (!tailwind.__unstable__loadDesignSystem) {
		console.info('Tailwind canonical check skipped: installed Tailwind does not expose v4 canonical-class diagnostics.');
		return 0;
	}
	const stylesheet = readFileSync(stylesheetPath, 'utf8');
	const designSystem = await tailwind.__unstable__loadDesignSystem(stylesheet, { from: stylesheetPath, loadStylesheet: (id, base) => loadStylesheet(cfg.root, id, base) });
	const scanCfg = cfg.tailwindCanonical.sourceRoots ? { ...cfg, sourceRoots: cfg.tailwindCanonical.sourceRoots.map((r) => resolve(cfg.root, r)) } : cfg;
	const files = srcFiles(scanCfg).filter((f) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f));
	const findings: { file: string; start: number; end: number; original: string; replacement: string; line: number; column: number }[] = [];
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		for (const val of classVals(source)) {
			for (const token of val.value.matchAll(/\S+/g)) {
				const original = token[0]!;
				const replacement = designSystem.canonicalizeCandidates([original])[0];
				if (!replacement || replacement === original || replacement.includes(' ')) continue;
				const start = val.start + token.index!;
				findings.push({ file, start, end: start + original.length, original, replacement, ...locationAt(source, start) });
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
		console.info(`Tailwind canonical classes fixed: ${uniqueFindings.length}`);
		return 0;
	}
	for (const finding of uniqueFindings) console.error(`${relative(cfg.root, finding.file)}:${finding.line}:${finding.column} ${finding.original} -> ${finding.replacement}`);
	if (uniqueFindings.length) throw new Error(`Tailwind canonical class check failed with ${uniqueFindings.length} suggestion${uniqueFindings.length === 1 ? '' : 's'}.`);
	console.info(`Tailwind canonical class check passed: ${files.length} source files scanned.`);
	return 0;
}

/**
 * Reports exact duplicate regular-expression sources across source files.
 *
 * @param cfg Quality configuration defining regex extensions, exclusions, and threshold.
 * @param analysis Optional shared analysis context for reusing source text and ASTs.
 *
 * @return Duplicate regular-expression sources and their source locations.
 */
export function regexFindings(cfg: QualityCfg, analysis?: QualityAnalysis): RegexFinding[] {
	const settings = cfg.regexDedup ?? {};
	const exts = new Set(settings.extensions ?? ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.mts', '.cts']);
	const ignored = new Set(settings.ignoredFiles ?? []);
	const minimum = settings.minimumCount ?? 2;
	const vals = new Map<string, string[]>();
	for (const file of (analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })).filter(
		(c) => exts.has(c.slice(c.lastIndexOf('.'))) && !c.split('/').includes('test') && !c.split('/').includes('tests'),
	)) {
		if (ignored.has(displayPath(cfg, file))) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		const ast = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
		const visit = (node: ts.Node): void => {
			const val = ts.isRegularExpressionLiteral(node) ? node.text : ts.isNewExpression(node) && node.expression.getText(ast) === 'RegExp' ? (node.arguments?.[0]?.getText(ast) ?? '') : '';
			if (val) {
				const location = `${displayPath(cfg, file)}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}`;
				vals.set(val, [...(vals.get(val) ?? []), location]);
			}
			ts.forEachChild(node, visit);
		};
		visit(ast);
	}
	return [...vals.entries()].filter(([, l]) => l.length >= minimum).map(([s, l]) => ({ source: s, count: l.length, locations: l }));
}
