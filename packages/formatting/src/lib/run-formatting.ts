/**
 * packages/formatting/src/lib/run-formatting.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { collapseInlineIfs } from './inline-if.js';
import { collapseTypesAndObjects } from './collapse.js';
import { existsSync } from 'node:fs';
import { maintainSrcFile, protectLongImports } from '@terra-symposium/standards-documentation';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { srcFiles } from '@terra-symposium/standards-quality-core';

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
	const files = srcFiles(cfg).filter((f) => !f.endsWith('.astro'));
	if (options.fix && cfg.autofix?.format !== false) {
		for (const file of files) {
			if (/\.(?:c|m)?(?:js|jsx|ts|tsx)$/u.test(file)) {
				collapseInlineIfs(file);
				collapseTypesAndObjects(file);
			}
			maintainSrcFile(cfg.root, file);
			if (cfg.oneLineImports) protectLongImports(file, cfg.prettierPrintWidth);
		}
	}
	if (!files.length) return 0;
	const configRoot = cfg.configRoot ?? resolve(cfg.root, 'config');
	const prettierConfig = CONFIG_NAMES.flatMap((n) => [resolve(configRoot, n), resolve(cfg.root, n)]).find(existsSync);
	const prettierIgnore = [resolve(configRoot, '.prettierignore'), resolve(cfg.root, '.prettierignore')].find(existsSync);
	const tool = cfg.tools?.prettier;
	const executable = tool && (tool.includes('/') || tool.includes('\\')) ? tool : resolve(cfg.root, 'node_modules/.bin', tool ?? 'prettier');
	const cmd = existsSync(executable) ? executable : (tool ?? 'prettier');
	const args = [options.fix && cfg.autofix?.format !== false ? '--write' : '--check', '--ignore-unknown'];
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
	for (const targets of batches) {
		const result = spawnSync(cmd, [...args, ...targets], { cwd: cfg.root, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024 });
		if (result.error) {
			console.error(`Prettier failed: ${result.error.message}`);
			failed ||= 1;
		} else if (result.status !== 0) failed ||= result.status ?? 1;
	}
	return failed;
}
