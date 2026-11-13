/**
 * packages/quality/test/checks/files.test.mjs
 * Verifies source discovery, working-tree scope selection, and path helpers.
 * Fixtures are isolated temporary repositories so cache and Git behavior are
 * tested without modifying the Standards checkout.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { symlinkSync } from 'node:fs';
import test from 'node:test';
import { createQualityCfg, displayPath, isFile, nonProgramSrcFiles, srcFiles, workingSrcFiles } from '../../dist/index.js';
import { execFileSync } from 'node:child_process';
import { fixtureFile, fixtureRoot } from '../../support/fixtures.mjs';
import { join } from 'node:path';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('source discovery scans configured roots and include roots, handles direct files, and sees files created during a run', () => {
	const root = fixtureRoot('terra-quality-files-');
	const main = fixtureFile(root, 'src/main.ts', 'export const main = true;\n');
	fixtureFile(root, 'src/nested/keep.ts', 'export const keep = true;\n');
	fixtureFile(root, 'src/nested/skip.ts', 'export const skip = true;\n');
	fixtureFile(root, 'src/node_modules/dependency.ts', 'export const dependency = true;\n');
	fixtureFile(root, 'src/ignored/generated.ts', 'export const generated = true;\n');
	fixtureFile(root, 'include/index.js', 'export const included = true;\n');
	fixtureFile(root, 'include/notes.md', '# not source\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], includeRoots: ['include'], extensions: ['.ts', '.js'] });
	const discovered = [main, join(root, 'include/index.js'), join(root, 'src/ignored/generated.ts'), join(root, 'src/nested/keep.ts'), join(root, 'src/nested/skip.ts')].sort();
	assert.deepEqual(srcFiles(cfg), discovered);
	fixtureFile(root, 'src/new.ts', 'export const newFile = true;\n');
	assert.deepEqual(srcFiles(cfg), [...discovered, join(root, 'src/new.ts')].sort());
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: [main], extensions: ['.ts'] })), [main]);
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: ['does-not-exist'], extensions: ['.ts'] })), []);
});
test('source discovery includes test and spec files under configured roots', () => {
	const root = fixtureRoot('terra-quality-exclude-tests-');
	// terra-quality-ignore single-use -- Keep the implementation fixture path distinct from its generated and dependency files.
	const implementation = fixtureFile(root, 'src/feature.ts', 'export const feature = true;\n');
	fixtureFile(root, 'src/feature.test.ts', 'export const testFeature = true;\n');
	fixtureFile(root, 'src/feature.spec.tsx', 'export const specFeature = true;\n');
	assert.deepEqual(
		srcFiles(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] })),
		[implementation, join(root, 'src/feature.spec.tsx'), join(root, 'src/feature.test.ts')].sort(),
	);
});
test('source discovery ignores symlink entries and direct symlink roots', () => {
	const root = fixtureRoot('terra-quality-symlink-files-');
	const target = fixtureFile(root, 'config/package.json', '{"name":"fixture"}\n');
	const alias = join(root, 'package.json');
	symlinkSync(target, alias);
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.json'] })), [target]);
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: [alias], extensions: ['.json'] })), []);
});
test('source discovery separates captured prose and archived Gem attachments from authored source', () => {
	const root = fixtureRoot('terra-quality-captured-source-');
	// terra-quality-ignore single-use -- Keep the app source fixture path distinct from JSX and generated attachments in discovery checks.
	const application = fixtureFile(root, 'src/app.ts', 'export function startApp() {\n\treturn true;\n}\n');
	// terra-quality-ignore single-use -- Keep the JSX fragment fixture path distinct from the other authored source fixtures.
	const jsxFragment = fixtureFile(root, 'src/controls.tsx', '<><button type="button">Save</button><input aria-label="Search" /></>\n');
	// terra-quality-ignore single-use -- Keep the long authored source fixture path for the minified-file exclusion assertion.
	const authoredLongLine = fixtureFile(root, 'src/long-literal.ts', `export const article = '${'x'.repeat(10_001)}';\n`);
	fixtureFile(
		root,
		'content/Canvas.tsx',
		`\nimport { List } from '../../../../config/node_modules/.pnpm/postcss@8/node_modules/postcss/lib/list.d';
import { It, at, it, st } from '../../../../config/node_modules/.pnpm/rolldown@1/node_modules/rolldown/dist/shared/config.d';
import { send } from '../../../../config/node_modules/.pnpm/vite@8/node_modules/vite/dist/node/index.d';
Skip to content
Dashboard
Account

This captured page contains ordinary course text.
`,
	);
	// terra-quality-ignore single-use -- Keep the imported JSX fixture path for the source-discovery assertion.
	const importedJsx = fixtureFile(
		root,
		'src/imported-view.tsx',
		"import { useState } from 'react';\nexport function View() { const [open] = useState(false); return <button>{String(open)}</button>; }\n",
	);
	fixtureFile(root, 'content/CanvasExcerpt.ts', 'Skip to content\nExam brief\n');
	fixtureFile(root, 'content/course-data.ts', 'window.COURSE_DATA = { modules: [] };\n');
	fixtureFile(root, 'content/viewer/course-data.js', `window.COURSE_DATA = { "transcript": "${'course material '.repeat(1000)}" };`);
	fixtureFile(
		root,
		'content/viewer/bundle.js',
		`!function(e){function t(r){return e[r]}}({${'var module={};module.exports=function(value){return value+1};'.repeat(200)}});\n//# sourceMappingURL=bundle.js.map\n`,
	);
	// terra-quality-ignore single-use -- Keep the formatted bundle attachment path distinct from authored source files.
	const fmtBundle = fixtureFile(root, 'content/viewer/formatted/bundle.js', '/* bundled module */\nconst moduleValue = 1;\n'.repeat(3_000));
	// terra-quality-ignore single-use -- Keep the archived gem attachment path distinct from executable source files.
	const gemAttachment = fixtureFile(root, '.agents/personas/gems/content/blocks-mtwolpip.tsx', 'export function oldBlocks() { return []; }\n');
	// terra-quality-ignore single-use -- Keep the gem tool fixture path distinct from archived attachment code.
	const gemTool = fixtureFile(root, '.agents/personas/scripts/check.ts', 'export function checkPersonas() { return true; }\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.js', '.tsx', '.ts'] });
	assert.deepEqual(
		srcFiles(cfg),
		[application, authoredLongLine, gemTool, importedJsx, jsxFragment].sort((left, right) => left.localeCompare(right)),
	);
	assert.deepEqual(
		nonProgramSrcFiles(cfg),
		[
			join(root, 'content/Canvas.tsx'),
			join(root, 'content/CanvasExcerpt.ts'),
			join(root, 'content/course-data.ts'),
			join(root, 'content/viewer/bundle.js'),
			join(root, 'content/viewer/course-data.js'),
			fmtBundle,
			gemAttachment,
		].sort((left, right) => left.localeCompare(right)),
	);
});
test('root-wide source discovery excludes nested pnpm dependency sources', () => {
	const root = fixtureRoot('terra-quality-pnpm-source-scope-');
	// terra-quality-ignore single-use -- Keep the app source fixture path for the Git-tracking discovery assertion.
	const appSource = fixtureFile(root, 'src/main.ts', 'export const ready = true;\n');
	fixtureFile(root, 'node_modules/.pnpm/toolkit@1.0.0/node_modules/toolkit/uncheckedindexed.ts', 'const index = 0;\nexport const result = index + 1;\n');
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.ts'] })), [appSource]);
});
test('root-wide source discovery excludes Rust target build artifacts', () => {
	const root = fixtureRoot('terra-quality-rust-target-scope-');
	// terra-quality-ignore single-use -- Keep the app source fixture path for the Git-tracking discovery assertion.
	const appSource = fixtureFile(root, 'src/main.ts', 'export const ready = true;\n');
	fixtureFile(root, 'aussieplusplus/target/doc/search-index.js', 'var searchIndex = [];\n');
	fixtureFile(root, 'aussieplusplus/target/debug/build/generated.rs', 'pub fn generated() {}\n');
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.js', '.rs', '.ts'] })), [appSource]);
});
test('source discovery excludes ignored local artifacts while retaining tracked files', () => {
	const root = fixtureRoot('terra-quality-git-ignored-source-');
	fixtureFile(root, '.gitignore', '*.json\n');
	// terra-quality-ignore single-use -- Keep the tracked config fixture path distinct from deleted and untracked files.
	const tracked = fixtureFile(root, 'config.json', '{"enabled":true}\n');
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '.gitignore'], { cwd: root });
	execFileSync('git', ['add', '-f', 'config.json'], { cwd: root });
	fixtureFile(root, '.local-auth.json', '{"storageState":"private"}\n');
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.json'] })), [tracked]);
});
test('root-wide source discovery excludes Python virtual-environment packages', () => {
	const root = fixtureRoot('terra-quality-python-environment-scope-');
	// terra-quality-ignore single-use -- Keep the Python source fixture path distinct from the C source profile fixture.
	const appPython = fixtureFile(root, 'src/app.py', 'def run():\n    return True\n');
	// terra-quality-ignore single-use -- Keep the C source fixture path distinct from the Python source profile fixture.
	const appC = fixtureFile(root, 'src/native.c', 'int run(void) { return 1; }\n');
	fixtureFile(root, 'config/.venv/lib/python3.13/site-packages/third_party/module.py', 'def vendored():\n    return False\n');
	fixtureFile(root, 'config/venv/lib/python3.13/site-packages/third_party/module.pyi', 'def vendored() -> bool: ...\n');
	fixtureFile(root, 'config/.tox/py/lib/python3.13/site-packages/third_party/native.c', 'int vendored(void) { return 0; }\n');
	fixtureFile(root, 'config/.nox/py/lib/python3.13/site-packages/third_party/native.c', 'int vendored(void) { return 0; }\n');
	fixtureFile(root, 'config/.venv/lib/python3.13/site-packages/third_party/__pycache__/cache.py', 'def cached(): ...\n');
	assert.deepEqual(
		srcFiles(createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.c', '.py', '.pyi'] })),
		[appC, appPython].sort((left, right) => left.localeCompare(right)),
	);
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
	// terra-quality-ignore single-use -- Keep the deleted source path named for the tracked-file exclusion assertion.
	const deleted = join(root, 'src/deleted.ts');
	execFileSync('git', ['rm', '-q', deleted], { cwd: root });
	assert.deepEqual(workingSrcFiles(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] })), [join(root, 'src/changed.ts'), join(root, 'src/new.ts')]);
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
