/**
 * packages/hygiene/tests/checks/imports.test.mjs
 * Verifies internal import resolution across source, asset, and module forms.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkImports, createQualityCfg } from '../../dist/index.js';
import { fixtureFile, fixtureRoot } from '../../support/fixtures.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('import validation resolves relative, aliased, index, asset, export, dynamic, and require imports', () => {
	const root = fixtureRoot('hygiene-imports-');
	fixtureFile(
		root,
		'src/main.ts',
		`
import { local } from './local';
import { alias } from '@/alias';
export { indexed } from './folder';
const lazy = import('./lazy');
const asset = require('./asset.svg');
import './missing.js';
import './unsupported.txt';
const dynamic = import(moduleName);
const twoArgRequire = require('./not-static', moduleName);
void [local, alias, indexed, lazy, asset, dynamic, twoArgRequire];
`,
	);
	fixtureFile(root, 'src/local.ts', 'export const local = true;\n');
	fixtureFile(root, 'src/alias.ts', 'export const alias = true;\n');
	fixtureFile(root, 'src/folder/index.ts', 'export const indexed = true;\n');
	fixtureFile(root, 'src/lazy.ts', 'export const lazy = true;\n');
	fixtureFile(root, 'src/asset.svg', '<svg />\n');
	// hygiene-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '@/': 'src/' } });
	assert.deepEqual(checkImports(cfg), [{ importer: 'src/main.ts', specifier: './missing.js' }]);
});
test('import validation ignores module-looking examples in Markdown prose', () => {
	const root = fixtureRoot('hygiene-imports-markdown-prose-');
	fixtureFile(root, 'docs/archived.md', '```tsx\nimport Nodes from "@src/pages/docs/components/_Nodes";\n```\n');
	fixtureFile(root, 'src/main.ts', 'import missing from "./missing";\nvoid missing;\n');
	assert.deepEqual(checkImports(createQualityCfg({ root, sourceRoots: ['docs', 'src'], extensions: ['.md', '.ts'], aliases: { '@src/': 'src/' } })), [
		{ importer: 'src/main.ts', specifier: './missing' },
	]);
});
test('import validation respects external prefixes, explicit unsupported extensions, and missing index targets', () => {
	const root = fixtureRoot('hygiene-import-policy-');
	fixtureFile(
		root,
		'src/main.ts',
		`
import external from '~/external';
import './missing.css';
import './missing.txt';
void external;
`,
	);
	// hygiene-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '~/': 'vendor/' }, externalPrefixes: ['~/'] });
	assert.deepEqual(checkImports(cfg), [{ importer: 'src/main.ts', specifier: './missing.css' }]);
});
test('import validation resolves installed packages and Node builtins while reporting missing packages', () => {
	const root = fixtureRoot('hygiene-package-imports-');
	fixtureFile(
		root,
		'src/main.ts',
		`
import assert from 'node:assert/strict';
import { available } from 'installed-fixture';
import missing from 'not-installed-fixture';
import { actions } from 'astro:actions';
void [assert, available, missing, actions];
`,
	);
	fixtureFile(root, 'node_modules/installed-fixture/package.json', '{"types":"index.d.ts"}\n');
	fixtureFile(root, 'node_modules/installed-fixture/index.d.ts', 'export declare const available: true;\n');
	// hygiene-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(checkImports(cfg), [{ importer: 'src/main.ts', specifier: 'not-installed-fixture' }]);
});
test('import validation resolves package-exported assets and CSS package entrypoints', () => {
	const root = fixtureRoot('hygiene-package-assets-');
	fixtureFile(
		root,
		'src/main.ts',
		"import '@terra-symposium/docs/style.css';\nimport '@terra-symposium/docs/not-found.astro';\nimport '@terra-symposium/styling/ui.css';\nimport '@xyflow/react/dist/style.css';\nimport 'vidstack/styles/base.css';\nimport 'tw-animate-css';\nimport 'missing-package/style.css';\n",
	);
	fixtureFile(root, 'node_modules/@terra-symposium/docs/package.json', '{"exports":{"./style.css":"./style.css","./not-found.astro":"./not-found.astro"}}\n');
	fixtureFile(root, 'node_modules/@terra-symposium/docs/style.css', 'body {}\n');
	fixtureFile(root, 'node_modules/@terra-symposium/docs/not-found.astro', '<main />\n');
	fixtureFile(root, 'node_modules/@terra-symposium/styling/package.json', '{"exports":{"./ui.css":"./ui.css"}}\n');
	fixtureFile(root, 'node_modules/@terra-symposium/styling/ui.css', 'body {}\n');
	fixtureFile(root, 'node_modules/@xyflow/react/package.json', '{"exports":{"./dist/style.css":"./dist/style.css"}}\n');
	fixtureFile(root, 'node_modules/@xyflow/react/dist/style.css', 'body {}\n');
	fixtureFile(root, 'node_modules/vidstack/package.json', '{"exports":{"./styles/base.css":"./styles/base.css"}}\n');
	fixtureFile(root, 'node_modules/vidstack/styles/base.css', 'body {}\n');
	fixtureFile(root, 'node_modules/tw-animate-css/package.json', '{"exports":{".":{"style":"./dist/tw-animate.css"}}}\n');
	fixtureFile(root, 'node_modules/tw-animate-css/dist/tw-animate.css', 'body {}\n');
	fixtureFile(root, 'src/main.css', "@import 'tw-animate-css';\n@import 'unsafe-style';\n");
	fixtureFile(root, 'node_modules/unsafe-style/package.json', '{"exports":{".":{"style":"./../outside.css"}}}\n');
	fixtureFile(root, 'node_modules/outside.css', 'body {}\n');
	assert.deepEqual(checkImports(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.css'] })), [
		{ importer: 'src/main.css', specifier: 'unsafe-style' },
		{ importer: 'src/main.ts', specifier: 'tw-animate-css' },
		{ importer: 'src/main.ts', specifier: 'missing-package/style.css' },
	]);
});
