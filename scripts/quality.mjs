#!/usr/bin/env node

import { runQualityFromCfg } from '../packages/quality/dist/lib/runner.js';

try {
	await runQualityFromCfg(undefined, process.argv.slice(2));
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
