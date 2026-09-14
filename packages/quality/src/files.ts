/**
 * packages/quality/src/files.ts
 * Shared source discovery and path utilities for quality checks.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { basename, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// File discovery is shared by nearly every check. Cache by the effective
// discovery inputs so a full run walks the repository once per scope instead
// of once per check. The cache is process-local and naturally disappears
// between CLI invocations; source edits do not change the file set.
const fileCache = new Map<string, string[]>();

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Discovers source files under the configured roots, reusing a cached result for identical discovery settings.
 *
 * @param cfg Quality configuration containing roots, extensions, and excluded paths.
 *
 * @return Sorted absolute paths for files that belong to the configured source scope.
 */
export function srcFiles(cfg: QualityCfg): string[] {
	const cacheKey = JSON.stringify([cfg.root, cfg.sourceRoots, cfg.includeRoots ?? [], cfg.extensions, cfg.skippedDirectories ?? [], cfg.skippedFiles ?? []]);
	const cached = fileCache.get(cacheKey);
	// Quality stages can rename or generate source files. Do not reuse a stale
	// inventory after a discovered path disappears (for example, naming moves a
	// legacy page into its canonical route directory).
	if (cached && cached.every((file) => existsSync(file))) return cached;
	if (cached) fileCache.delete(cacheKey);
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
	const result = files.sort((a, b) => a.localeCompare(b));
	fileCache.set(cacheKey, result);
	return result;
}

/**
 * Returns configured source files changed in the working tree, including untracked files.
 *
 * @param cfg Quality configuration whose repository root is used to query Git.
 *
 * @return Sorted configured source files that are changed or untracked in the working tree.
 */
export function workingSrcFiles(cfg: QualityCfg): string[] {
	const changed = new Set(
		execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR'], { cwd: cfg.root, encoding: 'utf8' })
			.concat(execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: cfg.root, encoding: 'utf8' }))
			.split('\n')
			.filter(Boolean)
			.map((p) => join(cfg.root, p)),
	);
	return srcFiles(cfg).filter((f) => changed.has(f));
}

/**
 * Converts an absolute file path into the repository-relative path shown in diagnostics.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param fileName Absolute path to the source file.
 *
 * @return A repository-relative path, or the basename when the path is already outside the root.
 */
export function displayPath(cfg: QualityCfg, fileName: string): string {
	return relative(cfg.root, fileName) || basename(fileName);
}

/**
 * Tests whether a path currently resolves to a regular file.
 *
 * @param path Filesystem path to inspect.
 *
 * @return `true` when the path exists and is a file; otherwise `false`.
 */
export function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}
