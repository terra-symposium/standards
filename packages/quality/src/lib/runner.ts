#!/usr/bin/env node

/**
 * packages/quality/src/lib/runner.ts
 * CLI boundary that loads configuration and coordinates repository quality checks.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { accessibilityFindings, fixAccessibleNames } from './accessibility.js';
import { aliasFindings, declarationScope, isCallbackDeclaration, isProtectedPath, isRenamableDeclaration, namingFindings, renameDeclaration, renameId } from './naming.js';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { buildGitHubReport, formatGitHubReport, hasGitHubAuth } from './github-report.js';
import { checkImports } from './imports.js';
import { collapseInlineIfs } from './inline-if.js';
import { collapseTypesAndObjects } from './collapse.js';
import { deadCodeEditsIntroduceTypeErrors, deadCodeTypeProgram, fixSingleUseDeclarations, singleUseFindings } from './single-use.js';
import { displayNameFindings, fixDisplayNames } from './display-name.js';
import { documentSrcFile, documentationFindings, documentedCommandFindings, duplicateImportFindings, fixDocumentedCommands, maintainSrcFile, protectLongImports } from './documentation.js';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixObjectForwarding, objectForwardingFindings } from './object-forwarding.js';
import { fixRegexDedup, fixRepeatedClasses, performancePatternFindings, regexFindings, repeatedClassFindings, runTailwindCanonical, uiPatternFindings } from './patterns.js';
import { inspectLanguageProfileTool, isLanguageProfileId, resolveLanguageProfiles } from './language-profiles.js';
import { qualityNodeReporterOptions } from './node-reporter.js';
import { qualityProgress, setQualityProgressSuppressed } from './progress.js';
import { securityFindings } from './security.js';
import { spawnSync } from 'node:child_process';
import { srcFiles, workingSrcFiles } from './files.js';
import { uiComponentRecommendations } from './ui-recommendations.js';
import { writeHistoryReport } from './history-report.js';

// COMPONENTS
import { Worker } from 'node:worker_threads';

// DATA
import { LANGUAGE_CAPABILITIES } from './language-profiles.js';
import { PROTECTED_IDENTIFIERS } from './naming.js';

// TYPES
import type { Dirent } from 'node:fs';
import type { DocumentationRequirements } from './documentation.js';
import type { GitHubFeature, GitHubReport } from './github-report.js';
import type { LanguageProfileId, LanguageProfileTool, LanguageQualityPhase, ResolvedLanguageCheck, SkippedLanguageCheck } from './language-profiles.js';
import type { UiRecommendationSettings } from './ui-recommendations.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const BPLAYWRIGHT_B_U_REGEX = /\bplaywright\b/u;
const BWORKSPACE_TEST_RUNNER_JS_B_U_REGEX = /\bworkspace-test-runner\.js\b/u;
const NON_WORKSPACE_DIRS = new Set(['.git', '.next', '.nuxt', '.turbo', '.vercel', '.vite', '.astro', 'build', 'coverage', 'dist', 'node_modules', 'out', 'vendor']);

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const R_N_REGEX = /\r?\n/;
const SHARED_REGEX = /\/\*|\/\//;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const CJS_JS_JSX_MJS_TS_TSX_REGEX = /\.(?:cjs|js|jsx|mjs|ts|tsx)$/;
/**
 *
 * @return
 */
const G_REGEX = () => /-/g;
const C_M_JS_TS_REGEX = /\.(?:c|m)?(?:js|ts)$/;
const CLI_CMDS = new Set([
	'quality',
	'history',
	'quality:all',
	'quality:baseline',
	'document',
	'maintain',
	'format',
	'naming',
	'domain',
	'single-use',
	'dead-code',
	'security',
	'repeated-classes',
	'tailwind-canonical',
	'regex-dedup',
	'ui-patterns',
	'ui-recommendations',
	'imports',
	'aliases',
	'forwarding',
	'documentation',
	'github',
	'lint',
	'knip',
	'types',
]);
const CLI_FLAGS = new Set(['--all', '--warn', '--strict', '--skip-commands', '--skip-recommendations', '--help', '-h', '--version', '-v', '--report-json', '--branch', '--base-sha', '--repository']);
const TOOL_OUTPUT_MAX_BUFFER = 64 * 1024 * 1024;
const ESLINT_API_FALLBACK = 78;
const ESLINT_ARGUMENT_BUDGET = 64 * 1024;
const FOCUSED_ESLINT_FALLBACK = 'TERRA_QUALITY_FOCUSED_ESLINT_UNAVAILABLE';
const ESLINT_GLOB_SPECIALS = new Set(['*', '?', '[', ']', '{', '}', '(', ')', '!', '\\']);

/** Stable, artifact-safe summary of a single CLI invocation. */
export type QualityJsonReport = {
	schemaVersion: 1;
	generatedAt: string;
	command: string;
	scope: 'all' | 'changed';
	checks: { name: string; status: 'passed' | 'findings' | 'failed' | 'skipped' | 'not-applicable'; findings: number; reason?: string }[];
	capabilities: { language: string; kind: 'check' | 'autofix'; name: string; status: 'supported' | 'not-applicable'; provider: string; reason?: string }[];
	github?: GitHubReport;
};
let reportStages: Map<string, QualityJsonReport['checks'][number]> | undefined;
let reportStageName: string | undefined;
let reportGitHubData: GitHubReport | undefined;
let outputPhase: string | undefined;
let qualityCheckName: string | undefined;
let qualityDetails: string[] = [];
let qualitySpinner: { worker: Worker; state: Int32Array } | undefined;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const C_M_JS_TS_X_REGEX = /\.(?:c|m)?(?:js|ts)x?$/;
const C_M_JS_TS_X_CLASS_2 = /\.(?:(?:c|m)?(?:js|ts)x?)$/;
/** Names accepted in the `enabledChecks` configuration map. */
export type QualityCheckName =
	| 'document'
	| 'format'
	| 'import'
	| 'name'
	| 'forward'
	| 'accessibility'
	| 'display-name'
	| 'performance-patterns'
	| 'documented-commands'
	| 'lint'
	| 'knip'
	| 'dead-code'
	| 'type'
	| 'recommend'
	| 'command'
	| 'diff'
	| 'alias'
	| 'security'
	| 'repeated-classes'
	| 'tailwind-canonical'
	| 'regex-dedup'
	| 'ui-patterns'
	| 'ui-recommendations'
	| 'github';
/** Names accepted in the `autofix` configuration map. */
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
	| 'documentedCommands';
/** Normalized repository paths, source scope, policies, and tool settings. */
export type QualityCfg = {
	root: string;
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
	renameExports?: boolean;
	qualityCommands?: { name: string; command: string; args?: string[] }[];
	languageProfiles?: LanguageProfileId[];
	excludeTests?: boolean;
	enabledChecks?: Partial<Record<QualityCheckName, boolean>>;
	autofix?: Partial<Record<QualityAutofixName, boolean>>;
	documentation?: { required?: DocumentationRequirements; commandRoots?: string[] };
	enabledCommands?: Record<string, boolean>;
	recommendationCommands?: { name: string; command: string; args?: string[] }[];
	enabledRecommendations?: Record<string, boolean>;
	tailwindCanonical?: { stylesheet: string; sourceRoots?: string[] };
	security?: { forbiddenTerms?: string[]; forbiddenImports?: string[]; clientRoots?: string[]; allowProcessEnvRoots?: string[] };
	repeatedClasses?: { minimumCount?: number; extensions?: string[] };
	regexDedup?: { extensions?: string[]; minimumCount?: number; sharedModule?: string };
	uiPatterns?: { forbidden?: string[]; extensions?: string[] };
	performancePatterns?: { ignoredFiles?: string[]; extensions?: string[] };
	uiRecommendations?: UiRecommendationSettings;
	github?: { repositories?: string[]; requiredFeatures?: GitHubFeature[] };
	tsconfig?: string;
	oneLineImports?: boolean;
	prettierPrintWidth?: number;
	lintRoots?: string[];
	typecheckRoots?: string[];
	typecheckExtensions?: string[];
	typecheckCommand?: { command: string; args?: string[] };
	tools?: { prettier?: string; tsc?: string; eslint?: string; knip?: string };
	loadTesting?: {
		enabled?: boolean;
		defaultBudget?: { warnMs?: number; failMs?: number };
		testBudgets?: Record<string, { warnMs?: number; failMs?: number }>;
		operationBudgets?: Record<string, { warnMs?: number; failMs?: number }>;
	};
};
/**
 * Normalized shape for one configured quality command.
 */
type QualityInvocation = NonNullable<QualityCfg['qualityCommands']>[number] & {
	phase?: LanguageQualityPhase;
	profileId?: string;
	profileTool?: LanguageProfileTool;
	qualityChecks?: QualityCheckName[];
};
/**
 * Fixed phase assigned to a selected quality command.
 */
type QualityPhase = LanguageQualityPhase;
/** Workspace package metadata used only to identify a selected package script. */
type WorkspaceManifest = { directory: string; name?: string; scripts: Record<string, unknown> };
const WORKSPACE_MANIFESTS = new Map<string, WorkspaceManifest[]>();
/** Cached files, source text, syntax trees, and type information for one run. */
export type QualityAnalysis = { files: string[]; texts: Map<string, string>; sources: Map<string, ts.SourceFile>; program: ts.Program; checker: ts.TypeChecker };
/** Parsed scope and write controls for one Terra Quality CLI invocation. */
export type QualityOptions = { fix: boolean; all: boolean; strict: boolean; skipCommands?: boolean; skipRecommendations?: boolean };
/** Shared finding shapes rendered by the generic source-check reporter. */
type GenericFinding =
	| { file?: string; message: string }
	| { file: string; line: number; column: number; element: string; message: string; fixable: boolean }
	| { file: string; line: number; column: number; component: string; recommendation: string }
	| { file: string; line: number; column: number; method: string; receiver: string; recommendation: string }
	| { file: string; line: number; command: string; recommendation: string }
	| { value: string; count: number; locations: string[] }
	| { source: string; count: number; locations: string[] }
	| { file: string; pattern: string };
const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g');

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates the shared TypeScript program for the configured source scope.
 *
 * @param files Absolute source paths that should be program roots.
 *
 * @return TypeScript program configured for repository JavaScript and TypeScript analysis.
 */
function createAnalysisProgram(files: string[]): ts.Program {
	return ts.createProgram({
		rootNames: files.filter((f) => /\.(?:c|m)?(?:js|jsx|ts|tsx)$/.test(f)),
		options: {
			allowNonTsExtensions: true,
			allowJs: true,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		},
	});
}

/**
 * Builds the per-run source text, AST, program, and checker caches used by static checks.
 *
 * @param cfg Quality configuration defining the source scope.
 *
 * @return Shared analysis context for the configured files.
 */
export function createQualityAnalysis(cfg: QualityCfg): QualityAnalysis {
	const files = srcFiles(cfg);
	const program = createAnalysisProgram(files);
	return {
		files,
		texts: new Map(files.map((f) => [f, readFileSync(f, 'utf8')])),
		sources: new Map(files.map((f) => [f, program.getSourceFile(f)]).filter((e): e is [string, ts.SourceFile] => Boolean(e[1]))),
		program,
		checker: program.getTypeChecker(),
	};
}

/**
 * Checks whether a built-in quality check is enabled by configuration.
 *
 * @param cfg Quality configuration containing check toggles.
 * @param check Built-in check name to query.
 *
 * @return `true` unless the check is explicitly disabled.
 */
export function qualityCheckEnabled(cfg: QualityCfg, check: QualityCheckName): boolean {
	if (check === 'accessibility' || check === 'display-name' || check === 'documented-commands') return cfg.enabledChecks?.[check] === true;
	return cfg.enabledChecks?.[check] !== false;
}

/**
 * Determines whether a check may apply its configured autofix for the current CLI invocation.
 *
 * @param cfg Quality configuration containing autofix toggles.
 * @param check Autofix-capable check name to query.
 * @param cliFix Whether the invocation allows writes.
 *
 * @return `true` when both the invocation and configuration permit autofix.
 */
export function qualityAutofixEnabled(cfg: QualityCfg, check: QualityAutofixName, cliFix = true): boolean {
	return cliFix && cfg.autofix?.[check] !== false;
}

/**
 * Checks whether a configured repository command is enabled.
 *
 * @param cfg Quality configuration containing command toggles.
 * @param name Configured command name to query.
 *
 * @return `true` when command checks and this command are enabled.
 */
export function qualityCmdEnabled(cfg: QualityCfg, name: string): boolean {
	return qualityCheckEnabled(cfg, 'command') && cfg.enabledCommands?.[name] !== false;
}

/**
 * Checks whether a configured recommendation command is enabled.
 *
 * @param cfg Quality configuration containing recommendation toggles.
 * @param name Recommendation name to query.
 *
 * @return `true` when recommendations and this recommendation are enabled.
 */
export function qualityRecommendationEnabled(cfg: QualityCfg, name: string): boolean {
	return qualityCheckEnabled(cfg, 'recommend') && cfg.enabledRecommendations?.[name] !== false;
}

/**
 * Loads and normalizes a quality configuration file relative to that file's directory.
 *
 * @param file Configuration path; defaults to `quality.json` in the current directory.
 *
 * @return Normalized quality configuration with absolute repository paths.
 */
export function loadQualityCfg(file = resolve(process.cwd(), 'quality.json')): QualityCfg {
	const path = resolve(file);
	const raw = JSON.parse(readFileSync(path, 'utf8')) as Omit<QualityCfg, 'root'> & { root?: string };
	return createQualityCfg({ ...raw, root: raw.root ? resolve(dirname(path), raw.root) : dirname(path) });
}

/**
 * Applies defaults and resolves repository-relative paths in a quality configuration.
 *
 * @param cfg Raw or partially normalized quality configuration.
 *
 * @return Configuration ready for quality checks and subprocess execution.
 */
export function createQualityCfg(cfg: QualityCfg): QualityCfg {
	const langProfiles = cfg.languageProfiles ?? [];
	if (!Array.isArray(langProfiles)) throw new Error('languageProfiles must be an array of profile names.');
	for (const profile of langProfiles) {
		if (typeof profile !== 'string' || !isLanguageProfileId(profile)) throw new Error(`Unknown language profile "${profile}". Available profiles: c, java, python.`);
	}
	if (new Set(langProfiles).size !== langProfiles.length) throw new Error('languageProfiles must not contain duplicate profile names.');
	return {
		...cfg,
		languageProfiles: langProfiles,
		renameExports: cfg.renameExports ?? false,
		root: resolve(cfg.root),
		sourceRoots: cfg.sourceRoots.map((p) => resolve(cfg.root, p)),
		includeRoots: (cfg.includeRoots ?? []).map((p) => resolve(cfg.root, p)),
		skippedDirectories: cfg.skippedDirectories ?? [],
		skippedFiles: (cfg.skippedFiles ?? []).map((p) => resolve(cfg.root, p)),
		singleUse: cfg.singleUse ? { ...cfg.singleUse, skippedDirectories: cfg.singleUse.skippedDirectories ?? [] } : undefined,
		aliases: cfg.aliases ?? {},
		protectedIdentifiers: cfg.protectedIdentifiers ?? [],
		lintRoots: (cfg.lintRoots ?? []).map((p) => resolve(cfg.root, p)),
		typecheckRoots: (cfg.typecheckRoots ?? []).map((p) => resolve(cfg.root, p)),
		typecheckCommand: cfg.typecheckCommand,
	};
}

/**
 * Resolves a configured tool name to a repository-local executable when available.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param cfgd Explicit tool path or executable name.
 * @param fallback Default executable name when no tool is configured.
 *
 * @return Executable path or name suitable for spawning.
 */
function toolPath(cfg: QualityCfg, cfgd: string | undefined, fallback: string): string {
	if (cfgd && (cfgd.includes('/') || cfgd.includes('\\'))) return cfgd;
	const executable = cfgd ?? fallback;
	const local = resolve(cfg.root, 'node_modules', '.bin', executable);
	return existsSync(local) ? local : executable;
}

/**
 * Formats one check identifier for terminal output.
 *
 * @param name Internal quality check identifier.
 *
 * @return Readable check name.
 */
function qualityLabel(name: string): string {
	const key = name.replace(/^(?:command|recommendation):/u, '').replace(/^dead-code\//u, '');
	const labels: Record<string, string> = {
		accessibility: 'Accessibility',
		aliases: 'Aliases',
		'dead-code': 'Dead Code',
		documentation: 'Documentation',
		'documented-commands': 'Documented Commands',
		forwarding: 'Forwarding',
		'performance-patterns': 'Performance Patterns',
		'repeated-classes': 'Repeated Classes',
		'regex-dedup': 'Regex Dedup',
		'source-analysis': 'Source Analysis',
		'tailwind-canonical': 'Tailwind Canonical',
		typecheck: 'Typecheck',
		'ui-patterns': 'UI Patterns',
		'ui-recommendations': 'UI Recommendations',
	};
	if (labels[key]) return labels[key];
	return key
		.replace(/(^|[-/\s])([a-z])/gu, (_match, separator: string, letter: string) => `${separator === '-' || separator === '/' ? ' ' : separator}${letter.toUpperCase()}`)
		.replace(/\bEslint\b/gu, 'ESLint');
}

/**
 * Starts the spinner and records the active check for a full quality run.
 *
 * @param name Internal quality check identifier.
 * @param detail Human-readable description for non-full output.
 *
 * @return Nothing; full output starts the check's terminal spinner.
 */
function qualityHeader(name: string, detail: string): void {
	if (reportStages) {
		reportStageName = name;
		reportStages.set(name, { name, status: 'passed', findings: 0 });
	}
	if (outputPhase) {
		if (outputPhase === 'PREPARING SAFE FIXES' || name.includes('/')) return;
		qualityCheckName = qualityLabel(name);
		qualityDetails = [];
		startQualitySpinner(qualityCheckName);
		return;
	}
	console.error(`\n=== ${name} ===`);
	console.error(detail);
}

/**
 * Reports whether a named quality check completed cleanly or found issues.
 *
 * @param name Check identifier used by the quality runner.
 * @param findings Number of findings produced by the check.
 *
 * @return Nothing; a concise completion line is written to standard error.
 */
function printCheckStatus(name: string, findings: number): void {
	if (!outputPhase || outputPhase === 'PREPARING SAFE FIXES') return;
	stopQualitySpinner();
	console.error(`  ${findings ? '✗' : '✓'} ${qualityLabel(name)}`);
	printQualityDetails();
}

/**
 * Ends a skipped check's spinner and writes its status.
 *
 * @param name Internal quality check identifier.
 *
 * @return Nothing; the skipped status is written to standard error.
 */
function printSkippedCheckStatus(name: string): void {
	if (!outputPhase || outputPhase === 'PREPARING SAFE FIXES') return;
	stopQualitySpinner();
	console.error(`  ↷ ${qualityLabel(name)}`);
	printQualityDetails();
}

/**
 * Starts a terminal spinner outside the blocked main JavaScript thread.
 *
 * @param label Readable check name shown in the terminal.
 *
 * @return Nothing; interactive terminals receive animated frames.
 */
function startQualitySpinner(label: string): void {
	if (!process.stderr.isTTY) {
		console.error(`  ⠋ ${label}`);
		return;
	}
	const state = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3));
	const worker = new Worker(new URL('./spinner-worker.js', import.meta.url), { workerData: { label, sharedBuffer: state.buffer } });
	worker.unref();
	if (Atomics.wait(state, 1, 0, 1000) === 'timed-out') {
		void worker.terminate();
		console.error(`  ⠋ ${label}`);
		return;
	}
	qualitySpinner = { worker, state };
}

/**
 * Stops the active spinner and clears its terminal line.
 *
 * @return Nothing; the check status can be written on a clean line.
 */
function stopQualitySpinner(): void {
	const spinner = qualitySpinner;
	if (!spinner) return;
	qualitySpinner = undefined;
	Atomics.store(spinner.state, 0, 1);
	Atomics.notify(spinner.state, 0);
	if (Atomics.wait(spinner.state, 2, 0, 1000) === 'timed-out') void spinner.worker.terminate();
}

/**
 * Buffers one diagnostic as a bullet under the active quality check.
 *
 * @param detail Diagnostic text to show below the check status.
 *
 * @return Nothing; text is buffered during a full quality run.
 */
function recordQualityDetail(detail: string): void {
	if (!outputPhase) {
		for (const line of compactOutput(detail)) console.error(`  ${line}`);
		return;
	}
	if (!qualityCheckName) qualityCheckName = 'Quality Runner';
	qualityDetails.push(...compactOutput(detail).map((line) => `    - ${line.trim().replace(/^[-•]\s*/u, '')}`));
}

/**
 * Prints and clears the active check's buffered diagnostic bullets.
 *
 * @return Nothing; buffered details are written to standard error.
 */
function printQualityDetails(): void {
	for (const detail of qualityDetails) console.error(detail);
	qualityDetails = [];
	qualityCheckName = undefined;
}

/**
 * Records one failed check and keeps its complete diagnostic under that check.
 *
 * @param name Check identifier used by the quality runner.
 * @param err Error thrown by the check.
 */
