/**
 * packages/ui-quality/test/public.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as api from '../dist/index.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('public API exports the capability contract', () => {
	assert.ok('accessibilityFindings' in api, 'exports accessibilityFindings');
	assert.ok('displayNameFindings' in api, 'exports displayNameFindings');
	assert.ok('errorBoundaryFindings' in api, 'exports errorBoundaryFindings');
	assert.ok('uiComponentRecommendations' in api, 'exports uiComponentRecommendations');
});
test('standalone CLI exposes shared help', () => {
	const result = spawnSync(process.execPath, [new URL('../dist/cli.js', import.meta.url).pathname, '--help'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Usage:/);
});
test('capability package does not depend on the aggregate runner', () => {
	assert.equal(Object.hasOwn(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).dependencies ?? {}, '@terra-symposium/standards-quality'), false);
});
