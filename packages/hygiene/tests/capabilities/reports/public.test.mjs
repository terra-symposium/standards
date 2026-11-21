/**
 * packages/hygiene/tests/capabilities/reports/public.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as api from '../../../dist/capabilities/reports/index.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
test('public API exports the capability contract', () => {
	assert.ok('buildGitHubReport' in api, 'exports buildGitHubReport');
	assert.ok('createHistoryReport' in api, 'exports createHistoryReport');
	assert.ok('qualityNodeReporter' in api, 'exports qualityNodeReporter');
	assert.ok('QualityPlaywrightReporter' in api, 'exports QualityPlaywrightReporter');
});
test('standalone CLI exposes help', () => {
	// hygiene-ignore single-use -- Keep the generated script fixture path separate from the command that executes it.
	const script = new URL('../../../dist/capabilities/reports/cli.js', import.meta.url);
	const result = spawnSync(process.execPath, [script.pathname, '--help'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Usage:/);
});
