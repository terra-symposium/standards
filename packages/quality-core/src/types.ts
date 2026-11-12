/**
 * packages/quality-core/src/types.ts
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Check switches accepted by the shared quality.json schema. */
export const QUALITY_CHECK_NAMES = [
	'document',
	'format',
	'import',
	'name',
	'forward',
	'accessibility',
	'display-name',
	'performance-patterns',
	'documented-commands',
	'lint',
	'knip',
	'dead-code',
	'type',
	'recommend',
	'command',
	'diff',
	'alias',
	'security',
	'repeated-classes',
	'tailwind-canonical',
	'regex-dedup',
	'ui-patterns',
	'ui-recommendations',
	'error-boundaries',
	'github',
] as const;
/** A supported identifier for an enabled quality check. */
export type QualityCheckName = (typeof QUALITY_CHECK_NAMES)[number];
/** Autofix switches accepted by the shared quality.json schema. */
export type QualityAutofixName =
	| 'document'
	| 'format'
	| 'name'
	| 'lint'
	| 'knip'
	| 'dead-code'
	| 'alias'
	| 'forward'
	| 'repeatedClasses'
	| 'tailwindCanonical'
	| 'regexDedup'
	| 'accessibility'
	| 'displayName'
	| 'documentedCommands'
	| 'errorBoundaries'
	| 'duplicateImports';
/** Options shared by an independently runnable quality capability API and CLI. */
export type CapabilityOptions = { fix: boolean; all: boolean; files?: string[]; configPath?: string; args?: string[] };
/** Shared normalized configuration shape retained by the aggregate quality runner. */
export type QualityCfg = {
	root: string;
	configRoot?: string;
	sourceRoots: string[];
	includeRoots?: string[];
	skippedDirectories?: string[];
	skippedFiles?: string[];
	singleUse?: { skippedDirectories?: string[] };
	extensions: string[];
	aliases?: Record<string, string>;
	externalPrefixes?: string[];
	protectedIdentifiers?: string[];
	frameworkEntryExports?: Record<string, string[]>;
	knipPackageMappings?: { sourceRoots: string[]; packageRoot: string }[];
	renameExports?: boolean;
	qualityCommands?: { name: string; command: string; args?: string[] }[];
	languageProfiles?: ('c' | 'java' | 'python')[];
	enabledChecks?: Partial<Record<QualityCheckName, boolean>>;
	autofix?: Partial<
		Record<
			| 'format'
			| 'name'
			| 'lint'
			| 'knip'
			| 'dead-code'
			| 'alias'
			| 'forward'
			| 'repeatedClasses'
			| 'tailwindCanonical'
			| 'regexDedup'
			| 'accessibility'
			| 'displayName'
			| 'documentedCommands'
			| 'duplicateImports'
			| 'errorBoundaries',
			boolean
		>
	> & { document?: false };
	documentation?: { required?: { types?: boolean; functions?: boolean; exportedFunctions?: boolean; noInlineFunctions?: boolean }; commandRoots?: string[]; cAuthors?: Record<string, string> };
	enabledCommands?: Record<string, boolean>;
	recommendationCommands?: { name: string; command: string; args?: string[] }[];
	enabledRecommendations?: Record<string, boolean>;
	tailwindCanonical?: { stylesheet: string; sourceRoots?: string[] };
	security?: { forbiddenTerms?: string[]; forbiddenImports?: string[]; clientRoots?: string[]; runtimeRoots?: string[]; allowProcessEnvRoots?: string[] };
	repeatedClasses?: { minimumCount?: number; extensions?: string[] };
	regexDedup?: { extensions?: string[]; minimumCount?: number; sharedModule?: string; skippedDirectories?: string[] };
	uiPatterns?: { forbidden?: string[]; extensions?: string[] };
	performancePatterns?: { ignoredFiles?: string[]; extensions?: string[] };
	uiRecommendations?: {
		rules?: { element: string; component: string; import: string; variant?: string; types?: string[]; when?: 'always' | 'button-like' | 'text-link'; reason?: string }[];
		extensions?: string[];
		ignoredFiles?: string[];
		ignoredDirectories?: string[];
	};
	github?: {
		repositories?: string[];
		requiredFeatures?: ('dependencyGraph' | 'dependabotAlerts' | 'malwareAlerts' | 'securityUpdates' | 'versionUpdates' | 'groupedUpdates' | 'secretScanning' | 'pushProtection' | 'codeScanning')[];
	};
	tsconfig?: string;
	oneLineImports?: boolean;
	prettierPrintWidth?: number;
	lintRoots?: string[];
	typecheckRoots?: string[];
	typecheckExtensions?: string[];
	typecheckCommand?: { command: string; args?: string[] };
	tools?: { prettier?: string; tsc?: string; eslint?: string; knip?: string; clang?: string };
	loadTesting?: {
		enabled?: boolean;
		defaultBudget?: { warnMs?: number; failMs?: number };
		testBudgets?: Record<string, { warnMs?: number; failMs?: number }>;
		operationBudgets?: Record<string, { warnMs?: number; failMs?: number }>;
	};
};
/** Source paths and extensions used to scope each independent quality capability. */
export type QualityScope = Pick<QualityCfg, 'root' | 'sourceRoots' | 'includeRoots' | 'skippedDirectories' | 'skippedFiles' | 'extensions'>;
/** Runner switches that control strictness, external commands, and recommendation phases. */
export type QualityOptions = { fix: boolean; all: boolean; strict: boolean; skipCommands?: boolean; skipRecommendations?: boolean };
