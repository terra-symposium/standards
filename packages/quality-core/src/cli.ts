/**
 * packages/quality-core/src/cli.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { loadQualityConfig } from './config.js';
import { resolve } from 'node:path';
import { workingSrcFiles } from './lib/files.js';

// TYPES
import type { QualityCfg } from './types.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Shared command-line boundary for independently runnable quality capabilities.
 *
 * @param name Capability name used to select its configuration and print its executable usage.
 * @param execute Capability operation that receives the resolved scope and command-line options.
 * @param args Arguments to parse; defaults to the current process arguments after the executable name.
 */
export async function runCapabilityCli(
	name: string,
	execute: (cfg: QualityCfg, options: { fix: boolean; all: boolean; files?: string[]; configPath?: string; args?: string[] }) => unknown | Promise<unknown>,
	args = process.argv.slice(2),
): Promise<void> {
	let configPath: string | undefined;
	let all = false;
	let fix = true;
	const files: string[] = [];
	for (let index = 0; index < args.length; index++) {
		const arg = args[index]!;
		if (arg === '--help' || arg === '-h') {
			process.stdout.write(`Usage: terra-${name} [--config PATH] [--all] [--warn] [files...]\n`);
			return;
		}
		if (arg === '--config') {
			configPath = args[++index];
			if (!configPath) throw new Error('--config requires a path.');
		} else if (arg === '--all') all = true;
		else if (arg === '--warn') fix = false;
		else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
		else files.push(resolve(arg));
	}
	const cfg = loadQualityConfig(configPath);
	const selected = files.length ? files : all ? undefined : workingSrcFiles(cfg);
	const result = await execute(selected ? { ...cfg, sourceRoots: selected, includeRoots: [] } : cfg, { fix, all, files: selected, configPath, args: [] });
	if (Array.isArray(result)) {
		for (const finding of result) process.stdout.write(`${JSON.stringify(finding)}\n`);
		if (result.length) process.exitCode = 1;
	} else if (result !== undefined) process.stdout.write(`${JSON.stringify(result)}\n`);
}
