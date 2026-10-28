/**
 * packages/quality/src/app/workspace-test-runner.ts
 * Runs the Standards workspace test matrix once with shared progress reporting.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualityNodeReporterOptions } from '../lib/node-reporter.js';
import { qualityProgress } from '../lib/progress.js';

/*//////////////////////////////////////////////////
RUNNER
//////////////////////////////////////////////////*/

/**
 * Runs the three publishable package suites selected by the Standards workspace.
 *
 * @return Nothing; the recursive test command's status becomes this process status.
 */
function runWorkspaceTests(): void {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
	const reporter = new URL('../lib/node-reporter.js', import.meta.url).href;
	const env = { ...process.env };
	env.NODE_OPTIONS = qualityNodeReporterOptions(env.NODE_OPTIONS, reporter);
	env.TERRA_QUALITY_NODE_REPORTER_OWNER = '1';
	const suites = ['@terra-symposium/standards-error-boundaries', '@terra-symposium/standards-quality', '@terra-symposium/standards-reporting'];
	let failed = false;

	console.error('\nTESTS\n  Unit / Contract · Standards workspace');
	qualityProgress('Test suites', 0, suites.length);
	for (const [idx, name] of suites.entries()) {
		const result = spawnSync('pnpm', ['--filter', name, 'test'], { cwd: root, stdio: 'inherit', env });
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
}

runWorkspaceTests();
