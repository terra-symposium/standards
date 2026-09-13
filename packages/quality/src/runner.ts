/**
 * packages/quality/src/runner.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { checkImports } from './imports.js';
import { collapseInlineIfs } from './inline-if.js';
import { collapseTypesAndObjects } from './collapse.js';
import { declarationScope, isCallbackDeclaration, isProtectedPath, isRenamableDeclaration, namingFindings, renameDeclaration, renameId } from './naming.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { maintainSrcFile, protectLongImports } from './maintenance.js';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { srcFiles, workingSrcFiles } from './files.js';
import { objectForwardingFindings } from './object-forwarding.js';
import { documentSrcFile, documentationFindings } from './documentation.js';
import { aliasFindings } from './aliases.js';
import { writeSingleUseReport } from './single-use.js';

// DATA
import { PROTECTED_IDENTIFIERS } from './naming.js';

// TYPES
import { qualityAutofixEnabled, qualityCheckEnabled, qualityCommandEnabled, qualityRecommendationEnabled } from './config.js';
import type { QualityAutofixName, QualityCfg } from './config.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type QualityResult = { imports: ReturnType<typeof checkImports>; naming: ReturnType<typeof namingFindings>; aliases: ReturnType<typeof aliasFindings>; forwarding: ReturnType<typeof objectForwardingFindings>; documentation: ReturnType<typeof documentationFindings> };
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
function toolPath(cfg: QualityCfg, cfgd: string | undefined, fallback: string): string {
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
function run(cfg: QualityCfg, cmd: string, args: string[]): number {
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
	return Array.from({ length: Math.ceil(vals.length / size) }, (_, idx) => vals.slice(idx * size, (idx + 1) * size));
}

/**
 *
 * @param cfg
 * @param all
 *
 * @return
 */
function filesFor(cfg: QualityCfg, all: boolean): string[] {
	return all ? srcFiles(cfg) : workingSrcFiles(cfg);
}

/**
 *
 * @param cfg
 * @param all
 *
 * @return
 */
