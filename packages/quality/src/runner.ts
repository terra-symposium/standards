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
import { checkImports } from './imports.js';
import { collapseInlineIfs } from './inline-if.js';
import { collapseTypesAndObjects } from './collapse.js';
import { dirname, relative, resolve, sep } from 'node:path';
import { documentSrcFile, documentationFindings, maintainSrcFile, protectLongImports, removeNonCodeComments } from './documentation.js';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixObjectForwarding, objectForwardingFindings } from './object-forwarding.js';
import { fixRegexDedup, fixRepeatedClasses, regexFindings, repeatedClassFindings, uiPatternFindings } from './patterns.js';
import { fixSingleUseDeclarations, singleUseFindings } from './single-use.js';
import { securityFindings } from './security.js';
import { spawnSync } from 'node:child_process';
import { srcFiles, workingSrcFiles } from './files.js';

// DATA
import { DOCUMENTATION_DESCRIPTION_NOTICE } from './documentation.js';
import { PROTECTED_IDENTIFIERS } from './naming.js';

// TYPES
import type { DocumentationRequirements } from './documentation.js';
/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/
const CJS_JS_JSX_MJS_TS_TSX_REGEX = /\.(?:cjs|js|jsx|mjs|ts|tsx)$/;
const G_REGEX = () => /-/g;
const G_CLASS_2 = () => /[.*+?^${}()|[\]\\]/g;
const C_M_JS_TS_REGEX = /\.(?:c|m)?(?:js|ts)$/;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const C_M_JS_TS_X_REGEX = /\.(?:c|m)?(?:js|ts)x?$/;
const C_M_JS_TS_X_CLASS_2 = /\.(?:(?:c|m)?(?:js|ts)x?)$/;
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
export type QualityAutofixName = 'document' | 'format' | 'name' | 'lint' | 'knip' | 'alias' | 'forward' | 'repeatedClasses' | 'regexDedup';
export type QualityCfg = {
	root: string;
	sourceRoots: string[];
	includeRoots?: string[];
	extensions: string[];
	aliases?: Record<string, string>;
	externalPrefixes?: string[];
	skippedDirectories?: string[];
	skippedFiles?: string[];
	singleUse?: { skippedDirectories?: string[] };
	protectedIdentifiers?: string[];
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
	regexDedup?: { extensions?: string[]; ignoredFiles?: string[]; minimumCount?: number };
	uiPatterns?: { forbidden?: string[]; ignoredFiles?: string[]; extensions?: string[] };
	tsconfig?: string;
	oneLineImports?: boolean;
	prettierPrintWidth?: number;
	lintRoots?: string[];
	typecheckRoots?: string[];
	typecheckExtensions?: string[];
	typecheckCommand?: { command: string; args?: string[] };
	tools?: { prettier?: string; tsc?: string; eslint?: string; knip?: string };
};
export type QualityAnalysis = { files: string[]; texts: Map<string, string>; sources: Map<string, ts.SourceFile>; program: ts.Program; checker: ts.TypeChecker };
export type QualityOptions = { fix: boolean; all: boolean; strict: boolean; skipCommands?: boolean; skipRecommendations?: boolean };
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
		skippedFiles: (cfg.skippedFiles ?? []).map((p) => resolve(cfg.root, p)),
		singleUse: { ...cfg.singleUse, skippedDirectories: (cfg.singleUse?.skippedDirectories ?? []).map((p) => resolve(cfg.root, p)) },
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
 * Renders compact progress for a file-processing quality section.
 *
 * @param label Section operation being performed.
 * @param curr Number of files completed.
 * @param total Number of files in the section.
 *
 * @return Nothing; progress is written to standard error.
 */
