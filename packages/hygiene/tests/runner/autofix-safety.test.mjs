/**
 * packages/hygiene/tests/runner/autofix-safety.test.mjs
 * Checks that Quality autofixes preserve source files across failures.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runQualityFromCfg } from '../../dist/lib/runner.js';
import { QUALITY_CHECK_NAMES } from '../../dist/capabilities/core/index.js';

test('autofix restores a file when a formatter introduces syntax errors', async () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-safety-'));
	const src = join(root, 'src/main.js');
	const fmt = join(root, 'formatter.mjs');
	const config = join(root, 'quality.json');
	mkdirSync(join(root, 'src'));
	writeFileSync(src, 'export const value = { ok: true };\n');
	writeFileSync(fmt, `#!/usr/bin/env node\nimport { writeFileSync } from 'node:fs';\nif (!process.argv.includes('--version')) writeFileSync(${JSON.stringify(src)}, 'export const value = ;\\n');\n`);
	chmodSync(fmt, 0o755);
	writeFileSync(
		config,
		JSON.stringify({ root, sourceRoots: ['src'], extensions: ['.js'], tools: { prettier: fmt }, enabledChecks: Object.fromEntries(QUALITY_CHECK_NAMES.map(name => [name, name === 'format'])) }),
	);
	// hygiene-ignore single-use -- Snapshot the prior process exit code before this test changes it, then restore that exact value.
	const prevExitCode = process.exitCode;
	try {
		await runQualityFromCfg(config, ['quality', '--all', '--fix']);
		assert.equal(readFileSync(src, 'utf8'), 'export const value = { ok: true };\n');
		assert.equal(process.exitCode, 1);
		// hygiene-ignore single-use -- Keep the exact lock path for asserting that the fixing run releases it.
		const lock = join(tmpdir(), `hygiene-${createHash('sha256').update(root).digest('hex').slice(0, 24)}.lock`);
		assert.equal(existsSync(lock), false);
	} finally {
		process.exitCode = prevExitCode;
		rmSync(root, { recursive: true, force: true });
	}
});

test('a second Quality run refuses to overlap a live fixer', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-lock-test-'));
	const config = join(root, 'quality.json');
	const lock = join(tmpdir(), `hygiene-${createHash('sha256').update(root).digest('hex').slice(0, 24)}.lock`);
	mkdirSync(join(root, 'src'));
	writeFileSync(join(root, 'src/main.js'), 'export const value = 1;\n');
	writeFileSync(config, JSON.stringify({ root, sourceRoots: ['src'], extensions: ['.js'], enabledChecks: Object.fromEntries(QUALITY_CHECK_NAMES.map(name => [name, false])) }));
	mkdirSync(lock);
	writeFileSync(join(lock, 'pid'), String(process.pid));
	try {
		assert.throws(() => runQualityFromCfg(config, ['quality', '--all', '--fix']), /already running/);
	} finally {
		rmSync(lock, { recursive: true, force: true });
		rmSync(root, { recursive: true, force: true });
	}
});

test('explicit warn reports findings without changing files or failing', async () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-warn-test-'));
	const src = join(root, 'src/main.js');
	const fmt = join(root, 'formatter.mjs');
	const config = join(root, 'quality.json');
	mkdirSync(join(root, 'src'));
	writeFileSync(src, 'export const value={ok:true};\n');
	writeFileSync(fmt, '#!/usr/bin/env node\nprocess.exit(1);\n');
	chmodSync(fmt, 0o755);
	writeFileSync(
		config,
		JSON.stringify({ root, sourceRoots: ['src'], extensions: ['.js'], tools: { prettier: fmt }, enabledChecks: Object.fromEntries(QUALITY_CHECK_NAMES.map(name => [name, name === 'format'])) }),
	);
	// hygiene-ignore single-use -- Restore the exact pre-test exit code after checking warning-only behavior.
	const prevExitCode = process.exitCode;
	try {
		await runQualityFromCfg(config, ['quality', '--all', '--warn']);
		assert.equal(readFileSync(src, 'utf8'), 'export const value={ok:true};\n');
		assert.equal(process.exitCode, 0);
	} finally {
		process.exitCode = prevExitCode;
		rmSync(root, { recursive: true, force: true });
	}
});
