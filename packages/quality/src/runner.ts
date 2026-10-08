#!/usr/bin/env node

/**
 * packages/quality/src/runner.ts
 * CLI boundary that loads configuration and coordinates repository quality checks.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { aliasFindings, declarationScope, isCallbackDeclaration, isProtectedPath, isRenamableDeclaration, namingFindings, renameDeclaration, renameId } from './naming.js';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { checkImports } from './imports.js';
import { collapseInlineIfs } from './inline-if.js';
import { collapseTypesAndObjects } from './collapse.js';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { deadCodeEditsIntroduceTypeErrors, deadCodeTypeProgram, fixSingleUseDeclarations, singleUseFindings } from './single-use.js';
import { documentSrcFile, documentationFindings, duplicateImportFindings, maintainSrcFile, protectLongImports } from './documentation.js';
import { fileURLToPath } from 'node:url';
import { fixObjectForwarding, objectForwardingFindings } from './object-forwarding.js';
import { fixRegexDedup, fixRepeatedClasses, regexFindings, repeatedClassFindings, uiPatternFindings } from './patterns.js';
import { qualityProgress } from './progress.js';
import { securityFindings } from './security.js';
import { spawnSync } from 'node:child_process';
import { srcFiles, workingSrcFiles } from './files.js';
import { tmpdir } from 'node:os';

// DATA
import { DOCUMENTATION_DESCRIPTION_NOTICE } from './documentation.js';
import { PROTECTED_IDENTIFIERS } from './naming.js';

// TYPES
import type { DocumentationRequirements } from './documentation.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const R_N_REGEX = /\r?\n/;
const SHARED_REGEX = /\/\*|\/\//;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const CJS_JS_JSX_MJS_TS_TSX_REGEX = /\.(?:cjs|js|jsx|mjs|ts|tsx)$/;
const G_REGEX = () => /-/g;
const C_M_JS_TS_REGEX = /\.(?:c|m)?(?:js|ts)$/;
const CLI_CMDS = new Set([
	'quality',
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
	'regex-dedup',
	'ui-patterns',
	'imports',
	'aliases',
	'forwarding',
	'documentation',
	'lint',
	'knip',
	'types',
]);
const CLI_FLAGS = new Set(['--all', '--warn', '--strict', '--skip-commands', '--skip-recommendations', '--help', '-h', '--version', '-v']);
const TOOL_OUTPUT_MAX_BUFFER = 64 * 1024 * 1024;
const ESLINT_BATCH_SIZE = 10;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const C_M_JS_TS_X_REGEX = /\.(?:c|m)?(?:js|ts)x?$/;
const C_M_JS_TS_X_CLASS_2 = /\.(?:(?:c|m)?(?:js|ts)x?)$/;
/**
 *
 */
export type QualityCheckName =
	| 'document'
	| 'format'
	| 'import'
	| 'name'
	| 'forward'
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
	| 'regex-dedup'
	| 'ui-patterns';
/**
 *
 */
export type QualityAutofixName = 'document' | 'format' | 'name' | 'lint' | 'knip' | 'dead-code' | 'alias' | 'forward' | 'repeatedClasses' | 'regexDedup';
/**
 *
 */
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
	frameworkEntryExports?: Record<string, string[]>;
	renameExports?: boolean;
	qualityCommands?: { name: string; command: string; args?: string[] }[];
	enabledChecks?: Partial<Record<QualityCheckName, boolean>>;
	autofix?: Partial<Record<QualityAutofixName, boolean>>;
	documentation?: { required?: DocumentationRequirements };
	enabledCommands?: Record<string, boolean>;
	recommendationCommands?: { name: string; command: string; args?: string[] }[];
	enabledRecommendations?: Record<string, boolean>;
	tailwindCanonical?: { stylesheet: string; sourceRoots?: string[] };
	security?: { forbiddenTerms?: string[]; forbiddenImports?: string[]; clientRoots?: string[]; allowProcessEnvRoots?: string[] };
	repeatedClasses?: { minimumCount?: number; extensions?: string[]; ignoredDirectories?: string[] };
	regexDedup?: { extensions?: string[]; ignoredFiles?: string[]; minimumCount?: number; sharedModule?: string };
	uiPatterns?: { forbidden?: string[]; ignoredFiles?: string[]; extensions?: string[] };
	singleUse?: { skippedDirectories?: string[] };
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
 *
 */
export type QualityAnalysis = { files: string[]; texts: Map<string, string>; sources: Map<string, ts.SourceFile>; program: ts.Program; checker: ts.TypeChecker };
/**
 *
 */
export type QualityOptions = { fix: boolean; all: boolean; strict: boolean; skipCommands?: boolean; skipRecommendations?: boolean };
/**
 *
 */
