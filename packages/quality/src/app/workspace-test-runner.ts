/**
 * packages/quality/src/app/workspace-test-runner.ts
 * Runs the Standards workspace test matrix once with shared progress reporting.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualityNodeReporterOptions } from '@terra-symposium/standards-quality-reports';
import { qualityProgress } from '@terra-symposium/standards-quality-core';
import { spawnSync } from 'node:child_process';

/*//////////////////////////////////////////////////
RUNNER
//////////////////////////////////////////////////*/

const suites = [
	'@terra-symposium/standards-error-boundaries',
	'@terra-symposium/standards-quality',
	'@terra-symposium/standards-reporting',
	'@terra-symposium/standards-testing',
	'@terra-symposium/hygiene-dashboard',
];
let failed = false;
console.error('\nTESTS\n  Unit / Contract · Standards workspace');
qualityProgress('Test suites', 0, suites.length);
for (const [idx, name] of suites.entries()) {
	const result = spawnSync('pnpm', ['--filter', name, 'test'], {
		cwd: resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'),
		stdio: 'inherit',
		env: {
			...process.env,
			NODE_OPTIONS: qualityNodeReporterOptions(process.env.NODE_OPTIONS, new URL('../lib/node-reporter.js', import.meta.url).href),
			TERRA_QUALITY_NODE_REPORTER_OWNER: '1',
		},
	});
	if (result.error) {
		console.error(`  ${name} failed to start: ${result.error.message}`);
		failed = true;
	} else if (result.status !== 0) {
		failed = true;
	}
	qualityProgress('Test suites', idx + 1, suites.length);
}
console.error(`  ${failed ? '✗ failed' : '✓ passed'}`);
if (failed) process.exitCode = 1;
