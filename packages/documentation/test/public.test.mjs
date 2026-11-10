/**
 * packages/documentation/test/public.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as api from '../dist/index.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
test('public API exports the capability contract', () => {
	assert.ok('documentationFindings' in api, 'exports documentationFindings');
	assert.ok('documentSrcFile' in api, 'exports documentSrcFile');
	assert.ok('documentedCommandFindings' in api, 'exports documentedCommandFindings');
});
test('standalone CLI exposes shared help', () => {
	const script = new URL('../dist/cli.js', import.meta.url);
	const result = spawnSync(process.execPath, [script.pathname, '--help'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Usage:/);
});
test('capability package does not depend on the aggregate runner', () => {
	const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	assert.equal(Object.hasOwn(manifest.dependencies ?? {}, '@terra-symposium/standards-quality'), false);
});
test('warn is read-only and documentation scaffolding adds no prose', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-documentation-cli-'));
	try {
		mkdirSync(join(root, 'src'));
		const source = join(root, 'src/main.ts');
		writeFileSync(source, 'export function value(input: string): string { return input; }\n');
		const config = join(root, 'quality.json');
		writeFileSync(config, JSON.stringify({ sourceRoots: ['src'], extensions: ['.ts'] }));
		const script = new URL('../dist/cli.js', import.meta.url);
		const warn = spawnSync(process.execPath, [script.pathname, '--config', config, '--all', '--warn'], { cwd: root, encoding: 'utf8' });
		assert.equal(warn.status, 1, warn.stderr);
		assert.equal(readFileSync(source, 'utf8'), 'export function value(input: string): string { return input; }\n');
		const fix = spawnSync(process.execPath, [script.pathname, '--config', config, '--all'], { cwd: root, encoding: 'utf8' });
		assert.equal(fix.status, 1, fix.stderr);
		const updated = readFileSync(source, 'utf8');
		assert.match(updated, /\/\*\*\s+\*\s+\*\//u);
		assert.doesNotMatch(updated, /\* [A-Z][^\n]*/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
