/**
 * packages/hygiene/tests/runner/quality-runner-worktree.test.mjs
 * Verifies that Standards Quality works from a uniquely named worktree.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('recognizes Standards from its manifest in a uniquely named worktree', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-worktree-'));
	try {
		mkdirSync(join(root, 'scripts'));
		copyFileSync(fileURLToPath(new URL('../../../../scripts/quality-runner.mjs', import.meta.url)), join(root, 'scripts/quality-runner.mjs'));
		writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'standards-workspace-adapter' }));
		writeFileSync(join(root, 'quality.json'), '{}');
		const result = spawnSync(process.execPath, [join(root, 'scripts/quality-runner.mjs')], { cwd: root, env: { ...process.env, QUALITY_RUNNER_SCOPE_ONLY: '1' }, encoding: 'utf8' });
		if (result.status !== 0) throw new Error(result.stderr);
		const output = JSON.parse(result.stdout);
		if (output.repoName !== 'standards') throw new Error(`Unexpected repository identity: ${output.repoName}`);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
