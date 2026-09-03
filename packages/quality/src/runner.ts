import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { checkImports } from './imports.js';
import type { QualityConfig } from './config.js';
import { collapseInlineIfs } from './inline-if.js';
import { maintainSourceFile } from './maintenance.js';
import { isRenamableDeclaration, namingFindings, PROTECTED_IDENTIFIERS, renameIdentifier } from './naming.js';
import { sourceFiles, workingSourceFiles } from './files.js';

export type QualityResult = { imports: ReturnType<typeof checkImports>; naming: ReturnType<typeof namingFindings> };
export type QualityOptions = { fix: boolean; all: boolean; strict: boolean };

function toolPath(config: QualityConfig, configured: string | undefined, fallback: string): string {
	if (configured) return configured;
	const local = resolve(config.root, 'node_modules', '.bin', fallback);
	return existsSync(local) ? local : fallback;
}

function run(config: QualityConfig, command: string, args: string[]): number {
	const result = spawnSync(command, args, { cwd: config.root, stdio: 'inherit', env: process.env });
	if (result.error) console.error(`${command} failed: ${result.error.message}`);
	return result.status ?? 1;
}

function batches<T>(values: T[], size = 100): T[][] {
	return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

function filesFor(config: QualityConfig, all: boolean): string[] {
	return all ? sourceFiles(config) : workingSourceFiles(config);
}

function scopedConfig(config: QualityConfig, all: boolean): QualityConfig {
	return all ? config : { ...config, sourceRoots: filesFor(config, false) };
}

function runLint(config: QualityConfig, options: QualityOptions, exhaustive = false): void {
	const files = filesFor(config, options.all).filter(file => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(file));
	if (!files.length) return;
	const flags = ['--cache', '--cache-strategy', 'content', '--cache-location', '.eslintcache', '--no-warn-ignored', ...(exhaustive ? ['--max-warnings=0'] : []), ...(options.fix ? ['--fix'] : [])];
	for (const filesBatch of batches(files)) {
		const status = run(config, toolPath(config, config.tools?.eslint, 'eslint'), [...flags, ...filesBatch]);
		if (status) process.exitCode = status;
	}
}

function runConfiguredCommand(config: QualityConfig, name: string): void {
	const check = config.qualityCommands?.find(command => command.name === name);
	if (!check) throw new Error(`Unknown quality domain: ${name}`);
	const status = run(config, check.command, check.args ?? []);
	if (status) process.exitCode = status;
}

function runConfiguredCommands(config: QualityConfig): void {
	for (const check of config.qualityCommands ?? []) runConfiguredCommand(config, check.name);
}

function runProjectTypecheck(config: QualityConfig): void {
	const status = run(config, toolPath(config, config.tools?.tsc, 'tsc'), ['--noEmit', '-p', config.tsconfig ?? 'tsconfig.json']);
	if (status) process.exitCode = status;
}

function runKnip(config: QualityConfig, fix: boolean, exhaustive = false): void {
	const status = run(config, toolPath(config, config.tools?.knip, 'knip'), [...(fix && !exhaustive ? ['--fix'] : exhaustive ? [] : ['--include', 'unresolved,nsExports,nsTypes,cycles']), ...(exhaustive ? [] : ['--no-exit-code'])]);
	if (status) process.exitCode = status;
}

function runDiffCheck(config: QualityConfig): void {
	const status = run(config, 'git', ['-c', 'core.pager=cat', 'diff', '--check']);
	if (status) process.exitCode = status;
}

function fixNames(config: QualityConfig, all: boolean): void {
	const allowed = new Set(filesFor(config, all));
	const program = ts.createProgram({
		rootNames: sourceFiles(config).filter(file => /\.(?:c|m)?(?:js|ts)x?$/.test(file)),
		options: { allowJs: true, checkJs: false, jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true, target: ts.ScriptTarget.ESNext },
	});
	const checker = program.getTypeChecker();
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(config.protectedIdentifiers ?? [])]);
	const exported = new Set<ts.Symbol>();
	for (const source of program.getSourceFiles()) {
		const module = checker.getSymbolAtLocation(source);
		if (module) for (const symbol of checker.getExportsOfModule(module)) exported.add(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
	}
	const replacements = new Map<ts.Symbol, string>();
	for (const source of program.getSourceFiles()) {
		if (!allowed.has(source.fileName)) continue;
		const inspect = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && isRenamableDeclaration(node) && !protectedNames.has(node.text)) {
				const suggestion = renameIdentifier(node.text);
				const symbol = suggestion === node.text ? undefined : checker.getSymbolAtLocation(node);
				if (symbol && !exported.has(symbol)) replacements.set(symbol, suggestion);
			}
			ts.forEachChild(node, inspect);
		};
		inspect(source);
	}
	const edits = new Map<string, ts.TextChange[]>();
	for (const source of program.getSourceFiles()) {
		if (!allowed.has(source.fileName)) continue;
		const inspect = (node: ts.Node): void => {
			if (ts.isIdentifier(node)) {
				const replacement = replacements.get(checker.getSymbolAtLocation(node) as ts.Symbol);
				if (replacement) {
					const fileEdits = edits.get(source.fileName) ?? [];
					fileEdits.push({ span: { start: node.getStart(source), length: node.getWidth(source) }, newText: ts.isShorthandPropertyAssignment(node.parent) ? `${node.text}: ${replacement}` : replacement });
					edits.set(source.fileName, fileEdits);
				}
			}
			ts.forEachChild(node, inspect);
		};
		inspect(source);
	}
	for (const [fileName, fileEdits] of edits) {
		const source = readFileSync(fileName, 'utf8');
		const next = fileEdits.sort((a, b) => b.span.start - a.span.start).reduce((text, edit) => `${text.slice(0, edit.span.start)}${edit.newText}${text.slice(edit.span.start + edit.span.length)}`, source);
		if (next !== source) writeFileSync(fileName, next);
	}
}