function recordQualityFailure(name: string, err: unknown): void {
	const detail = err instanceof Error ? err.message : String(err);
	const stage = reportStages?.get(name);
	if (stage) stage.status = 'failed';
	process.exitCode = 1;
	if (outputPhase) {
		if (!qualityCheckName) {
			qualityCheckName = qualityLabel(name);
			startQualitySpinner(qualityCheckName);
		}
		recordQualityDetail(detail);
	} else console.error(`${qualityLabel(name)}: ${detail}`);
}

/**
 * Runs an independent action and records its error without interrupting later checks.
 *
 * @param name Check identifier used if the action throws.
 * @param action Check action to run.
 *
 * @return Whether the action completed without throwing.
 */
function continueAfterFailure(name: string, action: () => void): boolean {
	try {
		action();
		return true;
	} catch (err) {
		recordQualityFailure(name, err);
		printCheckStatus(name, 1);
		return false;
	}
}

/**
 * Starts one fixed output phase for the full quality command.
 *
 * @param phase Phase heading owned by the Quality runner.
 *
 * @return Nothing; the heading is written once before the phase checks.
 */
function beginQualityPhase(phase: QualityPhase): void {
	outputPhase = phase;
	console.error(`\n${phase.toUpperCase()}`);
}

/**
 * Finds package manifests once so filtered workspace scripts can be classified.
 *
 * @param root Repository root whose package scripts are selected.
 *
 * @return Workspace package manifests outside generated and dependency directories.
 */
function workspaceManifests(root: string): WorkspaceManifest[] {
	const cached = WORKSPACE_MANIFESTS.get(root);
	if (cached) return cached;
	const manifests: WorkspaceManifest[] = [];
	/**
	 *
	 * @param dir
	 */
	const visit = (dir: string): void => {
		let entries: Dirent[];
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const path = resolve(dir, entry.name);
			if (entry.isDirectory()) {
				if (!NON_WORKSPACE_DIRS.has(entry.name) && !entry.name.startsWith('.')) visit(path);
				continue;
			}
			if (entry.name !== 'package.json' || !entry.isFile()) continue;
			try {
				const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: unknown; scripts?: Record<string, unknown> };
				manifests.push({ directory: dir, ...(typeof pkg.name === 'string' ? { name: pkg.name } : {}), scripts: pkg.scripts ?? {} });
			} catch {
				continue;
			}
		}
	};
	visit(root);
	WORKSPACE_MANIFESTS.set(root, manifests);
	return manifests;
}

/**
 * Finds the selected package script name without treating option values as check names.
 *
 * @param check Configured command whose arguments may select a package script.
 *
 * @return Script name for `run`, `run-script`, or a direct package-manager script command.
 */
function scriptNameForInvocation(check: QualityInvocation): string {
	const args = check.args ?? [];
	const runIdx = args.findIndex((arg) => arg === 'run' || arg === 'run-script');
	if (runIdx >= 0) return args[runIdx + 1] ?? '';
	if (!/^(?:pnpm|npm|yarn|bun)(?:\.cmd)?$/iu.test(basename(check.command))) return '';
	for (let idx = 0; idx < args.length; idx++) {
		const arg = args[idx]!;
		if (arg === '--filter') {
			idx++;
			continue;
		}
		if (arg.startsWith('--')) {
			if (arg === '--workspace-concurrency' || arg === '--reporter' || arg === '--dir') idx++;
			continue;
		}
		if (arg.startsWith('-')) continue;
		return arg;
	}
	return '';
}

/**
 * Returns repository package filters supplied to a package-manager command.
 *
 * @param check Configured command whose arguments may select workspace packages.
 *
 * @return Explicit `--filter` selectors in argument order.
 */
function workspaceFilters(check: QualityInvocation): string[] {
	const args = check.args ?? [];
	const selectors: string[] = [];
	for (let idx = 0; idx < args.length; idx++) {
		const arg = args[idx]!;
		if (arg === '--filter' && args[idx + 1]) selectors.push(args[++idx]!);
		else if (arg.startsWith('--filter=')) selectors.push(arg.slice('--filter='.length));
	}
	return selectors;
}

/**
 * Reads package scripts selected by a direct or filtered package-manager command.
 *
 * @param cfg Quality configuration containing the repository root.
 * @param check Configured command whose script may identify its test runner or phase.
 *
 * @return Script text from the root package or selected workspace packages.
 */
function scriptsForInvocation(cfg: QualityCfg, check: QualityInvocation): string[] {
	const scriptName = scriptNameForInvocation(check);
	if (!scriptName) return [];
	const selectors = workspaceFilters(check);
	const packages = selectors.length
		? workspaceManifests(cfg.root).filter((manifest) => selectors.some((selector) => matchesWorkspaceFilter(cfg.root, selector, manifest)))
		: workspaceManifests(cfg.root).filter((manifest) => manifest.directory === cfg.root);
	return packages.map((manifest) => manifest.scripts[scriptName]).filter((script): script is string => typeof script === 'string');
}

/**
 * Matches an exact workspace name or a simple repository-relative package filter.
 *
 * @param root Repository root that owns workspace package paths.
 * @param selector Package name or path expression following `--filter`.
 * @param manifest Candidate workspace package metadata.
 *
 * @return Whether the selector can be matched to this package without guessing.
 */
