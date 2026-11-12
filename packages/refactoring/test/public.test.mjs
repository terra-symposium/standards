/**
 * packages/refactoring/test/public.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as api from '../dist/index.js';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadQualityConfig } from '@terra-symposium/standards-quality-core';
import { spawnSync } from 'node:child_process';
test('public API exports the capability contract', () => {
	assert.ok('objectForwardingFindings' in api, 'exports objectForwardingFindings');
	assert.ok('singleUseFindings' in api, 'exports singleUseFindings');
	assert.ok('fixSingleUseDeclarations' in api, 'exports fixSingleUseDeclarations');
});
test('public single-use API batches safe declaration inlining without the aggregate runner', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-refactoring-public-'));
	try {
		const sourceRoot = join(root, 'src');
		mkdirSync(sourceRoot);
		const sourcePath = join(sourceRoot, 'main.ts');
		writeFileSync(
			sourcePath,
			`const label = 'ready';
const retryCount = 3;
const available = true;
export const status = [label, retryCount, available];
`,
		);
		const configPath = join(root, 'quality.json');
		writeFileSync(configPath, JSON.stringify({ sourceRoots: ['src'], extensions: ['.ts'] }));
		const cfg = loadQualityConfig(configPath);
		assert.equal(api.singleUseFindings(cfg).filter((finding) => finding.autofixable).length, 3);
		assert.equal(api.fixSingleUseDeclarations(cfg), 1);
		const updated = readFileSync(sourcePath, 'utf8');
		assert.doesNotMatch(updated, /const (?:label|retryCount|available)\b/u);
		assert.match(updated, /export const status = \[\('ready'\), \(3\), \(true\)\]/u);
		assert.deepEqual(api.singleUseFindings(cfg), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('public single-use API batches static literals only at the first effect-safe consumer', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-refactoring-literal-'));
	try {
		const sourceRoot = join(root, 'src');
		mkdirSync(sourceRoot);
		const sourcePath = join(sourceRoot, 'main.js');
		writeFileSync(
			sourcePath,
			`const events = [];
function sideEffect() { events.push('effect'); return 'done'; }
function take(value, suffix) { events.push('take'); return [value, suffix]; }
function runObject() {
  const options = { retries: 3, enabled: true };
  return take(options, sideEffect());
}
function runArray() {
  const labels = ['fast', 'safe'];
  return take(labels, 'labels');
}
function runDelayed() {
  const delayedOptions = { retries: 4 };
  return take(sideEffect(), delayedOptions);
}
function runOptional() {
  const optionalOptions = { retries: 5 };
  return take?.(optionalOptions, 'optional');
}
console.log(JSON.stringify({ object: runObject(), array: runArray(), delayed: runDelayed(), optional: runOptional(), events }));
`,
		);
		const configPath = join(root, 'quality.json');
		writeFileSync(configPath, JSON.stringify({ sourceRoots: ['src'], extensions: ['.js'] }));
		const cfg = loadQualityConfig(configPath);
		const findings = api.singleUseFindings(cfg);
		assert.equal(findings.find((finding) => finding.name === 'options')?.autofixable, true);
		assert.equal(findings.find((finding) => finding.name === 'labels')?.autofixable, true);
		assert.equal(findings.find((finding) => finding.name === 'delayedOptions')?.autofixable, false);
		assert.equal(findings.find((finding) => finding.name === 'optionalOptions')?.autofixable, false);
		const before = spawnSync(process.execPath, [sourcePath], { encoding: 'utf8' });
		assert.equal(before.status, 0, before.stderr);
		assert.equal(api.fixSingleUseDeclarations(cfg), 1);
		const updated = readFileSync(sourcePath, 'utf8');
		assert.doesNotMatch(updated, /const (?:options|labels)\b/u);
		assert.match(updated, /take\(\(\{ retries: 3, enabled: true \}\), sideEffect\(\)\)/u);
		assert.match(updated, /take\(\(\['fast', 'safe'\]\), 'labels'\)/u);
		assert.match(updated, /const delayedOptions = \{ retries: 4 \}/u);
		assert.match(updated, /const optionalOptions = \{ retries: 5 \}/u);
		const after = spawnSync(process.execPath, [sourcePath], { encoding: 'utf8' });
		assert.equal(after.status, 0, after.stderr);
		assert.deepEqual(JSON.parse(after.stdout), JSON.parse(before.stdout));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
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
