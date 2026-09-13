/**
 * packages/quality/src/tailwind.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { srcFiles } from './files.js';

// TYPES
import type { QualityCfg } from './config.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type TailwindCanonicalFinding = { file: string; start: number; end: number; original: string; replacement: string; line: number; column: number };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Resolves a stylesheet import from the consumer repository's dependency graph.
 *
 * @param root
 * @param id
 * @param base
 *
 * @return
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
 * Loads the stylesheet graph consumed by Tailwind v4.
 *
 * @param root
 * @param id
 * @param base
 *
 * @return
 */
async function loadStylesheet(root: string, id: string, base: string): Promise<{ path: string; base: string; content: string }> {
	const path = resolveStylesheet(root, id, base);
	return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
}

/**
 * Resolves the consumer package's ESM entry instead of the CommonJS entry returned by require.resolve.
 *
 * @param consumerRequire
 * @param root
 *
 * @return
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
 * Finds literal class values in JSX/Astro attributes and configured class helpers.
 *
 * @param src
 *
 * @return
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
		for (const value of body.matchAll(/(['"`])([\s\S]*?)\1/g)) {
			if (!value[2]!.includes('${')) vals.push({ start: bodyStart + value.index! + 1, value: value[2]! });
		}
	}
	return vals;
}

/**
 * Converts an offset to a one-based source location.
 *
 * @param src
 * @param offset
 *
 * @return
 */
function locationAt(src: string, offset: number): { line: number; column: number } {
	const before = src.slice(0, offset);
	return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}

/**
 * Runs the Tailwind v4 canonical-class diagnostic used by Zed.
 * Tailwind v3 and earlier do not expose this compiler capability, so those
 * repositories are reported as compatible and skipped.
 *
 * @param cfg
 * @param fix
 *
 * @return
 */
export async function runTailwindCanonical(cfg: QualityCfg, fix = false): Promise<number> {
	const settings = cfg.tailwindCanonical;
	if (!settings) return 0;
	const stylesheetPath = resolve(cfg.root, settings.stylesheet);
	if (!existsSync(stylesheetPath)) throw new Error(`Tailwind stylesheet not found: ${stylesheetPath}`);
	const consumerRequire = createRequire(resolve(cfg.root, 'package.json'));
	let tailwind: {
		__unstable__loadDesignSystem?: (
			css: string,
			opts: { from: string; loadStylesheet: (id: string, base: string) => Promise<{ path: string; base: string; content: string }> },
		) => Promise<{ parseCandidate: (candidate: string) => unknown[]; canonicalizeCandidates: (candidates: string[]) => string[] }>;
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
	const scanCfg = settings.sourceRoots ? { ...cfg, sourceRoots: settings.sourceRoots.map((r) => resolve(cfg.root, r)) } : cfg;
	const files = srcFiles(scanCfg).filter((f) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f));
	const findings: TailwindCanonicalFinding[] = [];
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		for (const val of classVals(source)) {
			for (const token of val.value.matchAll(/\S+/g)) {
				const original = token[0]!;
				const replacement = designSystem.canonicalizeCandidates([original])[0];
				if (!replacement || replacement === original || replacement.includes(' ')) continue;
				const start = val.start + token.index!;
				const location = locationAt(source, start);
				findings.push({ file, start, end: start + original.length, original, replacement, ...location });
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