function matchesWorkspaceFilter(root: string, selector: string, manifest: WorkspaceManifest): boolean {
	const packageSelector = selector.replace(/^\.\.\./u, '').replace(/\.\.\.$/u, '');
	const pathSelector = packageSelector.startsWith('.') || (!packageSelector.startsWith('@') && packageSelector.includes('/'));
	if (!pathSelector) return manifest.name === packageSelector;
	const norm = packageSelector.replace(/^\.\//u, '').replace(/\*.*$/u, '').replace(/\/$/u, '');
	const packagePath = resolve(root, norm || '.');
	const hasGlob = /[*?{[]/u.test(packageSelector);
	if (!hasGlob) return manifest.directory === packagePath;
	const relativePackage = relative(packagePath, manifest.directory);
	if (relativePackage === '..' || relativePackage.startsWith(`..${sep}`) || isAbsolute(relativePackage)) return false;
	if (packageSelector.includes('**')) return true;
	return !relativePackage.includes(sep);
}

/**
 * Reads one display string for the command and its selected package script.
 *
 * @param cfg Quality configuration containing the repository root.
 * @param check Configured command to describe.
 *
 * @return Lowercase command and script text; free-form argument values are excluded.
 */
function invocationText(cfg: QualityCfg, check: QualityInvocation): string {
	return `${check.name} ${check.command} ${scriptNameForInvocation(check)} ${scriptsForInvocation(cfg, check).join(' ')}`.toLowerCase();
}

/**
 * Identifies test commands without adding grouping metadata to quality.json.
 *
 * @param cfg Quality configuration containing repository commands.
 * @param check Configured command to classify.
 *
 * @return Whether the command selects a test suite.
 */
function isTestInvocation(cfg: QualityCfg, check: QualityInvocation): boolean {
	return (
		testRunner(cfg, check) !== 'unknown' ||
		/\b(?:test|tests|spec|specs|playwright|vitest|jest|mocha|e2e|contract|integration)\b/u.test(invocationText(cfg, check)) ||
		(check.args ?? []).some((arg) => arg === '--test' || arg.startsWith('--test='))
	);
}

/**
 * Assigns a configured command to the fixed runner phase order.
 *
 * @param cfg Quality configuration containing repository commands.
 * @param check Configured command to classify.
 *
 * @return The output and execution phase selected by Terra Quality.
 */
function phaseForInvocation(cfg: QualityCfg, check: QualityInvocation): QualityPhase {
	if (check.phase) return check.phase;
	const text = invocationText(cfg, check);
	if (isTestInvocation(cfg, check)) return 'Tests';
	if (/\b(?:format|prettier)\b/u.test(text)) return 'Format';
	if (/\b(?:typecheck|type-check|types|tsc|astro\s+check)\b/u.test(text)) return 'Framework / type checks';
	if (/\b(?:build|compile|bundle)\b/u.test(text)) return 'Build';
	if (/\b(?:github|diff|repository-health|repo-health)\b/u.test(text)) return 'Repository health';
	return 'Static quality';
}

/**
 * Groups selected tests by the kind of boundary they exercise.
 *
 * @param cfg Quality configuration containing repository commands.
 * @param check Configured test command to classify.
 *
 * @return Stable display category for the test suite.
 */
/**
 * Identifies the runner family for configured test-command reporting.
 *
 * @param cfg Quality configuration containing repository commands.
 * @param check Configured test command to classify.
 *
 * @return Node, Playwright, or unknown when the runner cannot be inferred safely.
 */
function testRunner(cfg: QualityCfg, check: QualityInvocation): 'node' | 'playwright' | 'unknown' {
	const text = invocationText(cfg, check);
	const args = check.args ?? [];
	if (BPLAYWRIGHT_B_U_REGEX.test(text) || /\bplaywright\b/iu.test(args.join(' '))) return 'playwright';
	const nodeCmd = /^(?:node|node\.exe)$/iu.test(basename(check.command));
	const nodeTestArgs = args.some((arg) => arg === '--test' || arg.startsWith('--test=')) || args.some((arg) => /\.(?:mjs|cjs)$/iu.test(arg));
	if ((nodeCmd && nodeTestArgs) || BWORKSPACE_TEST_RUNNER_JS_B_U_REGEX.test(text) || /\bnode\s+[^\n]*--test\b/u.test(text) || /\bpnpm\s+-r\s+test\b/u.test(text)) return 'node';
	return 'unknown';
}

/**
 * Removes configured Node test reporters so the shared reporter remains authoritative.
 *
 * @param args Selected Node or package-manager arguments.
 *
 * @return Arguments without CLI reporter selections or their destination values.
 */
function withoutNodeReporterArgs(args: string[]): string[] {
	const retained: string[] = [];
	for (let idx = 0; idx < args.length; idx++) {
		const arg = args[idx]!;
		if (arg === '--test-reporter' || arg === '--test-reporter-destination') {
			idx++;
			continue;
		}
		if (arg.startsWith('--test-reporter=') || arg.startsWith('--test-reporter-destination=')) continue;
		retained.push(arg);
	}
	return retained;
}

/**
 * Removes duplicate configured test invocations while preserving the first selected name.
 *
 * @param checks Configured commands in their source order.
 *
 * @return Commands with repeated executable-and-argument vectors removed.
 */
function uniqueTestSuites(checks: QualityInvocation[]): QualityInvocation[] {
	const seen = new Set<string>();
	const unique = checks.filter((check) => {
		const key = JSON.stringify([check.command, check.args ?? []]);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	/**
	 *
	 * @param check
	 *
	 * @return
	 */
	const rank = (check: QualityInvocation): number => {
		const name = check.name.toLowerCase();
		if (/\bunit\b/u.test(name)) return 0;
		if (/\bintegration\b/u.test(name)) return 1;
		if (/\b(?:browser|e2e|playwright)\b/u.test(name) || /\bplaywright\b/u.test([check.command, ...(check.args ?? [])].join(' '))) return 2;
		return 3;
	};
	return unique.sort((left, right) => rank(left) - rank(right));
}

/**
 * Converts tool output into compact single-line messages without terminal control codes.
 *
 * @param val Raw child-process output.
 *
 * @return Output lines with ANSI codes removed and whitespace normalized.
 */
function compactOutput(val: string): string[] {
	return val
		.replace(ANSI_ESCAPE, '')
		.split(R_N_REGEX)
		.map((l) => l.replace(/\s+/g, ' ').trim())
		.filter(Boolean);
}

/**
 * Prints one-line output emitted by a quality subprocess.
 *
 * @param val Raw child-process output.
 *
 * @return Nothing; each non-empty output line is printed once.
 */
function printChildOutput(val: string | Buffer | null | undefined): void {
	if (!val) return;
	for (const line of compactOutput(val.toString())) console.error(`  ${line}`);
}

/**
 * Runs one subprocess from the configured repository root and returns its exit status.
 *
 * @param cfg Quality configuration defining the subprocess working directory.
 * @param cmd Executable path or command name.
 * @param args Arguments passed to the executable.
 * @param opts Optional output policy; successful output can be suppressed for autofix passes.
 *
 * @return Child-process exit status, or `1` when spawning fails without a status.
 */
function run(cfg: QualityCfg, cmd: string, args: string[], opts: { quietSuccess?: boolean } = {}): number {
	const result = spawnSync(cmd, args, { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env, maxBuffer: TOOL_OUTPUT_MAX_BUFFER });
	const status = result.status ?? 1;
	if (result.status && reportStages && reportStageName) {
		const stage = reportStages.get(reportStageName);
		if (stage) stage.status = 'failed';
	}
	if (outputPhase && status) {
		const output = [...compactOutput(result.stdout?.toString() ?? ''), ...compactOutput(result.stderr?.toString() ?? '')];
		recordQualityDetail(`${basename(cmd)} failed (exit ${status})`);
		for (const line of output) recordQualityDetail(line);
	} else if (!outputPhase && (!opts.quietSuccess || status)) {
		printChildOutput(result.stdout);
		printChildOutput(result.stderr);
	}
	if (result.error) {
		const message = `${cmd} failed: ${result.error.message}`;
		if (outputPhase) recordQualityDetail(message);
		else console.error(`  ${message}`);
	}
	return status;
}

/**
 * Runs one selected test command with shared case reporting when its runner is known.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param check Test command selected by quality.json.
 * @param completed One-based completed-suite count.
 * @param total Number of selected, deduplicated suites.
 *
 * @return Exit status and captured output for this check's detail list.
 */
function runTestSuite(cfg: QualityCfg, check: QualityInvocation): { status: number; output: string[] } {
	const runner = testRunner(cfg, check);
	const args = [...(check.args ?? [])];
	const env = { ...process.env };
	if (runner === 'node') {
		const reporterUrl = new URL('./node-reporter.js', import.meta.url).href;
		env.NODE_OPTIONS = qualityNodeReporterOptions(env.NODE_OPTIONS, reporterUrl);
		env.TERRA_QUALITY_NODE_REPORTER_OWNER = '1';
		args.splice(0, args.length, ...withoutNodeReporterArgs(args));
	} else if (runner === 'playwright') {
		const reporterPath = resolve(dirname(fileURLToPath(import.meta.url)), 'playwright-reporter.js');
		const reporterArg = `--reporter=${reporterPath}`;
		const selectedArgs: string[] = [];
		for (let idx = 0; idx < args.length; idx++) {
			const arg = args[idx]!;
			if (arg === '--reporter') {
				idx++;
				continue;
			}
			if (!arg.startsWith('--reporter=')) selectedArgs.push(arg);
		}
		args.splice(0, args.length, ...selectedArgs);
		const packageScript = /\b(?:pnpm|npm|yarn)\b/u.test(check.command) && args.some((arg) => arg === 'run' || arg === 'run-script');
		if (packageScript) {
			if (!args.includes('--')) args.push('--');
			args.push(reporterArg);
		} else {
			const separator = args.indexOf('--');
			if (separator < 0) args.push(reporterArg);
			else args.splice(separator, 0, reporterArg);
		}
	}
	qualityHeader(`command:${check.name}`, '');
	let status = 1;
	let output: string[] = [];
	try {
		const result = spawnSync(check.command, args, { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env, maxBuffer: TOOL_OUTPUT_MAX_BUFFER });
		output = [...compactOutput(result.stdout?.toString() ?? ''), ...compactOutput(result.stderr?.toString() ?? '')];
		if (result.error) output.push(result.error.message);
		status = result.status ?? 1;
	} catch (err) {
		output.push(err instanceof Error ? err.message : String(err));
	}
	if (reportStages && reportStageName) {
		const stage = reportStages.get(reportStageName);
		if (stage && status) stage.status = 'failed';
	}
	if (status) {
		process.exitCode = 1;
		if (outputPhase) {
			recordQualityDetail(`Command failed (exit ${status})`);
			for (const line of output) recordQualityDetail(line);
		} else for (const line of output) console.error(`  ${line}`);
	} else if (!outputPhase) for (const line of output) console.error(`  ${line}`);
	printCheckStatus(check.name, status ? 1 : 0);
	return { status, output };
}

/**
 * Combines selected profile checks with repository commands, letting same-name commands replace defaults.
 *
 * @param cfg Repository configuration containing commands and command toggles.
 * @param profileChecks Native checks resolved from selected language profiles.
 *
 * @return Profile defaults or same-name overrides, followed by unrelated repository commands.
 */
function qualityInvocations(cfg: QualityCfg, profileChecks: ResolvedLanguageCheck[]): QualityInvocation[] {
	const configured = cfg.qualityCommands ?? [];
	const profileNames = new Set(profileChecks.map((check) => check.name));
	const configuredByName = new Map(configured.map((check) => [check.name, check]));
	const profileInvocations = profileChecks.map((check): QualityInvocation => {
		const override = configuredByName.get(check.name);
		return override
			? { ...override, phase: check.phase, profileId: check.profileId, qualityChecks: check.qualityChecks }
			: { name: check.name, command: check.command, args: check.args, phase: check.phase, profileId: check.profileId, profileTool: check.tool, qualityChecks: check.qualityChecks };
	});
	return [...profileInvocations, ...configured.filter((check) => !profileNames.has(check.name))];
}

/**
 * Runs configured and profile-provided checks assigned to one fixed phase.
 *
 * @param cfg Quality configuration containing the repository root and command toggles.
 * @param phase Fixed Quality runner phase to execute.
 * @param profileChecks Native profile checks resolved for this full quality run.
 * @param toolResults Cached native-tool version probes shared across profile checks.
 *
 * @return Number of commands that failed in this phase.
 */
function runQualityPhase(cfg: QualityCfg, phase: QualityPhase, profileChecks: ResolvedLanguageCheck[], toolResults: Map<string, ReturnType<typeof inspectLanguageProfileTool>>): number {
	const cmds = qualityInvocations(cfg, profileChecks).filter((check) => qualityCmdEnabled(cfg, check.name) && phaseForInvocation(cfg, check) === phase);
	/**
	 *
	 * @param check
	 */
	const requireProfileTool = (check: QualityInvocation): void => {
		if (!check.profileTool) return;
		const toolKey = JSON.stringify([check.profileTool.command, check.profileTool.versionArgs, check.profileTool.minimumVersion]);
		let toolResult = toolResults.get(toolKey);
		if (!toolResult) {
			toolResult = inspectLanguageProfileTool(check.profileTool, cfg.root);
			toolResults.set(toolKey, toolResult);
		}
		if (toolResult.error) throw new Error(toolResult.error);
	};
	let failures = 0;
	if (phase === 'Tests') {
		const suites = uniqueTestSuites(cmds);
		for (const check of suites) {
			try {
				requireProfileTool(check);
				if (runTestSuite(cfg, check).status) failures += 1;
			} catch (error) {
				failures += 1;
				recordQualityFailure(`command:${check.name}`, error);
				printCheckStatus(check.name, 1);
			}
		}
		return failures;
	}
	for (const check of cmds) {
		qualityHeader(`command:${check.name}`, '');
		let status = 1;
		try {
			requireProfileTool(check);
			const args = [...(check.args ?? [])].flatMap((argument) => {
				if (argument !== '{classes}') return [argument];
				const classes = [resolve(cfg.root, 'target/classes'), resolve(cfg.root, 'build/classes/java/main')].filter((path) => existsSync(path) && statSync(path).isDirectory());
				if (!classes.length) throw new Error('SpotBugs requires compiled Java classes. Configure a build command before repository health checks or override java-spotbugs for the project.');
				return classes;
			});
			status = run(cfg, check.command, args);
		} catch (error) {
			recordQualityFailure(`command:${check.name}`, error);
		}
		if (status) {
			failures += 1;
			process.exitCode = 1;
		}
		printCheckStatus(`command:${check.name}`, status ? 1 : 0);
	}
	return failures;
}

/**
 * Records selected profile checks that cannot run because their source or optional config is absent.
 *
 * @param cfg Repository configuration controlling individual command toggles.
 * @param skipped Profile checks and their source-discovery reasons.
 *
 * @return Nothing; terminal output and an optional JSON report mark each check skipped.
 */
function reportSkippedLangChecks(cfg: QualityCfg, skipped: SkippedLanguageCheck[]): void {
	for (const check of skipped) {
		if (!qualityCmdEnabled(cfg, check.name)) continue;
		const name = `command:${check.name}`;
		if (reportStages) reportStages.set(name, { name, status: 'skipped', findings: 0, reason: check.reason });
		console.error(`  ↷ ${qualityLabel(check.name)} skipped: ${check.reason}.`);
	}
}

/**
 * Marks required profile configuration failures without stopping unrelated checks.
 *
 * @param cfg
 * @param failed
 */
function reportFailedLangChecks(cfg: QualityCfg, failed: SkippedLanguageCheck[]): void {
	for (const check of failed) {
		if (!qualityCmdEnabled(cfg, check.name)) continue;
		const name = `command:${check.name}`;
		if (reportStages) reportStages.set(name, { name, status: 'failed', findings: 1, reason: check.reason });
		process.exitCode = 1;
		console.error(`  ✗ ${qualityLabel(check.name)} failed: ${check.reason}.`);
	}
}

/**
 * Applies profile-provided safe fixes while preserving the normal read-only check commands.
 *
 * @param cfg
 * @param checks
 * @param toolResults
 */
function runLangProfileFixes(cfg: QualityCfg, checks: ResolvedLanguageCheck[], toolResults: Map<string, ReturnType<typeof inspectLanguageProfileTool>>): void {
	for (const check of checks) {
		if (!check.autofix || cfg.qualityCommands?.some((command) => command.name === check.name) || !qualityAutofixEnabled(cfg, check.autofix.name) || !qualityCmdEnabled(cfg, check.name)) continue;
		if (check.tool) {
			const toolKey = JSON.stringify([check.tool.command, check.tool.versionArgs, check.tool.minimumVersion]);
			let toolResult = toolResults.get(toolKey);
			if (!toolResult) {
				toolResult = inspectLanguageProfileTool(check.tool, cfg.root);
				toolResults.set(toolKey, toolResult);
			}
			if (toolResult.error) throw new Error(toolResult.error);
		}
		const args = check.autofix.args.flatMap((argument) => (argument === '{files}' ? check.files : [argument]));
		const result = spawnSync(check.autofix.command, args, { cwd: cfg.root, stdio: 'inherit' });
		if (result.error) throw result.error;
		if (result.status !== 0) throw new Error(`${check.autofix.command} exited with status ${result.status ?? 1}`);
	}
}

/**
 * Identifies an exact configured Git whitespace check.
 *
 * @param check Configured repository-health command.
 *
 * @return Whether the invocation duplicates the built-in `git diff --check`.
 */
function isGitDiffCheck(check: QualityInvocation): boolean {
	return basename(check.command).toLowerCase() === 'git' && check.args?.length === 2 && check.args[0] === 'diff' && check.args[1] === '--check';
}

/**
 * Detects whether an enabled repository-health command already performs Git's diff check.
 *
 * @param cfg Normalized repository configuration.
 *
 * @return Whether a selected exact Git diff check is present.
 */
function hasCfgdGitDiffCheck(cfg: QualityCfg): boolean {
	return (cfg.qualityCommands ?? []).some((check) => qualityCmdEnabled(cfg, check.name) && isGitDiffCheck(check));
}

/**
 * Captures source text so automatic tools can report changed-file counts without
 * replaying their successful per-file output.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param files Files modified by the automatic tool.
 *
 * @return Text snapshots keyed by absolute filename.
 */
function snapshotFiles(cfg: QualityCfg, files: string[]): Map<string, string> {
	return new Map(files.map((f) => [f, readFileSync(resolve(cfg.root, f), 'utf8')]));
}

/**
 * Counts files whose contents differ from a prior snapshot.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param files Files to compare.
 * @param before Initial file contents.
 *
 * @return Number of changed files.
 */
function changedFileCount(cfg: QualityCfg, files: string[], before: Map<string, string>): number {
	return files.filter((f) => before.get(f) !== readFileSync(resolve(cfg.root, f), 'utf8')).length;
}

/**
 * Splits file arguments below a conservative process argument-size limit.
 *
 * @param files Absolute file paths passed to ESLint.
 *
 * @return Ordered file batches that fit within the argument budget.
 */
function argumentBatches(files: string[]): string[][] {
	const result: string[][] = [];
	let batch: string[] = [];
	let bytes = 0;
	for (const file of files) {
		const size = Buffer.byteLength(file) + 1;
		if (batch.length && bytes + size > ESLINT_ARGUMENT_BUDGET) {
			result.push(batch);
			batch = [];
			bytes = 0;
		}
		batch.push(file);
		bytes += size;
	}
	if (batch.length) result.push(batch);
	return result;
}

/**
 * Escapes glob syntax in one repository-relative ESLint file pattern.
 *
 * @param path Repository-relative file path.
 *
 * @return Literal ESLint pattern matching only that path.
 */
function eslintFilePattern(path: string): string {
	return [...path].map((character) => (ESLINT_GLOB_SPECIALS.has(character) ? `\\${character}` : character)).join('');
}

/**
 * Selects either the complete configured scope or the changed working-tree scope.
 *
 * @param cfg Quality configuration defining source discovery.
 * @param all Whether to include every configured source file.
 *
 * @return Source files for the requested run scope.
 */
function filesFor(cfg: QualityCfg, all: boolean): string[] {
	return all ? srcFiles(cfg) : workingSrcFiles(cfg);
}

/**
 * Restricts a configuration to the files selected for a changed-file run.
 *
 * @param cfg Quality configuration to scope.
 * @param all Whether the full source scope should remain unchanged.
 *
 * @return Original configuration for full runs, or a configuration rooted at changed files.
 */
function scopedCfg(cfg: QualityCfg, all: boolean): QualityCfg {
	return all ? cfg : { ...cfg, sourceRoots: filesFor(cfg, false) };
}

/**
 * Creates the child program that reuses one ESLint engine for the complete file set.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param files Ordered files to lint.
 * @param opts CLI options controlling safe fixes.
 * @param exhaustive Whether any warning must fail the lint pass.
 * @param deadCodeCoordinated Whether unused-variable reporting belongs to the dead-code coordinator.
 *
 * @return ESM source for the ESLint API child process.
 */
function eslintApiSource(cfg: QualityCfg, files: string[], opts: QualityOptions, exhaustive: boolean, deadCodeCoordinated: boolean): string {
	const payload = JSON.stringify({ root: cfg.root, files, fix: opts.fix, exhaustive, deadCodeCoordinated });
	const progressUrl = new URL('./progress.js', import.meta.url).href;
	return `
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const options = ${payload};
const { qualityProgress } = await import(${JSON.stringify(progressUrl)});
let ESLint;
let engine;
try {
	({ ESLint } = createRequire(resolve(options.root, 'package.json'))('eslint'));
	if (!ESLint) throw new Error('The installed ESLint package does not expose its API.');
	engine = new ESLint({
		cwd: options.root,
		cache: true,
		cacheLocation: 'node_modules/.cache/eslint',
		cacheStrategy: 'content',
		warnIgnored: false,
		fix: options.fix,
		...(options.deadCodeCoordinated ? { overrideConfig: { rules: { 'unused-imports/no-unused-vars': 'off' } } } : {}),
	});
} catch {
	process.exit(${ESLINT_API_FALLBACK});
}
try {
	const results = await engine.lintFiles(options.files);
	if (options.fix) await ESLint.outputFixes(results);
	qualityProgress('ESLint', options.files.length, options.files.length);
	const formatter = await engine.loadFormatter();
	const output = await formatter.format(results);
	if (output) process.stdout.write(output);
	const errors = results.reduce((total, result) => total + result.errorCount, 0);
	const warnings = results.reduce((total, result) => total + result.warningCount, 0);
	process.exitCode = errors || (options.exhaustive && warnings) ? 1 : 0;
} catch (error) {
	process.stdout.write(error instanceof Error ? error.stack ?? error.message : String(error));
	process.exitCode = 2;
}
`;
}

/**
 * Runs ESLint over the selected files in one API pass.
 *
 * @param cfg Quality configuration defining the repository and ESLint executable.
 * @param opts CLI options controlling scope and autofix.
 * @param exhaustive Whether ESLint must report zero warnings.
 * @param deadCodeCoordinated Whether the canonical dead-code coordinator owns unused-variable reporting.
 *
 * @return Nothing; failures are reflected in the process exit code.
 */
function runLint(cfg: QualityCfg, opts: QualityOptions, exhaustive = false, deadCodeCoordinated = false): void {
	const files = filesFor(cfg, opts.all).filter((f) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f));
	if (!files.length) return;
	qualityHeader('lint', `${opts.fix ? 'Fixing' : 'Checking'} ${files.length} source files with ESLint`);
	const flags = [
		'--cache',
		'--cache-strategy',
		'content',
		'--cache-location',
		'node_modules/.cache/eslint',
		'--no-warn-ignored',
		...(deadCodeCoordinated ? ['--rule', 'unused-imports/no-unused-vars: off'] : []),
		...(exhaustive ? ['--max-warnings=0'] : []),
		...(opts.fix ? ['--fix'] : []),
	];
	let failed = false;
	const before = opts.fix ? snapshotFiles(cfg, files) : undefined;
	let completed = 0;
	qualityProgress('ESLint', completed, files.length);
	let apiUnavailable = cfg.tools?.eslint !== undefined && cfg.tools.eslint !== 'eslint';
	if (!apiUnavailable) {
		const result = spawnSync(process.execPath, ['--input-type=module'], {
			cwd: cfg.root,
			stdio: ['pipe', 'pipe', 'inherit'],
			input: eslintApiSource(cfg, files, opts, exhaustive, deadCodeCoordinated),
			env: process.env,
			maxBuffer: TOOL_OUTPUT_MAX_BUFFER,
		});
		apiUnavailable = result.status === ESLINT_API_FALLBACK;
		if (!apiUnavailable) {
			const status = result.status ?? 1;
			const childOutput = result.stdout?.toString() ?? '';
			if (status && reportStages && reportStageName) {
				const stage = reportStages.get(reportStageName);
				if (stage) stage.status = 'failed';
			}
			if (status) {
				failed = true;
				process.exitCode = status;
				const details = compactOutput(childOutput);
				if (result.error) details.push(result.error.message);
				if (outputPhase) {
					recordQualityDetail(`ESLint failed (exit ${status})`);
					for (const line of details) recordQualityDetail(line);
				} else printChildOutput(childOutput);
			} else if (!outputPhase && childOutput) printChildOutput(childOutput);
		}
	}
	if (apiUnavailable) {
		for (const filesBatch of argumentBatches(files)) {
			const status = run(cfg, toolPath(cfg, cfg.tools?.eslint, 'eslint'), [...flags, ...filesBatch], { quietSuccess: opts.fix });
			completed += filesBatch.length;
			qualityProgress('ESLint', completed, files.length);
			if (status) {
				failed = true;
				process.exitCode = status;
			}
		}
	}
	if (before && !outputPhase) console.error(`  fixed ${changedFileCount(cfg, files, before)} files`);
	printCheckStatus('lint', failed ? 1 : 0);
}

/**
 * Removes function declarations that ESLint proves have no references.
 *
 * Knip can safely remove an unused export modifier while leaving the declaration
 * private. This pass completes that mechanical cleanup without guessing about
 * variables whose initializers may have side effects.
 *
 * @param cfg Quality configuration defining the repository and ESLint executable.
 * @param reports ESLint reports containing unused private function declarations.
 * @param changedFiles Set updated with files modified by the fixer.
 * @param importedConsumers Export names referenced by configured source files.
 *
 * @return Number of unused function declarations removed.
 */
function fixUnusedDeclarations(cfg: QualityCfg, reports: EslintReport[], changedFiles: Set<string>, importedConsumers = importedExportConsumers(cfg)): number {
	let fixed = 0;
	for (const report of reports) {
		const unusedMsgs = report.messages.filter((message) => message.ruleId === 'unused-imports/no-unused-vars');
		if (!unusedMsgs.length) continue;
		const src = readFileSync(report.filePath, 'utf8');
		const ast = ts.createSourceFile(
			report.filePath,
			src,
			ts.ScriptTarget.Latest,
			true,
			C_M_JS_TS_X_CLASS_2.test(report.filePath) && report.filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
		);
		if ((ast as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length)
			throw new Error(`ESLint reported unused declarations in unparsable source: ${report.filePath}`);
		const starts = new Set(unusedMsgs.map((message) => ast.getPositionOfLineAndCharacter(message.line - 1, message.column - 1)));
		const edits: Array<{ start: number; end: number; text?: string }> = [];
		/**
		 *
		 * @param node
		 */
		const visit = (node: ts.Node): void => {
			let declaration: ts.Node | undefined;
			const name =
				ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)
					? node.name?.text
					: ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
						? node.name.text
						: undefined;
			const externallyConsumed = name ? importedConsumers.get(resolve(report.filePath))?.has(name) : false;
			/**
			 *
			 * @param candidate
			 *
			 * @return
			 */
			const isTopLevel = (candidate: ts.Node): boolean =>
				candidate.parent === ast ||
				(ts.isVariableDeclaration(candidate) && ts.isVariableDeclarationList(candidate.parent) && ts.isVariableStatement(candidate.parent.parent) && candidate.parent.parent.parent === ast);
			/**
			 *
			 * @param candidate
			 *
			 * @return
			 */
			const isExported = (candidate: ts.Node): boolean => ts.canHaveModifiers(candidate) && Boolean(ts.getModifiers(candidate)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
			if (ts.isFunctionDeclaration(node) && node.name && starts.has(node.name.getStart(ast)) && isTopLevel(node) && !isExported(node) && !externallyConsumed) declaration = node;
			if ((ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && starts.has(node.name.getStart(ast)) && isTopLevel(node) && !isExported(node) && !externallyConsumed)
				declaration = node;
			if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && starts.has(node.name.getStart(ast)) && isTopLevel(node) && !externallyConsumed) {
				if (
					ts.isVariableDeclarationList(node.parent) &&
					(node.parent.flags & ts.NodeFlags.Const) !== 0 &&
					node.parent.declarations.length === 1 &&
					ts.isVariableStatement(node.parent.parent) &&
					!node.parent.parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
					node.initializer &&
					isPureUnusedInit(node.initializer)
				)
					declaration = node.parent.parent;
			}
			if (declaration) {
				let start = declaration.getStart(ast);
				const comments = ts.getLeadingCommentRanges(src, declaration.getFullStart()) ?? [];
				const attached = comments.at(-1);
				if (attached?.kind === ts.SyntaxKind.MultiLineCommentTrivia && src.slice(attached.end, start).trim() === '' && src.slice(attached.pos, attached.pos + 3) === '/**') start = attached.pos;
				let end = declaration.end;
				while (src[end] === ' ' || src[end] === '\t') end++;
				if (src.slice(end, end + 2) === '\r\n') end += 2;
				else if (src[end] === '\n') end++;
				edits.push({ start, end });
			}
			ts.forEachChild(node, visit);
		};
		visit(ast);
		if (!edits.length) continue;
		let updated = src;
		for (const edit of edits.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, edit.start)}${updated.slice(edit.end)}`;
		const diagnostics =
			ts.transpileModule(updated, { fileName: report.filePath, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext } }).diagnostics ??
			[];
		if (diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) continue;
		writeFileSync(report.filePath, updated);
		changedFiles.add(report.filePath);
		fixed += edits.length;
	}
	return fixed;
}

/**
 * Accepts only initializers whose evaluation has no observable effects.
 *
 * @param node Initializer expression to classify.
 *
 * @return Whether evaluating the expression is limited to immutable literal data or a function value.
 */
function isPureUnusedInit(node: ts.Expression): boolean {
	if (
		ts.isStringLiteralLike(node) ||
		ts.isNumericLiteral(node) ||
		ts.isBigIntLiteral(node) ||
		ts.isRegularExpressionLiteral(node) ||
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword ||
		node.kind === ts.SyntaxKind.NullKeyword ||
		ts.isArrowFunction(node) ||
		ts.isFunctionExpression(node)
	)
		return true;
	if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node))
		return isPureUnusedInit(node.expression);
	if (ts.isArrayLiteralExpression(node)) return node.elements.every((element) => !ts.isSpreadElement(element) && isPureUnusedInit(element));
	if (ts.isObjectLiteralExpression(node))
		return node.properties.every((property) => ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) && isPureUnusedInit(property.initializer));
	return false;
}
/** One file's parsed ESLint messages used by the dead-code coordinator. */
type EslintReport = { filePath: string; messages: Array<{ ruleId?: string; line: number; column: number; message?: string }> };
/** A safe-to-fix or manual-review result from a dead-code detector. */
type DeadCodeFinding = { rule: string; file: string; line: number; name: string; severity: 'error'; autofixable: boolean; reason: string; agentAction: string };
/** One named item reported by Knip, with an optional source line. */
type KnipItem = { name: string; line?: number };
/** One source-file record in Knip's machine-readable issue inventory. */
type KnipIssue = { file: string; [kind: string]: string | KnipItem[] };

/**
 * Uses the repository's resolved unused-variable rule without evaluating its unrelated lint rules.
 *
 * @param cfg Quality configuration defining the repository and selected ESLint executable.
 * @param flatCfg Resolved flat ESLint config path.
 *
 * @return Whether the local ESLint API matches the configured executable.
 */
function canUseFocusedEslint(cfg: QualityCfg, flatCfg: string | undefined): boolean {
	if (!flatCfg) return false;
	const cfgdTool = cfg.tools?.eslint;
	const localExecutable = resolve(cfg.root, 'node_modules', '.bin', 'eslint');
	if (cfgdTool && cfgdTool !== 'eslint' && resolve(cfg.root, cfgdTool) !== localExecutable) return false;
	return existsSync(resolve(cfg.root, 'node_modules', 'eslint', 'package.json'));
}

/**
 * Builds a temporary flat config containing only each selected file's unused-variable rule.
 *
 * @param cfg Quality configuration defining the repository.
 * @param flatCfg Original flat ESLint config used to resolve parser, plugin, and rule settings.
 * @param files Source files passed to the focused detector.
 *
 * @return JavaScript module source for ESLint's temporary config loader.
 */
function focusedEslintCfgSrc(cfg: QualityCfg, flatCfg: string, files: string[]): string {
	const patterns = files.map((f) => eslintFilePattern(relative(cfg.root, f).split(sep).join('/')));
	return `
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const root = ${JSON.stringify(cfg.root)};
const configPath = ${JSON.stringify(flatCfg)};
const sourceFiles = ${JSON.stringify(files)};
const filePatterns = ${JSON.stringify(patterns)};
try {
	const requireFromRepo = createRequire(resolve(root, 'package.json'));
	const { ESLint } = requireFromRepo('eslint');
	const eslint = new ESLint({ cwd: root, overrideConfigFile: configPath, ignore: false });
	const groups = new Map();
	const objectIds = new WeakMap();
	let nextObjectId = 0;
	const objectId = (value) => {
		if (!value || (typeof value !== 'object' && typeof value !== 'function')) return String(value);
		if (!objectIds.has(value)) objectIds.set(value, ++nextObjectId);
		return objectIds.get(value);
	};
	for (const [index, file] of sourceFiles.entries()) {
		const effective = await eslint.calculateConfigForFile(file);
		const languageOptions = effective?.languageOptions;
		if (!languageOptions?.parser) throw new Error('ESLint did not resolve a parser for ' + file);
		const parserOptions = { ...(languageOptions.parserOptions ?? {}) };
		for (const key of ['project', 'projectService', 'program', 'tsconfigRootDir']) delete parserOptions[key];
		const focusedLanguageOptions = { ...languageOptions, parserOptions };
		const rule = effective.rules?.['unused-imports/no-unused-vars'];
		const severity = Array.isArray(rule) ? rule[0] : rule;
		const active = rule !== undefined && severity !== 0 && severity !== 'off';
		const plugin = effective.plugins?.['unused-imports'];
		if (active && !plugin) throw new Error('ESLint resolved the unused-variable rule without its plugin for ' + file);
		const signature = JSON.stringify({
			parser: objectId(languageOptions.parser),
			plugin: objectId(plugin),
			rule: active ? rule : null,
			languageOptions: { ...focusedLanguageOptions, parser: undefined },
			settings: effective.settings,
		});
		const group = groups.get(signature) ?? {
			patterns: [],
			languageOptions: focusedLanguageOptions,
			plugins: plugin ? { 'unused-imports': plugin } : {},
			rules: active ? { 'unused-imports/no-unused-vars': rule } : {},
			settings: effective.settings,
		};
		group.patterns.push(filePatterns[index]);
		groups.set(signature, group);
	}
	const focused = new ESLint({
		cwd: root,
		ignore: false,
		overrideConfigFile: true,
		overrideConfig: [...groups.values()].map((group) => ({
			files: group.patterns,
			languageOptions: group.languageOptions,
			plugins: group.plugins,
			rules: group.rules,
			...(group.settings ? { settings: group.settings } : {}),
		})),
	});
	const results = await focused.lintFiles(sourceFiles);
	const reports = results.map(({ filePath, messages, fatalErrorCount }) => ({
		filePath: resolve(filePath),
		messages: messages.map(({ ruleId, line, column, message }) => ({ ruleId, line, column, message })),
		fatalErrorCount,
	}));
	process.stdout.write(JSON.stringify(reports));
} catch (error) {
	console.error(${JSON.stringify(FOCUSED_ESLINT_FALLBACK)}, error instanceof Error ? error.stack ?? error.message : String(error));
	process.exitCode = 2;
}
`;
}

/**
 * Runs the unused-variable detector under the extracted repository rule configuration.
 *
 * @param cfg Quality configuration defining the repository.
 * @param flatCfg Original flat ESLint config used to resolve the detector rule.
 * @param files Source files in this argument-safe batch.
 *
 * @return ESLint process result, or `undefined` when the extraction requires the full-config fallback.
 */
function runFocusedEslint(cfg: QualityCfg, flatCfg: string, files: string[]): ReturnType<typeof spawnSync> | undefined {
	const result = spawnSync(process.execPath, ['--input-type=module'], {
		cwd: cfg.root,
		encoding: 'utf8',
		env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' },
		input: focusedEslintCfgSrc(cfg, flatCfg, files),
		maxBuffer: TOOL_OUTPUT_MAX_BUFFER,
	});
	if (result.status === 2 && result.stderr?.toString().includes(FOCUSED_ESLINT_FALLBACK)) return undefined;
	return result;
}

/**
 * Runs ESLint's machine-readable pass once for the selected source files.
 *
 * @param cfg Quality configuration defining source files and the ESLint executable.
 * @param all Whether to inspect every configured source file instead of changed files.
 * @param selectedFiles Optional exact file set to scan incrementally.
 *
 * @return Validated ESLint reports for the selected source files.
 */
function collectEslintReports(cfg: QualityCfg, all: boolean, selectedFiles?: string[]): EslintReport[] {
	const files = (selectedFiles ?? filesFor(cfg, all)).filter((f) => CJS_JS_JSX_MJS_TS_TSX_REGEX.test(f));
	const reports: EslintReport[] = [];
	const flatCfg = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts']
		.map((f) => resolve(cfg.root, f))
		.find((f) => existsSync(f));
	const eslintPath = toolPath(cfg, cfg.tools?.eslint, 'eslint');
	const focusedEslint = canUseFocusedEslint(cfg, flatCfg);
	let completed = 0;
	qualityProgress('ESLint dead-code', completed, files.length);
	for (const filesBatch of argumentBatches(files)) {
		const focusedResult = focusedEslint && flatCfg ? runFocusedEslint(cfg, flatCfg, filesBatch) : undefined;
		const result =
			focusedResult ??
			spawnSync(eslintPath, ['--format', 'json', '--no-ignore', ...(flatCfg ? ['--config', flatCfg] : []), ...filesBatch], {
				cwd: cfg.root,
				encoding: 'utf8',
				env: flatCfg ? { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' } : process.env,
				maxBuffer: TOOL_OUTPUT_MAX_BUFFER,
			});
		reports.push(...parseEslintReports(result, filesBatch));
		completed += filesBatch.length;
		qualityProgress('ESLint dead-code', completed, files.length);
	}
	return reports;
}

/**
 * Parses ESLint JSON and fails closed when the detector cannot provide a trustworthy result.
 *
 * @param result ESLint process result containing JSON reports and an exit status.
 * @param files Absolute paths of every source file requested from ESLint.
 *
 * @return Validated reports covering the complete requested file set.
 */
function parseEslintReports(result: ReturnType<typeof spawnSync>, files: string[]): EslintReport[] {
	if (result.error) throw new Error(`ESLint dead-code detector failed: ${result.error.message}`);
	if (result.status !== 0 && result.status !== 1)
		throw new Error(
			`ESLint dead-code detector exited ${result.status ?? 'without a status'} for ${files.length} source files (${files
				.slice(0, 3)
				.map((f) => relative(process.cwd(), f))
				.join(', ')}${files.length > 3 ? ', …' : ''}): ${compactOutput(result.stderr?.toString() ?? '').join(' ')}`,
		);
	try {
		const reports = JSON.parse(result.stdout?.toString() || '') as unknown;
		if (!Array.isArray(reports)) throw new Error('expected a JSON array');
		if (
			reports.some(
				(report) =>
					!report ||
					typeof report.filePath !== 'string' ||
					!Array.isArray(report.messages) ||
					report.messages.some(
						(message: unknown) =>
							!message ||
							typeof message !== 'object' ||
							((message as { ruleId?: unknown }).ruleId === 'unused-imports/no-unused-vars' &&
								(!Number.isInteger((message as { line?: unknown }).line) || !Number.isInteger((message as { column?: unknown }).column))),
					),
			)
		)
			throw new Error('report entries must include filePath and well-formed messages');
		const actual = new Set(reports.map((report: { filePath: string }) => resolve(report.filePath)));
		const missing = files.map((f) => resolve(f)).filter((f) => !actual.has(f));
		if (missing.length) throw new Error(`missing reports for ${missing.join(', ')}`);
		return reports as EslintReport[];
	} catch (err) {
		const detail = err instanceof SyntaxError ? `invalid JSON: ${err.message}` : err instanceof Error ? err.message : String(err);
		throw new Error(`ESLint dead-code detector could not read reports for ${files.length} source files: ${detail}`, { cause: err });
	}
}

/**
 * Reports unused private declarations, classifying only proven-safe removals as autofixable.
 *
 * @param cfg Quality configuration defining the repository and source roots.
 * @param reports Parsed ESLint messages used to identify unused private declarations.
 *
 * @return Findings with only unambiguous, side-effect-free function removals marked fixable.
 */
function unusedDeclarationFindings(cfg: QualityCfg, reports: EslintReport[]): DeadCodeFinding[] {
	const findings: DeadCodeFinding[] = [];
	for (const report of reports) {
		const src = readFileSync(report.filePath, 'utf8');
		const lines = src.split(R_N_REGEX);
		const ast = ts.createSourceFile(
			report.filePath,
			src,
			ts.ScriptTarget.Latest,
			true,
			C_M_JS_TS_X_CLASS_2.test(report.filePath) && report.filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
		);
		if ((ast as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length)
			throw new Error(`ESLint reported unused declarations in unparsable source: ${report.filePath}`);
		for (const msg of report.messages.filter((e) => e.ruleId === 'unused-imports/no-unused-vars')) {
			const text = lines[msg.line - 1]?.slice(Math.max(0, msg.column - 1)) ?? '';
			const name = text.match(/^[A-Za-z_$][\w$]*/)?.[0] ?? msg.message?.match(/^'([^']+)'/)?.[1] ?? '<unknown>';
			const pos = ast.getPositionOfLineAndCharacter(msg.line - 1, msg.column - 1);
			let declaration: ts.Node | undefined;
			/**
			 *
			 * @param node
			 */
			const find = (node: ts.Node): void => {
				if (
					(node as ts.Node & { name?: ts.Node }).name &&
					ts.isIdentifier((node as ts.Node & { name?: ts.Node }).name as ts.Node) &&
					((node as ts.Node & { name?: ts.Node }).name as ts.Node).getStart(ast) === pos
				)
					declaration = node;
				ts.forEachChild(node, find);
			};
			find(ast);
			let autofixable = false;
			let reason = 'The ESLint location did not resolve to a supported private declaration.';
			const declarationExported =
				declaration &&
				((ts.canHaveModifiers(declaration) && Boolean(ts.getModifiers(declaration as ts.HasModifiers)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))) ||
					(ts.isVariableDeclaration(declaration) &&
						ts.isVariableDeclarationList(declaration.parent) &&
						ts.isVariableStatement(declaration.parent.parent) &&
						Boolean(declaration.parent.parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))));
			const topLevelPrivate = Boolean(
				declaration &&
				(declaration.parent === ast ||
					(ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent) && ts.isVariableStatement(declaration.parent.parent) && declaration.parent.parent.parent === ast)),
			);
			if (declaration && !declarationExported && topLevelPrivate) {
				if (ts.isFunctionDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
					autofixable = true;
					reason = 'ESLint confirms this private declaration is unused and removing it has no initializer effects.';
				} else if (ts.isVariableDeclaration(declaration)) {
					autofixable =
						ts.isVariableDeclarationList(declaration.parent) &&
						(declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
						declaration.parent.declarations.length === 1 &&
						ts.isVariableStatement(declaration.parent.parent) &&
						Boolean(declaration.initializer && isPureUnusedInit(declaration.initializer));
					reason = autofixable ? 'The unused const has a side-effect-free initializer.' : 'Removing this binding may change initializer evaluation or declaration semantics.';
				}
			} else if (declaration && !declarationExported) {
				reason = 'This unused binding is nested inside another declaration; removing its enclosing function or component would change behavior.';
			}
			findings.push({
				rule: 'eslint/unused-private-declaration',
				file: relative(cfg.root, report.filePath),
				line: msg.line,
				name,
				severity: 'error',
				autofixable,
				reason,
				agentAction: autofixable
					? 'Run the canonical dead-code autofix; it should remove this declaration and its attached TSDoc without changing other source behavior.'
					: reason.startsWith('This unused binding is nested')
						? 'Remove only this local parameter or binding when appropriate; preserve its enclosing function, component, hook order, closure behavior, and control flow, then run the focused test and typecheck.'
						: 'Inspect the declaration and its initializer. Remove the unused binding only if initializer evaluation and control flow remain equivalent; preserve observable effects, then run the affected focused test and typecheck.',
			});
		}
	}
	return findings;
}

/**
 * Runs one named repository quality command.
 *
 * @param cfg Quality configuration containing configured commands.
 * @param name Command name to execute.
 *
 * @return Nothing; command failures are reflected in the process exit code.
 */
function runCfgdCmd(cfg: QualityCfg, name: string): void {
	if (!qualityCmdEnabled(cfg, name)) return;
	const check = cfg.qualityCommands?.find((c) => c.name === name);
	if (!check) throw new Error(`Unknown quality domain: ${name}`);
	qualityHeader(`command:${name}`, '');
	let status = 1;
	try {
		status = run(cfg, check.command, check.args ?? []);
	} catch (err) {
		recordQualityFailure(`command:${name}`, err);
	}
	if (status) process.exitCode = 1;
	printCheckStatus(`command:${name}`, status ? 1 : 0);
}

/**
 * Runs configured recommendation commands after Knip and fails when a command fails.
 *
 * @param cfg Quality configuration containing recommendation commands.
 *
 * @return Nothing; command failures set the process exit code.
 */
function runRecommendationCmds(cfg: QualityCfg): void {
	for (const check of cfg.recommendationCommands ?? []) {
		if (!qualityRecommendationEnabled(cfg, check.name)) continue;
		qualityHeader(`recommendation:${check.name}`, '');
		let status = 1;
		try {
			status = run(cfg, check.command, check.args ?? []);
		} catch (err) {
			recordQualityFailure(`recommendation:${check.name}`, err);
		}
		if (status) process.exitCode = 1;
		printCheckStatus(`recommendation:${check.name}`, status ? 1 : 0);
	}
}

/**
 * Runs the configured project typecheck command or the default TypeScript compiler invocation.
 *
 * @param cfg Quality configuration containing compiler and project settings.
 *
 * @return Nothing; typecheck failures are reflected in the process exit code.
 */
function runProjectTypecheck(cfg: QualityCfg): void {
	qualityHeader('typecheck', 'Checking the configured project type boundary');
	if (!cfg.typecheckCommand) {
		const status = run(cfg, toolPath(cfg, cfg.tools?.tsc, 'tsc'), ['--noEmit', '-p', cfg.tsconfig ?? 'tsconfig.json']);
		if (status) process.exitCode = status;
		printCheckStatus('typecheck', status ? 1 : 0);
		return;
	}
	const result = spawnSync(cfg.typecheckCommand.command, cfg.typecheckCommand.args ?? [], { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env, maxBuffer: TOOL_OUTPUT_MAX_BUFFER });
	const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
	const diagnosticsReported = /\berror\s+ts\(\d+\)/u.test(output) || /-\s+[1-9]\d*\s+errors?\b/u.test(output);
	const status = result.status ?? 1;
	if (status || diagnosticsReported) {
		const lines = compactOutput(output);
		if (outputPhase) {
			recordQualityDetail(`${cfg.typecheckCommand.command} ${status ? `failed (exit ${status})` : 'reported diagnostics'}`);
			for (const line of lines) recordQualityDetail(line);
		} else printChildOutput(output);
	}
	if (status || diagnosticsReported) process.exitCode = status || 1;
	printCheckStatus('typecheck', status || diagnosticsReported ? 1 : 0);
}

/**
 * Restores a missing local import when the repository has one unambiguous
 * source export for the unresolved identifier. This is deliberately narrow:
 * unresolved locals, globals, and symbols with multiple possible sources are
 * left for the compiler rather than guessed at.
 *
 * @param cfg Quality configuration defining the repository root and source scope.
 * @param program TypeScript program whose exports and unresolved identifiers are inspected.
 * @param checker TypeScript type checker used to resolve exported symbols.
 *
 * @return Nothing; unambiguous missing local imports are written into source files.
 */
function repairMissingImports(cfg: QualityCfg, program: ts.Program, checker: ts.TypeChecker): void {
	const candidates = new Map<string, ts.SourceFile[]>();
	for (const source of program.getSourceFiles()) {
		if (!source.fileName.startsWith(`${cfg.root}${sep}`) || !C_M_JS_TS_X_REGEX.test(source.fileName)) continue;
		const module = checker.getSymbolAtLocation(source);
		for (const exported of module ? checker.getExportsOfModule(module) : []) {
			const list = candidates.get(exported.name) ?? [];
			list.push(source);
			candidates.set(exported.name, list);
		}
	}
	/**
	 *
	 * @param n
	 *
	 * @return
	 */
	const isTypePos = (n: ts.Identifier): boolean => {
		for (let parent: ts.Node | undefined = n.parent; parent; parent = parent.parent) {
			if (ts.isImportDeclaration(parent) || ts.isVariableDeclaration(parent) || ts.isFunctionDeclaration(parent)) return false;
			if (ts.isTypeNode(parent) || ts.isTypeAliasDeclaration(parent) || ts.isInterfaceDeclaration(parent)) return true;
			if (ts.isStatement(parent)) return false;
		}
		return false;
	};

	// WALKTHROUGH
	for (const src of program.getSourceFiles()) {
		if (!src.fileName.startsWith(`${cfg.root}${sep}`) || !C_M_JS_TS_X_REGEX.test(src.fileName)) continue;
		const missing = new Map<string, { source: ts.SourceFile; typeOnly: boolean }>();
		const importedNames = new Set<string>();
		for (const statement of src.statements.filter(ts.isImportDeclaration)) {
			if (!statement.importClause) continue;
			if (statement.importClause.name) importedNames.add(statement.importClause.name.text);
			if (statement.importClause.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings)) importedNames.add(statement.importClause.namedBindings.name.text);
			if (statement.importClause.namedBindings && ts.isNamedImports(statement.importClause.namedBindings))
				for (const element of statement.importClause.namedBindings.elements) importedNames.add(element.name.text);
		}
		/**
		 *
		 * @param n
		 */
		const visit = (n: ts.Node): void => {
			const intrinsicJsxTag = ts.isIdentifier(n) && (ts.isJsxOpeningLikeElement(n.parent) || ts.isJsxClosingElement(n.parent)) && n.parent.tagName === n && /^[a-z]/.test(n.text);
			const propertyName =
				ts.isIdentifier(n) && (('name' in n.parent && (n.parent as { name?: ts.Node }).name === n) || ('propertyName' in n.parent && (n.parent as { propertyName?: ts.Node }).propertyName === n));
			if (
				ts.isIdentifier(n) &&
				!intrinsicJsxTag &&
				!propertyName &&
				!checker.getSymbolAtLocation(n) &&
				!ts.isPropertyAccessExpression(n.parent) &&
				!ts.isPropertyAccessChain(n.parent) &&
				!ts.isQualifiedName(n.parent) &&
				!importedNames.has(n.text) &&
				!ts.isImportDeclaration(n.parent) &&
				!ts.isImportSpecifier(n.parent) &&
				!ts.isExportSpecifier(n.parent)
			) {
				const srcs = candidates.get(n.text) ?? [];
				const unique = [...new Set(srcs)].filter((c) => c !== src);
				if (unique.length === 1) missing.set(n.text, { source: unique[0]!, typeOnly: isTypePos(n) });
			}
			ts.forEachChild(n, visit);
		};
		visit(src);
		if (!missing.size) continue;
		const imports = [...missing.entries()].reduce((g, [n, v]) => {
			const specifier = relative(dirname(src.fileName), v.source.fileName)
				.replace(/\\/g, '/')
				.replace(/\.(?:c|m)?tsx?$/, '')
				.replace(/\.jsx?$/, '');
			const moduleName = specifier.startsWith('.') ? specifier : `./${specifier}`;
			const key = `${v.typeOnly ? 'type:' : 'value:'}${moduleName}`;
			const names = g.get(key) ?? { moduleName, typeOnly: v.typeOnly, names: [] as string[] };
			names.names.push(n);
			g.set(key, names);
			return g;
		}, new Map<string, { moduleName: string; typeOnly: boolean; names: string[] }>());
		const text = readFileSync(src.fileName, 'utf8');
		const importText = [...imports.values()].map((g) => `import ${g.typeOnly ? 'type ' : ''}{ ${g.names.sort().join(', ')} } from '${g.moduleName}';`).join('\n');
		const firstBody = src.statements.find((s) => !ts.isImportDeclaration(s));
		const pos = firstBody?.getStart(src) ?? 0;
		const updated = `${text.slice(0, pos)}${importText}\n${text.slice(pos)}`;
		if (updated !== text) writeFileSync(src.fileName, updated);
	}
}

/**
 * Runs Knip once and validates its complete machine-readable issue inventory.
 *
 * @param cfg Quality configuration defining the repository and Knip executable.
 *
 * @return Validated issue records reported by Knip.
 */
function readKnipIssues(cfg: QualityCfg): KnipIssue[] {
	const knip = toolPath(cfg, cfg.tools?.knip, 'knip');
	const result = spawnSync(knip, ['--reporter', 'json', '--no-config-hints'], { cwd: cfg.root, encoding: 'utf8', env: process.env, maxBuffer: TOOL_OUTPUT_MAX_BUFFER });
	if (result.error || (result.status !== 0 && result.status !== 1)) throw new Error(`Knip failed: ${result.error?.message ?? result.stderr ?? result.status}`);
	let issues: KnipIssue[];
	try {
		const parsed = JSON.parse(result.stdout) as { issues?: KnipIssue[] };
		if (!Array.isArray(parsed.issues)) throw new Error('missing issues array');
		issues = parsed.issues;
		for (const issue of issues) {
			if (!issue || typeof issue.file !== 'string' || !issue.file) throw new Error('finding without a source file');
			assertKnipPath(cfg, issue.file, 'finding source');
			for (const [kind, val] of Object.entries(issue)) {
				if (kind === 'file') continue;
				if (!Array.isArray(val)) throw new Error(`invalid ${kind} findings for ${issue.file}`);
				for (const item of val) {
					if (!item || typeof item.name !== 'string' || !item.name || (item.line !== undefined && (!Number.isInteger(item.line) || item.line < 1)))
						throw new Error(`malformed ${kind} finding for ${issue.file}`);
					if (kind === 'files') assertKnipPath(cfg, item.name, 'unreachable file');
				}
			}
		}
	} catch (err) {
		throw new Error(`Knip returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
	}
	if (result.status === 1 && issues.length === 0) throw new Error('Knip reported failure without findings');
	return issues;
}

/**
 * Rejects malformed, missing, or out-of-repository paths in Knip's inventory.
 *
 * @param cfg Quality configuration defining the repository boundary.
 * @param path Relative Knip path to validate.
 * @param label Description used in validation errors.
 *
 * @return The resolved absolute path inside the repository.
 */
function assertKnipPath(cfg: QualityCfg, path: string, label: string): string {
	const absolute = resolve(cfg.root, path);
	const rel = relative(cfg.root, absolute);
	if (isAbsolute(path) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Knip returned a ${label} path outside the repository: ${path}`);
	if (!existsSync(absolute)) throw new Error(`Knip returned a ${label} path that does not exist: ${path}`);
	const realRoot = realpathSync(cfg.root);
	const realPath = realpathSync(absolute);
	const realRelative = relative(realRoot, realPath);
	if (realRelative === '..' || realRelative.startsWith(`..${sep}`) || isAbsolute(realRelative)) throw new Error(`Knip returned a ${label} symlink outside the repository: ${path}`);
	return absolute;
}
/**
 * Converts Knip's validated issue inventory into dead-code review findings.
 *
 * @param cfg Quality configuration defining scope and explicit entry-point contracts.
 * @param importedConsumers Export names referenced by configured source files.
 *
 * @return Knip findings with safe export-modifier changes marked autofixable.
 */
function collectKnipFindings(cfg: QualityCfg, importedConsumers = importedExportConsumers(cfg)): DeadCodeFinding[] {
	const issues = readKnipIssues(cfg);
	const findings: DeadCodeFinding[] = [];
	for (const issue of issues) {
		const filePath = assertKnipPath(cfg, issue.file, 'finding source');
		for (const [kind, val] of Object.entries(issue)) {
			if (kind === 'file') continue;
			for (const item of val as KnipItem[]) {
				if (kind === 'exports' && isFrameworkEntryExport(cfg, issue.file, item.name)) continue;
				const location = kind === 'files' ? item.name : issue.file;
				const autoFixable = (kind === 'exports' || kind === 'types') && !importedConsumers.get(filePath)?.has(item.name) && knipExportCanBeMadePrivate(filePath, item.name);
				const reason = autoFixable
					? 'Knip identifies an unconsumed named export with a direct, unambiguous declaration.'
					: kind === 'files'
						? 'Knip considers this file unreachable; file deletion can affect dynamic, generated, or framework references.'
						: importedConsumers.get(filePath)?.has(item.name)
							? 'Knip reports this export as unused, but a configured source consumer was found.'
							: `Knip reports an unused ${kind} that the safe export rewrite cannot identify unambiguously.`;
				const agentAction = autoFixable
					? 'Run the canonical dead-code autofix; it should remove only this export modifier, then verify the declaration and its local uses remain intact.'
					: kind === 'files'
						? 'Inspect imports, dynamic loading, framework discovery, generated inventories, and tests. Delete this file only if those checks prove it unreachable; otherwise correct the explicit entry-point or source-discovery model.'
						: importedConsumers.get(filePath)?.has(item.name)
							? 'Reconcile the reported consumer with Knip configuration and module resolution. Preserve the export while it has a real consumer; do not add a broad ignore.'
							: `Inspect the exact ${kind} and its consumers. Remove it only if it is truly unused; otherwise add the concrete framework/public contract to the explicit entry model.`;
				findings.push({ rule: `knip/${kind}`, file: location, line: item.line ?? 1, name: item.name, severity: 'error', autofixable: autoFixable, reason, agentAction });
			}
		}
	}
	return findings;
}
/**
 * Checks whether a name is a configured framework-discovered route export.
 *
 * @param cfg Quality configuration containing framework entry exports.
 * @param file Repository-relative source filename reported by Knip.
 * @param name Exported identifier to check.
 *
 * @return Whether the configured file or supported TypeScript route pattern includes the export.
 */
function isFrameworkEntryExport(cfg: QualityCfg, file: string, name: string): boolean {
	const publicRoute = !basename(file).startsWith('_');
	return Object.entries(cfg.frameworkEntryExports ?? {}).some(([pattern, names]) => {
		const pathMatches =
			pattern === file ||
			(publicRoute && pattern.endsWith('/**/*.ts') && file.startsWith(pattern.slice(0, -8)) && file.endsWith('.ts')) ||
			(publicRoute && pattern.endsWith('/**/*.tsx') && file.startsWith(pattern.slice(0, -9)) && file.endsWith('.tsx'));
		return pathMatches && names.includes(name);
	});
}
/**
 * Selects the TypeScript parser mode from a source filename's extension.
 *
 * @param file Source filename to classify.
 *
 * @return The JavaScript, JSX, TypeScript, or TSX compiler script kind.
 */
function deadCodeScriptKind(file: string): ts.ScriptKind {
	if (/\.tsx$/i.test(file)) return ts.ScriptKind.TSX;
	if (/\.jsx$/i.test(file)) return ts.ScriptKind.JSX;
	if (/\.(?:c|m)?js$/i.test(file)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}
/**
 * Checks whether Knip identified a direct named export that can become private.
 *
 * @param file Absolute source filename containing the export.
 * @param name Exported identifier reported by Knip.
 *
 * @return Whether the export modifier can be removed without an ambiguous rewrite.
 */
function knipExportCanBeMadePrivate(file: string, name: string): boolean {
	if (!existsSync(file) || file.endsWith('.astro')) return false;
	const srcText = readFileSync(file, 'utf8');
	const src = ts.createSourceFile(file, srcText, ts.ScriptTarget.Latest, true, deadCodeScriptKind(file));
	if ((src as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw new Error(`Cannot safely classify Knip export in unparsable source: ${file}`);
	for (const statement of src.statements) {
		if (!ts.canHaveModifiers(statement) || !ts.getModifiers(statement as ts.HasModifiers)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
		if (ts.getModifiers(statement as ts.HasModifiers)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) continue;
		if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
			if (statement.exportClause.elements.some((element) => element.name.text === name) && !SHARED_REGEX.test(srcText.slice(statement.exportClause.getStart(src), statement.exportClause.end)))
				return true;
		} else if (ts.isVariableStatement(statement)) {
			const declaration = statement.declarationList.declarations[0];
			if (statement.declarationList.declarations.length === 1 && declaration && ts.isIdentifier(declaration.name) && declaration.name.text === name) return true;
		} else if ('name' in statement && statement.name && ts.isIdentifier(statement.name) && statement.name.text === name) return true;
	}
	return false;
}

/**
 * Removes only an unused export modifier that Knip identifies precisely.
 *
 * @param cfg Quality configuration defining source scope and Knip output.
 * @param changedFiles Set updated with files whose export modifiers are removed.
 */
function fixKnipExports(cfg: QualityCfg, changedFiles: Set<string>): void {
	const issues = readKnipIssues(cfg);
	const importedConsumers = importedExportConsumers(cfg);
	for (const issue of issues) {
		const exports = [...(Array.isArray(issue.exports) ? issue.exports : []), ...(Array.isArray(issue.types) ? issue.types : [])];
		if (!exports.length || issue.file.endsWith('.astro')) continue;
		const file = assertKnipPath(cfg, issue.file, 'finding source');
		const src = readFileSync(file, 'utf8');
		const ast = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, deadCodeScriptKind(file));
		if ((ast as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw new Error(`Cannot safely fix Knip exports in unparsable source: ${issue.file}`);
		const edits: Array<{ start: number; end: number; text?: string }> = [];
		const externalConsumers = importedConsumers.get(resolve(file));
		const removableNames = new Set(
			exports
				.filter((finding) => finding && typeof finding.name === 'string' && !isFrameworkEntryExport(cfg, issue.file, finding.name) && !externalConsumers?.has(finding.name))
				.map((finding) => finding.name),
		);
		const handledNames = new Set<string>();
		for (const statement of ast.statements) {
			if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
			const removed = statement.exportClause.elements.filter((specifier) => removableNames.has(specifier.name.text));
			if (!removed.length || SHARED_REGEX.test(src.slice(statement.exportClause.getStart(ast), statement.exportClause.end))) continue;
			for (const specifier of removed) handledNames.add(specifier.name.text);
			const retained = statement.exportClause.elements.filter((specifier) => !removableNames.has(specifier.name.text));
			let end = statement.end;
			if (!retained.length) {
				if (src[end] === '\r' && src[end + 1] === '\n') end += 2;
				else if (src[end] === '\n') end++;
				const replacement = statement.moduleSpecifier && !statement.isTypeOnly ? `import ${statement.moduleSpecifier.getText(ast)}${src.slice(statement.moduleSpecifier.end, statement.end)}` : '';
				edits.push({ start: statement.getStart(ast), end, text: replacement });
			} else {
				const keptClause = `{ ${retained.map((specifier) => specifier.getText(ast)).join(', ')} }`;
				edits.push({
					start: statement.getStart(ast),
					end: statement.end,
					text: `${src.slice(statement.getStart(ast), statement.exportClause.getStart(ast))}${keptClause}${src.slice(statement.exportClause.end, statement.end)}`,
				});
			}
		}
		for (const finding of exports) {
			if (!finding || typeof finding.name !== 'string' || !finding.name) throw new Error(`Knip returned malformed export findings for ${issue.file}`);
			if (!removableNames.has(finding.name) || isFrameworkEntryExport(cfg, issue.file, finding.name) || handledNames.has(finding.name)) continue;
			const declaration = ast.statements.find((statement) => {
				if (!ts.canHaveModifiers(statement) || !ts.getModifiers(statement as ts.HasModifiers)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return false;
				if (ts.getModifiers(statement as ts.HasModifiers)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) return false;
				if (ts.isVariableStatement(statement))
					return (
						statement.declarationList.declarations.length === 1 &&
						ts.isIdentifier(statement.declarationList.declarations[0]!.name) &&
						statement.declarationList.declarations[0]!.name.text === finding.name
					);
				return 'name' in statement && statement.name && ts.isIdentifier(statement.name) && statement.name.text === finding.name;
			});
			if (!declaration || (finding.line && declaration.getStart(ast) > ast.getPositionOfLineAndCharacter(finding.line - 1, 0))) continue;
			const modifier = ts.getModifiers(declaration as ts.HasModifiers)?.find((i) => i.kind === ts.SyntaxKind.ExportKeyword);
			if (modifier) {
				const end = src[modifier.end] === ' ' || src[modifier.end] === '\t' ? modifier.end + 1 : modifier.end;
				edits.push({ start: modifier.getStart(ast), end });
			}
		}
		const uniqueEdits = [...new Map(edits.map((edit) => [edit.start, edit])).values()].sort((left, right) => right.start - left.start);
		if (uniqueEdits.length) {
			const output = uniqueEdits.reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text ?? ''}${text.slice(edit.end)}`, src);
			writeFileSync(file, output);
			changedFiles.add(file);
		}
	}
}

/** Finds export names that configured source files import and actually reference. */
const importedExportConsumerCache = new WeakMap<QualityCfg, { signature: string; consumers: Map<string, Set<string>> }>();
/**
 * Builds a cache of exported names referenced by configured source consumers.
 *
 * @param cfg Quality configuration defining roots, aliases, and skipped paths.
 *
 * @return Export names grouped by their resolved absolute source file.
 */
function importedExportConsumers(cfg: QualityCfg): Map<string, Set<string>> {
	const srcFiles = filesFor(cfg, true).filter((path) => C_M_JS_TS_X_CLASS_2.test(path) || path.endsWith('.astro'));
	const signature = srcFiles
		.map((f) => {
			const stats = statSync(f);
			return `${f}:${stats.mtimeMs}:${stats.size}`;
		})
		.join('\n');
	const cached = importedExportConsumerCache.get(cfg);
	if (cached?.signature === signature) return cached.consumers;
	const consumers = new Map<string, Set<string>>();
	const paths = Object.fromEntries(Object.entries(cfg.aliases ?? {}).map(([pattern, target]) => [pattern.endsWith('*') ? pattern : `${pattern}*`, [target.endsWith('*') ? target : `${target}*`]]));
	const compilerOpts: ts.CompilerOptions = { baseUrl: cfg.root, moduleResolution: ts.ModuleResolutionKind.Bundler, paths };
	const moduleResolutionCache = ts.createModuleResolutionCache(cfg.root, (f) => f, compilerOpts);
	const progressStep = Math.max(1, Math.ceil(srcFiles.length / 20));
	qualityProgress('Knip import consumers', 0, srcFiles.length);
	for (const [srcIdx, file] of srcFiles.entries()) {
		if (srcIdx % progressStep === 0 || srcIdx + 1 === srcFiles.length) qualityProgress('Knip import consumers', srcIdx + 1, srcFiles.length);
		const raw = readFileSync(file, 'utf8');
		const astro = file.endsWith('.astro') ? /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw) : null;
		if (file.endsWith('.astro') && !astro) continue;
		const frontmatter = astro?.[1] ?? raw;
		const markup = astro ? raw.slice(astro[0].length) : '';
		const src = ts.createSourceFile(file, frontmatter, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
		/**
		 *
		 * @param name
		 *
		 * @return
		 */
		const markupUses = (name: string): boolean => Boolean(markup) && markup.includes(name);
		const referencedIdentifiers = new Set<string>();
		const namespaceProperties = new Map<string, Set<string>>();
		/**
		 *
		 * @param node
		 */
		const collectReferences = (node: ts.Node): void => {
			if (ts.isImportDeclaration(node)) return;
			if (ts.isIdentifier(node)) referencedIdentifiers.add(node.text);
			if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
				const properties = namespaceProperties.get(node.expression.text) ?? new Set<string>();
				properties.add(node.name.text);
				namespaceProperties.set(node.expression.text, properties);
			}
			ts.forEachChild(node, collectReferences);
		};
		collectReferences(src);
		for (const statement of src.statements) {
			if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
			const resolved = ts.resolveModuleName(statement.moduleSpecifier.text, file, compilerOpts, ts.sys, moduleResolutionCache).resolvedModule?.resolvedFileName;
			if (!resolved) continue;
			const owner = resolve(resolved);
			const names = consumers.get(owner) ?? new Set<string>();
			if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
				for (const specifier of statement.exportClause.elements) names.add(specifier.propertyName?.text ?? specifier.name.text);
				consumers.set(owner, names);
				continue;
			}
			if (!ts.isImportDeclaration(statement)) continue;
			const bindings = statement.importClause?.namedBindings;
			if (!bindings) continue;
			if (ts.isNamedImports(bindings)) {
				for (const specifier of bindings.elements) {
					if (referencedIdentifiers.has(specifier.name.text) || markupUses(specifier.name.text)) names.add(specifier.propertyName?.text ?? specifier.name.text);
				}
			} else if (ts.isNamespaceImport(bindings)) {
				for (const property of namespaceProperties.get(bindings.name.text) ?? []) names.add(property);
				if (markupUses(bindings.name.text)) {
					for (const match of markup.matchAll(new RegExp(`<\\s*${bindings.name.text}\\.([A-Za-z_$][\\w$]*)(?:[\\s/>])`, 'g'))) names.add(match[1]!);
				}
			}
			if (names.size) consumers.set(owner, names);
		}
	}
	importedExportConsumerCache.set(cfg, { signature, consumers });
	return consumers;
}
/**
 * Accepts proposed edits only when they add no TypeScript errors to changed files.
 *
 * @param program TypeScript program representing the original source.
 * @param proposed Proposed source text keyed by absolute filename.
 * @param original Original source text for the same files.
 * @param onBatch Optional progress callback for each validation batch.
 *
 * @return Accepted source edits and filenames rejected by the type-safety check.
 */
