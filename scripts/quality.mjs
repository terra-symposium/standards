#!/usr/bin/env node

import { runQualityFromCfg } from '../packages/quality/dist/lib/runner.js';

try {
	await runQualityFromCfg(undefined, process.argv.slice(2));
} catch (err) {
	console.error(err instanceof Error ? err.message : String(err));
	process.exitCode = 1;
}
