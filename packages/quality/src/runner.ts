import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { checkImports } from './imports.js';
import type { QualityConfig } from './config.js';
import { collapseInlineIfs } from './inline-if.js';
import { namingFindings } from './naming.js';
import { sourceFiles } from './files.js';

export type QualityResult = {
	imports: ReturnType<typeof checkImports>;
	naming: ReturnType<typeof namingFindings>;
};

function toolPath(config: QualityConfig, configured: string | undefined, fallback: string): string {
	if (configured) return configured;
	const local = resolve(config.root, 'node_modules', '.bin', fallback);
	return existsSync(local) ? local : fallback;
}

function run(config: QualityConfig, command: string, args: string[]): number {
	const result = spawnSync(command, args, { cwd: config.root, stdio: 'inherit', env: process.env });
	return result.status ?? 1;
}

function runLint(config: QualityConfig): void {
	const eslint = toolPath(config, config.tools?.eslint, 'eslint');
	const roots = config.lintRoots?.length ? config.lintRoots : config.sourceRoots;
	const status = run(config, eslint, ['--cache', '--cache-strategy', 'content', '--cache-location', '.eslintcache', '--ext', '.js,.jsx,.ts,.tsx,.astro,.cjs,.mjs', '--fix', ...roots]);
	if (status) process.exitCode = status;
}

function runKnip(config: QualityConfig, args: string[] = []): void {
	const knip = toolPath(config, config.tools?.knip, 'knip');
	const status = run(config, knip, [...args, '--no-exit-code']);
	if (status) process.exitCode = status;
}

function runDiffCheck(config: QualityConfig): void {
	const status = run(config, 'git', ['-c', 'core.pager=cat', 'diff', '--check']);
	if (status) process.exitCode = status;
}

export function runQuality(config: QualityConfig, strict = false): QualityResult {
	const result = { imports: checkImports(config), naming: namingFindings(config) };
	if (result.imports.length) for (const failure of result.imports) console.error(`Unresolved import: ${failure.importer} -> ${failure.specifier}`);
	for (const finding of result.naming) console.warn(`${finding.severity === 'error' ? 'Naming drift' : 'Naming suggestion'}: ${finding.file}: ${finding.name} -> ${finding.suggestion}`);
	if (result.imports.length || (strict && result.naming.some(finding => finding.severity === 'error'))) process.exitCode = 1;
	return result;
}

export function runQualityCli(config: QualityConfig, args = process.argv.slice(2)): void {
	const command = args.find(arg => !arg.startsWith('-')) ?? 'quality';
	const all = args.includes('--all') || command === 'maintain:all' || command === 'quality:all' || command === 'quality:baseline';
	if (command === 'maintain' || command === 'maintain:all') {
		const prettier = config.tools?.prettier ?? 'prettier';
		const roots = all ? [...config.sourceRoots, ...(config.includeRoots ?? [])] : config.sourceRoots;
		const status = run(config, toolPath(config, prettier, 'prettier'), ['--write', '--ignore-unknown', ...roots]);
		if (status) process.exitCode = status;
		for (const file of sourceFiles(config)) if (['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'].includes(file.slice(file.lastIndexOf('.')))) collapseInlineIfs(file);
	}
	if (command === 'lint' || command === 'fix:unused') runLint(config);
	if (command === 'knip') runKnip(config, ['--include', 'unresolved,nsExports,nsTypes,cycles']);
	if (command === 'knip:fix') runKnip(config, ['--fix']);
	if (command === 'quality:patterns' || command === 'types:architecture' || command === 'quality' || command === 'quality:all' || command === 'quality:baseline' || command === 'maintain' || command === 'maintain:all') {
		if (command === 'quality' || command === 'quality:all' || command === 'quality:baseline') {
			if (command !== 'quality' || all) runQualityCli(config, ['maintain', ...(all ? ['--all'] : [])]);
			if (config.tools?.eslint) runLint(config);
			if (config.tools?.knip) runKnip(config, ['--include', 'unresolved,nsExports,nsTypes,cycles']);
			if (config.tools?.prettier) runFormatter(config, ['--write', '--ignore-unknown', ...(all ? ['.'] : config.sourceRoots)]);
			if (config.tools?.tsc) runTypecheck(config, all ? ['--all'] : []);
		}
		runQuality(config, args.includes('--strict'));
		if (command === 'quality' || command === 'quality:all' || command === 'quality:baseline') runDiffCheck(config);
	}
}

export function runFormatter(config: QualityConfig, args = process.argv.slice(2)): void {
	const prettier = toolPath(config, config.tools?.prettier, 'prettier');
	const result = spawnSync(prettier, args.length ? args : ['--write', '--ignore-unknown', ...config.sourceRoots, ...(config.includeRoots ?? [])], { cwd: config.root, stdio: 'inherit' });
	if (result.status) process.exitCode = result.status ?? 1;
}

export function runTypecheck(config: QualityConfig, args = process.argv.slice(2)): void {
	const tsc = config.tools?.tsc ?? 'tsc';
	const typecheckFiles = config.typecheckExtensions?.length
		? sourceFiles(config).filter(file => config.typecheckExtensions?.includes(file.slice(file.lastIndexOf('.'))) && (!config.typecheckRoots?.length || config.typecheckRoots.some(root => file.startsWith(`${root}/`) || file.startsWith(`${root}\\`))))
		: [];
	if (typecheckFiles.length) {
		const configPath = config.tsconfig ? resolve(config.root, config.tsconfig) : '';
		const configJson = configPath && existsSync(configPath) ? ts.readConfigFile(configPath, file => readFileSync(file, 'utf8')) : { config: {}, error: undefined };
		const parsed = ts.parseJsonConfigFileContent(configJson.config, ts.sys, config.root);
		const program = ts.createProgram({
			rootNames: typecheckFiles,
			options: {
				...parsed.options,
				allowImportingTsExtensions: true,
				allowJs: true,
				checkJs: true,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.Bundler,
				noEmit: true,
				skipLibCheck: true,
				strict: true,
				target: ts.ScriptTarget.ESNext,
			},
		});
		const roots = new Set(typecheckFiles.map(file => resolve(file)));
		const diagnostics = ts.getPreEmitDiagnostics(program).filter(diagnostic => !diagnostic.file || roots.has(resolve(diagnostic.file.fileName)));
		if (diagnostics.length) {
			console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: file => file, getCurrentDirectory: () => config.root, getNewLine: () => '\n' }));
			process.exitCode = 1;
		}
		return;
	}
	const compilerArgs = typecheckFiles.length
		? ['--noEmit', '--allowJs', '--checkJs', '--strict', '--skipLibCheck', '--module', 'ESNext', '--moduleResolution', 'Bundler', '--target', 'ESNext', '--allowImportingTsExtensions', ...typecheckFiles, ...args]
		: ['--noEmit', '-p', config.tsconfig ?? 'tsconfig.json', ...args];
	const result = spawnSync(toolPath(config, tsc, 'tsc'), compilerArgs, { cwd: config.root, stdio: 'inherit' });
	if (result.status) process.exitCode = result.status ?? 1;
}