function acceptTypeSafeEdits(
	program: ts.Program,
	proposed: Map<string, string>,
	original: Map<string, string>,
	onBatch?: (checked: number, fileCount: number) => void,
): { accepted: Map<string, string>; rejected: Set<string> } {
	const rejected = new Set<string>();
	let checks = 0;
	/**
	 *
	 * @param entries
	 * @param base
	 *
	 * @return
	 */
	const accept = (entries: [string, string][], base: Map<string, string>): Map<string, string> => {
		if (!entries.length) return base;
		onBatch?.(++checks, entries.length);
		const candidate = new Map(base);
		for (const [file, text] of entries) candidate.set(file, text);
		if (!deadCodeEditsIntroduceTypeErrors(program, candidate)) return candidate;
		if (entries.length === 1) {
			rejected.add(entries[0]![0]);
			return base;
		}
		const midpoint = Math.floor(entries.length / 2);
		const afterLeft = accept(entries.slice(0, midpoint), base);
		return accept(entries.slice(midpoint), afterLeft);
	};
	const baseline = new Map([...proposed.keys()].map((f) => [f, original.get(f)!]));
	return {
		accepted: accept(
			[...proposed].sort(([left], [right]) => left.localeCompare(right)),
			baseline,
		),
		rejected,
	};
}
/**
 * Prints dead-code findings and fails when errors or blocking manual findings remain.
 *
 * @param findings Findings collected by the dead-code coordinator.
 * @param typeSafetyVerified Whether the candidate autofixes passed TypeScript safety checks.
 */
