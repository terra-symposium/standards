/**
 * packages/quality-core/test/public.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as api from '../dist/index.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { join, relative } from 'node:path';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
test('public API exports the capability contract', () => {
	assert.ok('loadQualityConfig' in api, 'exports loadQualityConfig');
	assert.ok('qualityScope' in api, 'exports qualityScope');
	assert.ok('createQualityAnalysis' in api, 'exports createQualityAnalysis');
	assert.ok('srcFiles' in api, 'exports srcFiles');
});
test('shared config lookup and changed-file scope include modified and untracked sources', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-core-'));
	try {
		mkdirSync(join(root, 'src'));
		writeFileSync(join(root, 'src/changed.ts'), 'export const before = 1;\n');
		writeFileSync(join(root, 'src/stable.ts'), 'export const stable = 1;\n');
		const runGit = (args) => {
			const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
			assert.equal(result.status, 0, result.stderr);
		};
		runGit(['init', '-q']);
		runGit(['config', 'user.name', 'Quality Core Test']);
		runGit(['config', 'user.email', 'quality-core-test@example.invalid']);
		runGit(['add', 'src']);
		runGit(['commit', '-qm', 'baseline']);
		writeFileSync(join(root, 'src/changed.ts'), 'export const after = 1;\n');
		writeFileSync(join(root, 'src/added.ts'), 'export const added = 1;\n');
		const config = join(root, 'quality.json');
		writeFileSync(config, JSON.stringify({ sourceRoots: ['src'], extensions: ['.ts'] }));
		const cfg = api.loadQualityConfig(config);
		assert.equal(cfg.root, root);
		assert.deepEqual(
			api.workingSrcFiles(cfg).map((file) => relative(root, file)),
			['src/added.ts', 'src/changed.ts'],
		);
		assert.deepEqual(api.qualityScope(cfg).sourceRoots, [join(root, 'src')]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