export function runQuality(config: QualityConfig, strict = false, all = true): QualityResult {
	const result = { imports: checkImports(scopedConfig(config, all)), naming: namingFindings(scopedConfig(config, all)) };
	for (const failure of result.imports) console.error(`Unresolved import: ${failure.importer} -> ${failure.specifier}`);
	for (const finding of result.naming) console.warn(`${finding.severity === 'error' ? 'Naming drift' : 'Naming suggestion'}: ${finding.file}: ${finding.name} -> ${finding.suggestion}`);
	if (result.imports.length || (strict && result.naming.some(finding => finding.severity === 'error'))) process.exitCode = 1;
	return result;
}

export function runQualityCli(config: QualityConfig, args = process.argv.slice(2)): void {
	const command = args.find(arg => !arg.startsWith('-')) ?? 'quality';
	const options: QualityOptions = { fix: !args.includes('--warn'), all: args.includes('--all'), strict: args.includes('--strict') };
	const files = filesFor(config, options.all);
	if (command === 'format' || command === 'maintain') {
		runFormatter(config, options, command === 'format' ? args.slice(1) : files);
		if (options.fix) for (const file of files) if (/\.(?:c|m)?(?:js|ts)x?$/.test(file)) collapseInlineIfs(file);
		if (options.fix) for (const file of files) maintainSourceFile(config.root, file);
		return;
	}
	if (command === 'naming') {
		if (options.fix) fixNames(config, options.all);
		runQuality(config, options.strict, options.all);
		return;
	}
	if (command === 'domain') {
		const name = args[args.indexOf('domain') + 1];
		if (!name) throw new Error('Pass a quality domain name.');
		runConfiguredCommand(config, name);
		return;
	}
	if (command === 'lint') return runLint(config, options);
	if (command === 'knip') return runKnip(config, options.fix);
	if (command === 'types') return runTypecheck(config, options.all ? [] : files);
	if (command === 'imports' || command === 'quality:patterns' || command === 'types:architecture') {
		runQuality(config, options.strict, options.all);
		return;
	}
	if (command === 'quality' || command === 'quality:all' || command === 'quality:baseline') {
		runQualityCli(config, ['maintain', ...(options.all ? ['--all'] : []), ...(options.fix ? [] : ['--warn'])]);
		if (options.fix) fixNames(config, options.all);
		runLint(config, options, true);
		if (config.tools?.knip) runKnip(config, options.fix, true);
		if (options.fix) runQualityCli(config, ['maintain', ...(options.all ? ['--all'] : [])]);
		if (config.tools?.tsc) {
			runTypecheck(config);
			if (config.typecheckExtensions?.length) runProjectTypecheck(config);
		}
		runConfiguredCommands(config);
		runQuality(config, true, options.all);
		runDiffCheck(config);
	}
}

export function runFormatter(config: QualityConfig, optionsOrArgs: QualityOptions | string[] = { fix: true, all: false, strict: false }, args: string[] = []): void {
	const legacyArgs = Array.isArray(optionsOrArgs);
	const options = legacyArgs ? { fix: optionsOrArgs.includes('--write') || !optionsOrArgs.includes('--check'), all: optionsOrArgs.includes('--all'), strict: false } : optionsOrArgs;
	const suppliedArgs = (legacyArgs ? optionsOrArgs : args).filter(arg => !['--all', '--warn', '--strict'].includes(arg));
	const hasMode = suppliedArgs.includes('--write') || suppliedArgs.includes('--check');
	const hasIgnoreMode = suppliedArgs.some(arg => arg.startsWith('--ignore-unknown'));
	const formatterArgs = [...(hasMode ? [] : [options.fix ? '--write' : '--check']), ...(hasIgnoreMode ? [] : ['--ignore-unknown']), ...(suppliedArgs.length ? suppliedArgs : filesFor(config, options.all))];
	const flags = formatterArgs.filter(arg => arg.startsWith('-'));
	const targets = formatterArgs.filter(arg => !arg.startsWith('-'));
	for (const targetBatch of batches(targets)) {
		const status = run(config, toolPath(config, config.tools?.prettier, 'prettier'), [...flags, ...targetBatch]);
		if (status) process.exitCode = status;
	}
}

export function runTypecheck(config: QualityConfig, args: string[] = []): void {
	const tsc = config.tools?.tsc ?? 'tsc';
	const typecheckFiles = config.typecheckExtensions?.length ? sourceFiles(config).filter(file => config.typecheckExtensions?.includes(file.slice(file.lastIndexOf('.'))) && (!config.typecheckRoots?.length || config.typecheckRoots.some(root => file.startsWith(`${root}/`) || file.startsWith(`${root}\\`)))) : [];
	const compilerArgs = typecheckFiles.length ? ['--noEmit', '--allowJs', '--checkJs', '--strict', '--skipLibCheck', '--module', 'ESNext', '--moduleResolution', 'Bundler', '--target', 'ESNext', '--allowImportingTsExtensions', ...(args.length ? args : typecheckFiles)] : ['--noEmit', '-p', config.tsconfig ?? 'tsconfig.json', ...args];
	const result = spawnSync(toolPath(config, tsc, 'tsc'), compilerArgs, { cwd: config.root, stdio: 'inherit' });
	if (result.status) process.exitCode = result.status ?? 1;
}