function printDeadCodeFindings(findings: DeadCodeFinding[], typeSafetyVerified = true): void {
	if (reportStages) {
		const stage = reportStages.get('dead-code');
		if (stage) {
			stage.findings = findings.length;
			if (findings.length) stage.status = 'findings';
		}
	}
	if (!findings.length) {
		if (!outputPhase) console.error('  ✓ dead-code checks passed; no findings remain');
		return;
	}
	const errs = findings;
	const lines: string[] = [];
	for (const finding of [...findings].sort(
		(left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.rule.localeCompare(right.rule) || left.name.localeCompare(right.name),
	)) {
		lines.push(`  - [ERROR] ${finding.rule}: ${finding.file}:${finding.line} ${finding.name}`);
		lines.push(`      Reason: ${finding.reason}`);
		const autofix = !finding.autofixable ? 'not safe or not supported' : typeSafetyVerified ? 'available' : 'candidate; fix mode checks TypeScript before writing';
		lines.push(`      Autofix: ${autofix}`);
		lines.push(`      Agent action: ${finding.agentAction}`);
	}
	lines.push(`  ${errs.length} error${errs.length === 1 ? '' : 's'}.`);
	if (outputPhase) {
		for (const line of lines.slice(0, -1)) recordQualityDetail(line.replace(/^\s*-\s*/u, ''));
	} else for (const line of lines) console.error(line);
	if (errs.length) process.exitCode = 1;
}

/**
 * Runs every dead-code detector through one fix-and-verify boundary.
 *
 * @param cfg Quality configuration defining source scope, tools, and policy exceptions.
 * @param fix Whether eligible changes should be written.
 * @param all Whether to inspect all configured source files.
 * @param verify Whether to rerun the detectors after applying fixes.
 * @param emit Whether to print stage headings and findings.
 *
 * @return Remaining findings after any eligible fixes and verification.
 */
function runDeadCode(cfg: QualityCfg, fix: boolean, all: boolean, verify = true, emit = true): DeadCodeFinding[] {
	if (emit) qualityHeader('dead-code', `${fix ? 'Fixing safe cases and checking' : 'Read-only check of'} unused files, exports, declarations, and single-use code`);
	let verificationStarted = false;
	/**
	 *
	 */
	const beginVerification = (): void => {
		if (verificationStarted) return;
		verificationStarted = true;
		if (emit) qualityHeader('dead-code/verification', 'Verify remaining unused files, exports, declarations, and single-use code');
	};
	const changedFiles = new Set<string>();
	const srcSnapshot = fix ? new Map(filesFor(cfg, true).map((f) => [f, readFileSync(f, 'utf8')])) : new Map<string, string>();
	const initialInventory = fix ? new Set(srcSnapshot.keys()) : new Set<string>();
	if (fix && emit && !outputPhase) console.error(`  Preparing TypeScript baseline for ${srcSnapshot.size} configured source files...`);
	const typeProgram = fix ? deadCodeTypeProgram(cfg) : null;
	if (fix && emit && !outputPhase) console.error('  TypeScript baseline ready.');
	const typeRejectedFiles = new Set<string>();
	const singleUseVerificationFindings: ReturnType<typeof singleUseFindings> = [];
	const eslintReportsByPath = new Map<string, EslintReport>();
	const eslintScannedContents = new Map<string, string>();
	let importedConsumersForRun: Map<string, Set<string>> | undefined;
	/**
	 *
	 * @param selectedFiles
	 *
	 * @return
	 */
	const scanEslint = (selectedFiles?: string[]): EslintReport[] => {
		const reports = collectEslintReports(cfg, all, selectedFiles);
		for (const report of reports) {
			const f = resolve(report.filePath);
			eslintReportsByPath.set(f, report);
			eslintScannedContents.set(f, readFileSync(f, 'utf8'));
		}
		return reports;
	};
	/**
	 *
	 * @return
	 */
	const scanDirtyEslintFiles = (): EslintReport[] => {
		const dirtyFiles = [...eslintScannedContents].filter(([f, content]) => existsSync(f) && readFileSync(f, 'utf8') !== content).map(([f]) => f);
		return dirtyFiles.length ? scanEslint(dirtyFiles) : [];
	};
	if (fix) {
		if (emit) qualityHeader('dead-code/safe-fixes', 'Apply only mechanically proven fixes');
		if (qualityCheckEnabled(cfg, 'knip')) {
			if (emit) qualityHeader('dead-code/knip-fix', 'Removing only unambiguous unused export modifiers');
			fixKnipExports(cfg, changedFiles);
		}
		importedConsumersForRun = qualityCheckEnabled(cfg, 'knip') || qualityCheckEnabled(cfg, 'lint') ? importedExportConsumers(cfg) : undefined;
		if (qualityCheckEnabled(cfg, 'lint')) {
			if (emit) qualityHeader('dead-code/eslint-fix', 'Scan configured files and apply only safe unused-declaration fixes');
			let reportsToFix = scanEslint();
			for (let round = 0; round < 5; round++) {
				if (!reportsToFix.some((report) => report.messages.some((message) => message.ruleId === 'unused-imports/no-unused-vars'))) break;
				if (emit && !outputPhase) console.error(`  ESLint unused-declaration pass ${round + 1}/5...`);
				const passChangedFiles = new Set<string>();
				if (!fixUnusedDeclarations(cfg, reportsToFix, passChangedFiles, importedConsumersForRun)) break;
				for (const file of passChangedFiles) changedFiles.add(file);
				reportsToFix = scanDirtyEslintFiles();
			}
		}
		if (emit) qualityHeader('dead-code/single-use', 'Scan declarations and references, classify candidates, and inline only proven cases');
		const singleUseChangedFiles = new Set<string>();
		fixSingleUseDeclarations(
			cfg,
			singleUseChangedFiles,
			(pass, filesChanged) => {
				if (emit && !outputPhase) console.error(`  Single-use rewrite pass ${pass} starting (${filesChanged} source files changed so far).`);
			},
			singleUseVerificationFindings,
		);
		for (const file of singleUseChangedFiles) changedFiles.add(file);
		const currInventory = new Set(filesFor(cfg, true));
		const trackedInitialInventory = [...initialInventory];
		const trackedCurrInventory = [...currInventory];
		if (trackedCurrInventory.length !== trackedInitialInventory.length || trackedInitialInventory.some((f) => !currInventory.has(f)))
			throw new Error('Dead-code autofix changed the configured source inventory; file creation or deletion is not an automatic dead-code fix.');
		const proposed = new Map<string, string>();
		for (const file of changedFiles) {
			const original = srcSnapshot.get(file);
			if (original === undefined || !existsSync(file)) throw new Error(`Dead-code autofix changed source inventory unexpectedly: ${relative(cfg.root, file)}`);
			const curr = readFileSync(file, 'utf8');
			if (curr !== original) proposed.set(file, curr);
		}
		if (verify) beginVerification();
		if (proposed.size) {
			if (!typeProgram) throw new Error('Dead-code edit validation requires its baseline TypeScript program.');
			if (emit && !outputPhase) console.error(`  Validating ${proposed.size} changed files against TypeScript diagnostics...`);
			const { accepted, rejected } = acceptTypeSafeEdits(typeProgram, proposed, srcSnapshot, (checked, count) => {
				if (emit && !outputPhase) console.error(`  TypeScript safety check ${checked} (${count} candidate files).`);
			});
			for (const file of rejected) {
				const original = srcSnapshot.get(file);
				if (original !== undefined) writeFileSync(file, original);
				typeRejectedFiles.add(relative(cfg.root, file));
				changedFiles.delete(file);
			}
			for (const [file, text] of accepted) if (readFileSync(file, 'utf8') !== text) writeFileSync(file, text);
		}
		if (verify) beginVerification();
		if (qualityCheckEnabled(cfg, 'lint')) scanDirtyEslintFiles();
	}
	if (!verify) return [];
	beginVerification();
	const findings: DeadCodeFinding[] = [];
	if (qualityCheckEnabled(cfg, 'knip')) {
		if (emit) qualityHeader('dead-code/knip', 'Checking unused files, exports, dependencies, and reachability');
		findings.push(...collectKnipFindings(cfg, importedConsumersForRun));
	}
	if (qualityCheckEnabled(cfg, 'lint')) {
		if (!fix) scanEslint();
		findings.push(...unusedDeclarationFindings(cfg, [...eslintReportsByPath.values()]));
	}
	const finalSingleUseFindings = fix && !typeRejectedFiles.size ? singleUseVerificationFindings : singleUseFindings(cfg);
	for (const single of finalSingleUseFindings)
		findings.push({
			rule: 'typescript/single-use',
			file: single.file,
			line: single.line,
			name: single.name,
			severity: 'error',
			autofixable: single.autofixable,
			reason: single.reason,
			agentAction: single.agentAction,
		});
	for (const finding of documentationFindings(scopedCfg(cfg, true)).filter((i) => i.kind === 'orphan'))
		findings.push({
			rule: 'tsdoc/detached',
			file: finding.file,
			line: finding.line,
			name: finding.name,
			severity: 'error',
			autofixable: false,
			reason: finding.reason,
			agentAction:
				'Attach this TSDoc to the declaration it describes when that relationship is clear; otherwise remove only this detached block. Preserve meaningful constraints and do not move it across unrelated code.',
		});
	const finalFindings = findings.map((finding) =>
		typeRejectedFiles.has(finding.file) && finding.autofixable
			? {
					...finding,
					severity: 'error' as const,
					autofixable: false,
					reason: `The proposed rewrite in this file introduced TypeScript diagnostics and was rolled back: ${finding.reason}`,
					agentAction: 'Inspect the exact declaration and proposed rewrite, preserve semantics and types, then apply a source-level fix or leave this case manual.',
				}
			: finding,
	);
	if (emit) printDeadCodeFindings(finalFindings, fix);
	return finalFindings;
}

/**
 * Runs dead-code detectors once without modifying the source tree.
 *
 * @param cfg Quality configuration defining source scope and tools.
 * @param all Whether to inspect all configured source files.
 *
 * @return
 */
function runDeadCodeReadOnly(cfg: QualityCfg, all: boolean): DeadCodeFinding[] {
	return runDeadCode(cfg, false, all);
}
/**
 * Dispatches the dead-code coordinator in fix or read-only mode.
 *
 * @param cfg Quality configuration defining source scope and tools.
 * @param fix Whether eligible changes may be applied to source files.
 * @param all Whether to inspect all configured source files.
 */
function runDeadCodeCmd(cfg: QualityCfg, fix: boolean, all: boolean): void {
	const findings = fix ? runDeadCode(cfg, true, all) : runDeadCodeReadOnly(cfg, all);
	printCheckStatus('dead-code', findings.length);
}

/**
 * Runs Git's whitespace/error diff check for the current repository.
 *
 * @param cfg Quality configuration defining the repository root.
 *
 * @return Nothing; diff-check failures are reflected in the process exit code.
 */
function runDiffCheck(cfg: QualityCfg): void {
	qualityHeader('diff', 'Checking Git whitespace and patch errors');
	const status = run(cfg, 'git', ['-c', 'core.pager=cat', 'diff', '--check']);
	if (status) process.exitCode = status;
	printCheckStatus('diff', status ? 1 : 0);
}

/**
 * Prints a grouped set of findings with one normalized line per issue.
 *
 * @param findings Findings produced by one quality stage.
 * @param fmt Converts one finding into a human-readable message.
 *
 * @return Nothing; findings are printed under the active check or directly to the console.
 */
function printFindings<T>(findings: readonly T[], fmt: (finding: T) => string): void {
	if (reportStages && reportStageName && findings.length) {
		const stage = reportStages.get(reportStageName);
		if (stage) {
			stage.findings += findings.length;
			stage.status = 'findings';
		}
	}
	if (!findings.length) {
		if (!outputPhase) console.error('  ✓ clean');
		return;
	}
	if (outputPhase) {
		for (const finding of findings) recordQualityDetail(fmt(finding));
	} else {
		const lines = findings.map((finding) => `  - ${compactOutput(fmt(finding)).join(' ')}`);
		console.error(`  ${findings.length} error${findings.length === 1 ? '' : 's'}:`);
		for (const line of lines) console.error(line);
	}
}

/**
 * Runs one independent finding check and keeps failures from blocking later checks.
 *
 * @param name Check identifier shown in the output.
 * @param detail Human-readable description of the check.
 * @param check Function that collects findings.
 * @param fmt Converts one finding into a human-readable message.
 *
 * @return Findings produced by the check.
 */
function runFindingCheck<T>(name: string, detail: string, check: () => T[], fmt: (finding: T) => string): T[] {
	qualityHeader(name, detail);
	try {
		const findings = check();
		printFindings(findings, fmt);
		if (findings.length) process.exitCode = 1;
		printCheckStatus(name, findings.length);
		return findings;
	} catch (err) {
		recordQualityFailure(name, err);
		printCheckStatus(name, 1);
		return [];
	}
}

/**
 * Run the optional, read-only GitHub analytics stage.
 *
 * @param cfg Quality configuration containing repositories and expected settings.
 * @param repos Repository overrides supplied to `terra-quality github`.
 * @param explicit Whether GitHub reporting was requested as the command itself.
 * @param warn Whether findings should be reported without setting a failing exit code.
 */
function runGitHubCheck(cfg: QualityCfg, repos: string[] = [], explicit = false, warn = false): void {
	qualityHeader('github', 'Reading open issues, Dependabot, code scanning, and secret scanning alerts');
	const tgts = repos.length ? repos : (cfg.github?.repositories ?? [inferGitHubRepo(cfg.root)].filter((repo): repo is string => Boolean(repo)));
	if (!tgts.length) {
		const detail = 'Set github.repositories in quality.json or pass --repository owner/name.';
		reportGitHubData = { schemaVersion: 1, generatedAt: new Date().toISOString(), state: 'partial', detail, repositories: [] };
		updateGitHubStage('failed', 0);
		if (outputPhase) recordQualityDetail(detail);
		else console.error(`  GitHub: ${detail}`);
		process.exitCode = 1;
		printCheckStatus('github', 1);
		return;
	}
	if (!hasGitHubAuth()) {
		const detail = 'GitHub CLI is unavailable or unauthenticated; run gh auth login or set GH_TOKEN.';
		reportGitHubData = { schemaVersion: 1, generatedAt: new Date().toISOString(), state: 'skipped', detail, repositories: [] };
		updateGitHubStage(explicit ? 'failed' : 'skipped', 0);
		if (explicit) {
			if (outputPhase) recordQualityDetail(detail);
			else console.error(`  GitHub: ${detail}`);
			process.exitCode = 1;
			printCheckStatus('github', 1);
		} else printSkippedCheckStatus('github');
		return;
	}
	try {
		reportGitHubData = buildGitHubReport(tgts, cfg.github?.requiredFeatures);
		const findings = reportGitHubData.repositories.flatMap((repo) => repo.findings);
		const failed = reportGitHubData.state === 'partial';
		updateGitHubStage(failed ? 'failed' : findings.length ? 'findings' : 'passed', findings.length);
		const blockingFindings = findings.some((finding) => finding.category !== 'issue' && finding.category !== 'setting');
		if (outputPhase) for (const line of formatGitHubReport(reportGitHubData)) recordQualityDetail(line);
		else for (const line of formatGitHubReport(reportGitHubData)) console.warn(`  ${line}`);
		if (!warn && blockingFindings) process.exitCode = 1;
		if (failed && !warn) process.exitCode = 1;
		printCheckStatus('github', !warn && (blockingFindings || failed) ? 1 : 0);
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'Unknown GitHub report error.';
		reportGitHubData = { schemaVersion: 1, generatedAt: new Date().toISOString(), state: 'partial', detail, repositories: [] };
		updateGitHubStage('failed', 0);
		if (outputPhase) recordQualityDetail(detail);
		else console.error(`  GitHub: ${detail}`);
		process.exitCode = 1;
		printCheckStatus('github', 1);
	}
}

/**
 * Update the JSON summary for the active GitHub report stage.
 *
 * @param status Result state to record.
 * @param findings Number of GitHub findings in the report.
 */
function updateGitHubStage(status: QualityJsonReport['checks'][number]['status'], findings: number): void {
	const stage = reportStages?.get('github');
	if (stage) {
		stage.status = status;
		stage.findings = findings;
	}
}

/**
 * Infer the current repository slug from its GitHub origin remote.
 *
 * @param root Repository root to inspect.
 *
 * @return The owner/name slug, or undefined for a non-GitHub remote.
 */
function inferGitHubRepo(root: string): string | undefined {
	const remote = spawnSync('git', ['config', '--get', 'remote.origin.url'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).stdout.trim();
	return remote.match(/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i)?.[1];
}

/**
 * Runs configured generic repository checks as part of the full quality command.
 *
 * @param cfg Quality configuration selecting enabled generic checks and their policies.
 * @param analysis Optional shared analysis context for regex checks in the same run.
 *
 * @return Nothing; blocking generic findings are reflected in the process exit code.
 */
function runGenericChecks(cfg: QualityCfg, analysis?: QualityAnalysis): void {
	const checks: [string, () => readonly GenericFinding[]][] = [];
	if (qualityCheckEnabled(cfg, 'accessibility')) checks.push(['accessibility', () => accessibilityFindings(cfg, analysis)]);
	if (qualityCheckEnabled(cfg, 'display-name')) checks.push(['display-name', () => displayNameFindings(cfg, analysis)]);
	if (cfg.performancePatterns && qualityCheckEnabled(cfg, 'performance-patterns')) checks.push(['performance-patterns', () => performancePatternFindings(cfg, analysis)]);
	if (cfg.documentation?.commandRoots?.length && qualityCheckEnabled(cfg, 'documented-commands')) checks.push(['documented-commands', () => documentedCommandFindings(cfg)]);
	if (cfg.security && qualityCheckEnabled(cfg, 'security')) checks.push(['security', () => securityFindings(cfg)]);
	if (cfg.repeatedClasses && qualityCheckEnabled(cfg, 'repeated-classes')) checks.push(['repeated-classes', () => repeatedClassFindings(cfg, analysis)]);
	if (cfg.regexDedup && qualityCheckEnabled(cfg, 'regex-dedup')) checks.push(['regex-dedup', () => regexFindings(cfg, analysis)]);
	if (cfg.uiPatterns && qualityCheckEnabled(cfg, 'ui-patterns')) checks.push(['ui-patterns', () => uiPatternFindings(cfg, analysis)]);
	for (const [name, check] of checks) {
		qualityHeader(name, `Checking ${name.replace(G_REGEX(), ' ')}`);
		try {
			const findings = check();
			printFindings(
				findings,
				(f) =>
					`${'file' in f ? `${f.file}: ` : ''}${'message' in f ? `${'line' in f ? `${f.line}:${f.column} ` : ''}${f.message}` : 'component' in f ? `${f.line}:${f.column} ${f.component}: ${f.recommendation}` : 'method' in f ? `${f.line}:${f.column} ${f.method}(${f.receiver}): ${f.recommendation}` : 'command' in f ? `${f.line}: ${f.recommendation} (${f.command})` : 'value' in f ? `${f.count}x ${f.value} (${f.locations.join(', ')})` : 'source' in f ? `${f.count}x ${f.source} (${f.locations.join(', ')})` : f.pattern}`,
			);
			printCheckStatus(name, findings.length);
			if (findings.length) process.exitCode = 1;
		} catch (err) {
			recordQualityFailure(name, err);
			printCheckStatus(name, 1);
		}
	}
}

/**
 * Runs the configured Tailwind canonical-class check and records its CLI report stage.
 *
 * @param cfg Quality configuration containing the Tailwind stylesheet and source roots.
 * @param fix Whether to write Tailwind's canonical class suggestions.
 *
 * @return Promise resolving when the diagnostic or autofix completes.
 */
function runTailwindCanonicalCheck(cfg: QualityCfg, fix: boolean): Promise<void> {
	qualityHeader('tailwind-canonical', `${fix ? 'Fixing and checking' : 'Checking'} canonical Tailwind classes`);
	let skipped = false;
	return runTailwindCanonical(cfg, fix, {
		quiet: Boolean(outputPhase),
		onFinding: recordQualityDetail,
		onSkip: () => {
			skipped = true;
		},
	}).then(
		() => (skipped ? printSkippedCheckStatus('tailwind-canonical') : printCheckStatus('tailwind-canonical', 0)),
		(error: unknown) => {
			const stage = reportStages?.get('tailwind-canonical');
			if (stage) {
				stage.status = 'failed';
				stage.findings = Number(/failed with (\d+) suggestion/.exec(error instanceof Error ? error.message : '')?.[1] ?? 0);
			}
			throw error;
		},
	);
}

/**
 * Renames safe repository-local declarations and repairs matching references.
 *
 * @param cfg Quality configuration defining source scope and naming protections.
 * @param all Whether to apply changes to every configured source file.
 *
 * @return Nothing; safe naming changes are written to source files.
 */
function fixNames(cfg: QualityCfg, all: boolean): void {
	// TypeScript's parser does not understand Astro frontmatter. Keep Astro in
	// reporting/import scope, but never apply symbol renames to it.
	const allowed = new Set(filesFor(cfg, all).filter((f) => !isProtectedPath(f) && !f.endsWith('.astro')));
	let program = ts.createProgram({
		rootNames: srcFiles(cfg).filter((f) => C_M_JS_TS_X_CLASS_2.test(f)),
		options: {
			allowNonTsExtensions: true,
			allowJs: true,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		},
	});
	let checker = program.getTypeChecker();
	// Import repair writes source files. Rebuild the AST afterward so every
	// subsequent text span is anchored to the current file contents.
	repairMissingImports(cfg, program, checker);
	program = ts.createProgram({
		rootNames: srcFiles(cfg).filter((f) => C_M_JS_TS_X_CLASS_2.test(f)),
		options: {
			allowNonTsExtensions: true,
			allowJs: true,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		},
	});
	checker = program.getTypeChecker();
	/**
	 *
	 * @param n
	 *
	 * @return
	 */
	const isIntrinsicJsxTag = (n: ts.Identifier): boolean => {
		return (ts.isJsxOpeningLikeElement(n.parent) || ts.isJsxClosingElement(n.parent)) && n.parent.tagName === n && n.text.length > 0 && n.text[0] === n.text[0]!.toLowerCase();
	};
	/**
	 *
	 * @param symbol
	 *
	 * @return
	 */
	const canonical = (symbol: ts.Symbol | undefined): ts.Symbol | undefined => (symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
	/**
	 *
	 * @param n
	 *
	 * @return
	 */
	const identifierSymbol = (n: ts.Identifier): ts.Symbol | undefined =>
		canonical(ts.isShorthandPropertyAssignment(n.parent) ? (checker.getShorthandAssignmentValueSymbol(n.parent) ?? checker.getSymbolAtLocation(n)) : checker.getSymbolAtLocation(n));
	/**
	 *
	 * @param n
	 *
	 * @return
	 */
	const isPropertyName = (n: ts.Identifier): boolean =>
		(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
		(ts.isQualifiedName(n.parent) && n.parent.right === n) ||
		((ts.isPropertyAssignment(n.parent) || ts.isMethodDeclaration(n.parent) || ts.isMethodSignature(n.parent)) && n.parent.name === n);
	/**
	 *
	 * @param n
	 *
	 * @return
	 */
	const hasInitShadow = (n: ts.Identifier): boolean => {
		if (!ts.isVariableDeclaration(n.parent) || !n.parent.initializer) return false;
		const tgt = checker.getSymbolAtLocation(n);
		let found = false;
		/**
		 *
		 * @param child
		 */
		const visit = (child: ts.Node): void => {
			if (found || child === n) return;
			if (ts.isIdentifier(child) && !isPropertyName(child) && child.text === n.text && checker.getSymbolAtLocation(child) === tgt) found = true;
			ts.forEachChild(child, visit);
		};
		visit(n.parent.initializer);
		return found;
	};
	/**
	 *
	 * @param n
	 *
	 * @return
	 */
	const hasInitReferenceToOtherSymbol = (n: ts.Identifier): boolean => {
		if (!ts.isVariableDeclaration(n.parent) || !n.parent.initializer) return false;
		const tgt = checker.getSymbolAtLocation(n);
		let found = false;
		/**
		 *
		 * @param child
		 */
		const visit = (child: ts.Node): void => {
			if (found || child === n) return;
			if (ts.isIdentifier(child) && !isPropertyName(child) && child.text === n.text && checker.getSymbolAtLocation(child) !== tgt) found = true;
			ts.forEachChild(child, visit);
		};
		visit(n.parent.initializer);
		return found;
	};
	/**
	 *
	 * @param n
	 * @param suggestion
	 *
	 * @return
	 */
	const hasInitRenameCollision = (n: ts.Identifier, suggestion: string): boolean => {
		if (!ts.isVariableDeclaration(n.parent) || !n.parent.initializer) return false;
		let found = false;
		/**
		 *
		 * @param child
		 */
		const visit = (child: ts.Node): void => {
			if (found) return;
			if (ts.isIdentifier(child) && !isPropertyName(child)) {
				const symbol = checker.getSymbolAtLocation(child);
				for (const declaration of symbol?.declarations ?? []) {
					const name = 'name' in declaration && ts.isIdentifier(declaration.name as ts.Node) ? (declaration.name as ts.Identifier) : undefined;
					if (name && name !== n && renameDeclaration(name) === suggestion) {
						found = true;
						return;
					}
				}
			}
			ts.forEachChild(child, visit);
		};
		visit(n.parent.initializer);
		return found;
	};
	/**
	 *
	 * @param n
	 * @param suggestion
	 *
	 * @return
	 */
	const hasInitConsumerCollision = (n: ts.Identifier, suggestion: string): boolean => {
		const tgt = checker.getSymbolAtLocation(n);
		if (!tgt) return false;
		const src = n.getSourceFile();
		if (!allowed.has(src.fileName)) return false;
		{
			let found = false;
			/**
			 *
			 * @param n
			 */
			const visit = (n: ts.Node): void => {
				if (found) return;
				if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === suggestion && n.initializer) {
					/**
					 *
					 * @param child
					 */
					const check = (child: ts.Node): void => {
						if (found) return;
						if (ts.isIdentifier(child) && checker.getSymbolAtLocation(child) === tgt) found = true;
						ts.forEachChild(child, check);
					};
					check(n.initializer);
				}
				ts.forEachChild(n, visit);
			};
			visit(src);
			if (found) return true;
		}
		return false;
	};
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(cfg.protectedIdentifiers ?? [])]);
	const exported = new Set<ts.Symbol>();
	for (const src of program.getSourceFiles()) {
		const module = checker.getSymbolAtLocation(src);
		if (module) for (const s of checker.getExportsOfModule(module)) exported.add(s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
	}
	const replacements = new Map<ts.Symbol, string>();
	const renameSafetyByScope = new Map<ts.Node, { declared: Set<string>; proposals: Map<string, number> }>();
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		/**
		 *
		 * @param n
		 */
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n)) {
				const scope = declarationScope(n);
				const safety = renameSafetyByScope.get(scope) ?? { declared: new Set<string>(), proposals: new Map<string, number>() };
				safety.declared.add(n.text);
				const suggestion = renameDeclaration(n);
				if (
					!n.text.startsWith('_') &&
					!protectedNames.has(n.text) &&
					!hasInitShadow(n) &&
					!hasInitReferenceToOtherSymbol(n) &&
					!hasInitRenameCollision(n, suggestion) &&
					!hasInitConsumerCollision(n, suggestion)
				) {
					if (suggestion !== n.text && !isCallbackDeclaration(n)) safety.proposals.set(suggestion, (safety.proposals.get(suggestion) ?? 0) + 1);
				}
				renameSafetyByScope.set(scope, safety);
			}
			ts.forEachChild(n, inspect);
		};
		inspect(src);
	}
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		/**
		 *
		 * @param n
		 */
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n) && !n.text.startsWith('_') && !protectedNames.has(n.text) && !hasInitShadow(n) && !hasInitReferenceToOtherSymbol(n)) {
				const suggestion = renameDeclaration(n);
				// Reject collisions in this declaration scope below, while allowing
				// the same concise name in an unrelated sibling function scope.
				if (hasInitRenameCollision(n, suggestion) || hasInitConsumerCollision(n, suggestion)) return;
				const safety = renameSafetyByScope.get(declarationScope(n));
				if (!isCallbackDeclaration(n) && (safety?.declared.has(suggestion) || (safety?.proposals.get(suggestion) ?? 0) > 1)) return;
				const symbol = suggestion === n.text ? undefined : identifierSymbol(n);
				if (symbol && (!exported.has(symbol) || cfg.renameExports === true)) replacements.set(symbol, suggestion);
			}
			ts.forEachChild(n, inspect);
		};
		inspect(src);
	}
	const edits = new Map<string, ts.TextChange[]>();
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		/**
		 *
		 * @param n
		 */
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && !isIntrinsicJsxTag(n)) {
				const replacement = replacements.get(identifierSymbol(n) as ts.Symbol);
				const astroAttrName = src.fileName.endsWith('.astro') && src.text.slice(n.end, n.end + 2) === '={' && src.text.lastIndexOf('---', n.getStart(src)) >= 0;
				if (replacement && !astroAttrName) {
					const shorthandBinding = ts.isBindingElement(n.parent) && n.parent.name === n && !n.parent.propertyName && ts.isObjectBindingPattern(n.parent.parent);
					const fileEdits = edits.get(src.fileName) ?? [];
					fileEdits.push({
						// Identifier `pos` can include a preceding delimiter (for example the
						// opening parenthesis of a call argument). Anchor edits from `end` so
						// expanding a shorthand binding cannot consume adjacent punctuation.
						span: { start: n.getStart(src), length: n.text.length },
						newText: !src.fileName.endsWith('.astro') && (ts.isShorthandPropertyAssignment(n.parent) || shorthandBinding) ? `${n.text}: ${replacement}` : replacement,
					});
					if (ts.isParameter(n.parent) && n.parent.name === n) {
						const docStart = n.parent.parent.getFullStart();
						const doc = src.text.slice(docStart, n.parent.parent.getStart(src));
						const pattern = new RegExp(`(@param\\s+(?:\\{[^}]*\\}\\s*)?)${n.text}\\b`, 'g');
						for (const match of doc.matchAll(pattern)) fileEdits.push({ span: { start: docStart + match.index! + match[1]!.length, length: n.text.length }, newText: replacement });
					}
					edits.set(src.fileName, fileEdits);
				}
			}
			ts.forEachChild(n, inspect);
		};
		inspect(src);
	}
	for (const [fileName, fileEdits] of edits) {
		const src = readFileSync(fileName, 'utf8');
		const n = fileEdits.sort((a, b) => b.span.start - a.span.start).reduce((t, e) => `${t.slice(0, e.span.start)}${e.newText}${t.slice(e.span.start + e.span.length)}`, src);
		if (n !== src) writeFileSync(fileName, n);
	}
	// Renames have changed the source text, so discard the previous AST before
	// inspecting import spans. Otherwise an import edit can land in the wrong
	// token when a declaration changed length.
	program = ts.createProgram({
		rootNames: srcFiles(cfg).filter((f) => C_M_JS_TS_X_CLASS_2.test(f)),
		options: {
			allowNonTsExtensions: true,
			allowJs: true,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		},
	});
	checker = program.getTypeChecker();
	// Export renames can leave stale named imports when a consumer was already
	// out of sync. Repair only an absent import whose concise spelling is an
	// actual export of the same module; never guess across unrelated symbols.
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const fileEdits: ts.TextChange[] = [];
		/**
		 *
		 * @param node
		 */
		const visit = (node: ts.Node): void => {
			if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
				const module = checker.getSymbolAtLocation(node.moduleSpecifier);
				const exportsByName = new Map((module ? checker.getExportsOfModule(module) : []).map((s) => [s.name, s]));
				for (const specifier of node.importClause.namedBindings.elements) {
					const oldName = specifier.propertyName?.text ?? specifier.name.text;
					if (exportsByName.has(oldName)) continue;
					const concise = renameId(oldName);
					// Never guess a replacement for an unresolved module. A local-looking
					// specifier is not evidence that the concise spelling is exported.
					if (concise === oldName || !exportsByName.has(concise)) continue;
					const imported = specifier.propertyName ?? specifier.name;
					fileEdits.push({ span: { start: imported.getStart(src), length: imported.text.length }, newText: concise });
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(src);
		if (fileEdits.length) {
			const srcText = readFileSync(src.fileName, 'utf8');
			const updated = fileEdits.sort((a, b) => b.span.start - a.span.start).reduce((t, e) => `${t.slice(0, e.span.start)}${e.newText}${t.slice(e.span.start + e.span.length)}`, srcText);
			if (updated !== srcText) writeFileSync(src.fileName, updated);
		}
	}
}

