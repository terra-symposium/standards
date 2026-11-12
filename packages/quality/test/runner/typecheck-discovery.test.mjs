import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { discoverTypecheckTargets, runTypecheckTargets } from '../../../../config/scripts/typecheck.mjs';

test('typecheck discovery finds configured package and app projects and rejects missing scripts', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-typecheck-discovery-'));
	try {
		const packageDir = join(root, 'packages', 'typed');
		const appDir = join(root, 'apps', 'site');
		for (const dir of [packageDir, appDir]) {
			mkdirSync(join(dir, 'config'), { recursive: true });
			mkdirSync(join(dir, 'src'), { recursive: true });
			writeFileSync(join(dir, 'config', 'tsconfig.json'), '{}\n');
			writeFileSync(join(dir, 'src', 'index.ts'), 'export {}\n');
		}
		writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'typed', scripts: { typecheck: 'tsc --noEmit -p config/tsconfig.json' } }));
		writeFileSync(join(appDir, 'package.json'), JSON.stringify({ name: 'site', scripts: { build: 'astro build' } }));
		assert.throws(() => discoverTypecheckTargets(root), /apps\/site.*no package\.json typecheck script/u);

		writeFileSync(join(appDir, 'package.json'), JSON.stringify({ name: 'site', scripts: { typecheck: 'astro check' } }));
		assert.deepEqual(
			discoverTypecheckTargets(root).map(({ name, script }) => ({ name, script })),
			[
				{ name: 'site', script: 'typecheck' },
				{ name: 'typed', script: 'typecheck' },
			],
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('typecheck runner stops at and returns the first failing workspace command', () => {
	const root = '/repo';
	const targets = [
		{ directory: '/repo/packages/first', name: 'first', script: 'typecheck' },
		{ directory: '/repo/apps/second', name: 'second', script: 'typecheck' },
	];
	const invocations = [];
	const status = runTypecheckTargets(targets, root, (command, args, options) => {
		invocations.push({ command, args, cwd: options.cwd });
		return { status: 2 };
	});
	assert.equal(status, 2);
	assert.deepEqual(invocations, [{ command: 'pnpm', args: ['--dir', 'packages/first', 'run', 'typecheck'], cwd: root }]);
});