function qualityProgress(label: string, curr: number, total: number): void {
	const completed = Math.min(Math.max(curr, 0), total);
	const width = 24;
	const filled = total ? Math.round((completed / total) * width) : width;
	const line = `  ${label} [${'='.repeat(filled)}${' '.repeat(width - filled)}] ${completed}/${total}`;
	if (process.stderr.isTTY) {
		process.stderr.write(`\r${line}`);
		if (completed >= total) process.stderr.write('\n');
		return;
	}
	console.error(line);
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
		.split(/\r?\n/)
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
 *
 * @return Child-process exit status, or `1` when spawning fails without a status.
 */
function run(cfg: QualityCfg, cmd: string, args: string[], opts: { quietSuccess?: boolean } = {}): number {
	const result = spawnSync(cmd, args, { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
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
 *
 * @return Nothing; failures are reflected in the process exit code.
 */
function runLint(cfg: QualityCfg, opts: QualityOptions, exhaustive = false): void {
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
		...(exhaustive ? ['--max-warnings=0'] : []),
		...(opts.fix ? ['--fix'] : []),
	];
	let failed = false;
	const before = opts.fix ? snapshotFiles(cfg, files) : undefined;
	let completed = 0;
	qualityProgress('ESLint', completed, files.length);
	for (const filesBatch of batches(files)) {
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
 * @param all Whether every configured source file should be inspected.
 *
 * @return Number of unused function declarations removed.
 */
function fixUnusedFns(cfg: QualityCfg, all: boolean): number {
	const files = filesFor(cfg, all).filter((f) => CJS_JS_JSX_MJS_TS_TSX_REGEX.test(f));
	let fixed = 0;
	for (const filesBatch of batches(files)) {
		const result = spawnSync(
			toolPath(cfg, cfg.tools?.eslint, 'eslint'),
			['--cache', '--cache-strategy', 'content', '--cache-location', 'node_modules/.cache/eslint', '--format', 'json', '--no-warn-ignored', ...filesBatch],
			{ cwd: cfg.root, encoding: 'utf8', env: process.env },
		);
		let reports: Array<{ filePath: string; messages: Array<{ ruleId?: string; line: number; column: number }> }> = [];
		try {
			reports = JSON.parse(result.stdout || '[]') as typeof reports;
		} catch {
			continue;
		}
		for (const report of reports) {
			const src = readFileSync(report.filePath, 'utf8');
			const ast = ts.createSourceFile(
				report.filePath,
				src,
				ts.ScriptTarget.Latest,
				true,
				C_M_JS_TS_X_CLASS_2.test(report.filePath) && report.filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
			);
			const starts = new Set(report.messages.filter((m) => m.ruleId === 'unused-imports/no-unused-vars').map((m) => ast.getPositionOfLineAndCharacter(m.line - 1, m.column - 1)));
			const edits: Array<{ start: number; end: number }> = [];
			const visit = (node: ts.Node): void => {
				if (ts.isFunctionDeclaration(node) && node.name && starts.has(node.name.getStart(ast)) && !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
					let start = node.getStart(ast);
					const comments = ts.getLeadingCommentRanges(src, node.getFullStart()) ?? [];
					const attached = comments.at(-1);
					if (attached?.kind === ts.SyntaxKind.MultiLineCommentTrivia && src.slice(attached.end, start).trim() === '' && src.slice(attached.pos, attached.pos + 3) === '/**') start = attached.pos;
					let end = node.end;
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
			fixed += edits.length;
		}
	}
	return fixed;
}

type UnusedFnFinding = { file: string; line: number; name: string };

/** Reports private function declarations that ESLint proves have no references. */
function unusedFnFindings(cfg: QualityCfg, all: boolean): UnusedFnFinding[] {
	const files = filesFor(cfg, all).filter((f) => CJS_JS_JSX_MJS_TS_TSX_REGEX.test(f));
	const findings: UnusedFnFinding[] = [];
	for (const filesBatch of batches(files)) {
		const result = spawnSync(toolPath(cfg, cfg.tools?.eslint, 'eslint'), ['--format', 'json', '--no-warn-ignored', ...filesBatch], { cwd: cfg.root, encoding: 'utf8', env: process.env });
		let reports: Array<{ filePath: string; messages: Array<{ ruleId?: string; line: number; column: number }> }> = [];
		try {
			reports = JSON.parse(result.stdout || '[]') as typeof reports;
		} catch {
			continue;
		}
		for (const report of reports) {
			const src = readFileSync(report.filePath, 'utf8');
			const ast = ts.createSourceFile(
				report.filePath,
				src,
				ts.ScriptTarget.Latest,
				true,
				C_M_JS_TS_X_CLASS_2.test(report.filePath) && report.filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
			);
			const starts = new Set(report.messages.filter((m) => m.ruleId === 'unused-imports/no-unused-vars').map((m) => ast.getPositionOfLineAndCharacter(m.line - 1, m.column - 1)));
			const visit = (node: ts.Node): void => {
				if (ts.isFunctionDeclaration(node) && node.name && starts.has(node.name.getStart(ast)) && !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
					const line = ast.getLineAndCharacterOfPosition(node.name.getStart(ast)).line + 1;
					findings.push({ file: relative(cfg.root, report.filePath), line, name: node.name.text });
				}
				ts.forEachChild(node, visit);
			};
			visit(ast);
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
	const result = spawnSync(cfg.typecheckCommand.command, cfg.typecheckCommand.args ?? [], { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
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
 * Runs Knip with either autofix, focused warning checks, or its exhaustive default mode.
 *
 * @param cfg Quality configuration containing the Knip executable.
 * @param fix Whether Knip may apply its supported fixes.
 * @param exhaustive Whether the complete Knip check should determine failure status.
 *
 * @return Nothing; Knip failures are reflected in the process exit code.
 */
function runKnip(cfg: QualityCfg, fix: boolean, exhaustive = false): void {
	qualityHeader('knip', `${fix ? 'Fixing and checking' : 'Checking'} unused files, exports, dependencies, and reachability`);
	const knip = toolPath(cfg, cfg.tools?.knip, 'knip');
	if (fix) run(cfg, knip, ['--fix', '--allow-remove-files', '--no-exit-code', '--no-config-hints'], { quietSuccess: true });
	const status = run(cfg, knip, exhaustive ? ['--no-config-hints'] : ['--include', 'unresolved,nsExports,nsTypes,cycles', '--no-exit-code', '--no-config-hints']);
	if (status) process.exitCode = status;
	console.error(`  ${status ? '✗ failed' : '✓ passed'}`);
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
	for (const file of filesFor(cfg, all).filter((f) => f.endsWith('.astro') && !isProtectedPath(f))) {
		const source = readFileSync(file, 'utf8');
		const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
		if (!frontmatter) continue;
		const body = frontmatter[1]!;
		const offset = frontmatter[0].indexOf(body);
		const astroCfg = { ...cfg, sourceRoots: [file] };
		const findings = namingFindings(astroCfg);
		let updated = body;
		const replacements = new Map(findings.map((f) => [f.name, f.suggestion]));
		for (const [name, suggestion] of replacements) {
			const escaped = name.replace(G_CLASS_2(), '\\$&');
			updated = updated.replace(new RegExp(`\\b${escaped}\\b`, 'g'), suggestion);
		}
		let nSrc = updated === body ? source : `${source.slice(0, offset)}${updated}${source.slice(offset + body.length)}`;
		for (const [name, suggestion] of replacements) {
			if (name === suggestion) continue;
			const escaped = name.replace(G_CLASS_2(), '\\$&');
			const callback = new RegExp(`\\.map\\(\\s*(\\(\\s*)?(\\{\\s*${escaped}\\s*\\}|${escaped})\\s*\\)?\\s*=>\\s*\\(([\\s\\S]*?)\\)\\s*\\)`, 'g');
			nSrc = nSrc.replace(callback, (m) => m.replace(new RegExp(`\\b${escaped}\\b`, 'g'), suggestion));
		}
		if (nSrc !== source) writeFileSync(file, nSrc);
	}
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
	if (qualityCheckEnabled(cfg, 'import')) {
		qualityHeader('imports', 'Checking local import resolution');
		printFindings(result.imports, (f) => `Unresolved import: ${f.importer} -> ${f.specifier}`);
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
	if (result.imports.length || result.aliases.length || result.documentation.some((f) => f.severity === 'error') || (strict && result.naming.some((f) => f.severity === 'error'))) process.exitCode = 1;
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
		qualityHeader('single-use', `${opts.fix ? 'Fixing and checking' : 'Checking'} single-use declarations`);
		if (opts.fix) fixSingleUseDeclarations(cfg);
		const findings = singleUseFindings(cfg);
		printFindings(findings, (f) => `Single-use ${f.decision}: ${f.file}:${f.line} ${f.name} — ${f.reason}`);
		return;
	}
	if (cmd === 'dead-code') {
		qualityHeader('dead-code', `${opts.fix ? 'Fixing and checking' : 'Checking'} private unused function declarations`);
		if (opts.fix) {
			let removed = 0;
			for (let round = 0; round < 5; round++) {
				const count = fixUnusedFns(cfg, opts.all);
				removed += count;
				if (!count) break;
			}
			if (removed) console.error(`  removed ${removed} private function${removed === 1 ? '' : 's'}`);
		}
		const findings = unusedFnFindings(cfg, opts.all);
		for (const finding of findings) console.error(`  - Unused function: ${finding.file}:${finding.line} ${finding.name}`);
		if (findings.length) process.exitCode = 1;
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
	if (cmd === 'knip') return qualityCheckEnabled(cfg, 'knip') ? runKnip(cfg, fix('knip')) : undefined;
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
		const inlinedFiles = new Set<string>();
		if (opts.fix) {
			const inlined = fixSingleUseDeclarations(cfg, inlinedFiles);
			if (inlined) console.info(`Single-use fixer: ${inlined} declaration${inlined === 1 ? '' : 's'} inlined.`);
			for (const file of inlinedFiles) {
				maintainSrcFile(cfg.root, file);
				removeNonCodeComments(file);
			}
		}
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
		if (qualityCheckEnabled(cfg, 'knip') && cfg.tools?.knip) runKnip(cfg, fix('knip'), true);
		if (fix('lint') && qualityCheckEnabled(cfg, 'lint')) {
			let removed = 0;
			for (let round = 0; round < 5; round++) {
				const count = fixUnusedFns(cfg, opts.all);
				removed += count;
				if (!count) break;
			}
			if (removed) console.info(`Unused declaration fixer: ${removed} function${removed === 1 ? '' : 's'} removed.`);
		}
		if (qualityCheckEnabled(cfg, 'lint')) runLint(cfg, { ...opts, fix: fix('lint') }, true);
		if (qualityCheckEnabled(cfg, 'document') && documentationFindings(scopedCfg(cfg, opts.all)).some((f) => f.severity === 'error'))
			runDocumentation(cfg, opts, ['document', ...(opts.all ? ['--all'] : []), '--quiet'], true);
		if (fix('format') && qualityCheckEnabled(cfg, 'format')) runFormatter(cfg, { ...opts, fix: true }, opts.all ? [] : filesFor(cfg, false));
		if (opts.fix && qualityCheckEnabled(cfg, 'alias')) aliasFindings(scoped, true);
		const analysis = createQualityAnalysis(scoped);
		runGenericChecks(scoped, analysis);
		if (qualityCheckEnabled(cfg, 'type') && cfg.tools?.tsc) {
			runTypecheck(cfg);
			if (cfg.typecheckExtensions?.length && !cfg.typecheckRoots?.length) runProjectTypecheck(cfg);
		}
		if (!opts.skipCommands) runCfgdCmds(cfg);
		if (!opts.skipRecommendations) runRecommendationCmds(cfg);
		runQuality(cfg, true, opts.all, analysis);
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
	runQualityCli(loadQualityCfg(file), args);
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
	const result = spawnSync(toolPath(cfg, tsc, 'tsc'), compilerArgs, { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'] });
	printChildOutput(result.stdout);
	printChildOutput(result.stderr);
	if (result.status) process.exitCode = result.status ?? 1;
	console.error(`  ${result.status ? '✗ failed' : '✓ passed'}`);
}
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) runQualityFromCfg();