/**
 * Runs the core static quality checks against one source scope.
 *
 * @param cfg Quality configuration defining checks, paths, and protections.
 * @param _strict Retained for call compatibility; all findings now fail quality.
 * @param all Whether to inspect every configured file instead of changed files.
 * @param analysis Optional analysis context for the selected source scope.
 *
 * @return Findings grouped by import, naming, alias, forwarding, and documentation checks.
 */
export function runQuality(
	cfg: QualityCfg,
	_strict = false,
	all = true,
	analysis?: QualityAnalysis,
): {
	imports: ReturnType<typeof checkImports>;
	naming: ReturnType<typeof namingFindings>;
	aliases: ReturnType<typeof aliasFindings>;
	forwarding: ReturnType<typeof objectForwardingFindings>;
	documentation: ReturnType<typeof documentationFindings>;
} {
	void _strict;
	const scoped = scopedCfg(cfg, all);
	const ctx = analysis;
	const result = {
		imports: [] as ReturnType<typeof checkImports>,
		naming: [] as ReturnType<typeof namingFindings>,
		aliases: [] as ReturnType<typeof aliasFindings>,
		forwarding: [] as ReturnType<typeof objectForwardingFindings>,
		documentation: [] as ReturnType<typeof documentationFindings>,
	};
	let duplicateImports: ReturnType<typeof duplicateImportFindings> = [];
	if (qualityCheckEnabled(cfg, 'import')) {
		qualityHeader('imports', 'Checking local import resolution');
		let findings = 0;
		try {
			result.imports = checkImports(scoped);
			printFindings(result.imports, (f) => `Unresolved import: ${f.importer} -> ${f.specifier}`);
			findings += result.imports.length;
		} catch (error) {
			recordQualityFailure('imports', error);
			findings += 1;
		}
		try {
			duplicateImports = duplicateImportFindings(ctx?.files ?? filesFor(scoped, true));
			printFindings(duplicateImports, (f) => `Duplicate named import: ${f.file}:${f.line} repeats an import from ${f.module}`);
			findings += duplicateImports.length;
		} catch (error) {
			recordQualityFailure('imports', error);
			findings += 1;
		}
		printCheckStatus('imports', findings);
	}
	if (qualityCheckEnabled(cfg, 'name'))
		result.naming = runFindingCheck(
			'naming',
			'Checking concise, consistent symbol names',
			() => namingFindings(scoped, ctx),
			(f) => `Naming error: ${f.file}: ${f.name} -> ${f.suggestion}`,
		);
	if (qualityCheckEnabled(cfg, 'alias'))
		result.aliases = runFindingCheck(
			'aliases',
			'Checking for unnecessary compatibility aliases',
			() => aliasFindings(scoped, ctx),
			(f) => `Alias: ${f.file}:${f.line} ${f.kind} ${f.name} -> ${f.replacement}`,
		);
	if (qualityCheckEnabled(cfg, 'forward'))
		result.forwarding = runFindingCheck(
			'forwarding',
			'Checking object-forwarding opportunities',
			() => objectForwardingFindings(scoped, ctx),
			(f) => `Forwarding error: ${f.file}:${f.line}:${f.column} ${f.callee} repeats ${f.source}.${f.properties.join(', ')}; ${f.recommendation}.`,
		);
	if (qualityCheckEnabled(cfg, 'document'))
		result.documentation = runFindingCheck(
			'documentation',
			'Checking meaningful file, function, and parameter documentation',
			() => documentationFindings(scoped, ctx),
			(f) => `Documentation error: ${f.file}:${f.line}:${f.column} ${f.name}; ${f.reason}.`,
		);
	if (result.imports.length || duplicateImports.length || result.aliases.length || result.documentation.length > 0 || result.naming.length > 0 || result.forwarding.length > 0) process.exitCode = 1;
	return result;
}

