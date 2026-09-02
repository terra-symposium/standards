import { resolve } from 'node:path';

export type QualityConfig = {
	root: string;
	sourceRoots: string[];
	includeRoots?: string[];
	extensions: string[];
	aliases?: Record<string, string>;
	skippedDirectories?: string[];
	skippedFiles?: string[];
	protectedIdentifiers?: string[];
	tsconfig?: string;
	tools?: {
		prettier?: string;
		tsc?: string;
	};
};

/** Normalizes a consumer repository configuration once at the package boundary. */
export function createQualityConfig(config: QualityConfig): QualityConfig {
	return {
		...config,
		root: resolve(config.root),
		sourceRoots: config.sourceRoots.map(path => resolve(config.root, path)),
		includeRoots: (config.includeRoots ?? []).map(path => resolve(config.root, path)),
		skippedDirectories: config.skippedDirectories ?? ['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.astro'],
		skippedFiles: (config.skippedFiles ?? []).map(path => resolve(config.root, path)),
		aliases: config.aliases ?? {},
		protectedIdentifiers: config.protectedIdentifiers ?? [],
	};
}