function scopedCfg(cfg: QualityCfg, all: boolean): QualityCfg {
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
function runLint(cfg: QualityCfg, opts: QualityOptions, exhaustive = false): void {
	const files = filesFor(cfg, opts.all).filter((f) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f));
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
function runCfgdCmd(cfg: QualityCfg, name: string): void {
	if (!qualityCommandEnabled(cfg, name)) return;
	const check = cfg.qualityCommands?.find((c) => c.name === name);
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
function runCfgdCmds(cfg: QualityCfg): void {
	for (const check of cfg.qualityCommands ?? []) if (qualityCommandEnabled(cfg, check.name)) runCfgdCmd(cfg, check.name);
}

/**
 * Runs configured advisory checks after Knip without turning recommendations into failures.
 *
 * @param cfg
 *
 * @return
 */
function runRecommendationCmds(cfg: QualityCfg): void {
	for (const check of cfg.recommendationCommands ?? []) if (qualityRecommendationEnabled(cfg, check.name)) run(cfg, check.command, check.args ?? []);
}

/**
 *
 * @param cfg
 *
 * @return
 */
function runProjectTypecheck(cfg: QualityCfg): void {
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
function runKnip(cfg: QualityCfg, fix: boolean, exhaustive = false): void {
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
function runDiffCheck(cfg: QualityCfg): void {
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
function fixNames(cfg: QualityCfg, all: boolean): void {
	// TypeScript's parser does not understand Astro frontmatter. Keep Astro in
	// reporting/import scope, but never apply symbol renames to it.
	const allowed = new Set(filesFor(cfg, all).filter((f) => !isProtectedPath(f) && !f.endsWith('.astro')));
	const program = ts.createProgram({
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
	const checker = program.getTypeChecker();
	const isIntrinsicJsxTag = (n: ts.Identifier): boolean => {
		const parent = n.parent;
		return (ts.isJsxOpeningLikeElement(parent) || ts.isJsxClosingElement(parent)) && parent.tagName === n && n.text.length > 0 && n.text[0] === n.text[0]!.toLowerCase();
	};
	const canonical = (symbol: ts.Symbol | undefined): ts.Symbol | undefined => (symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
	const identifierSymbol = (n: ts.Identifier): ts.Symbol | undefined =>
		canonical(ts.isShorthandPropertyAssignment(n.parent) ? (checker.getShorthandAssignmentValueSymbol(n.parent) ?? checker.getSymbolAtLocation(n)) : checker.getSymbolAtLocation(n));
	const hasInitShadow = (n: ts.Identifier): boolean => {
		const declaration = n.parent;
		if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
		const tgt = checker.getSymbolAtLocation(n);
		let found = false;
		const visit = (child: ts.Node): void => {
			if (found || child === n) return;
			if (ts.isIdentifier(child) && child.text === n.text && checker.getSymbolAtLocation(child) === tgt) found = true;
			ts.forEachChild(child, visit);
		};
		visit(declaration.initializer);
		return found;
	};
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(cfg.protectedIdentifiers ?? [])]);
	const exported = new Set<ts.Symbol>();
	for (const src of program.getSourceFiles()) {
		const module = checker.getSymbolAtLocation(src);
		if (module) for (const symbol of checker.getExportsOfModule(module)) exported.add(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
	}
	const replacements = new Map<ts.Symbol, string>();
	const renameSafetyByScope = new Map<ts.Node, { declared: Set<string>; proposals: Map<string, number> }>();
	const declaredByFile = new Map<string, Set<string>>();
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n)) {
				const scope = declarationScope(n);
				const safety = renameSafetyByScope.get(scope) ?? { declared: new Set<string>(), proposals: new Map<string, number>() };
				safety.declared.add(n.text);
				const fileDeclared = declaredByFile.get(src.fileName) ?? new Set<string>();
				fileDeclared.add(n.text);
				declaredByFile.set(src.fileName, fileDeclared);
				if (!n.text.startsWith('_') && !protectedNames.has(n.text) && !hasInitShadow(n)) {
					const suggestion = renameDeclaration(n);
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
	const hasDeclaredName = (src: ts.SourceFile, suggestion: string): boolean => {
		const escaped = suggestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`\\b(?:const|let|var|function|class|interface|type)\\s+${escaped}\\b`).test(src.text);
	};
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const inspect = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && isRenamableDeclaration(n) && !n.text.startsWith('_') && !protectedNames.has(n.text) && !hasInitShadow(n)) {
				const suggestion = renameDeclaration(n);
				const safety = renameSafetyByScope.get(declarationScope(n));
				const fileDeclared = declaredByFile.get(src.fileName);
				if (
					!isCallbackDeclaration(n) &&
					(safety?.declared.has(suggestion) ||
						fileDeclared?.has(suggestion) ||
						hasDeclaredName(src, suggestion) ||
						(safety?.proposals.get(suggestion) ?? 0) > 1 ||
						hasDescCollision(declarationScope(n), suggestion))
				)
					return;
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
		const n = fileEdits.sort((a, b) => b.span.start - a.span.start).reduce((t, e) => `${t.slice(0, e.span.start)}${e.newText}${t.slice(e.span.start + e.span.length)}`, src);
		if (n !== src) writeFileSync(fileName, n);
	}
	// Export renames can leave stale named imports when a consumer was already
	// out of sync. Repair only an absent import whose concise spelling is an
	// actual export of the same module; never guess across unrelated symbols.
	for (const src of program.getSourceFiles()) {
		if (!allowed.has(src.fileName)) continue;
		const fileEdits: ts.TextChange[] = [];
		const visit = (node: ts.Node): void => {
			if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
				const module = checker.getSymbolAtLocation(node.moduleSpecifier);
				const exportsByName = new Map((module ? checker.getExportsOfModule(module) : []).map((symbol) => [symbol.name, symbol]));
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
			const source = readFileSync(src.fileName, 'utf8');
			const updated = fileEdits.sort((a, b) => b.span.start - a.span.start).reduce((text, edit) => `${text.slice(0, edit.span.start)}${edit.newText}${text.slice(edit.span.start + edit.span.length)}`, source);
			if (updated !== source) writeFileSync(src.fileName, updated);
		}
	}
}

/**
 *
 * @param cfg
 * @param strict
 * @param all
 *
 * @return
 */
export function runQuality(cfg: QualityCfg, strict = false, all = true): QualityResult {
	const scoped = scopedCfg(cfg, all);
	const result = {
		imports: qualityCheckEnabled(cfg, 'import') ? checkImports(scoped) : [],
		naming: qualityCheckEnabled(cfg, 'name') ? namingFindings(scoped) : [],
		aliases: qualityCheckEnabled(cfg, 'alias') ? aliasFindings(scoped) : [],
		forwarding: qualityCheckEnabled(cfg, 'forward') ? objectForwardingFindings(scoped) : [],
		documentation: qualityCheckEnabled(cfg, 'document') ? documentationFindings(scoped) : [],
	};
	for (const f of result.imports) console.error(`Unresolved import: ${f.importer} -> ${f.specifier}`);
	for (const f of result.naming) console.warn(`${f.severity === 'error' ? 'Naming drift' : 'Naming suggestion'}: ${f.file}: ${f.name} -> ${f.suggestion}`);
	for (const f of result.aliases) console.warn(`Alias: ${f.file}:${f.line} ${f.kind} ${f.name} -> ${f.replacement}`);
	for (const f of result.forwarding) console.warn(`Forwarding suggestion: ${f.file}:${f.line}:${f.column} ${f.callee} repeats ${f.source}.${f.properties.join(', ')}; ${f.recommendation}.`);
	for (const f of result.documentation) console.warn(`Documentation requirement: ${f.file}:${f.line}:${f.column} ${f.name}; ${f.reason}.`);
	if (result.imports.length || result.aliases.length || result.documentation.length || (strict && result.naming.some((f) => f.severity === 'error'))) process.exitCode = 1;
	return result;
}

/**
 *
 * @param cfg
 * @param args
 *
 * @return
 */
export function runQualityCli(cfg: QualityCfg, args = process.argv.slice(2)): void {
	const cmd = args.find((a) => !a.startsWith('-')) ?? 'quality';
	const opts: QualityOptions = { fix: !args.includes('--warn'), all: args.includes('--all') || cmd === 'quality:all', strict: args.includes('--strict') };
	const fix = (check: QualityAutofixName): boolean => qualityAutofixEnabled(cfg, check, opts.fix);
	const files = filesFor(cfg, opts.all);
	if (cmd === 'format' || cmd === 'document' || cmd === 'maintain') {
		if (cmd === 'format' && !qualityCheckEnabled(cfg, 'format')) return;
		if (cmd !== 'format' && !qualityCheckEnabled(cfg, 'document')) return;
		const cmdOpts = { ...opts, fix: fix(cmd === 'format' ? 'format' : 'document') };
		const reqFiles = args.slice(1).filter((a) => !a.startsWith('-'));
		const tgts = (cmd !== 'format' && reqFiles.length ? reqFiles : files).filter((file) => !file.endsWith('.astro'));
		if (cmdOpts.fix) for (const file of tgts) if (/\.(?:c|m)?(?:js|ts)x?$/.test(file)) collapseInlineIfs(file);
		if (cmdOpts.fix)
			for (const f of tgts) {
				maintainSrcFile(cfg.root, f);
				if (cmd !== 'format') documentSrcFile(cfg, f);
				if (cfg.oneLineImports) protectLongImports(f, cfg.prettierPrintWidth);
			}
		if (qualityCheckEnabled(cfg, 'format')) runFormatter(cfg, cmdOpts, cmd === 'format' ? args.slice(1) : tgts);
		if (cmd !== 'format' && !args.includes('--quiet')) runQuality(cfg, opts.strict, opts.all);
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
		const findings = writeSingleUseReport(cfg);
		for (const finding of findings) console.warn(`Single-use ${finding.decision}: ${finding.file}:${finding.line} ${finding.name} — ${finding.reason}`);
		return;
	}
	if (cfg.qualityCommands?.some((check) => check.name === cmd)) {
		runCfgdCmd(cfg, cmd);
		return;
	}
	if (cmd === 'lint') return qualityCheckEnabled(cfg, 'lint') ? runLint(cfg, { ...opts, fix: fix('lint') }) : undefined;
	if (cmd === 'knip') return qualityCheckEnabled(cfg, 'knip') ? runKnip(cfg, fix('knip')) : undefined;
	if (cmd === 'types') {
		if (!qualityCheckEnabled(cfg, 'type')) return;
		runTypecheck(cfg, opts.all ? [] : files);
		if (cfg.typecheckExtensions?.length) runProjectTypecheck(cfg);
		return;
	}
	if (cmd === 'imports' || cmd === 'quality:patterns' || cmd === 'types:architecture') {
		runQuality(cfg, opts.strict, opts.all);
		return;
	}
	if (cmd === 'quality' || cmd === 'quality:all' || cmd === 'quality:baseline') {
		if (opts.fix && qualityCheckEnabled(cfg, 'alias')) aliasFindings(cfg, true);
		if (qualityCheckEnabled(cfg, 'document')) runQualityCli(cfg, ['document', ...(opts.all ? ['--all'] : []), ...(!fix('document') ? ['--warn'] : []), '--quiet']);
		if (fix('name') && qualityCheckEnabled(cfg, 'name')) fixNames(cfg, opts.all);
		if (qualityCheckEnabled(cfg, 'lint')) runLint(cfg, { ...opts, fix: fix('lint') }, true);
		if (qualityCheckEnabled(cfg, 'knip') && cfg.tools?.knip) runKnip(cfg, fix('knip'), true);
		runRecommendationCmds(cfg);
		if (fix('document') && qualityCheckEnabled(cfg, 'document')) runQualityCli(cfg, ['document', ...(opts.all ? ['--all'] : []), '--quiet']);
		if (qualityCheckEnabled(cfg, 'type') && cfg.tools?.tsc) {
			runTypecheck(cfg);
			if (cfg.typecheckExtensions?.length) runProjectTypecheck(cfg);
		}
		runCfgdCmds(cfg);
		runQuality(cfg, true, opts.all);
		if (qualityCheckEnabled(cfg, 'diff')) runDiffCheck(cfg);
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
	if (opts.fix) {
		const knownFiles = filesFor(cfg, opts.all);
		const directTgts = suppliedTgts.map((t) => resolve(cfg.root, t));
		const collapseTgts = directTgts.length ? knownFiles.filter((f) => directTgts.some((t) => resolve(f) === t || resolve(f).startsWith(`${t}${sep}`))) : knownFiles;
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
export function runTypecheck(cfg: QualityCfg, args: string[] = []): void {
	const tsc = cfg.tools?.tsc ?? 'tsc';
	const suppliedFiles = cfg.typecheckExtensions?.length
		? args.filter(
				(f) => cfg.typecheckExtensions?.includes(f.slice(f.lastIndexOf('.'))) && (!cfg.typecheckRoots?.length || cfg.typecheckRoots.some((r) => f.startsWith(`${r}/`) || f.startsWith(`${r}\\`))),
			)
		: args;
	if (args.length && !suppliedFiles.length) return;
	const typecheckFiles = cfg.typecheckExtensions?.length
		? srcFiles(cfg).filter(
				(f) => cfg.typecheckExtensions?.includes(f.slice(f.lastIndexOf('.'))) && (!cfg.typecheckRoots?.length || cfg.typecheckRoots.some((r) => f.startsWith(`${r}/`) || f.startsWith(`${r}\\`))),
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
