/**
 * packages/quality/src/files.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

// TYPES
import type { QualityConfig } from './config.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/
/**
 *
 * @param cfg
 *
 * @return
 */
export function sourceFiles(cfg: QualityConfig): string[] {
	const roots = [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])];
	const exts = new Set(cfg.extensions);
	const skipped = new Set(cfg.skippedDirectories ?? []);
	const files: string[] = [];
	const walk = (dir: string): void => {
		if (!existsSync(dir)) return;
		if (statSync(dir).isFile()) {
			if (exts.has(dir.slice(dir.lastIndexOf('.'))) && !cfg.skippedFiles?.includes(dir)) files.push(dir);
			return;
		}
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (e.isDirectory()) {
				if (!skipped.has(e.name)) walk(join(dir, e.name));
				continue;
			}
			if (exts.has(e.name.slice(e.name.lastIndexOf('.'))) && !cfg.skippedFiles?.includes(join(dir, e.name))) files.push(join(dir, e.name));
		}
	};
	for (const root of roots) walk(root);
	return files.sort((a, b) => a.localeCompare(b));
}

/**
 * Returns configured source files changed in the working tree, including untracked files.
 *
 * @param cfg
 *
 * @return
 */
export function workingSourceFiles(cfg: QualityConfig): string[] {
	const changed = new Set(
		execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR'], { cwd: cfg.root, encoding: 'utf8' })
			.concat(execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: cfg.root, encoding: 'utf8' }))
			.split('\n')
			.filter(Boolean)
			.map((p) => join(cfg.root, p)),
	);
	return sourceFiles(cfg).filter((file) => changed.has(file));
}

/**
 *
 * @param config
 * @param fileName
 *
 * @return
 */
export function displayPath(config: QualityConfig, fileName: string): string {
	return relative(config.root, fileName) || basename(fileName);
}

/**
 *
 * @param path
 *
 * @return
 */
export function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}
