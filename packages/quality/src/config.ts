/**
 * packages/quality/src/config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API

import { resolve } from 'node:path';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type QualityConfig = {
	root: string;
	sourceRoots: string[];
	includeRoots?: string[];
	extensions: string[];
	aliases?: Record<string, string>;
	externalPrefixes?: string[];
	skippedDirectories?: string[];
	skippedFiles?: string[];
	protectedIdentifiers?: string[];
	qualityCommands?: { name: string; command: string; args?: string[] }[];
	tsconfig?: string;
	/** Preserve canonical one-line imports by adding Prettier protection when they exceed print width. */
	oneLineImports?: boolean;
	/** Print width used by the one-line import protection rule. */
	prettierPrintWidth?: number;
	lintRoots?: string[];
	typecheckRoots?: string[];
	typecheckExtensions?: string[];
	tools?: { prettier?: string; tsc?: string; eslint?: string; knip?: string };
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Normalizes a consumer repository configuration once at the package boundary. */
export function createQualityConfig(config: QualityConfig): QualityConfig {
	return {
		...config,
		root: resolve(config.root),
		sourceRoots: config.sourceRoots.map((p) => resolve(config.root, p)),
		includeRoots: (config.includeRoots ?? []).map((p) => resolve(config.root, p)),
		skippedDirectories: config.skippedDirectories ?? [
			'.git',
			'node_modules',
			'dist',
			'build',
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
		],
		skippedFiles: (config.skippedFiles ?? []).map((p) => resolve(config.root, p)),
		aliases: config.aliases ?? {},
		protectedIdentifiers: config.protectedIdentifiers ?? [],
		lintRoots: (config.lintRoots ?? []).map((p) => resolve(config.root, p)),
		typecheckRoots: (config.typecheckRoots ?? []).map((p) => resolve(config.root, p)),
	};
}
