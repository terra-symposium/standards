import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import type { QualityConfig } from './config.js';

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

export function displayPath(config: QualityConfig, fileName: string): string {
	return relative(config.root, fileName) || basename(fileName);
}

export function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}