type GenericFinding =
	{ file?: string; message: string } | { value: string; count: number; locations: string[] } | { source: string; count: number; locations: string[] } | { file: string; pattern: string };
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
 * Checks whether a configured advisory command is enabled.
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
	const defaultSkipped = ['.git', 'node_modules', 'dist', 'build', 'coverage', 'test-results', '.next', '.astro', '.sanity', '.netlify', '.cache', '.output', '.vercel', '.nuxt', '.husky'];
	return {
		...cfg,
		renameExports: cfg.renameExports ?? false,
		root: resolve(cfg.root),
		sourceRoots: cfg.sourceRoots.map((p) => resolve(cfg.root, p)),
		includeRoots: (cfg.includeRoots ?? []).map((p) => resolve(cfg.root, p)),
		skippedDirectories: [...new Set([...defaultSkipped, ...(cfg.skippedDirectories ?? [])])],
		singleUse: { skippedDirectories: (cfg.singleUse?.skippedDirectories ?? []).map((p) => resolve(cfg.root, p)) },
		skippedFiles: (cfg.skippedFiles ?? []).map((p) => resolve(cfg.root, p)),
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
 * Prints a readable heading for one quality stage.
 *
 * @param name Short name identifying the quality stage.
 * @param detail Human-readable description of the work being performed.
 *
 * @return Nothing; the heading is written to standard error with the other quality messages.
 */
function qualityHeader(name: string, detail: string): void {
	console.error(`\n=== ${name} ===`);
	console.error(detail);
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
 * @param opts
 *
 * @return Child-process exit status, or `1` when spawning fails without a status.
 */
function run(cfg: QualityCfg, cmd: string, args: string[], opts: { quietSuccess?: boolean } = {}): number {
	const result = spawnSync(cmd, args, { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env, maxBuffer: TOOL_OUTPUT_MAX_BUFFER });
	if (!opts.quietSuccess || result.status) {
		printChildOutput(result.stdout);
		printChildOutput(result.stderr);
	}
	if (result.error) console.error(`  ${cmd} failed: ${result.error.message}`);
	return result.status ?? 1;
}

/**
 * Captures source text so automatic tools can report changed-file counts without
 * replaying their successful per-file output.
 *
 * @param cfg
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
 * @param cfg
 * @param files Files to compare.
 * @param before Initial file contents.
 *
 * @return Number of changed files.
 */
function changedFileCount(cfg: QualityCfg, files: string[], before: Map<string, string>): number {
	return files.filter((f) => before.get(f) !== readFileSync(resolve(cfg.root, f), 'utf8')).length;
}

/**
 * Splits a list into bounded batches for command-line tools.
 *
 * @param vals Values to divide into batches.
 * @param size Maximum number of values per batch.
 *
 * @return Ordered batches covering the input values.
 */
function batches<T>(vals: T[], size = 100): T[][] {
	return Array.from({ length: Math.ceil(vals.length / size) }, (_, i) => vals.slice(i * size, (i + 1) * size));
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
 * Runs ESLint over the selected files in argument-safe batches.
 *
 * @param cfg Quality configuration defining the repository and ESLint executable.
 * @param opts CLI options controlling scope and autofix.
 * @param exhaustive Whether warnings should fail the run.
 * @param deadCodeCoordinated
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
	for (const filesBatch of batches(files, ESLINT_BATCH_SIZE)) {
		const status = run(cfg, toolPath(cfg, cfg.tools?.eslint, 'eslint'), [...flags, ...filesBatch], { quietSuccess: opts.fix });
		completed += filesBatch.length;
		qualityProgress('ESLint', completed, files.length);
		if (status) {
			failed = true;
			process.exitCode = status;
		}
	}
	if (before) console.error(`  fixed ${changedFileCount(cfg, files, before)} files`);
	console.error(`  ${failed ? '✗ failed' : '✓ passed'}`);
}

/**
 * Removes function declarations that ESLint proves have no references.
 *
 * Knip can safely remove an unused export modifier while leaving the declaration
 * private. This pass completes that mechanical cleanup without guessing about
 * variables whose initializers may have side effects.
 *
 * @param cfg Quality configuration defining the repository and ESLint executable.
 * @param reports
 * @param changedFiles
 * @param all Whether every configured source file should be inspected.
 *
 * @return Number of unused function declarations removed.
 */
function fixUnusedDeclarations(cfg: QualityCfg, reports: EslintReport[], changedFiles: Set<string>): number {
	let fixed = 0;
	const importedConsumers = importedExportConsumers(cfg);
	for (const report of reports) {
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
		const starts = new Set(report.messages.filter((m) => m.ruleId === 'unused-imports/no-unused-vars').map((m) => ast.getPositionOfLineAndCharacter(m.line - 1, m.column - 1)));
		const edits: Array<{ start: number; end: number; text?: string }> = [];
		const visit = (node: ts.Node): void => {
			let declaration: ts.Node | undefined;
			const name =
				ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)
					? node.name?.text
					: ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
						? node.name.text
						: undefined;
			const externallyConsumed = name ? importedConsumers.get(resolve(report.filePath))?.has(name) : false;
			const isTopLevel = (candidate: ts.Node): boolean =>
				candidate.parent === ast ||
				(ts.isVariableDeclaration(candidate) && ts.isVariableDeclarationList(candidate.parent) && ts.isVariableStatement(candidate.parent.parent) && candidate.parent.parent.parent === ast);
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
 * @param node
 *
 * @return
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
/**
 *
 */
type EslintReport = { filePath: string; messages: Array<{ ruleId?: string; line: number; column: number; message?: string }> };
/**
 *
 */
type DeadCodeFinding = { rule: string; file: string; line: number; name: string; severity: 'error' | 'warning'; autofixable: boolean; reason: string; agentAction: string };
/**
 *
 */
type KnipItem = { name: string; line?: number };
/**
 *
 */
type KnipIssue = { file: string; [kind: string]: string | KnipItem[] };

/**
 * Runs ESLint's machine-readable pass once for the selected source files.
 *
 * @param cfg
 * @param all
 *
 * @return
 */
function collectEslintReports(cfg: QualityCfg, all: boolean): EslintReport[] {
	const files = filesFor(cfg, all).filter((f) => CJS_JS_JSX_MJS_TS_TSX_REGEX.test(f));
	const reports: EslintReport[] = [];
	const flatCfg = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts']
		.map((f) => resolve(cfg.root, f))
		.find((f) => existsSync(f));
	let completed = 0;
	qualityProgress('ESLint dead-code', completed, files.length);
	for (const filesBatch of batches(files, ESLINT_BATCH_SIZE)) {
		const result = spawnSync(toolPath(cfg, cfg.tools?.eslint, 'eslint'), ['--format', 'json', '--no-ignore', ...(flatCfg ? ['--config', flatCfg] : []), ...filesBatch], {
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
 * @param result
 * @param files
 *
 * @return
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
					(report.fatalErrorCount ?? 0) > 0 ||
					report.messages.some(
						(message: unknown) => !message || typeof message !== 'object' || !Number.isInteger((message as { line?: unknown }).line) || !Number.isInteger((message as { column?: unknown }).column),
					),
			)
		)
			throw new Error(`report entries must include filePath and well-formed messages: ${JSON.stringify(reports).slice(0, 4000)}`);
		const actual = new Set(reports.map((report: { filePath: string }) => resolve(report.filePath)));
		const missing = files.map((f) => resolve(f)).filter((f) => !actual.has(f));
		if (missing.length) throw new Error(`missing reports for ${missing.join(', ')}`);
		return reports as EslintReport[];
	} catch (err) {
		throw new Error(`ESLint dead-code detector returned invalid JSON for ${files.length} source files: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
	}
}

/**
 * Reports unused private declarations, classifying only proven-safe removals as autofixable.
 *
 * @param cfg
 * @param reports
 *
 * @return
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
				severity: autofixable ? 'error' : 'warning',
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
	qualityHeader(`command:${name}`, `Running ${check.command} ${(check.args ?? []).join(' ')}`.trim());
	const status = run(cfg, check.command, check.args ?? []);
	if (status) process.exitCode = status;
	console.error(`  ${status ? '✗ failed' : '✓ passed'}`);
}

/**
 * Runs every enabled configured quality command once.
 *
 * @param cfg Quality configuration containing repository commands.
 *
 * @return Nothing; command failures are reflected in the process exit code.
 */
function runCfgdCmds(cfg: QualityCfg): void {
	for (const check of cfg.qualityCommands ?? []) if (qualityCmdEnabled(cfg, check.name)) runCfgdCmd(cfg, check.name);
}

/**
 * Runs configured advisory checks after Knip without turning recommendations into failures.
 *
 * @param cfg Quality configuration containing advisory commands.
 *
 * @return Nothing; advisory failures do not alter the process exit code.
 */
function runRecommendationCmds(cfg: QualityCfg): void {
	for (const check of cfg.recommendationCommands ?? []) {
		if (!qualityRecommendationEnabled(cfg, check.name)) continue;
		qualityHeader(`recommendation:${check.name}`, `Running ${check.command} ${(check.args ?? []).join(' ')}`.trim());
		const status = run(cfg, check.command, check.args ?? []);
		console.error(`  ${status ? '✗ failed (advisory)' : '✓ passed'}`);
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
		console.error(`  ${status ? '✗ failed' : '✓ passed'}`);
		return;
	}
	const result = spawnSync(cfg.typecheckCommand.command, cfg.typecheckCommand.args ?? [], { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env, maxBuffer: TOOL_OUTPUT_MAX_BUFFER });
	const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
	printChildOutput(result.stdout);
	printChildOutput(result.stderr);
	const diagnosticsReported = /\berror\s+ts\(\d+\)/u.test(output) || /-\s+[1-9]\d*\s+errors?\b/u.test(output);
	const status = result.status ?? 1;
	if (status || diagnosticsReported) process.exitCode = status || 1;
	console.error(`  ${status || diagnosticsReported ? '✗ failed' : '✓ passed'}`);
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
 * @param cfg
 *
 * @return
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
 * @param cfg
 * @param path
 * @param label
 *
 * @return
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
 *
 * @param cfg
 * @returns
 */
function collectKnipFindings(cfg: QualityCfg): DeadCodeFinding[] {
	const issues = readKnipIssues(cfg);
	const importedConsumers = importedExportConsumers(cfg);
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
				findings.push({ rule: `knip/${kind}`, file: location, line: item.line ?? 1, name: item.name, severity: autoFixable ? 'error' : 'warning', autofixable: autoFixable, reason, agentAction });
			}
		}
	}
	return findings;
}
/**
 *
 * @param cfg
 * @param file
 * @param name
 * @returns
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
 *
 * @param file
 * @returns
 */
function deadCodeScriptKind(file: string): ts.ScriptKind {
	if (/\.tsx$/i.test(file)) return ts.ScriptKind.TSX;
	if (/\.jsx$/i.test(file)) return ts.ScriptKind.JSX;
	if (/\.(?:c|m)?js$/i.test(file)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}
/**
 *
 * @param file
 * @param name
 * @returns
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
 * @param cfg
 * @param changedFiles
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
 *
 * @param cfg
 * @returns
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
		const markupUses = (name: string): boolean => Boolean(markup) && markup.includes(name);
		const referencedIdentifiers = new Set<string>();
		const namespaceProperties = new Map<string, Set<string>>();
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
 *
 * @param onBatch
 * @param original
 * @param program
 * @param proposed
 * @returns
 */
function acceptTypeSafeEdits(
	program: ts.Program,
	proposed: Map<string, string>,
	original: Map<string, string>,
	onBatch?: (checked: number, fileCount: number) => void,
): { accepted: Map<string, string>; rejected: Set<string> } {
	const rejected = new Set<string>();
	let checks = 0;
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
 *
 * @param findings
 */
function printDeadCodeFindings(findings: DeadCodeFinding[]): void {
	if (!findings.length) {
		console.error('  ✓ dead-code checks passed; no autofixable findings or manual warnings remain');
		return;
	}
	const errs = findings.filter((finding) => finding.severity === 'error');
	const warnings = findings.filter((finding) => finding.severity === 'warning');
	for (const finding of findings) {
		console.error(`  - [${finding.severity.toUpperCase()}] ${finding.rule}: ${finding.file}:${finding.line} ${finding.name}`);
		console.error(`      Reason: ${finding.reason}`);
		console.error(`      Autofix: ${finding.autofixable ? 'available' : 'not safe or not supported'}`);
		console.error(`      Agent action: ${finding.agentAction}`);
	}
	console.error(`  ${errs.length} error${errs.length === 1 ? '' : 's'}; ${warnings.length} manual warning${warnings.length === 1 ? '' : 's'}.`);
	if (errs.length) process.exitCode = 1;
}

/**
 * Runs every dead-code detector through one fix-and-verify boundary.
 *
 * @param cfg
 * @param fix
 * @param all
 * @param verify
 * @param emit
 *
 * @return
 */
function runDeadCode(cfg: QualityCfg, fix: boolean, all: boolean, verify = true, emit = true): DeadCodeFinding[] {
	if (emit) qualityHeader('dead-code', `${fix ? 'Fixing safe cases and checking' : 'Read-only check of'} unused files, exports, declarations, and single-use code`);
	const changedFiles = new Set<string>();
	const srcSnapshot = fix ? new Map(filesFor(cfg, true).map((f) => [f, readFileSync(f, 'utf8')])) : new Map<string, string>();
	const initialInventory = fix ? new Set(srcSnapshot.keys()) : new Set<string>();
	if (fix && emit) console.error(`  Preparing TypeScript baseline for ${srcSnapshot.size} configured source files...`);
	const typeProgram = fix ? deadCodeTypeProgram(cfg) : null;
	if (fix && emit) console.error('  TypeScript baseline ready.');
	const typeRejectedFiles = new Set<string>();
	let eslintReports: EslintReport[] = [];
	if (fix) {
		if (qualityCheckEnabled(cfg, 'knip')) {
			if (emit) qualityHeader('dead-code/knip-fix', 'Removing only unambiguous unused export modifiers');
			fixKnipExports(cfg, changedFiles);
		}
		if (qualityCheckEnabled(cfg, 'lint')) {
			for (let round = 0; round < 5; round++) {
				if (emit) console.error(`  ESLint unused-declaration pass ${round + 1}/5...`);
				eslintReports = collectEslintReports(cfg, all);
				if (!fixUnusedDeclarations(cfg, eslintReports, changedFiles)) break;
			}
		}
		if (emit) console.error('  Checking and inlining safe single-use declarations...');
		fixSingleUseDeclarations(cfg, changedFiles, (pass, filesChanged) => {
			if (emit) console.error(`  Single-use rewrite pass ${pass} starting (${filesChanged} source files changed so far).`);
		});
		const currInventory = new Set(filesFor(cfg, true));
		const skippedInventory = new Set(cfg.skippedFiles ?? []);
		const trackedInitialInventory = [...initialInventory].filter((f) => !skippedInventory.has(f));
		const trackedCurrInventory = [...currInventory].filter((f) => !skippedInventory.has(f));
		if (trackedCurrInventory.length !== trackedInitialInventory.length || trackedInitialInventory.some((f) => !currInventory.has(f)))
			throw new Error('Dead-code autofix changed the configured source inventory; file creation or deletion is not an automatic dead-code fix.');
		const proposed = new Map<string, string>();
		for (const file of changedFiles) {
			const original = srcSnapshot.get(file);
			if (original === undefined || !existsSync(file)) throw new Error(`Dead-code autofix changed source inventory unexpectedly: ${relative(cfg.root, file)}`);
			const curr = readFileSync(file, 'utf8');
			if (curr !== original) proposed.set(file, curr);
		}
		if (proposed.size) {
			if (!typeProgram) throw new Error('Dead-code edit validation requires its baseline TypeScript program.');
			if (emit) console.error(`  Validating ${proposed.size} changed files against TypeScript diagnostics...`);
			const { accepted, rejected } = acceptTypeSafeEdits(typeProgram, proposed, srcSnapshot, (checked, count) => {
				if (emit) console.error(`  TypeScript safety check ${checked} (${count} candidate files).`);
			});
			for (const file of rejected) {
				const original = srcSnapshot.get(file);
				if (original !== undefined) writeFileSync(file, original);
				typeRejectedFiles.add(relative(cfg.root, file));
				changedFiles.delete(file);
			}
			for (const [file, text] of accepted) if (readFileSync(file, 'utf8') !== text) writeFileSync(file, text);
		}
	}
	if (!verify) return [];
	const findings: DeadCodeFinding[] = [];
	if (qualityCheckEnabled(cfg, 'knip')) {
		if (emit) qualityHeader('dead-code/knip', 'Checking unused files, exports, dependencies, and reachability');
		findings.push(...collectKnipFindings(cfg));
	}
	if (qualityCheckEnabled(cfg, 'lint')) eslintReports = collectEslintReports(cfg, all);
	if (qualityCheckEnabled(cfg, 'lint')) findings.push(...unusedDeclarationFindings(cfg, eslintReports));
	for (const single of singleUseFindings(cfg))
		findings.push({
			rule: 'typescript/single-use',
			file: single.file,
			line: single.line,
			name: single.name,
			severity: single.autofixable ? 'error' : 'warning',
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
			severity: 'warning',
			autofixable: false,
			reason: finding.reason,
			agentAction:
				'Attach this TSDoc to the declaration it describes when that relationship is clear; otherwise remove only this detached block. Preserve meaningful constraints and do not move it across unrelated code.',
		});
	const finalFindings = findings.map((finding) =>
		typeRejectedFiles.has(finding.file) && finding.autofixable
			? {
					...finding,
					severity: 'warning' as const,
					autofixable: false,
					reason: `The proposed rewrite in this file introduced TypeScript diagnostics and was rolled back: ${finding.reason}`,
					agentAction: 'Inspect the exact declaration and proposed rewrite, preserve semantics and types, then apply a source-level fix or leave this case manual.',
				}
			: finding,
	);
	if (emit) printDeadCodeFindings(finalFindings);
	return finalFindings;
}

/**
 * Runs the canonical fixer in a temporary source copy so --warn can distinguish
 * fixes it can land from candidates rejected by the TypeScript safety gate.
 *
 * @param cfg Quality configuration for the user's untouched source tree.
 * @param all Whether every configured source file should be inspected.
 *
 * @return Nothing; remaining automatic fixes set a failing process status.
 */
function runDeadCodeReadOnly(cfg: QualityCfg, all: boolean): void {
	const customToolPath = [cfg.tools?.knip, cfg.tools?.eslint].some((tool) => tool && (isAbsolute(tool) || tool.includes('/') || tool.includes('\\')));
	if (customToolPath) {
		runDeadCode(cfg, false, all);
		return;
	}
	const tempRoot = realpathSync(mkdtempSync(join(tmpdir(), 'terra-quality-dead-code-preview-')));
	try {
		const sharedRoot = resolve(cfg.root, 'shared');
		const roots = [...new Set([...cfg.sourceRoots, ...(cfg.includeRoots ?? []), ...(existsSync(sharedRoot) ? [sharedRoot] : [])])].sort((left, right) => left.length - right.length);
		const copiedRoots: string[] = [];
		for (const sourceRoot of roots) {
			const relativeRoot = relative(cfg.root, sourceRoot);
			if (relativeRoot === '..' || relativeRoot.startsWith(`..${sep}`) || isAbsolute(relativeRoot))
				throw new Error(`Cannot create a read-only dead-code preview for an external source root: ${sourceRoot}`);
			if (copiedRoots.some((parent) => relativeRoot === parent || relativeRoot.startsWith(`${parent}${sep}`))) continue;
			const destination = resolve(tempRoot, relativeRoot);
			mkdirSync(dirname(destination), { recursive: true });
			if (existsSync(sourceRoot)) cpSync(sourceRoot, destination, { recursive: true, verbatimSymlinks: true });
			else mkdirSync(destination, { recursive: true });
			copiedRoots.push(relativeRoot);
		}
		for (const file of [
			'.prettierrc.mjs',
			'package.json',
			'pnpm-lock.yaml',
			'pnpm-workspace.yaml',
			'quality.json',
			'knip.json',
			'eslint.config.js',
			'eslint.config.mjs',
			'eslint.config.cjs',
			'eslint.config.ts',
			'eslint.config.mts',
			'eslint.config.cts',
			'tailwind.config.mjs',
			'tailwind.preset.ts',
			'postcss.config.mjs',
			'tsconfig.json',
			'tsconfig.eslint.json',
			'astro/package.json',
			'astro/astro.config.mjs',
			'astro/tsconfig.json',
			'astro/env.d.ts',
			'playwright.config.ts',
		]) {
			const src = resolve(cfg.root, file);
			if (!existsSync(src)) continue;
			const destination = resolve(tempRoot, file);
			mkdirSync(dirname(destination), { recursive: true });
			copyFileSync(src, destination);
		}
		const srcRoots = [...new Set([...cfg.sourceRoots, ...(cfg.includeRoots ?? [])])];
		for (const sourceRoot of srcRoots) {
			for (let dir = sourceRoot; dir === cfg.root || dir.startsWith(`${cfg.root}${sep}`); dir = dirname(dir)) {
				const srcModules = resolve(dir, 'node_modules');
				if (existsSync(srcModules)) {
					const relativeDir = relative(cfg.root, dir);
					const shadowDir = resolve(tempRoot, relativeDir);
					mkdirSync(shadowDir, { recursive: true });
					const link = resolve(shadowDir, 'node_modules');
					if (!existsSync(link)) symlinkSync(srcModules, link, process.platform === 'win32' ? 'junction' : 'dir');
				}
				if (dir === cfg.root) break;
			}
		}
		const shadowCfg = createQualityCfg({
			...cfg,
			root: tempRoot,
			sourceRoots: cfg.sourceRoots.map((path) => relative(cfg.root, path)),
			includeRoots: (cfg.includeRoots ?? []).map((path) => relative(cfg.root, path)),
			singleUse: { skippedDirectories: (cfg.singleUse?.skippedDirectories ?? []).map((path) => relative(cfg.root, path)) },
			skippedFiles: (cfg.skippedFiles ?? []).map((path) => relative(cfg.root, path)),
			lintRoots: (cfg.lintRoots ?? []).map((path) => relative(cfg.root, path)),
			typecheckRoots: (cfg.typecheckRoots ?? []).map((path) => relative(cfg.root, path)),
		});
		process.exitCode = 0;
		const before = runDeadCode(shadowCfg, false, all, true, false);
		const after = runDeadCode(shadowCfg, true, all, true, false);
		const remaining = new Set(after.map((finding) => `${finding.rule}\0${finding.file}\0${finding.name}`));
		const unapplied = before.filter((finding) => finding.severity === 'error' && !remaining.has(`${finding.rule}\0${finding.file}\0${finding.name}`));
		qualityHeader('dead-code', 'Read-only check of unused files, exports, declarations, and single-use code (safe-fix preview runs in a temporary copy)');
		printDeadCodeFindings([...unapplied, ...after]);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
}
/**
 *
 * @param all
 * @param cfg
 * @param fix
 */
function runDeadCodeCmd(cfg: QualityCfg, fix: boolean, all: boolean): void {
	if (fix) runDeadCode(cfg, true, all);
	else runDeadCodeReadOnly(cfg, all);
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
	console.error(`  ${status ? '✗ failed' : '✓ passed'}`);
}

/**
 * Prints a grouped set of findings with one normalized line per issue.
 *
 * @param findings Findings produced by one quality stage.
 * @param fmt Converts one finding into a human-readable message.
 *
 * @return Nothing; findings and a clean summary are written to the console.
 */
function printFindings<T>(findings: readonly T[], fmt: (finding: T) => string): void {
	if (!findings.length) {
		console.error('  ✓ clean');
		return;
	}
	console.warn(`  ${findings.length} finding${findings.length === 1 ? '' : 's'}:`);
	for (const finding of findings) console.warn(`  - ${compactOutput(fmt(finding)).join(' ')}`);
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
	const checks = [
		['security', cfg.security ? securityFindings(cfg) : []],
		['repeated-classes', cfg.repeatedClasses ? repeatedClassFindings(cfg, analysis) : []],
		['regex-dedup', cfg.regexDedup ? regexFindings(cfg, analysis) : []],
		['ui-patterns', cfg.uiPatterns ? uiPatternFindings(cfg, analysis) : []],
	] as const;
	for (const [name, findings] of checks) {
		qualityHeader(name, `Checking ${name.replace(G_REGEX(), ' ')}`);
		printFindings(
			findings as readonly GenericFinding[],
			(f) =>
				`${'file' in f ? `${f.file}: ` : ''}${'message' in f ? f.message : 'value' in f ? `${f.count}x ${f.value} (${f.locations.join(', ')})` : 'source' in f ? `${f.count}x ${f.source} (${f.locations.join(', ')})` : f.pattern}`,
		);
		if (findings.length && (name === 'security' || name === 'ui-patterns')) process.exitCode = 1;
	}
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
	const isIntrinsicJsxTag = (n: ts.Identifier): boolean => {
		return (ts.isJsxOpeningLikeElement(n.parent) || ts.isJsxClosingElement(n.parent)) && n.parent.tagName === n && n.text.length > 0 && n.text[0] === n.text[0]!.toLowerCase();
	};
	const canonical = (symbol: ts.Symbol | undefined): ts.Symbol | undefined => (symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
	const identifierSymbol = (n: ts.Identifier): ts.Symbol | undefined =>
		canonical(ts.isShorthandPropertyAssignment(n.parent) ? (checker.getShorthandAssignmentValueSymbol(n.parent) ?? checker.getSymbolAtLocation(n)) : checker.getSymbolAtLocation(n));
	const isPropertyName = (n: ts.Identifier): boolean =>
		(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
		(ts.isQualifiedName(n.parent) && n.parent.right === n) ||
		((ts.isPropertyAssignment(n.parent) || ts.isMethodDeclaration(n.parent) || ts.isMethodSignature(n.parent)) && n.parent.name === n);
	const hasInitShadow = (n: ts.Identifier): boolean => {
		if (!ts.isVariableDeclaration(n.parent) || !n.parent.initializer) return false;
		const tgt = checker.getSymbolAtLocation(n);
		let found = false;
		const visit = (child: ts.Node): void => {
			if (found || child === n) return;
			if (ts.isIdentifier(child) && !isPropertyName(child) && child.text === n.text && checker.getSymbolAtLocation(child) === tgt) found = true;
			ts.forEachChild(child, visit);
		};
		visit(n.parent.initializer);
		return found;
	};
	const hasInitReferenceToOtherSymbol = (n: ts.Identifier): boolean => {
		if (!ts.isVariableDeclaration(n.parent) || !n.parent.initializer) return false;
		const tgt = checker.getSymbolAtLocation(n);
		let found = false;
		const visit = (child: ts.Node): void => {
			if (found || child === n) return;
			if (ts.isIdentifier(child) && !isPropertyName(child) && child.text === n.text && checker.getSymbolAtLocation(child) !== tgt) found = true;
			ts.forEachChild(child, visit);
		};
		visit(n.parent.initializer);
		return found;
	};
	const hasInitRenameCollision = (n: ts.Identifier, suggestion: string): boolean => {
		if (!ts.isVariableDeclaration(n.parent) || !n.parent.initializer) return false;
		let found = false;
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
	const hasInitConsumerCollision = (n: ts.Identifier, suggestion: string): boolean => {
		const tgt = checker.getSymbolAtLocation(n);
		if (!tgt) return false;
		const src = n.getSourceFile();
		if (!allowed.has(src.fileName)) return false;
		{
			let found = false;
			const visit = (n: ts.Node): void => {
				if (found) return;
				if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === suggestion && n.initializer) {
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
 * @param strict Whether naming errors should contribute to failure status.
 * @param all Whether to inspect every configured file instead of changed files.
 * @param analysis Optional analysis context for the selected source scope.
 *
 * @return Findings grouped by import, naming, alias, forwarding, and documentation checks.
 */
export function runQuality(
	cfg: QualityCfg,
	strict = false,
	all = true,
	analysis?: QualityAnalysis,
): {
	imports: ReturnType<typeof checkImports>;
	naming: ReturnType<typeof namingFindings>;
	aliases: ReturnType<typeof aliasFindings>;
	forwarding: ReturnType<typeof objectForwardingFindings>;
	documentation: ReturnType<typeof documentationFindings>;
} {
	const scoped = scopedCfg(cfg, all);
	const ctx = analysis ?? createQualityAnalysis(scoped);
	const result = {
		imports: qualityCheckEnabled(cfg, 'import') ? checkImports(scoped) : [],
		naming: qualityCheckEnabled(cfg, 'name') ? namingFindings(scoped, ctx) : [],
		aliases: qualityCheckEnabled(cfg, 'alias') ? aliasFindings(scoped, ctx) : [],
		forwarding: qualityCheckEnabled(cfg, 'forward') ? objectForwardingFindings(scoped, ctx) : [],
		documentation: qualityCheckEnabled(cfg, 'document') ? documentationFindings(scoped, ctx) : [],
	};
	const duplicateImports = qualityCheckEnabled(cfg, 'import') ? duplicateImportFindings(ctx.files) : [];
	if (qualityCheckEnabled(cfg, 'import')) {
		qualityHeader('imports', 'Checking local import resolution');
		printFindings(result.imports, (f) => `Unresolved import: ${f.importer} -> ${f.specifier}`);
		printFindings(duplicateImports, (f) => `Duplicate named import: ${f.file}:${f.line} repeats an import from ${f.module}`);
	}
	if (qualityCheckEnabled(cfg, 'name')) {
		qualityHeader('naming', 'Checking concise, consistent symbol names');
		printFindings(result.naming, (f) => `${f.severity === 'error' ? 'Naming drift' : 'Naming suggestion'}: ${f.file}: ${f.name} -> ${f.suggestion}`);
	}
	if (qualityCheckEnabled(cfg, 'alias')) {
		qualityHeader('aliases', 'Checking for unnecessary compatibility aliases');
		printFindings(result.aliases, (f) => `Alias: ${f.file}:${f.line} ${f.kind} ${f.name} -> ${f.replacement}`);
	}
	if (qualityCheckEnabled(cfg, 'forward')) {
		qualityHeader('forwarding', 'Checking object-forwarding opportunities');
		printFindings(result.forwarding, (f) => `Forwarding suggestion: ${f.file}:${f.line}:${f.column} ${f.callee} repeats ${f.source}.${f.properties.join(', ')}; ${f.recommendation}.`);
	}
	if (qualityCheckEnabled(cfg, 'document')) {
		qualityHeader('documentation', 'Checking meaningful file, function, and parameter documentation');
		if (result.documentation.length) console.warn(`  note: ${DOCUMENTATION_DESCRIPTION_NOTICE}`);
		printFindings(result.documentation, (f) => `${f.severity === 'warning' ? 'Documentation warning' : 'Documentation requirement'}: ${f.file}:${f.line}:${f.column} ${f.name}; ${f.reason}.`);
	}
	if (
		result.imports.length ||
		duplicateImports.length ||
		result.aliases.length ||
		result.documentation.some((f) => f.severity === 'error') ||
		(strict && result.naming.some((f) => f.severity === 'error'))
	)
		process.exitCode = 1;
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
 * @return Nothing; command failures are reflected in the process exit code.
 */
export function runQualityCli(cfg: QualityCfg, args = process.argv.slice(2)): void {
	validCliArgs(args);
	if (args.includes('--version') || args.includes('-v')) {
		const pkg = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf8')) as { version: string };
		console.info(pkg.version);
		return;
	}
	if (args.includes('--help') || args.includes('-h')) {
		console.info('Usage: terra-quality <command> [options]');
		console.info('Commands include quality, document, format, lint, knip, types, single-use, dead-code, security, and domain.');
		console.info('Options: --all, --warn, --strict, --skip-commands, --skip-recommendations.');
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
	const fix = (check: QualityAutofixName): boolean => qualityAutofixEnabled(cfg, check, opts.fix);
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
	if (cmd === 'security' || cmd === 'repeated-classes' || cmd === 'regex-dedup' || cmd === 'ui-patterns') {
		if (cmd === 'repeated-classes' && fix('repeatedClasses')) {
			const result = fixRepeatedClasses(cfg);
			console.info(`  fixed ${result.fixed} class attributes${result.skipped ? `; ${result.skipped} left advisory` : ''}`);
		}
		if (cmd === 'regex-dedup' && fix('regexDedup')) {
			const result = fixRegexDedup(cfg);
			console.info(`  fixed ${result.fixed} regex literals${result.skipped ? `; ${result.skipped} left advisory` : ''}`);
		}
		if (cmd === 'security' || cmd === 'ui-patterns') {
			const findings = cmd === 'security' ? securityFindings(cfg) : uiPatternFindings(cfg);
			qualityHeader(cmd, `Checking ${cmd.replace(G_REGEX(), ' ')}`);
			printFindings(
				findings as readonly GenericFinding[],
				(f) =>
					`${'file' in f ? `${f.file}: ` : ''}${'message' in f ? f.message : 'value' in f ? `${f.count}x ${f.value} (${f.locations.join(', ')})` : 'source' in f ? `${f.count}x ${f.source} (${f.locations.join(', ')})` : f.pattern}`,
			);
			if (findings.length) process.exitCode = 1;
			return;
		}
		const findings = cmd === 'repeated-classes' ? repeatedClassFindings(cfg) : regexFindings(cfg);
		qualityHeader(cmd, `Checking ${cmd.replace(G_REGEX(), ' ')}`);
		printFindings(
			findings as readonly GenericFinding[],
			(f) =>
				`${'file' in f ? `${f.file}: ` : ''}${'message' in f ? f.message : 'value' in f ? `${f.count}x ${f.value} (${f.locations.join(', ')})` : 'source' in f ? `${f.count}x ${f.source} (${f.locations.join(', ')})` : f.pattern}`,
		);
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
	if (cmd === 'quality' || cmd === 'quality:all' || cmd === 'quality:baseline') {
		if (opts.fix && qualityCheckEnabled(cfg, 'alias')) aliasFindings(cfg, true);
		if (fix('name') && qualityCheckEnabled(cfg, 'name')) {
			const namingScope = scopedCfg(cfg, opts.all);
			if (namingFindings(namingScope).length) fixNames(cfg, opts.all);
		}
		const scoped = scopedCfg(cfg, opts.all);
		if (fix('forward') && qualityCheckEnabled(cfg, 'forward')) {
			const result = fixObjectForwarding(scoped);
			if (result.fixed || result.skipped) console.info(`Forwarding fixer: ${result.fixed} exact duplicates removed${result.skipped ? `; ${result.skipped} advisory cases retained` : ''}.`);
		}
		if (fix('repeatedClasses') && qualityCheckEnabled(cfg, 'repeated-classes')) {
			const result = fixRepeatedClasses(scoped);
			if (result.fixed || result.skipped) console.info(`Class fixer: ${result.fixed} attributes replaced${result.skipped ? `; ${result.skipped} advisory cases retained` : ''}.`);
		}
		if (fix('regexDedup') && qualityCheckEnabled(cfg, 'regex-dedup')) {
			const result = fixRegexDedup(scoped);
			if (result.fixed || result.skipped) console.info(`Regex fixer: ${result.fixed} literals replaced${result.skipped ? `; ${result.skipped} advisory cases retained` : ''}.`);
		}
		if (fix('lint') && qualityCheckEnabled(cfg, 'lint')) runLint(cfg, { ...opts, fix: true }, true, true);
		if (qualityCheckEnabled(cfg, 'document')) {
			const documentationIssues = documentationFindings(scopedCfg(cfg, opts.all)).filter((f) => f.severity === 'error');
			if (documentationIssues.length) runDocumentation(cfg, opts, ['document', ...new Set(documentationIssues.map((f) => resolve(cfg.root, f.file))), '--quiet'], true);
		}
		if (fix('format') && qualityCheckEnabled(cfg, 'format')) runFormatter(cfg, { ...opts, fix: true }, opts.all ? [] : filesFor(cfg, false));
		if (opts.fix && qualityCheckEnabled(cfg, 'alias')) aliasFindings(scoped, true);
		if (qualityCheckEnabled(cfg, 'dead-code')) runDeadCodeCmd(cfg, qualityAutofixEnabled(cfg, 'dead-code', opts.fix), opts.all);
		if (qualityCheckEnabled(cfg, 'lint')) runLint(cfg, { ...opts, fix: false }, true, true);
		const analysis = createQualityAnalysis(scoped);
		runGenericChecks(scoped, analysis);
		if (qualityCheckEnabled(cfg, 'type') && cfg.tools?.tsc) {
			runTypecheck(cfg);
			if (cfg.typecheckExtensions?.length && !cfg.typecheckRoots?.length) runProjectTypecheck(cfg);
		}
		if (!opts.skipCommands) runCfgdCmds(cfg);
		if (!opts.skipRecommendations) runRecommendationCmds(cfg);
		if (opts.fix && qualityCheckEnabled(cfg, 'import') && qualityAutofixEnabled(cfg, 'document', opts.fix)) {
			const repeated = duplicateImportFindings(filesFor(cfg, opts.all));
			for (const file of new Set(repeated.map((finding) => finding.file))) maintainSrcFile(cfg.root, file);
		}
		runQuality(cfg, opts.strict, opts.all, analysis);
		if (qualityCheckEnabled(cfg, 'diff')) runDiffCheck(cfg);
		if (opts.fix && qualityCheckEnabled(cfg, 'diff')) runDiffCheck(cfg);
	}
}

/**
 * Loads the repository configuration and runs the CLI in one boundary call.
 *
 * @param file Optional path to the quality configuration file.
 * @param args CLI arguments passed to the dispatcher.
 *
 * @return Nothing; command failures are reflected in the process exit code.
 */
export function runQualityFromCfg(file?: string, args = process.argv.slice(2)): void {
	validCliArgs(args);
	if (args.some((arg) => ['--version', '-v', '--help', '-h'].includes(arg))) {
		runQualityCli({} as QualityCfg, args);
		return;
	}
	runQualityCli(loadQualityCfg(file), args);
}

/**
 * Reject unknown commands and flags before loading configuration or invoking a fixer.
 *
 * @param args
 */
function validCliArgs(args: string[]): void {
	const cmd = args.find((arg) => !arg.startsWith('-')) ?? 'quality';
	const unknownFlags = args.filter((arg) => arg.startsWith('-') && !CLI_FLAGS.has(arg));
	if (!CLI_CMDS.has(cmd) || unknownFlags.length) throw new Error(`Unknown quality CLI arguments: ${[...(!CLI_CMDS.has(cmd) ? [cmd] : []), ...unknownFlags].join(', ')}`);
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
	for (const tgtBatch of batches(tgts)) {
		const status = run(cfg, toolPath(cfg, cfg.tools?.prettier, 'prettier'), [...flags, ...tgtBatch], { quietSuccess: opts.fix });
		completed += tgtBatch.length;
		qualityProgress('Prettier', completed, tgts.length);
		if (status) {
			failed = true;
			process.exitCode = status;
		}
	}
	if (before) console.error(`  fixed ${changedFileCount(cfg, tgts, before)} files`);
	console.error(`  ${failed ? '✗ failed' : '✓ passed'}`);
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
	printChildOutput(result.stdout);
	printChildOutput(result.stderr);
	if (result.status) process.exitCode = result.status ?? 1;
	console.error(`  ${result.status ? '✗ failed' : '✓ passed'}`);
}
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) runQualityFromCfg();
