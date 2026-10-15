/**
 * packages/quality/test/files.test.mjs
 * Verifies source discovery, working-tree scope selection, and path helpers.
 * Fixtures are isolated temporary repositories so cache and Git behavior are
 * tested without modifying the Standards checkout.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityCfg, displayPath, isFile, srcFiles, workingSrcFiles } from '../dist/index.js';
import { execFileSync } from 'node:child_process';
import { fixtureFile, fixtureRoot } from './support.mjs';
import { join } from 'node:path';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('source discovery handles nested roots, include roots, exclusions, direct files, and files created during a run', () => {
	const root = fixtureRoot('terra-quality-files-');
	const main = fixtureFile(root, 'src/main.ts', 'export const main = true;\n');
	fixtureFile(root, 'src/nested/keep.ts', 'export const keep = true;\n');
	fixtureFile(root, 'src/nested/skip.ts', 'export const skip = true;\n');
	fixtureFile(root, 'src/node_modules/dependency.ts', 'export const dependency = true;\n');
	fixtureFile(root, 'src/ignored/generated.ts', 'export const generated = true;\n');
	fixtureFile(root, 'include/index.js', 'export const included = true;\n');
	fixtureFile(root, 'include/notes.md', '# not source\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], includeRoots: ['include'], extensions: ['.ts', '.js'], skippedDirectories: ['ignored'], skippedFiles: ['src/nested/skip.ts'] });
	assert.deepEqual(srcFiles(cfg), [main, join(root, 'include/index.js'), join(root, 'src/nested/keep.ts')].sort());
	fixtureFile(root, 'src/new.ts', 'export const newFile = true;\n');
	assert.deepEqual(srcFiles(cfg), [main, join(root, 'include/index.js'), join(root, 'src/nested/keep.ts'), join(root, 'src/new.ts')].sort());
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: [main], extensions: ['.ts'] })), [main]);
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: ['does-not-exist'], extensions: ['.ts'] })), []);
});
test('excludeTests omits test and spec files from quality source discovery', () => {
	const root = fixtureRoot('terra-quality-exclude-tests-');
	const implementation = fixtureFile(root, 'src/feature.ts', 'export const feature = true;\n');
	fixtureFile(root, 'src/feature.test.ts', 'export const testFeature = true;\n');
	fixtureFile(root, 'src/feature.spec.tsx', 'export const specFeature = true;\n');
	const withTests = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] });
	const withoutTests = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'], excludeTests: true });
	assert.equal(srcFiles(withTests).length, 3);
	assert.deepEqual(srcFiles(withoutTests), [implementation]);
});
test('working-tree discovery includes modified and untracked sources but excludes ignored files', () => {
	const root = fixtureRoot('terra-quality-working-files-');
	fixtureFile(root, '.gitignore', 'src/ignored.ts\n');
	fixtureFile(root, 'src/changed.ts', 'export const changed = false;\n');
	fixtureFile(root, 'src/deleted.ts', 'export const deleted = true;\n');
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '.'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=quality-test', '-c', 'user.email=quality@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
	fixtureFile(root, 'src/changed.ts', 'export const changed = true;\n');
	fixtureFile(root, 'src/new.ts', 'export const added = true;\n');
	fixtureFile(root, 'src/ignored.ts', 'export const ignored = true;\n');
	const deleted = join(root, 'src/deleted.ts');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	execFileSync('git', ['rm', '-q', deleted], { cwd: root });
	assert.deepEqual(workingSrcFiles(cfg), [join(root, 'src/changed.ts'), join(root, 'src/new.ts')]);
});
test('path utilities distinguish files, directories, missing paths, and repository-relative display names', () => {
	const root = fixtureRoot('terra-quality-paths-');
	const file = fixtureFile(root, 'src/main.ts', 'const value = true;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(isFile(file), true);
	assert.equal(isFile(join(root, 'src')), false);
	assert.equal(isFile(join(root, 'missing.ts')), false);
	assert.equal(displayPath(cfg, file), 'src/main.ts');
	assert.equal(displayPath(cfg, root), root.split('/').at(-1));
});
