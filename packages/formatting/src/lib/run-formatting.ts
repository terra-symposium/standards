/**
 * packages/formatting/src/lib/run-formatting.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { collapseInlineIfs } from './inline-if.js';
import { collapseTypesAndObjects } from './collapse.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { protectLongImports } from '@terra-symposium/standards-documentation';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { hasGeneratedSourceHeader, srcFiles } from '@terra-symposium/standards-quality-core';

// TYPES
import type { CapabilityOptions, QualityCfg } from '@terra-symposium/standards-quality-core';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const CONFIG_NAMES = [
	'.prettierrc',
	'.prettierrc.json',
	'.prettierrc.yml',
	'.prettierrc.yaml',
	'.prettierrc.mjs',
	'.prettierrc.cjs',
	'prettier.config.js',
	'prettier.config.mjs',
	'prettier.config.cjs',
];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Applies Terra's safe source layout transforms, then runs the repository's Prettier.
 *
 * @param cfg Repository paths, import policy, formatting configuration, and autofix settings.
 * @param options Whether source transforms and Prettier should write changes or only report differences.
 *
 * @return Prettier's exit status, or zero when the configured source scope is empty.
 */
export function runFormatting(cfg: QualityCfg, options: Pick<CapabilityOptions, 'fix'>): number {
	const files = srcFiles(cfg).filter((file) => !hasGeneratedSourceHeader(readFileSync(file, 'utf8')));
	if (!files.length) return 0;
	const fix = options.fix && cfg.autofix?.format !== false;
	const configRoot = cfg.configRoot ?? resolve(cfg.root, 'config');
	const prettierConfig = CONFIG_NAMES.flatMap((n) => [resolve(configRoot, n), resolve(cfg.root, n)]).find(existsSync);
	const prettierIgnore = [resolve(configRoot, '.prettierignore'), resolve(cfg.root, '.prettierignore')].find(existsSync);
	const tool = cfg.tools?.prettier;
	const executable = tool && (tool.includes('/') || tool.includes('\\')) ? tool : resolve(cfg.root, 'node_modules/.bin', tool ?? 'prettier');
	const cmd = existsSync(executable) ? executable : (tool ?? 'prettier');
	if (fix) {
		const available = spawnSync(cmd, ['--version'], { cwd: cfg.root, encoding: 'utf8', stdio: 'pipe' });
		if (available.error || available.status !== 0) {
			const reason = available.error?.message ?? available.stderr?.trim() ?? `exited with status ${available.status ?? 'unknown'}`;
			console.error(`Prettier unavailable: ${reason}`);
			return available.status || 1;
		}
	}
	const originals = fix ? new Map(files.map((file) => [file, readFileSync(file, 'utf8')])) : undefined;
	if (fix) {
		for (const file of files) {
			if (/\.(?:c|m)?(?:js|jsx|ts|tsx)$/u.test(file)) {
				collapseInlineIfs(file);
				collapseTypesAndObjects(file);
			}
			if (cfg.oneLineImports) protectLongImports(file, cfg.prettierPrintWidth);
		}
	}
	const args = [fix ? '--write' : '--check', '--ignore-unknown'];
	if (prettierConfig) args.push('--config', prettierConfig);
	if (prettierIgnore) args.push('--ignore-path', prettierIgnore);
	const batches: string[][] = [];
	let batch: string[] = [];
	let bytes = 0;
	for (const file of files) {
		const size = Buffer.byteLength(file) + 1;
		if (batch.length && bytes + size > 24 * 1024) {
			batches.push(batch);
			batch = [];
			bytes = 0;
		}
		batch.push(file);
		bytes += size;
	}
	if (batch.length) batches.push(batch);
	let failed = 0;
	const checkArgs = ['--check', '--ignore-unknown', ...(prettierConfig ? ['--config', prettierConfig] : []), ...(prettierIgnore ? ['--ignore-path', prettierIgnore] : [])];
	for (const targets of batches) {
		const result = spawnSync(cmd, [...args, ...targets], { cwd: cfg.root, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024 });
		if (result.error) {
			console.error(`Prettier failed: ${result.error.message}`);
			failed ||= 1;
		} else if (result.status !== 0) failed ||= result.status ?? 1;
	}
	if (fix && !failed) {
		for (const targets of batches) {
			const check = spawnSync(cmd, [...checkArgs, ...targets], { cwd: cfg.root, stdio: 'ignore', maxBuffer: 64 * 1024 * 1024 });
			if (!check.error && check.status === 0) continue;
			// Some Prettier plugins need a second write after structural transforms before output is stable.
			const retry = spawnSync(cmd, [...args, ...targets], { cwd: cfg.root, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024 });
			if (retry.error) {
				console.error(`Prettier failed: ${retry.error.message}`);
				failed ||= 1;
			} else if (retry.status !== 0) failed ||= retry.status ?? 1;
			if (failed) continue;
			const verified = spawnSync(cmd, [...checkArgs, ...targets], { cwd: cfg.root, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024 });
			if (verified.error) {
				console.error(`Prettier verification failed: ${verified.error.message}`);
				failed ||= 1;
			} else if (verified.status !== 0) failed ||= verified.status ?? 1;
		}
	}
	if (failed && originals) {
		for (const [file, original] of originals) {
			if (readFileSync(file, 'utf8') !== original) writeFileSync(file, original);
		}
		console.error('Prettier failed; restored source files because formatting did not complete.');
	}
	return failed;
}
