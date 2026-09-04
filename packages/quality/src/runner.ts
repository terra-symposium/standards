/**
 * packages/quality/src/runner.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API

import { collapseTypesAndObjects } from './collapse.js';
import { sourceFiles, workingSourceFiles } from './files.js';
import { checkImports } from './imports.js';
import { collapseInlineIfs } from './inline-if.js';
import { maintainSourceFile, protectLongImports } from './maintenance.js';
import { isCallbackDeclaration, isRenamableDeclaration, namingFindings, renameDeclaration } from './naming.js';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import ts from 'typescript';

// DATA

import { PROTECTED_IDENTIFIERS } from './naming.js';

// TYPES

import type { QualityConfig } from './config.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type QualityResult = { imports: ReturnType<typeof checkImports>; naming: ReturnType<typeof namingFindings> };
export type QualityOptions = { fix: boolean; all: boolean; strict: boolean };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param config
 * @param configured
 * @param fallback
 * @returns
 */
function toolPath(config: QualityConfig, configured: string | undefined, fallback: string): string {
	if (configured && (configured.includes('/') || configured.includes('\\'))) return configured;
	const executable = configured ?? fallback;
	const local = resolve(config.root, 'node_modules', '.bin', executable);
	return existsSync(local) ? local : executable;
}

/**
 *
 * @param config
 * @param command
 * @param args
 * @returns
 */
function run(config: QualityConfig, command: string, args: string[]): number {
	const result = spawnSync(command, args, { cwd: config.root, stdio: 'inherit', env: process.env });
	if (result.error) console.error(`${command} failed: ${result.error.message}`);
	return result.status ?? 1;
}

/**
 *
 * @param vals
 * @param size
 * @returns
 */
function batches<T>(vals: T[], size = 100): T[][] {
	return Array.from({ length: Math.ceil(vals.length / size) }, (_, index) => vals.slice(index * size, (index + 1) * size));
}

/**
 *
 * @param config
 * @param all
 * @returns
 */
function filesFor(config: QualityConfig, all: boolean): string[] {
	return all ? sourceFiles(config) : workingSourceFiles(config);
}

/**
 *
 * @param config
 * @param all
 * @returns
 */
function scopedConfig(config: QualityConfig, all: boolean): QualityConfig {
	return all ? config : { ...config, sourceRoots: filesFor(config, false) };
}

/**
 *
 * @param config
 * @param opts
 * @param exhaustive
 * @returns
 */
function runLint(config: QualityConfig, opts: QualityOptions, exhaustive = false): void {
	const files = filesFor(config, opts.all).filter((file) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(file));
	if (!files.length) return;
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
	for (const filesBatch of batches(files)) {
		const status = run(config, toolPath(config, config.tools?.eslint, 'eslint'), [...flags, ...filesBatch]);
		if (status) process.exitCode = status;
	}
}

/**
 *
 * @param config
 * @param name
 * @returns
 */
function runConfiguredCommand(config: QualityConfig, name: string): void {
	const check = config.qualityCommands?.find((command) => command.name === name);
	if (!check) throw new Error(`Unknown quality domain: ${name}`);
	const status = run(config, check.command, check.args ?? []);
	if (status) process.exitCode = status;
}

/**
 *
 * @param config
 * @returns
 */
function runConfiguredCommands(config: QualityConfig): void {
	for (const check of config.qualityCommands ?? []) runConfiguredCommand(config, check.name);
}

/**
 *
 * @param config
 * @returns
 */
function runProjectTypecheck(config: QualityConfig): void {
	const status = run(config, toolPath(config, config.tools?.tsc, 'tsc'), ['--noEmit', '-p', config.tsconfig ?? 'tsconfig.json']);
	if (status) process.exitCode = status;
}

/**
 *
 * @param config
 * @param fix
 * @param exhaustive
 * @returns
 */
