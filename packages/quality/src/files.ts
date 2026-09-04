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
 * @param config
 * @returns
 */
export function sourceFiles(config: QualityConfig): string[] {
	const roots = [...config.sourceRoots, ...(config.includeRoots ?? [])];
	const extensions = new Set(config.extensions);
	const skipped = new Set(config.skippedDirectories ?? []);
	const files: string[] = [];
	const walk = (directory: string): void => {
		if (!existsSync(directory)) return;
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (!skipped.has(entry.name)) walk(join(directory, entry.name));
				continue;
			}
			if (extensions.has(entry.name.slice(entry.name.lastIndexOf('.'))) && !config.skippedFiles?.includes(join(directory, entry.name))) files.push(join(directory, entry.name));
		}
	};
	for (const root of roots) walk(root);
	return files.sort((a, b) => a.localeCompare(b));
}

/** Returns configured source files changed in the working tree, including untracked files. */
export function workingSourceFiles(config: QualityConfig): string[] {
	const changed = new Set(
		execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR'], { cwd: config.root, encoding: 'utf8' })
			.concat(execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: config.root, encoding: 'utf8' }))
			.split('\n')
			.filter(Boolean)
			.map((p) => join(config.root, p)),
	);
	return sourceFiles(config).filter((file) => changed.has(file));
}

/**
 *
 * @param config
 * @param fileName
 * @returns
 */
export function displayPath(config: QualityConfig, fileName: string): string {
	return relative(config.root, fileName) || basename(fileName);
}

/**
 *
 * @param path
 * @returns
 */
export function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}
