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
REGEX
//////////////////////////////////////////////////*/
const TEST_SPEC_REGEX = /\.(?:test|spec)\.[^.]+$/;

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
	const roots = [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])];
	const exts = new Set(cfg.extensions);
	const skipped = new Set(cfg.skippedDirectories ?? []);
	const files: string[] = [];
	const walk = (dir: string): void => {
		if (!existsSync(dir)) return;
		if (statSync(dir).isFile()) {
			if (exts.has(dir.slice(dir.lastIndexOf('.'))) && !cfg.skippedFiles?.includes(dir) && !(cfg.excludeTests && TEST_SPEC_REGEX.test(dir))) files.push(dir);
			return;
		}
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (e.isDirectory()) {
				if (!skipped.has(e.name)) walk(join(dir, e.name));
				continue;
			}
			const path = join(dir, e.name);
			if (exts.has(e.name.slice(e.name.lastIndexOf('.'))) && !cfg.skippedFiles?.includes(path) && !(cfg.excludeTests && TEST_SPEC_REGEX.test(e.name))) files.push(path);
		}
	};
	for (const root of roots) walk(root);
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