function runKnip(config: QualityConfig, fix: boolean, exhaustive = false): void {
	const status = run(config, toolPath(config, config.tools?.knip, 'knip'), [
		...(fix && !exhaustive ? ['--fix'] : exhaustive ? [] : ['--include', 'unresolved,nsExports,nsTypes,cycles']),
		...(exhaustive ? [] : ['--no-exit-code']),
	]);
	if (status) process.exitCode = status;
}

/**
 *
 * @param config
 * @returns
 */
function runDiffCheck(config: QualityConfig): void {
	const status = run(config, 'git', ['-c', 'core.pager=cat', 'diff', '--check']);
	if (status) process.exitCode = status;
}

/**
 *
 * @param config
 * @param all
 * @returns
 */
function fixNames(config: QualityConfig, all: boolean): void {
	const allowed = new Set(filesFor(config, all));
	const program = ts.createProgram({
		rootNames: sourceFiles(config).filter((file) => /\.(?:(?:c|m)?(?:js|ts)x?|astro)$/.test(file)),
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
	const checker = program.getTypeChecker();
	const identifierSymbol = (node: ts.Identifier): ts.Symbol | undefined =>
		ts.isShorthandPropertyAssignment(node.parent) ? (checker.getShorthandAssignmentValueSymbol(node.parent) ?? checker.getSymbolAtLocation(node)) : checker.getSymbolAtLocation(node);
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(config.protectedIdentifiers ?? [])]);
	const exported = new Set<ts.Symbol>();
	for (const src of program.getSourceFiles()) {
		const module = checker.getSymbolAtLocation(src);
		if (module) for (const symbol of checker.getExportsOfModule(module)) exported.add(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
	}
	const replacements = new Map<ts.Symbol, string>();
	const renameSafetyByFile = new Map<string, { declared: Set<string>; proposals: Map<string, number> }>();
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const safety = { declared: new Set<string>(), proposals: new Map<string, number>() };
		const inspect = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && isRenamableDeclaration(node)) {
				safety.declared.add(node.text);
				if (!node.text.startsWith('_') && !protectedNames.has(node.text)) {
					const suggestion = renameDeclaration(node);
					if (suggestion !== node.text && !isCallbackDeclaration(node)) safety.proposals.set(suggestion, (safety.proposals.get(suggestion) ?? 0) + 1);
				}
			}
			ts.forEachChild(node, inspect);
		};
		inspect(src);
		renameSafetyByFile.set(src.fileName, safety);
	}
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const inspect = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && isRenamableDeclaration(node) && !node.text.startsWith('_') && !protectedNames.has(node.text)) {
				const suggestion = renameDeclaration(node);
				const safety = renameSafetyByFile.get(src.fileName);
				if (!isCallbackDeclaration(node) && (safety?.declared.has(suggestion) || (safety?.proposals.get(suggestion) ?? 0) > 1)) return;
				const symbol = suggestion === node.text ? undefined : identifierSymbol(node);
				if (symbol && !exported.has(symbol)) replacements.set(symbol, suggestion);
			}
			ts.forEachChild(node, inspect);
		};
		inspect(src);
	}
	const edits = new Map<string, ts.TextChange[]>();
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const inspect = (node: ts.Node): void => {
			if (ts.isIdentifier(node)) {
				const replacement = replacements.get(identifierSymbol(node) as ts.Symbol);
				const astroAttributeName = src.fileName.endsWith('.astro') && src.text.slice(node.end, node.end + 2) === '={' && src.text.lastIndexOf('---', node.getStart(src)) >= 0;
				if (replacement && !astroAttributeName) {
					const shorthandBinding = ts.isBindingElement(node.parent) && node.parent.name === node && !node.parent.propertyName && ts.isObjectBindingPattern(node.parent.parent);
					const fileEdits = edits.get(src.fileName) ?? [];
					fileEdits.push({
						span: { start: node.getStart(src), length: node.getWidth(src) },
						newText: !src.fileName.endsWith('.astro') && (ts.isShorthandPropertyAssignment(node.parent) || shorthandBinding) ? `${node.text}: ${replacement}` : replacement,
					});
					if (ts.isParameter(node.parent) && node.parent.name === node) {
						const owner = node.parent.parent;
						const docStart = owner.getFullStart();
						const doc = src.text.slice(docStart, owner.getStart(src));
						const pattern = new RegExp(`(@param\\s+(?:\\{[^}]*\\}\\s*)?)${node.text}\\b`, 'g');
						for (const match of doc.matchAll(pattern)) fileEdits.push({ span: { start: docStart + match.index! + match[1]!.length, length: node.text.length }, newText: replacement });
					}
					edits.set(src.fileName, fileEdits);
				}
			}
			ts.forEachChild(node, inspect);
		};
		inspect(src);
	}
	for (const [fileName, fileEdits] of edits) {
		const src = readFileSync(fileName, 'utf8');
		const next = fileEdits.sort((a, b) => b.span.start - a.span.start).reduce((text, edit) => `${text.slice(0, edit.span.start)}${edit.newText}${text.slice(edit.span.start + edit.span.length)}`, src);
		if (next !== src) writeFileSync(fileName, next);
	}
}

