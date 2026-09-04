/**
 * packages/quality/src/runner.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
import { collapseTypesAndObjects } from './collapse.js';
import { sourceFiles as srcFiles, workingSourceFiles } from './files.js';
import { checkImports } from './imports.js';
import { collapseInlineIfs } from './inline-if.js';
import { maintainSourceFile, protectLongImports } from './maintenance.js';
import { isCallbackDeclaration, isProtectedFilename, isProtectedPath, isRenamableDeclaration, namingFindings, renameDeclaration } from './naming.js';
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
 * @param cfg
 * @param cfgd
 * @param fallback
 *
 * @return
 */
function toolPath(cfg: QualityConfig, cfgd: string | undefined, fallback: string): string {
	if (cfgd && (cfgd.includes('/') || cfgd.includes('\\'))) return cfgd;
	const executable = cfgd ?? fallback;
	const local = resolve(cfg.root, 'node_modules', '.bin', executable);
	return existsSync(local) ? local : executable;
}

/**
 *
 * @param cfg
 * @param cmd
 * @param args
 *
 * @return
 */
function run(cfg: QualityConfig, cmd: string, args: string[]): number {
	const result = spawnSync(cmd, args, { cwd: cfg.root, stdio: 'inherit', env: process.env });
	if (result.error) console.error(`${cmd} failed: ${result.error.message}`);
	return result.status ?? 1;
}

/**
 *
 * @param vals
 * @param size
 *
 * @return
 */
function batches<T>(vals: T[], size = 100): T[][] {
	return Array.from({ length: Math.ceil(vals.length / size) }, (_, index) => vals.slice(index * size, (index + 1) * size));
}

/**
 *
 * @param cfg
 * @param all
 *
 * @return
 */
function filesFor(cfg: QualityConfig, all: boolean): string[] {
	return all ? srcFiles(cfg) : workingSourceFiles(cfg);
}

/**
 *
 * @param cfg
 * @param all
 *
 * @return
 */
function scopedCfg(cfg: QualityConfig, all: boolean): QualityConfig {
	return all ? cfg : { ...cfg, sourceRoots: filesFor(cfg, false) };
}

/**
 *
 * @param cfg
 * @param opts
 * @param exhaustive
 *
 * @return
 */
function runLint(cfg: QualityConfig, opts: QualityOptions, exhaustive = false): void {
	const files = filesFor(cfg, opts.all).filter((file) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(file));
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
		const status = run(cfg, toolPath(cfg, cfg.tools?.eslint, 'eslint'), [...flags, ...filesBatch]);
		if (status) process.exitCode = status;
	}
}

/**
 *
 * @param cfg
 * @param name
 *
 * @return
 */
function runCfgdCmd(cfg: QualityConfig, name: string): void {
	const check = cfg.qualityCommands?.find((cmd) => cmd.name === name);
	if (!check) throw new Error(`Unknown quality domain: ${name}`);
	const status = run(cfg, check.command, check.args ?? []);
	if (status) process.exitCode = status;
}

/**
 *
 * @param cfg
 *
 * @return
 */
function runCfgdCmds(cfg: QualityConfig): void {
	for (const check of cfg.qualityCommands ?? []) runCfgdCmd(cfg, check.name);
}

/**
 *
 * @param cfg
 *
 * @return
 */
function runProjectTypecheck(cfg: QualityConfig): void {
	const status = run(cfg, toolPath(cfg, cfg.tools?.tsc, 'tsc'), ['--noEmit', '-p', cfg.tsconfig ?? 'tsconfig.json']);
	if (status) process.exitCode = status;
}

/**
 *
 * @param cfg
 * @param fix
 * @param exhaustive
 *
 * @return
 */
function runKnip(cfg: QualityConfig, fix: boolean, exhaustive = false): void {
	const status = run(cfg, toolPath(cfg, cfg.tools?.knip, 'knip'), [
		...(fix && !exhaustive ? ['--fix'] : exhaustive ? [] : ['--include', 'unresolved,nsExports,nsTypes,cycles']),
		...(exhaustive ? [] : ['--no-exit-code']),
	]);
	if (status) process.exitCode = status;
}

/**
 *
 * @param cfg
 *
 * @return
 */
function runDiffCheck(cfg: QualityConfig): void {
	const status = run(cfg, 'git', ['-c', 'core.pager=cat', 'diff', '--check']);
	if (status) process.exitCode = status;
}

/**
 *
 * @param cfg
 * @param all
 *
 * @return
 */
