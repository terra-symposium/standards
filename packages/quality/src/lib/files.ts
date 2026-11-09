/**
 * packages/quality/src/lib/files.ts
 * Shared source discovery and path utilities for quality checks.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { basename, dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const SCAN_PRUNED_DIRS = new Set([
	'.git',
	'node_modules',
	'dist',
	'build',
	'.build',
	'coverage',
	'test-results',
	'.next',
	'.astro',
	'.sanity',
	'.netlify',
	'.cache',
	'.output',
	'.vercel',
	'.nuxt',
	'.husky',
]);

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
	const exts = new Set(cfg.extensions);
	const skippedFiles = new Set((cfg.skippedFiles ?? []).map((file) => resolve(cfg.root, file)));
	const files: string[] = [];
	/**
	 * Determines whether a source directory is excluded by configuration.
	 * @param dir Absolute directory path to check.
	 *
	 * @return `true` when the directory matches a skipped directory entry.
	 */
	const isSkippedDir = (dir: string): boolean => {
		return (cfg.skippedDirectories ?? []).some((skipped) => {
			const norm = normalize(skipped.replaceAll('\\', '/'));
			if (!norm || norm === '.') return false;
			if (!norm.includes(sep)) return basename(dir) === norm;
			const skippedPath = resolve(cfg.root, norm);
			return dir === skippedPath || dir.startsWith(`${skippedPath}${sep}`) || relative(cfg.root, dir) === norm;
		});
	};
	for (const root of [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])]) {
		const pending = [root];
		while (pending.length) {
			const dir = pending.pop()!;
			if (!existsSync(dir)) continue;
			const entry = statSync(dir);
			if (entry.isFile()) {
				if (!skippedFiles.has(resolve(dir)) && exts.has(dir.slice(dir.lastIndexOf('.')))) {
					for (let parent = dirname(resolve(dir)); ; parent = dirname(parent)) {
						if (SCAN_PRUNED_DIRS.has(basename(parent)) || isSkippedDir(parent)) break;
						if (parent === cfg.root || dirname(parent) === parent) {
							files.push(dir);
							break;
						}
					}
				}
				continue;
			}
			if (!entry.isDirectory() || SCAN_PRUNED_DIRS.has(basename(dir)) || isSkippedDir(dir)) continue;
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				if (entry.isDirectory()) {
					if (!SCAN_PRUNED_DIRS.has(entry.name)) pending.push(join(dir, entry.name));
					continue;
				}
				const path = join(dir, entry.name);
				if (!skippedFiles.has(resolve(path)) && exts.has(entry.name.slice(entry.name.lastIndexOf('.')))) files.push(path);
			}
		}
	}
	return files.sort((a, b) => a.localeCompare(b));
}

/**
 * Returns configured source files changed in the working tree, including untracked files.
 *
 * @param cfg Quality configuration whose repository root is used to query Git.
 *
 * @return Sorted configured source files that are changed or untracked in the working tree.
 */
export function workingSrcFiles(cfg: QualityCfg): string[] {
	return ((changed: Set<string>) => srcFiles(cfg).filter((file) => changed.has(file)))(
		new Set(
			execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR'], { cwd: cfg.root, encoding: 'utf8' })
				.concat(execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: cfg.root, encoding: 'utf8' }))
				.split('\n')
				.filter(Boolean)
				.map((path) => join(cfg.root, path)),
		),
	);
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
