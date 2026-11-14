import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// terra-quality-ignore single-use -- Keep the installed Knip executable path for the isolated consumer fixture.
const KNIP_BIN = fileURLToPath(new URL('../../../../config/node_modules/.bin/knip', import.meta.url));
// terra-quality-ignore single-use -- Keep the installed ESLint executable path for the isolated consumer fixture.
const ESLINT_BIN = fileURLToPath(new URL('../../../../config/node_modules/.bin/eslint', import.meta.url));
// terra-quality-ignore single-use -- Keep the built Quality runner path for the isolated consumer fixture.
const RUNNER = fileURLToPath(new URL('../../dist/lib/runner.js', import.meta.url));

test('Knip source ownership counts only declared dependencies imported by mapped parent sources', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-knip-package-mapping-'));
	try {
		for (const dir of ['config', 'src', 'node_modules/used-dep', 'node_modules/unlisted-dep', 'node_modules/style-dep', 'node_modules/require-resolve-dep', 'node_modules/meta-resolve-dep'])
			mkdirSync(join(root, dir), { recursive: true });
		writeFileSync(join(root, 'config', 'eslint.config.mjs'), 'export default [];\n');
		writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'workspace-shell', private: true }));
		writeFileSync(
			join(root, 'config', 'package.json'),
			JSON.stringify({
				name: 'mapped-app',
				private: true,
				dependencies: { 'used-dep': '1.0.0', 'style-dep': '1.0.0', 'require-resolve-dep': '1.0.0', 'meta-resolve-dep': '1.0.0', 'unused-dep': '1.0.0' },
			}),
		);
		writeFileSync(
			join(root, 'config', 'knip.json'),
			JSON.stringify({ workspaces: { '.': { entry: ['src/**/*.js', 'src/**/*.mjs'], project: ['src/**/*.js', 'src/**/*.mjs'] }, config: { entry: [], project: [] } } }),
		);
		writeFileSync(join(root, 'src', 'index.js'), "import { value } from 'used-dep';\nimport 'unlisted-dep';\nconsole.log(value);\n");
		writeFileSync(join(root, 'src', 'require-resolve.js'), "const dependencyPath = require.resolve('require-resolve-dep');\nconsole.log(dependencyPath);\n");
		writeFileSync(join(root, 'src', 'meta-resolve.mjs'), "const dependencyPath = import.meta.resolve('meta-resolve-dep');\nconsole.log(dependencyPath);\n");
		writeFileSync(join(root, 'src', 'theme.css'), '@import "style-dep";\n');
		writeFileSync(
			join(root, 'quality.json'),
			JSON.stringify({
				root: '.',
				sourceRoots: ['.'],
				extensions: ['.js', '.mjs'],
				configRoot: 'config',
				tools: { eslint: ESLINT_BIN, knip: KNIP_BIN },
				knipPackageMappings: [{ sourceRoots: ['src'], packageRoot: 'config' }],
			}),
		);
		for (const name of ['used-dep', 'unlisted-dep', 'style-dep', 'require-resolve-dep', 'meta-resolve-dep']) {
			writeFileSync(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, version: '1.0.0', main: 'index.js' }));
			writeFileSync(join(root, 'node_modules', name, 'index.js'), 'export const value = true;\n');
		}

		const result = spawnSync(process.execPath, [RUNNER, 'knip', '--all'], { cwd: root, encoding: 'utf8' });
		const output = `${result.stdout}\n${result.stderr}`;
		assert.equal(result.status, 1, output);
		assert.match(output, /unlisted-dep/u, 'an import absent from the mapped package manifest remains a finding');
		assert.match(output, /unused-dep/u, 'a declared dependency with no source import remains a finding');
		assert.doesNotMatch(output, /(^|\s)used-dep($|\s)/u, 'a declared dependency imported by mapped parent source is counted as used');
		assert.doesNotMatch(output, /style-dep/u, 'a dependency imported by a mapped stylesheet is counted as used');
		assert.doesNotMatch(output, /require-resolve-dep/u, 'require.resolve literals count as source usage');
		assert.doesNotMatch(output, /meta-resolve-dep/u, 'import.meta.resolve literals count as source usage');
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
