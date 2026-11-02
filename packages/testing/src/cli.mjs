#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { resolve } from 'node:path';
import { runTestPlan } from './index.mjs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Parses the workspace test-runner command-line options.
 *
 * @param args Arguments following the CLI executable name.
 *
 * @return The selected root, manifest, suites, and shared-suite mode.
 */
function parseArgs(args) {
	const [cmd, ...rest] = args;
	if (cmd !== 'run') throw new Error('Usage: terra-test run [--root <path>] [--manifest <path>] [--suites <name,name>] [--shared-only]');
	const options = { root: process.cwd(), manifest: undefined, suites: [], sharedOnly: false };
	for (let index = 0; index < rest.length; index++) {
		const flag = rest[index];
		const value = rest[index + 1];
		if (flag === '--root' && value) {
			options.root = resolve(value);
			index++;
		} else if (flag === '--manifest' && value) {
			options.manifest = value;
			index++;
		} else if (flag === '--suites' && value) {
			options.suites = value
				.split(',')
				.map((name) => name.trim())
				.filter(Boolean);
			index++;
		} else if (flag === '--shared-only') {
			options.sharedOnly = true;
		} else {
			throw new Error(`Unknown or incomplete argument: ${flag}`);
		}
	}
	return options;
}
try {
	const result = runTestPlan(parseArgs(process.argv.slice(2)));
	if (result.failed) process.exitCode = 1;
} catch (err) {
	console.error(err instanceof Error ? err.message : String(err));
	process.exitCode = 1;
}
