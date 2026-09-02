import { spawnSync } from 'node:child_process';
import { checkImports } from './imports.js';
import type { QualityConfig } from './config.js';
import { collapseInlineIfs } from './inline-if.js';
import { namingFindings } from './naming.js';
import { sourceFiles } from './files.js';

export type QualityResult = {
	imports: ReturnType<typeof checkImports>;
	naming: ReturnType<typeof namingFindings>;
};

export function runQuality(config: QualityConfig, strict = false): QualityResult {
	const result = { imports: checkImports(config), naming: namingFindings(config) };
	if (result.imports.length) for (const failure of result.imports) console.error(`Unresolved import: ${failure.importer} -> ${failure.specifier}`);
	for (const finding of result.naming) console.warn(`${finding.severity === 'error' ? 'Naming drift' : 'Naming suggestion'}: ${finding.file}: ${finding.name} -> ${finding.suggestion}`);
	if (result.imports.length || (strict && result.naming.some(finding => finding.severity === 'error'))) process.exitCode = 1;
	return result;
}

export function runQualityCli(config: QualityConfig, args = process.argv.slice(2)): void {
	const command = args.find(arg => !arg.startsWith('-')) ?? 'quality';
	if (command === 'maintain') {
		const prettier = config.tools?.prettier ?? 'prettier';
		const result = spawnSync(prettier, ['--write', '--ignore-unknown', ...config.sourceRoots, ...(config.includeRoots ?? [])], { cwd: config.root, stdio: 'inherit' });
		if (result.status) process.exitCode = result.status ?? 1;
		for (const file of sourceFiles(config)) if (['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'].includes(file.slice(file.lastIndexOf('.')))) collapseInlineIfs(file);
	}
	runQuality(config, args.includes('--strict'));
}

export function runFormatter(config: QualityConfig, args = process.argv.slice(2)): void {
	const prettier = config.tools?.prettier ?? 'prettier';
	const result = spawnSync(prettier, args.length ? args : ['--write', '--ignore-unknown', ...config.sourceRoots, ...(config.includeRoots ?? [])], { cwd: config.root, stdio: 'inherit' });
	if (result.status) process.exitCode = result.status ?? 1;
}

export function runTypecheck(config: QualityConfig, args = process.argv.slice(2)): void {
	const tsc = config.tools?.tsc ?? 'tsc';
	const result = spawnSync(tsc, ['--noEmit', '-p', config.tsconfig ?? 'tsconfig.json', ...args], { cwd: config.root, stdio: 'inherit' });
	if (result.status) process.exitCode = result.status ?? 1;
}
