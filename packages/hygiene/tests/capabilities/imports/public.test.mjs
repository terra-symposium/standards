/**
 * packages/hygiene/tests/capabilities/imports/public.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as api from '../../../dist/capabilities/imports/index.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
test('public API exports the capability contract', () => {
	assert.ok('checkImports' in api, 'exports checkImports');
	assert.ok('duplicateImportFindings' in api, 'exports duplicateImportFindings');
});
test('standalone CLI exposes shared help', () => {
	// hygiene-ignore single-use -- Keep the generated script fixture path separate from the command that executes it.
	const script = new URL('../../../dist/capabilities/imports/cli.js', import.meta.url);
	const result = spawnSync(process.execPath, [script.pathname, '--help'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Usage:/);
});