/**
 * Applies documentation maintenance and optional formatting to the requested source scope.
 *
 * @param cfg Normalized quality configuration for the current repository.
 * @param opts CLI options controlling scope and writes.
 * @param args Command arguments used to select explicit files.
 * @param quiet Whether the helper should omit the follow-up core quality pass.
 *
 * @return Nothing; maintenance and formatter failures are reflected in the process exit code.
 */
function runDocumentation(cfg: QualityCfg, opts: QualityOptions, args: string[], quiet: boolean): void {
	if (!qualityCheckEnabled(cfg, 'document')) return;
	qualityHeader('documentation', `${opts.fix ? 'Fixing and checking' : 'Checking'} documentation structure and meaningful descriptions`);
	const cmdOpts = { ...opts, fix: qualityAutofixEnabled(cfg, 'document', opts.fix) };
	const files = filesFor(cfg, opts.all);
	const reqFiles = args.slice(1).filter((a) => !a.startsWith('-'));
	const tgts = (reqFiles.length ? reqFiles : files).filter((f) => !f.endsWith('.astro'));
	if (cmdOpts.fix) for (const file of tgts) if (C_M_JS_TS_REGEX.test(file)) collapseInlineIfs(file);
	if (cmdOpts.fix)
		for (const file of tgts) {
			maintainSrcFile(cfg.root, file);
			documentSrcFile(cfg, file);
			if (cfg.oneLineImports) protectLongImports(file, cfg.prettierPrintWidth);
		}
	if (!quiet) runQuality(cfg, opts.strict, opts.all);
}

/**
 * Dispatches one quality CLI command after parsing its scope and autofix flags.
 *
 * @param cfg Normalized quality configuration for the current repository.
 * @param args CLI arguments to dispatch.
 *
 * @return A completion promise for asynchronous checks, or nothing for synchronous commands.
 */
export function runQualityCli(cfg: QualityCfg, args = process.argv.slice(2)): void | Promise<void> {
	validCliArgs(args);
	const reportIdx = args.indexOf('--report-json');
	const reportPath = reportIdx < 0 ? undefined : args[reportIdx + 1];
	const cmdArgs = reportIdx < 0 ? args : args.filter((_, i) => i !== reportIdx && i !== reportIdx + 1);
	if (!reportPath) return dispatchQualityCli(cfg, cmdArgs);
	reportStages = new Map();
	reportStageName = undefined;
	reportGitHubData = undefined;
	/**
	 *
	 */
	const writeReport = (): void => {
		const executed = [...(reportStages?.values() ?? [])].filter((s) => {
			if (s.name.includes('/') || s.name.startsWith('recommendation:')) return false;
			const names: Record<string, QualityCheckName> = { imports: 'import', naming: 'name', aliases: 'alias', forwarding: 'forward', documentation: 'document', typecheck: 'type' };
			const check = names[s.name] ?? ((s.name.startsWith('command:') ? 'command' : s.name) as QualityCheckName);
			if (!qualityCheckEnabled(cfg, check)) return false;
			if (s.name === 'security' && !cfg.security) return false;
			if (s.name === 'repeated-classes' && !cfg.repeatedClasses) return false;
			if (s.name === 'tailwind-canonical' && !cfg.tailwindCanonical) return false;
			if (s.name === 'regex-dedup' && !cfg.regexDedup) return false;
			if (s.name === 'ui-patterns' && !cfg.uiPatterns) return false;
			return true;
		});
		const standard = [
			'documentation',
			'format',
			'imports',
			'naming',
			'forwarding',
			'lint',
			'dead-code',
			'typecheck',
			'diff',
			'aliases',
			'security',
			'repeated-classes',
			'tailwind-canonical',
			'regex-dedup',
			'ui-patterns',
			'github',
		];
		const capabilities = Object.entries(LANGUAGE_CAPABILITIES).flatMap(([language, capability]) => [
			...Object.entries(capability.checks).map(([name, i]) => ({ language, kind: 'check' as const, name, ...i })),
			...Object.entries(capability.autofixes).map(([name, i]) => ({ language, kind: 'autofix' as const, name, ...i })),
		]);
		const notApplicableChecks = capabilities
			.filter((i) => i.kind === 'check' && i.status === 'not-applicable')
			.map((i) => ({ name: `${i.language}:${i.name}`, status: 'not-applicable' as const, findings: 0, reason: i.reason }));
		const report: QualityJsonReport = {
			schemaVersion: 1,
			generatedAt: new Date().toISOString(),
			command: cmdArgs.find((arg) => !arg.startsWith('-')) ?? 'quality',
			scope: cmdArgs.includes('--all') || cmdArgs.includes('quality:all') ? 'all' : 'changed',
			checks: [...executed, ...standard.filter((name) => !executed.some((s) => s.name === name)).map((name) => ({ name, status: 'skipped' as const, findings: 0 })), ...notApplicableChecks],
			capabilities,
			...(reportGitHubData ? { github: reportGitHubData } : {}),
		};
		writeFileSync(resolve(cfg.root, reportPath), `${JSON.stringify(report, null, 2)}\n`);
		reportStages = undefined;
		reportStageName = undefined;
	};
	try {
		const result = dispatchQualityCli(cfg, cmdArgs);
		if (result instanceof Promise) return result.finally(writeReport);
	} catch (err) {
		writeReport();
		throw err;
	}
	writeReport();
}

/**
 * Runs the full quality matrix in package-owned phase order.
 *
 * @param cfg Normalized repository configuration.
 * @param args Validated command arguments.
 * @param opts Scope and write controls parsed by the CLI.
 *
 * @return A promise only when the asynchronous Tailwind check is selected.
 */
function runFullQuality(cfg: QualityCfg, args: string[], opts: QualityOptions): void | Promise<void> {
	process.exitCode = 0;
	qualityCheckName = undefined;
	qualityDetails = [];
	const profileResolution = opts.skipCommands ? { checks: [], skipped: [], failed: [] } : resolveLanguageProfiles(cfg);
	const profileToolResults = new Map<string, ReturnType<typeof inspectLanguageProfileTool>>();
	if (!opts.skipCommands) {
		reportSkippedLangChecks(cfg, profileResolution.skipped);
		reportFailedLangChecks(cfg, profileResolution.failed);
	}
	/**
	 *
	 * @param phase
	 *
	 * @return
	 */
	const runConfiguredCmds = (phase: QualityPhase): number => runQualityPhase(cfg, phase, profileResolution.checks, profileToolResults);
	/**
	 *
	 * @param check
	 *
	 * @return
	 */
	const fix = (check: QualityAutofixName): boolean => qualityAutofixEnabled(cfg, check, opts.fix);
	const scoped = scopedCfg(cfg, opts.all);
	if (opts.fix) {
		outputPhase = 'PREPARING SAFE FIXES';
		console.error('\nPREPARING SAFE FIXES');
		qualityCheckName = 'Safe Fixes';
		qualityDetails = [];
		startQualitySpinner(qualityCheckName);
	}
	let sFixFailed = false;
	/**
	 *
	 * @param name
	 * @param action
	 */
	const sFix = (name: string, action: () => void): void => {
		if (!continueAfterFailure(name, action)) sFixFailed = true;
	};
	if (opts.fix && qualityCheckEnabled(cfg, 'name') && fix('name'))
		sFix('naming', () => {
			const namingScope = scopedCfg(cfg, opts.all);
			if (namingFindings(namingScope).length) fixNames(cfg, opts.all);
		});
	if (fix('accessibility') && qualityCheckEnabled(cfg, 'accessibility')) sFix('accessibility', () => fixAccessibleNames(scoped));
	if (fix('displayName') && qualityCheckEnabled(cfg, 'display-name')) sFix('display-name', () => fixDisplayNames(scoped));
	if (fix('documentedCommands') && qualityCheckEnabled(cfg, 'documented-commands')) sFix('documented-commands', () => fixDocumentedCommands(cfg));
	if (fix('forward') && qualityCheckEnabled(cfg, 'forward'))
		sFix('forwarding', () => {
			const result = fixObjectForwarding(scoped);
			if ((result.fixed || result.skipped) && !outputPhase)
				console.info(`Forwarding fixer: ${result.fixed} exact duplicates removed${result.skipped ? `; ${result.skipped} unsafe cases left unchanged` : ''}.`);
		});
	if (fix('repeatedClasses') && qualityCheckEnabled(cfg, 'repeated-classes'))
		sFix('repeated-classes', () => {
			const result = fixRepeatedClasses(scoped);
			if ((result.fixed || result.skipped) && !outputPhase) console.info(`Class fixer: ${result.fixed} attributes replaced${result.skipped ? `; ${result.skipped} unsafe cases left unchanged` : ''}.`);
		});
	if (fix('regexDedup') && qualityCheckEnabled(cfg, 'regex-dedup'))
		sFix('regex-dedup', () => {
			const result = fixRegexDedup(scoped);
			if ((result.fixed || result.skipped) && !outputPhase) console.info(`Regex fixer: ${result.fixed} literals replaced${result.skipped ? `; ${result.skipped} unsafe cases left unchanged` : ''}.`);
		});
	if (fix('lint') && qualityCheckEnabled(cfg, 'lint')) sFix('lint', () => runLint(cfg, { ...opts, fix: true }, true, true));
	if (opts.fix && qualityCheckEnabled(cfg, 'alias')) sFix('aliases', () => void aliasFindings(scoped, true));
	if (qualityCheckEnabled(cfg, 'document'))
		sFix('documentation', () => {
			const documentationIssues = documentationFindings(scopedCfg(cfg, opts.all)).filter((finding) => finding.severity === 'error');
			if (documentationIssues.length) runDocumentation(cfg, opts, ['document', ...new Set(documentationIssues.map((finding) => resolve(cfg.root, finding.file))), '--quiet'], true);
		});
	if (opts.fix && qualityCheckEnabled(cfg, 'import') && qualityAutofixEnabled(cfg, 'document', opts.fix))
		sFix('imports', () => {
			const repeated = duplicateImportFindings(filesFor(cfg, opts.all));
			for (const file of new Set(repeated.map((finding) => finding.file))) maintainSrcFile(cfg.root, file);
		});
	if (opts.fix && !opts.skipCommands && profileResolution.checks.some((check) => check.autofix))
		sFix('native language fixes', () => runLangProfileFixes(cfg, profileResolution.checks, profileToolResults));
	if (opts.fix) {
		stopQualitySpinner();
		console.error(`  ${sFixFailed ? '✗' : '✓'} Safe Fixes`);
		printQualityDetails();
	}
	outputPhase = undefined;
	beginQualityPhase('Format');
	if (qualityCheckEnabled(cfg, 'format')) continueAfterFailure('format', () => runFormatter(cfg, { ...opts, fix: fix('format') }, opts.all ? [] : filesFor(cfg, false)));
	if (!opts.skipCommands) continueAfterFailure('format', () => void runConfiguredCmds('Format'));
	beginQualityPhase('Static quality');
	/**
	 *
	 */
	const continueStaticAndLater = (): void => {
		if (qualityCheckEnabled(cfg, 'dead-code')) continueAfterFailure('dead-code', () => runDeadCodeCmd(cfg, qualityAutofixEnabled(cfg, 'dead-code', opts.fix), opts.all));
		if (qualityCheckEnabled(cfg, 'lint')) continueAfterFailure('lint', () => runLint(cfg, { ...opts, fix: false }, true, true));
		qualityHeader('source-analysis', '');
		let analysis: QualityAnalysis | undefined;
		try {
			analysis = createQualityAnalysis(scoped);
			printCheckStatus('source-analysis', 0);
		} catch (err) {
			recordQualityFailure('source-analysis', err);
			printCheckStatus('source-analysis', 1);
		}
		continueAfterFailure('static checks', () => runGenericChecks(scoped, analysis));
		continueAfterFailure('static checks', () => void runQuality(cfg, opts.strict, opts.all, analysis));
		if (!opts.skipCommands) continueAfterFailure('static quality', () => void runConfiguredCmds('Static quality'));
		if (!opts.skipRecommendations) continueAfterFailure('recommendations', () => runRecommendationCmds(cfg));
		beginQualityPhase('Tests');
		if (!opts.skipCommands) continueAfterFailure('tests', () => void runConfiguredCmds('Tests'));
		beginQualityPhase('Framework / type checks');
		if (qualityCheckEnabled(cfg, 'type') && (cfg.tools?.tsc || cfg.typecheckCommand))
			continueAfterFailure('typecheck', () => {
				runTypecheck(cfg);
				if (cfg.typecheckExtensions?.length && !cfg.typecheckRoots?.length && !cfg.typecheckCommand) runProjectTypecheck(cfg);
			});
		if (!opts.skipCommands) continueAfterFailure('framework checks', () => void runConfiguredCmds('Framework / type checks'));
		beginQualityPhase('Build');
		if (!opts.skipCommands) continueAfterFailure('build', () => void runConfiguredCmds('Build'));
		beginQualityPhase('Repository health');
		if (!opts.skipCommands) continueAfterFailure('repository health', () => void runConfiguredCmds('Repository health'));
		if (qualityCheckEnabled(cfg, 'diff') && !hasCfgdGitDiffCheck(cfg)) continueAfterFailure('diff', () => runDiffCheck(cfg));
		if (qualityCheckEnabled(cfg, 'github') && cfg.github?.repositories?.length) continueAfterFailure('github', () => runGitHubCheck(cfg, [], false, args.includes('--warn')));
		console.error(`\n${process.exitCode ? '✗' : '✓'} Quality complete`);
		outputPhase = undefined;
	};
	if (cfg.tailwindCanonical && qualityCheckEnabled(cfg, 'tailwind-canonical'))
		return runTailwindCanonicalCheck(cfg, fix('tailwindCanonical'))
			.catch((error: unknown) => {
				recordQualityFailure('tailwind-canonical', error);
				printCheckStatus('tailwind-canonical', 1);
			})
			.then(continueStaticAndLater);
	continueStaticAndLater();
}

