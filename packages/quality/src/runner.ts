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
import { documentSrcFile, documentationFindings, maintainSrcFile, protectLongImports } from './documentation.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixSingleUseTypes, writeSingleUseReport } from './single-use.js';
import { objectForwardingFindings } from './object-forwarding.js';
import { regexFindings, repeatedClassFindings, uiPatternFindings } from './patterns.js';
import { securityFindings } from './security.js';
import { spawnSync } from 'node:child_process';
import { srcFiles, workingSrcFiles } from './files.js';

// DATA
import { DOCUMENTATION_DESCRIPTION_NOTICE } from './documentation.js';
import { PROTECTED_IDENTIFIERS } from './naming.js';

// TYPES
import type { DocumentationRequirements } from './documentation.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type QualityCheckName = 'document' | 'format' | 'import' | 'name' | 'forward' | 'lint' | 'knip' | 'type' | 'recommend' | 'command' | 'diff' | 'alias';
export type QualityAutofixName = 'document' | 'format' | 'name' | 'lint' | 'knip' | 'alias';
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
export function qualityCommandEnabled(cfg: QualityCfg, name: string): boolean {
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
 * @return Nothing; the heading is written to standard output.
 */
function qualityHeader(name: string, detail: string): void {
	console.log(`\n=== ${name} ===`);
	console.log(detail);
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
 * @param err Whether the output came from standard error.
 *
 * @return Nothing; each non-empty output line is printed once.
 */
function printChildOutput(val: string | Buffer | null | undefined, err: boolean): void {
	if (!val) return;
	for (const line of compactOutput(val.toString())) (err ? console.error : console.log)(`  ${line}`);
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
function run(cfg: QualityCfg, cmd: string, args: string[]): number {
	const result = spawnSync(cmd, args, { cwd: cfg.root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
	printChildOutput(result.stdout, false);
	printChildOutput(result.stderr, true);
	if (result.error) console.error(`  ${cmd} failed: ${result.error.message}`);
	return result.status ?? 1;
}

/**
 * Splits a list into bounded batches for command-line tools.
 *
 * @param vals Values to divide into batches.
 * @param size Maximum number of values per batch.
 *
 * @return Ordered batches covering the input values.
 */
function batches<T>(vals: T[], size = 500): T[][] {
	return Array.from({ length: Math.ceil(vals.length / size) }, (_, idx) => vals.slice(idx * size, (idx + 1) * size));
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
	for (const filesBatch of batches(files)) {
		const status = run(cfg, toolPath(cfg, cfg.tools?.eslint, 'eslint'), [...flags, ...filesBatch]);
		if (status) {
			failed = true;
			process.exitCode = status;
		}
	}
	console.log(`  ${failed ? '✗ failed' : '✓ passed'}`);
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
	if (!qualityCommandEnabled(cfg, name)) return;
	const check = cfg.qualityCommands?.find((c) => c.name === name);
	if (!check) throw new Error(`Unknown quality domain: ${name}`);
	qualityHeader(`command:${name}`, `Running ${check.command} ${(check.args ?? []).join(' ')}`.trim());
	const status = run(cfg, check.command, check.args ?? []);
	if (status) process.exitCode = status;
	console.log(`  ${status ? '✗ failed' : '✓ passed'}`);
}

/**
 * Runs every enabled configured quality command once.
 *
 * @param cfg Quality configuration containing repository commands.
 *
 * @return Nothing; command failures are reflected in the process exit code.
 */
function runCfgdCmds(cfg: QualityCfg): void {
	for (const check of cfg.qualityCommands ?? []) if (qualityCommandEnabled(cfg, check.name)) runCfgdCmd(cfg, check.name);
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
		console.log(`  ${status ? '✗ failed (advisory)' : '✓ passed'}`);
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
	const status = cfg.typecheckCommand
		? run(cfg, cfg.typecheckCommand.command, cfg.typecheckCommand.args ?? [])
		: run(cfg, toolPath(cfg, cfg.tools?.tsc, 'tsc'), ['--noEmit', '-p', cfg.tsconfig ?? 'tsconfig.json']);
	if (status) process.exitCode = status;
	console.log(`  ${status ? '✗ failed' : '✓ passed'}`);
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
		if (!source.fileName.startsWith(`${cfg.root}${sep}`) || !/\.(?:c|m)?(?:js|ts)x?$/.test(source.fileName)) continue;
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
		if (!src.fileName.startsWith(`${cfg.root}${sep}`) || !/\.(?:c|m)?(?:js|ts)x?$/.test(src.fileName)) continue;
		const missing = new Map<string, { source: ts.SourceFile; typeOnly: boolean }>();
		const visit = (n: ts.Node): void => {
			if (
				ts.isIdentifier(n) &&
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
	qualityHeader('knip', `${fix && !exhaustive ? 'Fixing and checking' : 'Checking'} unused files, exports, dependencies, and reachability`);
	const status = run(cfg, toolPath(cfg, cfg.tools?.knip, 'knip'), [
		...(fix && !exhaustive ? ['--fix'] : exhaustive ? [] : ['--include', 'unresolved,nsExports,nsTypes,cycles']),
		...(exhaustive ? [] : ['--no-exit-code']),
	]);
	if (status) process.exitCode = status;
	console.log(`  ${status ? '✗ failed' : '✓ passed'}`);
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
	console.log(`  ${status ? '✗ failed' : '✓ passed'}`);
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
		console.log('  ✓ clean');
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
		['repeated-classes', cfg.repeatedClasses ? repeatedClassFindings(cfg) : []],
		['regex-dedup', cfg.regexDedup ? regexFindings(cfg, analysis) : []],
		['ui-patterns', cfg.uiPatterns ? uiPatternFindings(cfg) : []],
	] as const;
	for (const [name, findings] of checks) {
		qualityHeader(name, `Checking ${name.replace(/-/g, ' ')}`);
		printFindings(
			findings as readonly GenericFinding[],
			(finding) =>
				`${'file' in finding ? `${finding.file}: ` : ''}${'message' in finding ? finding.message : 'value' in finding ? `${finding.count}x ${finding.value} (${finding.locations.join(', ')})` : 'source' in finding ? `${finding.count}x ${finding.source} (${finding.locations.join(', ')})` : finding.pattern}`,
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
		rootNames: srcFiles(cfg).filter((f) => /\.(?:(?:c|m)?(?:js|ts)x?)$/.test(f)),
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
		rootNames: srcFiles(cfg).filter((f) => /\.(?:(?:c|m)?(?:js|ts)x?)$/.test(f)),
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
	const hasInitShadow = (n: ts.Identifier): boolean => {
		if (!ts.isVariableDeclaration(n.parent) || !n.parent.initializer) return false;
		const tgt = checker.getSymbolAtLocation(n);
		let found = false;
		const visit = (child: ts.Node): void => {
			if (found || child === n) return;
			if (ts.isIdentifier(child) && child.text === n.text && checker.getSymbolAtLocation(child) === tgt) found = true;
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
			if (ts.isIdentifier(child) && child.text === n.text && checker.getSymbolAtLocation(child) !== tgt) found = true;
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
			if (ts.isIdentifier(child)) {
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
	const hasDescCollision = (scope: ts.Node, suggestion: string): boolean =>
		[...renameSafetyByScope.entries()].some(([c, s]) => c !== scope && c.getStart() >= scope.getStart() && c.end <= scope.end && s.declared.has(suggestion));
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n) && !n.text.startsWith('_') && !protectedNames.has(n.text) && !hasInitShadow(n) && !hasInitReferenceToOtherSymbol(n)) {
				const suggestion = renameDeclaration(n);
				if (hasInitRenameCollision(n, suggestion) || hasInitConsumerCollision(n, suggestion)) return;
				const safety = renameSafetyByScope.get(declarationScope(n));
				if (!isCallbackDeclaration(n) && (safety?.declared.has(suggestion) || (safety?.proposals.get(suggestion) ?? 0) > 1 || hasDescCollision(declarationScope(n), suggestion))) return;
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
		rootNames: srcFiles(cfg).filter((f) => /\.(?:(?:c|m)?(?:js|ts)x?)$/.test(f)),
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
	if (cmdOpts.fix) for (const file of tgts) if (/\.(?:c|m)?(?:js|ts)x?$/.test(file)) collapseInlineIfs(file);
	if (cmdOpts.fix)
		for (const file of tgts) {
			maintainSrcFile(cfg.root, file);
			documentSrcFile(cfg, file);
			if (cfg.oneLineImports) protectLongImports(file, cfg.prettierPrintWidth);
		}
	if (qualityCheckEnabled(cfg, 'format')) runFormatter(cfg, cmdOpts, tgts);
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
		return;
	}
	if (cmd === 'format') {
		if (!qualityCheckEnabled(cfg, 'format')) return;
		const files = filesFor(cfg, opts.all);
		const cmdOpts = { ...opts, fix: fix('format') };
		const tgts = files.filter((f) => !f.endsWith('.astro'));
		if (cmdOpts.fix) for (const file of tgts) if (/\.(?:c|m)?(?:js|ts)x?$/.test(file)) collapseInlineIfs(file);
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
		if (opts.fix) fixSingleUseTypes(cfg);
		const findings = writeSingleUseReport(cfg);
		printFindings(findings, (finding) => `Single-use ${finding.decision}: ${finding.file}:${finding.line} ${finding.name} — ${finding.reason}`);
		return;
	}
	if (cmd === 'security' || cmd === 'repeated-classes' || cmd === 'regex-dedup' || cmd === 'ui-patterns') {
		const findings = cmd === 'security' ? securityFindings(cfg) : cmd === 'repeated-classes' ? repeatedClassFindings(cfg) : cmd === 'regex-dedup' ? regexFindings(cfg) : uiPatternFindings(cfg);
		qualityHeader(cmd, `Checking ${cmd.replace(/-/g, ' ')}`);
		printFindings(
			findings as readonly GenericFinding[],
			(finding) =>
				`${'file' in finding ? `${finding.file}: ` : ''}${'message' in finding ? finding.message : 'value' in finding ? `${finding.count}x ${finding.value} (${finding.locations.join(', ')})` : 'source' in finding ? `${finding.count}x ${finding.source} (${finding.locations.join(', ')})` : finding.pattern}`,
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
		if (opts.fix && qualityCheckEnabled(cfg, 'alias')) aliasFindings(cfg, true);
		if (qualityCheckEnabled(cfg, 'document')) runDocumentation(cfg, opts, ['document', ...(opts.all ? ['--all'] : []), '--quiet'], true);
		if (fix('name') && qualityCheckEnabled(cfg, 'name')) fixNames(cfg, opts.all);
		if (qualityCheckEnabled(cfg, 'lint')) runLint(cfg, { ...opts, fix: fix('lint') }, true);
		if (qualityCheckEnabled(cfg, 'knip') && cfg.tools?.knip) runKnip(cfg, fix('knip'), true);
		if (!opts.skipRecommendations) runRecommendationCmds(cfg);
		if (fix('document') && qualityCheckEnabled(cfg, 'document')) runDocumentation(cfg, opts, ['document', ...(opts.all ? ['--all'] : []), '--quiet'], true);
		const scoped = scopedCfg(cfg, opts.all);
		const analysis = createQualityAnalysis(scoped);
		runGenericChecks(scoped, analysis);
		if (qualityCheckEnabled(cfg, 'type') && cfg.tools?.tsc) {
			runTypecheck(cfg);
			if (cfg.typecheckExtensions?.length && !cfg.typecheckRoots?.length) runProjectTypecheck(cfg);
		}
		if (!opts.skipCommands) runCfgdCmds(cfg);
		runQuality(cfg, true, opts.all, analysis);
		if (qualityCheckEnabled(cfg, 'diff')) runDiffCheck(cfg);
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
export function runQualityFromConfig(file?: string, args = process.argv.slice(2)): void {
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
	const suppliedTgts = suppliedArgs.filter((a) => !a.startsWith('-') && !a.endsWith('.astro'));
	const fmtArgs = [...(hasMode ? [] : [opts.fix ? '--write' : '--check']), ...(hasIgnoreMode ? [] : ['--ignore-unknown']), ...suppliedArgs, ...(suppliedTgts.length ? [] : filesFor(cfg, opts.all))];
	const flags = fmtArgs.filter((a) => a.startsWith('-'));
	const tgts = fmtArgs.filter((a) => !a.startsWith('-') && !a.endsWith('.astro'));
	qualityHeader('format', `${opts.fix ? 'Fixing' : 'Checking'} formatting in ${tgts.length} source files`);
	if (opts.fix) {
		const knownFiles = filesFor(cfg, opts.all);
		const directTgts = suppliedTgts.map((t) => resolve(cfg.root, t));
		const collapseTgts = directTgts.length ? knownFiles.filter((f) => directTgts.some((t) => resolve(f) === t || resolve(f).startsWith(`${t}${sep}`))) : knownFiles;
		for (const file of collapseTgts) collapseTypesAndObjects(file);
	}
	let failed = false;
	for (const tgtBatch of batches(tgts)) {
		const status = run(cfg, toolPath(cfg, cfg.tools?.prettier, 'prettier'), [...flags, ...tgtBatch]);
		if (status) {
			failed = true;
			process.exitCode = status;
		}
	}
	console.log(`  ${failed ? '✗ failed' : '✓ passed'}`);
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
	printChildOutput(result.stdout, false);
	printChildOutput(result.stderr, true);
	if (result.status) process.exitCode = result.status ?? 1;
	console.log(`  ${result.status ? '✗ failed' : '✓ passed'}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runQualityFromConfig();
