/**
 * packages/naming/test/public.test.mjs
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
	assert.ok('namingFindings' in api, 'exports namingFindings');
	assert.ok('aliasFindings' in api, 'exports aliasFindings');
	assert.ok('fixNaming' in api, 'exports fixNaming');
	assert.ok('renameId' in api, 'exports renameId');
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
test('naming fixes are safe and idempotent', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-naming-package-'));
	try {
		mkdirSync(join(root, 'src'));
		const file = join(root, 'src/main.ts');
		writeFileSync(file, 'const administrator = "ok";\nconsole.log(administrator);\n');
		const cfg = { root, sourceRoots: [join(root, 'src')], extensions: ['.ts'] };
		assert.equal(api.namingFindings(cfg).length, 1);
		assert.equal(api.fixNaming(cfg), 1);
		assert.match(readFileSync(file, 'utf8'), /const admin = "ok"/u);
		assert.equal(api.namingFindings(cfg).length, 0);
		assert.equal(api.fixNaming(cfg), 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
