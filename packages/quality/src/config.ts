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
export function createQualityConfig(cfg: QualityConfig): QualityConfig {
	return {
		...cfg,
		root: resolve(cfg.root),
		sourceRoots: cfg.sourceRoots.map((p) => resolve(cfg.root, p)),
		includeRoots: (cfg.includeRoots ?? []).map((p) => resolve(cfg.root, p)),
		skippedDirectories: cfg.skippedDirectories ?? [
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
		skippedFiles: (cfg.skippedFiles ?? []).map((p) => resolve(cfg.root, p)),
		aliases: cfg.aliases ?? {},
		protectedIdentifiers: cfg.protectedIdentifiers ?? [],
		lintRoots: (cfg.lintRoots ?? []).map((p) => resolve(cfg.root, p)),
		typecheckRoots: (cfg.typecheckRoots ?? []).map((p) => resolve(cfg.root, p)),
	};
}