/**
 * Route validated arguments to the requested quality command.
 *
 * @param cfg Normalized repository quality configuration.
 * @param args Validated CLI arguments.
 *
 * @return A completion promise for asynchronous checks, or nothing for synchronous commands.
 */
function dispatchQualityCli(cfg: QualityCfg, args: string[]): void | Promise<void> {
	validCliArgs(args);
	if (args.includes('--version') || args.includes('-v')) {
		const pkg = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8')) as { version: string };
		console.info(pkg.version);
		return;
	}
	if (args.includes('--help') || args.includes('-h')) {
		console.info('Usage: terra-quality <command> [options]');
		console.info('Commands include quality, history, github, document, format, lint, knip, types, single-use, dead-code, tailwind-canonical, security, ui-recommendations, and domain.');
		console.info(
			'Options: --all, --warn, --strict, --skip-commands, --skip-recommendations, --report-json <path>, --repository owner/name; history also accepts --branch <name> and --base-sha <sha>.',
		);
		return;
	}
	const cmd = args.find((a) => !a.startsWith('-')) ?? 'quality';
	const opts: QualityOptions = {
		fix: !args.includes('--warn'),
		all: args.includes('--all') || cmd === 'quality:all',
		strict: args.includes('--strict'),
		skipCommands: args.includes('--skip-commands'),
		skipRecommendations: args.includes('--skip-recommendations'),
	};
	/**
	 *
	 * @param check
	 *
	 * @return
	 */
	const fix = (check: QualityAutofixName): boolean => qualityAutofixEnabled(cfg, check, opts.fix);
	if (
		cfg.tailwindCanonical &&
		qualityCheckEnabled(cfg, 'tailwind-canonical') &&
		!['quality', 'quality:all', 'quality:baseline'].includes(cmd) &&
		['imports', 'quality:patterns', 'types:architecture'].includes(cmd)
	)
		return runTailwindCanonicalCheck(cfg, fix('tailwindCanonical')).then(() => {
			const checks = { ...cfg.enabledChecks, 'tailwind-canonical': false };
			return dispatchQualityCli({ ...cfg, enabledChecks: checks }, args);
		});
	if (cmd === 'github') {
		runGitHubCheck(cfg, optVals(args, '--repository'), true, args.includes('--warn'));
		return;
	}
	if (cmd === 'document' || cmd === 'maintain') {
		runDocumentation(cfg, opts, args, args.includes('--quiet'));
		if (qualityCheckEnabled(cfg, 'format')) runFormatter(cfg, { ...opts, fix: fix('format') }, args.slice(1));
		return;
	}
	if (cmd === 'format') {
		if (!qualityCheckEnabled(cfg, 'format')) return;
		const files = filesFor(cfg, opts.all);
		const cmdOpts = { ...opts, fix: fix('format') };
		const tgts = files.filter((f) => !f.endsWith('.astro'));
		if (cmdOpts.fix) for (const file of tgts) if (C_M_JS_TS_REGEX.test(file)) collapseInlineIfs(file);
		if (cmdOpts.fix)
			for (const file of tgts) {
				maintainSrcFile(cfg.root, file);
				if (cfg.oneLineImports) protectLongImports(file, cfg.prettierPrintWidth);
			}
		if (qualityCheckEnabled(cfg, 'format')) runFormatter(cfg, cmdOpts, args.slice(1));
		return;
	}
	if (cmd === 'naming') {
		if (qualityCheckEnabled(cfg, 'name') && fix('name')) fixNames(cfg, opts.all);
		runQuality(cfg, opts.strict, opts.all);
		return;
	}
	if (cmd === 'domain') {
		const name = args[args.indexOf('domain') + 1];
		if (!name) throw new Error('Pass a quality domain name.');
		runCfgdCmd(cfg, name);
		return;
	}
	if (cmd === 'single-use') {
		runDeadCodeCmd(cfg, qualityAutofixEnabled(cfg, 'dead-code', opts.fix), opts.all);
		return;
	}
	if (cmd === 'dead-code') {
		runDeadCodeCmd(cfg, qualityAutofixEnabled(cfg, 'dead-code', opts.fix), opts.all);
		return;
	}
	if (cmd === 'tailwind-canonical') {
		if (!qualityCheckEnabled(cfg, 'tailwind-canonical') || !cfg.tailwindCanonical) return;
		return runTailwindCanonicalCheck(cfg, fix('tailwindCanonical'));
	}
	if (cmd === 'security' || cmd === 'repeated-classes' || cmd === 'regex-dedup' || cmd === 'ui-patterns') {
		if (cmd === 'repeated-classes' && fix('repeatedClasses')) {
			const result = fixRepeatedClasses(cfg);
			console.info(`  fixed ${result.fixed} class attributes${result.skipped ? `; ${result.skipped} unsafe cases left unchanged` : ''}`);
		}
		if (cmd === 'regex-dedup' && fix('regexDedup')) {
			const result = fixRegexDedup(cfg);
			console.info(`  fixed ${result.fixed} regex literals${result.skipped ? `; ${result.skipped} unsafe cases left unchanged` : ''}`);
		}
		if (cmd === 'security' || cmd === 'ui-patterns') {
			const findings = cmd === 'security' ? securityFindings(cfg) : uiPatternFindings(cfg);
			qualityHeader(cmd, `Checking ${cmd.replace(G_REGEX(), ' ')}`);
			printFindings(
				findings as readonly GenericFinding[],
				(f) =>
					`${'file' in f ? `${f.file}: ` : ''}${'message' in f ? f.message : 'component' in f ? `${f.line}:${f.column} ${f.component}: ${f.recommendation}` : 'method' in f ? `${f.line}:${f.column} ${f.method}(${f.receiver}): ${f.recommendation}` : 'command' in f ? `${f.line}: ${f.recommendation} (${f.command})` : 'value' in f ? `${f.count}x ${f.value} (${f.locations.join(', ')})` : 'source' in f ? `${f.count}x ${f.source} (${f.locations.join(', ')})` : f.pattern}`,
			);
			if (findings.length) process.exitCode = 1;
			return;
		}
		const findings = cmd === 'repeated-classes' ? repeatedClassFindings(cfg) : regexFindings(cfg);
		qualityHeader(cmd, `Checking ${cmd.replace(G_REGEX(), ' ')}`);
		printFindings(
			findings as readonly GenericFinding[],
			(f) =>
				`${'file' in f ? `${f.file}: ` : ''}${'message' in f ? f.message : 'component' in f ? `${f.line}:${f.column} ${f.component}: ${f.recommendation}` : 'method' in f ? `${f.line}:${f.column} ${f.method}(${f.receiver}): ${f.recommendation}` : 'command' in f ? `${f.line}: ${f.recommendation} (${f.command})` : 'value' in f ? `${f.count}x ${f.value} (${f.locations.join(', ')})` : 'source' in f ? `${f.count}x ${f.source} (${f.locations.join(', ')})` : f.pattern}`,
		);
		if (findings.length) process.exitCode = 1;
		return;
	}
	if (cmd === 'ui-recommendations') {
		const findings = uiComponentRecommendations(cfg);
		console.error(`UI component findings (${findings.length})`);
		for (const finding of findings) {
			const component = finding.variant ? `<${finding.component} variant="${finding.variant}">` : `<${finding.component}>`;
			console.error(`  [ERROR] ${finding.file}:${finding.line}:${finding.column} <${finding.element}> should use ${component} (import from '${finding.import}') — ${finding.reason}`);
		}
		if (findings.length) process.exitCode = 1;
		return;
	}
	if (cfg.qualityCommands?.some((c) => c.name === cmd)) {
		runCfgdCmd(cfg, cmd);
		return;
	}
	if (cmd === 'lint') return qualityCheckEnabled(cfg, 'lint') ? runLint(cfg, { ...opts, fix: fix('lint') }) : undefined;
	if (cmd === 'knip') {
		runDeadCodeCmd(cfg, qualityAutofixEnabled(cfg, 'dead-code', opts.fix), opts.all);
		return;
	}
	if (cmd === 'types') {
		if (!qualityCheckEnabled(cfg, 'type')) return;
		runTypecheck(cfg, opts.all ? [] : filesFor(cfg, false));
		if (cfg.typecheckExtensions?.length && !cfg.typecheckRoots?.length) runProjectTypecheck(cfg);
		return;
	}
	if (cmd === 'imports' || cmd === 'quality:patterns' || cmd === 'types:architecture') {
		runQuality(cfg, opts.strict, opts.all);
		return;
	}
	if (cmd === 'quality' || cmd === 'quality:all' || cmd === 'quality:baseline') return runFullQuality(cfg, args, opts);
}

/**
 * Loads the repository configuration and runs the CLI in one boundary call.
 *
 * @param file Optional path to the quality configuration file.
 * @param args CLI arguments passed to the dispatcher.
 *
 * @return A completion promise for asynchronous checks, or nothing for synchronous commands.
 */
export function runQualityFromCfg(file?: string, args = process.argv.slice(2)): void | Promise<void> {
	validCliArgs(args);
	if (args.some((arg) => ['--version', '-v', '--help', '-h'].includes(arg))) {
		runQualityCli({} as QualityCfg, args);
		return;
	}
	const reportIdx = args.indexOf('--report-json');
	const cmd = args.find((arg, i) => i !== reportIdx + 1 && !arg.startsWith('-')) ?? 'quality';
	if (cmd === 'history') {
		const reportPath = reportIdx < 0 ? undefined : args[reportIdx + 1];
		if (!reportPath) throw new Error('terra-quality history requires --report-json <path>.');
		const branch = optVal(args, '--branch');
		const baseSha = optVal(args, '--base-sha');
		writeHistoryReport(process.cwd(), reportPath, { ...(branch ? { branch } : {}), ...(baseSha ? { baseSha } : {}) });
		return;
	}
	const cfg = loadQualityCfg(file);
	const lintCmds = new Set(['quality', 'quality:all', 'quality:baseline', 'document', 'maintain', 'dead-code', 'knip', 'lint', 'naming', 'single-use']);
	if (lintCmds.has(cmd) && qualityCheckEnabled(cfg, 'lint')) {
		const flatCfg = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts']
			.map((config) => resolve(cfg.root, config))
			.find((config) => existsSync(config));
		if (!flatCfg) throw new Error(`ESLint flat config is required for ${cmd}. Add eslint.config.js, eslint.config.mjs, or eslint.config.ts at ${cfg.root} before running Terra Quality.`);
	}
	return runQualityCli(cfg, args);
}

/**
 * Reject unknown commands and flags before loading configuration or invoking a fixer.
 *
 * @param args CLI arguments to validate before configuration or source changes.
 */
function validCliArgs(args: string[]): void {
	const reportIdx = args.indexOf('--report-json');
	if (reportIdx >= 0 && (!args[reportIdx + 1] || args[reportIdx + 1].startsWith('-') || args.lastIndexOf('--report-json') !== reportIdx)) throw new Error('--report-json requires one output path.');
	for (const flag of ['--branch', '--base-sha', '--repository']) {
		const idx = args.indexOf(flag);
		if (flag === '--repository') {
			for (const occurrence of args.flatMap((arg, i) => (arg === flag ? [i] : []))) {
				if (!args[occurrence + 1] || args[occurrence + 1].startsWith('-')) throw new Error(`${flag} requires an owner/name value.`);
			}
		} else if (idx >= 0 && (!args[idx + 1] || args[idx + 1].startsWith('-') || args.lastIndexOf(flag) !== idx)) throw new Error(`${flag} requires one value.`);
	}
	const cmdArgs = args.filter((_, i) => i !== reportIdx + 1 || reportIdx < 0);
	const cmd = cmdArgs.find((arg) => !arg.startsWith('-')) ?? 'quality';
	const unknownFlags = cmdArgs.filter((arg) => arg.startsWith('-') && !CLI_FLAGS.has(arg));
	if (!CLI_CMDS.has(cmd) || unknownFlags.length) throw new Error(`Unknown quality CLI arguments: ${[...(!CLI_CMDS.has(cmd) ? [cmd] : []), ...unknownFlags].join(', ')}`);
}

/**
 * Read a single value following a validated CLI flag.
 *
 * @param args CLI arguments.
 * @param flag Flag whose following value is returned.
 *
 * @return The flag value, or undefined when the flag was not supplied.
 */
function optVal(args: string[], flag: string): string | undefined {
	const idx = args.indexOf(flag);
	return idx < 0 ? undefined : args[idx + 1];
}

/**
 * Read each occurrence of a repeated CLI option.
 *
 * @param args Validated command-line arguments.
 * @param flag Repeated flag to read.
 *
 * @return Values supplied after each occurrence of the flag.
 */
function optVals(args: string[], flag: string): string[] {
	return args.flatMap((arg, i) => (arg === flag && args[i + 1] ? [args[i + 1]!] : []));
}

/**
 * Runs Prettier after applying the quality package's safe structural formatting pass.
 *
 * @param cfg Quality configuration defining formatter, scope, and print-width settings.
 * @param optsOrArgs Typed options or legacy CLI-style arguments.
 * @param args Additional CLI arguments when typed options are supplied.
 *
 * @return Nothing; formatter failures are reflected in the process exit code.
 */
export function runFormatter(cfg: QualityCfg, optsOrArgs: QualityOptions | string[] = { fix: true, all: false, strict: false }, args: string[] = []): void {
	const legacyArgs = Array.isArray(optsOrArgs);
	const opts = legacyArgs ? { fix: optsOrArgs.includes('--write') || !optsOrArgs.includes('--check'), all: optsOrArgs.includes('--all'), strict: false } : optsOrArgs;
	const suppliedArgs = (legacyArgs ? optsOrArgs : args).filter((a) => !['--all', '--warn', '--strict'].includes(a));
	const hasMode = suppliedArgs.includes('--write') || suppliedArgs.includes('--check');
	const hasIgnoreMode = suppliedArgs.some((a) => a.startsWith('--ignore-unknown'));
	const hasLogLevel = suppliedArgs.includes('--log-level') || suppliedArgs.some((a) => a.startsWith('--log-level='));
	const suppliedTgts = suppliedArgs.filter((a, i) => a !== 'warn' || suppliedArgs[i - 1] !== '--log-level').filter((a) => !a.startsWith('-') && !a.endsWith('.astro'));
	const discoveredTgts = suppliedTgts.length ? [] : filesFor(cfg, opts.all).filter((f) => !f.endsWith('.astro'));
	const fmtArgs = [
		...(hasMode ? [] : [opts.fix ? '--write' : '--check']),
		...(hasIgnoreMode ? [] : ['--ignore-unknown']),
		...(opts.fix && !hasLogLevel ? ['--log-level=warn'] : []),
		...suppliedArgs,
		...(suppliedTgts.length ? [] : discoveredTgts),
	];
	const flags = fmtArgs.filter((a) => a.startsWith('-'));
	const tgts = suppliedTgts.length ? suppliedTgts : discoveredTgts;
	qualityHeader('format', `${opts.fix ? 'Fixing' : 'Checking'} formatting in ${tgts.length} source files`);
	const before = opts.fix ? snapshotFiles(cfg, tgts) : undefined;
	if (opts.fix) {
		// Explicit formatter targets are already the authoritative scope. Avoid
		// querying Git for a temporary/non-repository fixture when collapsing its
		// structural sources before Prettier.
		const knownFiles = suppliedTgts.length ? srcFiles(cfg) : filesFor(cfg, opts.all);
		const directTgts = suppliedTgts.map((t) => resolve(cfg.root, t));
		const collapseTgts = directTgts.length ? knownFiles.filter((f) => directTgts.some((t) => resolve(f) === t || resolve(f).startsWith(`${t}${sep}`))) : knownFiles;
		for (const file of collapseTgts) if (C_M_JS_TS_REGEX.test(file)) collapseTypesAndObjects(file);
	}
	let failed = false;
	let completed = 0;
	qualityProgress('Prettier', completed, tgts.length);
	for (const tgtBatch of argumentBatches(tgts)) {
		const status = run(cfg, toolPath(cfg, cfg.tools?.prettier, 'prettier'), [...flags, ...tgtBatch], { quietSuccess: true });
		completed += tgtBatch.length;
		qualityProgress('Prettier', completed, tgts.length);
		if (status) {
			failed = true;
			process.exitCode = status;
		}
	}
	if (before && !outputPhase) console.error(`  fixed ${changedFileCount(cfg, tgts, before)} files`);
	printCheckStatus('format', failed ? 1 : 0);
}

/**
 * Runs a configured TypeScript typecheck over either supplied files or the configured project.
 *
 * @param cfg Quality configuration containing compiler, root, and extension settings.
 * @param args Optional source files to typecheck in a scoped invocation.
 *
 * @return Nothing; compiler failures are reflected in the process exit code.
 */
export function runTypecheck(cfg: QualityCfg, args: string[] = []): void {
	if (cfg.typecheckCommand) {
		if (!args.length) runProjectTypecheck(cfg);
		return;
	}
	const tsc = cfg.tools?.tsc ?? 'tsc';
	// prettier-ignore
	const suppliedFiles = cfg.typecheckExtensions?.length
		? args.filter((f) => cfg.typecheckExtensions?.includes(f.slice(f.lastIndexOf('.'))) && (!cfg.typecheckRoots?.length || cfg.typecheckRoots.some((r) => f.startsWith(`${r}/`) || f.startsWith(`${r}\\`))),)
		: args;
	if (args.length && !suppliedFiles.length) return;
	// prettier-ignore
	const typecheckFiles = cfg.typecheckExtensions?.length
		? srcFiles(cfg).filter((f) => cfg.typecheckExtensions?.includes(f.slice(f.lastIndexOf('.'))) && (!cfg.typecheckRoots?.length || cfg.typecheckRoots.some((r) => f.startsWith(`${r}/`) || f.startsWith(`${r}\\`))),)
		: [];
	// prettier-ignore
	const compilerArgs = typecheckFiles.length
		? [
				'--noEmit', '--allowJs', '--checkJs',          '--strict', '--skipLibCheck',
				'--module', 'ESNext',    '--moduleResolution', 'Bundler',  '--target',
        'ESNext', '--allowImportingTsExtensions',
        ...(args.length ? suppliedFiles : typecheckFiles),
			]
		: ['--noEmit', '-p', cfg.tsconfig ?? 'tsconfig.json', ...suppliedFiles];
	qualityHeader('typecheck', `Checking ${args.length ? 'the selected source files' : 'the configured TypeScript project'}`);
	const result = spawnSync(toolPath(cfg, tsc, 'tsc'), compilerArgs, { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], maxBuffer: TOOL_OUTPUT_MAX_BUFFER });
	const status = result.status ?? 1;
	if (status) {
		const output = [...compactOutput(result.stdout?.toString() ?? ''), ...compactOutput(result.stderr?.toString() ?? '')];
		if (outputPhase) {
			recordQualityDetail(`${toolPath(cfg, tsc, 'tsc')} failed (exit ${status})`);
			for (const line of output) recordQualityDetail(line);
		} else {
			printChildOutput(result.stdout);
			printChildOutput(result.stderr);
		}
	}
	if (status) process.exitCode = 1;
	printCheckStatus('typecheck', status ? 1 : 0);
}
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) {
	setQualityProgressSuppressed(true);
	Promise.resolve(runQualityFromCfg()).catch((error: unknown) => {
		stopQualitySpinner();
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