/**
 *
 * @param config
 * @param strict
 * @param all
 * @returns
 */
export function runQuality(config: QualityConfig, strict = false, all = true): QualityResult {
	const result = { imports: checkImports(scopedConfig(config, all)), naming: namingFindings(scopedConfig(config, all)) };
	for (const failure of result.imports) console.error(`Unresolved import: ${failure.importer} -> ${failure.specifier}`);
	for (const finding of result.naming) console.warn(`${finding.severity === 'error' ? 'Naming drift' : 'Naming suggestion'}: ${finding.file}: ${finding.name} -> ${finding.suggestion}`);
	if (result.imports.length || (strict && result.naming.some((finding) => finding.severity === 'error'))) process.exitCode = 1;
	return result;
}

/**
 *
 * @param config
 * @param args
 * @returns
 */
export function runQualityCli(config: QualityConfig, args = process.argv.slice(2)): void {
	const command = args.find((arg) => !arg.startsWith('-')) ?? 'quality';
	const opts: QualityOptions = { fix: !args.includes('--warn'), all: args.includes('--all'), strict: args.includes('--strict') };
	const files = filesFor(config, opts.all);
	if (command === 'format' || command === 'maintain') {
		runFormatter(config, opts, command === 'format' ? args.slice(1) : files);
		if (opts.fix) for (const file of files) if (/\.(?:c|m)?(?:js|ts)x?$/.test(file)) collapseInlineIfs(file);
		if (opts.fix)
			for (const file of files) {
				maintainSourceFile(config.root, file);
				if (config.oneLineImports) protectLongImports(file, config.prettierPrintWidth);
			}
		return;
	}
	if (command === 'naming') {
		if (opts.fix) fixNames(config, opts.all);
		runQuality(config, opts.strict, opts.all);
		return;
	}
	if (command === 'domain') {
		const name = args[args.indexOf('domain') + 1];
		if (!name) throw new Error('Pass a quality domain name.');
		runConfiguredCommand(config, name);
		return;
	}
	if (command === 'lint') return runLint(config, opts);
	if (command === 'knip') return runKnip(config, opts.fix);
	if (command === 'types') {
		runTypecheck(config, opts.all ? [] : files);
		if (config.typecheckExtensions?.length) runProjectTypecheck(config);
		return;
	}
	if (command === 'imports' || command === 'quality:patterns' || command === 'types:architecture') {
		runQuality(config, opts.strict, opts.all);
		return;
	}
	if (command === 'quality' || command === 'quality:all' || command === 'quality:baseline') {
		runQualityCli(config, ['maintain', ...(opts.all ? ['--all'] : []), ...(opts.fix ? [] : ['--warn'])]);
		if (opts.fix) fixNames(config, opts.all);
		runLint(config, opts, true);
		if (config.tools?.knip) runKnip(config, opts.fix, true);
		if (opts.fix) runQualityCli(config, ['maintain', ...(opts.all ? ['--all'] : [])]);
		if (config.tools?.tsc) {
			runTypecheck(config);
			if (config.typecheckExtensions?.length) runProjectTypecheck(config);
		}
		runConfiguredCommands(config);
		runQuality(config, true, opts.all);
		runDiffCheck(config);
	}
}

