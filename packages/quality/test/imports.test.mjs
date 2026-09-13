/**
 * packages/quality/test/imports.test.mjs
 * Verifies internal import resolution across source, asset, and module forms.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkImports, createQualityCfg } from '../dist/index.js';
import { fixtureFile, fixtureRoot } from './support.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('import validation resolves relative, aliased, index, asset, export, dynamic, and require imports', () => {
	const root = fixtureRoot('terra-quality-imports-');
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
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '@/': 'src/' } });
	assert.deepEqual(checkImports(cfg), [{ importer: 'src/main.ts', specifier: './missing.js' }]);
});
test('import validation respects external prefixes, explicit unsupported extensions, and missing index targets', () => {
	const root = fixtureRoot('terra-quality-import-policy-');
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
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '~/': 'vendor/' }, externalPrefixes: ['~/'] });
	assert.deepEqual(checkImports(cfg), [{ importer: 'src/main.ts', specifier: './missing.css' }]);
});
