/**
 * packages/quality/src/config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type QualityCheckName =
	| 'document'
	| 'format'
	| 'import'
	| 'name'
	| 'forward'
	| 'lint'
	| 'knip'
	| 'type'
	| 'recommend'
	| 'command'
	| 'diff'
	| 'alias';



export type QualityCheckToggles = Partial<Record<QualityCheckName, boolean>>;
export type QualityAutofixName = 'document' | 'format' | 'name' | 'lint' | 'knip' | 'alias';
export type QualityAutofixToggles = Partial<Record<QualityAutofixName, boolean>>;
export type DocumentationRequirements = {
	types?: boolean;
	functions?: boolean;
	exportedFunctions?: boolean;
	noInlineFunctions?: boolean;
};

export type QualityCfg = {
	root: string;
	sourceRoots: string[];
	includeRoots?: string[];
	extensions: string[];
	aliases?: Record<string, string>;
	externalPrefixes?: string[];
	skippedDirectories?: string[];
	skippedFiles?: string[];
	protectedIdentifiers?: string[];
	/** Allow symbol-safe renames of exported declarations when repository APIs opt in. */
	renameExports?: boolean;
	qualityCommands?: { name: string; command: string; args?: string[] }[];
	/** Set a built-in check to false to disable it. Omitted checks remain enabled. */
	enabledChecks?: QualityCheckToggles;
	/** Set a fix-capable check to false to report issues without changing source files. */
	autofix?: QualityAutofixToggles;
	documentation?: { required?: DocumentationRequirements };
	/** Set an individual configured quality command, such as `test`, to false to skip it. */
	enabledCommands?: Record<string, boolean>;
	/** Commands that emit advisory recommendations after the primary quality checks. */
	recommendationCommands?: { name: string; command: string; args?: string[] }[];
	/** Set an individual recommendation command to false to skip it. */
	enabledRecommendations?: Record<string, boolean>;
	tailwindCanonical?: { stylesheet: string; sourceRoots?: string[] };
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
/**
 * Backwards-compatible name used by repositories on the previous quality API.
 *
 * @param cfg
 *
 * @return
 */
export const createQualityConfig = createQualityCfg;

/** Returns whether a built-in quality check is enabled (all are enabled by default). */
export function qualityCheckEnabled(cfg: QualityCfg, check: QualityCheckName): boolean {
	return cfg.enabledChecks?.[check] !== false;
}

/** Returns whether a fix-capable check may edit files (all fixes are enabled by default). */
export function qualityAutofixEnabled(cfg: QualityCfg, check: QualityAutofixName, cliFix = true): boolean {
	return cliFix && cfg.autofix?.[check] !== false;
}

/** Returns whether a named repository command is enabled (all are enabled by default). */
export function qualityCommandEnabled(cfg: QualityCfg, name: string): boolean {
	return qualityCheckEnabled(cfg, 'command') && cfg.enabledCommands?.[name] !== false;
}

/** Returns whether a named advisory command is enabled (all are enabled by default). */
export function qualityRecommendationEnabled(cfg: QualityCfg, name: string): boolean {
	return qualityCheckEnabled(cfg, 'recommend') && cfg.enabledRecommendations?.[name] !== false;
}

/** Loads a standard JSON configuration, using its directory as root when root is omitted. */
export function loadQualityCfg(file = resolve(process.cwd(), 'quality.json')): QualityCfg {
	const path = resolve(file);
	const raw = JSON.parse(readFileSync(path, 'utf8')) as Omit<QualityCfg, 'root'> & { root?: string };
	return createQualityCfg({ ...raw, root: raw.root ? resolve(dirname(path), raw.root) : dirname(path) });
}

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Normalizes a consumer repository configuration once at the package boundary.
 *
 * @param cfg
 *
 * @return
 */
export function createQualityCfg(cfg: QualityCfg): QualityCfg {
	return {
		...cfg,
		renameExports: cfg.renameExports ?? false,
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