/**
 *
 * @param config
 * @param optsOrArgs
 * @param args
 * @returns
 */
export function runFormatter(config: QualityConfig, optsOrArgs: QualityOptions | string[] = { fix: true, all: false, strict: false }, args: string[] = []): void {
	const legacyArgs = Array.isArray(optsOrArgs);
	const opts = legacyArgs ? { fix: optsOrArgs.includes('--write') || !optsOrArgs.includes('--check'), all: optsOrArgs.includes('--all'), strict: false } : optsOrArgs;
	const suppliedArgs = (legacyArgs ? optsOrArgs : args).filter((arg) => !['--all', '--warn', '--strict'].includes(arg));
	const hasMode = suppliedArgs.includes('--write') || suppliedArgs.includes('--check');
	const hasIgnoreMode = suppliedArgs.some((arg) => arg.startsWith('--ignore-unknown'));
	const suppliedTargets = suppliedArgs.filter((arg) => !arg.startsWith('-'));
	const fmtArgs = [
		...(hasMode ? [] : [opts.fix ? '--write' : '--check']),
		...(hasIgnoreMode ? [] : ['--ignore-unknown']),
		...suppliedArgs,
		...(suppliedTargets.length ? [] : filesFor(config, opts.all)),
	];
	const flags = fmtArgs.filter((arg) => arg.startsWith('-'));
	const targets = fmtArgs.filter((arg) => !arg.startsWith('-'));
	if (opts.fix) {
		const knownFiles = filesFor(config, opts.all);
		const directTargets = suppliedTargets.map((t) => resolve(config.root, t));
		const collapseTargets = directTargets.length ? knownFiles.filter((file) => directTargets.some((tgt) => resolve(file) === tgt || resolve(file).startsWith(`${tgt}${sep}`))) : knownFiles;
		for (const file of collapseTargets) collapseTypesAndObjects(file);
	}
	for (const tgtBatch of batches(targets)) {
		const status = run(config, toolPath(config, config.tools?.prettier, 'prettier'), [...flags, ...tgtBatch]);
		if (status) process.exitCode = status;
	}
}

/**
 *
 * @param config
 * @param args
 * @returns
 */
export function runTypecheck(config: QualityConfig, args: string[] = []): void {
	const tsc = config.tools?.tsc ?? 'tsc';
	const suppliedFiles = config.typecheckExtensions?.length
		? args.filter(
				(file) =>
					config.typecheckExtensions?.includes(file.slice(file.lastIndexOf('.'))) &&
					(!config.typecheckRoots?.length || config.typecheckRoots.some((root) => file.startsWith(`${root}/`) || file.startsWith(`${root}\\`))),
			)
		: args;
	if (args.length && !suppliedFiles.length) return;
	const typecheckFiles = config.typecheckExtensions?.length
		? sourceFiles(config).filter(
				(file) =>
					config.typecheckExtensions?.includes(file.slice(file.lastIndexOf('.'))) &&
					(!config.typecheckRoots?.length || config.typecheckRoots.some((root) => file.startsWith(`${root}/`) || file.startsWith(`${root}\\`))),
			)
		: [];
	const compilerArgs = typecheckFiles.length
		? [
				'--noEmit',
				'--allowJs',
				'--checkJs',
				'--strict',
				'--skipLibCheck',
				'--module',
				'ESNext',
				'--moduleResolution',
				'Bundler',
				'--target',
				'ESNext',
				'--allowImportingTsExtensions',
				...(args.length ? suppliedFiles : typecheckFiles),
			]
		: ['--noEmit', '-p', config.tsconfig ?? 'tsconfig.json', ...suppliedFiles];
	const result = spawnSync(toolPath(config, tsc, 'tsc'), compilerArgs, { cwd: config.root, stdio: 'inherit' });
	if (result.status) process.exitCode = result.status ?? 1;
}