function fixNames(cfg: QualityConfig, all: boolean): void {
	const allowed = new Set(filesFor(cfg, all).filter((file) => !isProtectedPath(file) && !isProtectedFilename(file)));
	const program = ts.createProgram({
		rootNames: srcFiles(cfg).filter((file) => /\.(?:(?:c|m)?(?:js|ts)x?|astro)$/.test(file)),
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
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(cfg.protectedIdentifiers ?? [])]);
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
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n)) {
				safety.declared.add(n.text);
				if (!n.text.startsWith('_') && !protectedNames.has(n.text)) {
					const suggestion = renameDeclaration(n);
					if (suggestion !== n.text && !isCallbackDeclaration(n)) safety.proposals.set(suggestion, (safety.proposals.get(suggestion) ?? 0) + 1);
				}
			}
			ts.forEachChild(n, inspect);
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
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n)) {
				const replacement = replacements.get(identifierSymbol(n) as ts.Symbol);
				const astroAttrName = src.fileName.endsWith('.astro') && src.text.slice(n.end, n.end + 2) === '={' && src.text.lastIndexOf('---', n.getStart(src)) >= 0;
				if (replacement && !astroAttrName) {
					const shorthandBinding = ts.isBindingElement(n.parent) && n.parent.name === n && !n.parent.propertyName && ts.isObjectBindingPattern(n.parent.parent);
					const fileEdits = edits.get(src.fileName) ?? [];
					fileEdits.push({
						// Identifier `pos` can include a preceding delimiter (for example the
						// opening parenthesis of a call argument). Anchor edits from `end` so
						// expanding a shorthand binding cannot consume adjacent punctuation.
						span: { start: n.end - n.text.length, length: n.text.length },
						newText: !src.fileName.endsWith('.astro') && (ts.isShorthandPropertyAssignment(n.parent) || shorthandBinding) ? `${n.text}: ${replacement}` : replacement,
					});
					if (ts.isParameter(n.parent) && n.parent.name === n) {
						const owner = n.parent.parent;
						const docStart = owner.getFullStart();
						const doc = src.text.slice(docStart, owner.getStart(src));
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
		const n = fileEdits.sort((a, b) => b.span.start - a.span.start).reduce((text, edit) => `${text.slice(0, edit.span.start)}${edit.newText}${text.slice(edit.span.start + edit.span.length)}`, src);
		if (n !== src) writeFileSync(fileName, n);
	}
}

/**
 *
 * @param config
 * @param strict
 * @param all
 *
 * @return
 */
export function runQuality(config: QualityConfig, strict = false, all = true): QualityResult {
	const result = { imports: checkImports(scopedCfg(config, all)), naming: namingFindings(scopedCfg(config, all)) };
	for (const f of result.imports) console.error(`Unresolved import: ${f.importer} -> ${f.specifier}`);
	for (const f of result.naming) console.warn(`${f.severity === 'error' ? 'Naming drift' : 'Naming suggestion'}: ${f.file}: ${f.name} -> ${f.suggestion}`);
	if (result.imports.length || (strict && result.naming.some((f) => f.severity === 'error'))) process.exitCode = 1;
	return result;
}

/**
 *
 * @param cfg
 * @param args
 *
 * @return
 */
export function runQualityCli(cfg: QualityConfig, args = process.argv.slice(2)): void {
	const cmd = args.find((arg) => !arg.startsWith('-')) ?? 'quality';
	const opts: QualityOptions = { fix: !args.includes('--warn'), all: args.includes('--all'), strict: args.includes('--strict') };
	const files = filesFor(cfg, opts.all);
	if (cmd === 'format' || cmd === 'maintain') {
		if (opts.fix) for (const file of files) if (/\.(?:c|m)?(?:js|ts)x?$/.test(file)) collapseInlineIfs(file);
		if (opts.fix)
			for (const f of files) {
				maintainSourceFile(cfg.root, f);
				if (cfg.oneLineImports) protectLongImports(f, cfg.prettierPrintWidth);
			}
		runFormatter(cfg, opts, cmd === 'format' ? args.slice(1) : files);
		return;
	}
	if (cmd === 'naming') {
		if (opts.fix) fixNames(cfg, opts.all);
		runQuality(cfg, opts.strict, opts.all);
		return;
	}
	if (cmd === 'domain') {
		const name = args[args.indexOf('domain') + 1];
		if (!name) throw new Error('Pass a quality domain name.');
		runCfgdCmd(cfg, name);
		return;
	}
	if (cmd === 'lint') return runLint(cfg, opts);
	if (cmd === 'knip') return runKnip(cfg, opts.fix);
	if (cmd === 'types') {
		runTypecheck(cfg, opts.all ? [] : files);
		if (cfg.typecheckExtensions?.length) runProjectTypecheck(cfg);
		return;
	}
	if (cmd === 'imports' || cmd === 'quality:patterns' || cmd === 'types:architecture') {
		runQuality(cfg, opts.strict, opts.all);
		return;
	}
	if (cmd === 'quality' || cmd === 'quality:all' || cmd === 'quality:baseline') {
		runQualityCli(cfg, ['maintain', ...(opts.all ? ['--all'] : []), ...(opts.fix ? [] : ['--warn'])]);
		if (opts.fix) fixNames(cfg, opts.all);
		runLint(cfg, opts, true);
		if (cfg.tools?.knip) runKnip(cfg, opts.fix, true);
		if (opts.fix) runQualityCli(cfg, ['maintain', ...(opts.all ? ['--all'] : [])]);
		if (cfg.tools?.tsc) {
			runTypecheck(cfg);
			if (cfg.typecheckExtensions?.length) runProjectTypecheck(cfg);
		}
		runCfgdCmds(cfg);
		runQuality(cfg, true, opts.all);
		runDiffCheck(cfg);
	}
}

/**
 *
 * @param cfg
 * @param optsOrArgs
 * @param args
 *
 * @return
 */
export function runFormatter(cfg: QualityConfig, optsOrArgs: QualityOptions | string[] = { fix: true, all: false, strict: false }, args: string[] = []): void {
	const legacyArgs = Array.isArray(optsOrArgs);
	const opts = legacyArgs ? { fix: optsOrArgs.includes('--write') || !optsOrArgs.includes('--check'), all: optsOrArgs.includes('--all'), strict: false } : optsOrArgs;
	const suppliedArgs = (legacyArgs ? optsOrArgs : args).filter((arg) => !['--all', '--warn', '--strict'].includes(arg));
	const hasMode = suppliedArgs.includes('--write') || suppliedArgs.includes('--check');
	const hasIgnoreMode = suppliedArgs.some((arg) => arg.startsWith('--ignore-unknown'));
	const suppliedTgts = suppliedArgs.filter((arg) => !arg.startsWith('-'));
	const fmtArgs = [...(hasMode ? [] : [opts.fix ? '--write' : '--check']), ...(hasIgnoreMode ? [] : ['--ignore-unknown']), ...suppliedArgs, ...(suppliedTgts.length ? [] : filesFor(cfg, opts.all))];
	const flags = fmtArgs.filter((arg) => arg.startsWith('-'));
	const tgts = fmtArgs.filter((arg) => !arg.startsWith('-'));
	if (opts.fix) {
		const knownFiles = filesFor(cfg, opts.all);
		const directTgts = suppliedTgts.map((t) => resolve(cfg.root, t));
		const collapseTgts = directTgts.length ? knownFiles.filter((f) => directTgts.some((tgt) => resolve(f) === tgt || resolve(f).startsWith(`${tgt}${sep}`))) : knownFiles;
		for (const file of collapseTgts) collapseTypesAndObjects(file);
	}
	for (const tgtBatch of batches(tgts)) {
		const status = run(cfg, toolPath(cfg, cfg.tools?.prettier, 'prettier'), [...flags, ...tgtBatch]);
		if (status) process.exitCode = status;
	}
}

/**
 *
 * @param cfg
 * @param args
 *
 * @return
 */
export function runTypecheck(cfg: QualityConfig, args: string[] = []): void {
	const tsc = cfg.tools?.tsc ?? 'tsc';
	const suppliedFiles = cfg.typecheckExtensions?.length
		? args.filter(
				(f) =>
					cfg.typecheckExtensions?.includes(f.slice(f.lastIndexOf('.'))) && (!cfg.typecheckRoots?.length || cfg.typecheckRoots.some((root) => f.startsWith(`${root}/`) || f.startsWith(`${root}\\`))),
			)
		: args;
	if (args.length && !suppliedFiles.length) return;
	const typecheckFiles = cfg.typecheckExtensions?.length
		? srcFiles(cfg).filter(
				(f) =>
					cfg.typecheckExtensions?.includes(f.slice(f.lastIndexOf('.'))) && (!cfg.typecheckRoots?.length || cfg.typecheckRoots.some((root) => f.startsWith(`${root}/`) || f.startsWith(`${root}\\`))),
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
		: ['--noEmit', '-p', cfg.tsconfig ?? 'tsconfig.json', ...suppliedFiles];
	const result = spawnSync(toolPath(cfg, tsc, 'tsc'), compilerArgs, { cwd: cfg.root, stdio: 'inherit' });
	if (result.status) process.exitCode = result.status ?? 1;
}
