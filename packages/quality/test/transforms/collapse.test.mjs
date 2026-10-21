/**
 * packages/quality/test/transforms/collapse.test.mjs
 * Verifies syntax-aware object and type-body whitespace collapsing.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { collapseTypesAndObjects } from '../../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../../support/fixtures.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('collapseTypesAndObjects preserves JSX-bearing objects and unsupported files while handling JavaScript-family extensions', () => {
	const root = fixtureRoot('terra-quality-collapse-edges-');
	const file = fixtureFile(root, 'src/main.mts', `const object = {\n\tvalue: true,\n};\n`);
	const jsx = fixtureFile(root, 'src/view.tsx', `const view = {\n\tcontent: <span>keep layout</span>,\n};\n`);
	const unsupported = fixtureFile(root, 'src/data.json', '{\n  "value": true\n}\n');
	assert.equal(collapseTypesAndObjects(file), true);
	assert.match(fixtureText(root, 'src/main.mts'), /const object = \{ value: true, \};/);
	assert.equal(collapseTypesAndObjects(file), false);
	const jsxBefore = fixtureText(root, 'src/view.tsx');
	assert.equal(collapseTypesAndObjects(jsx), false);
	assert.equal(fixtureText(root, 'src/view.tsx'), jsxBefore);
	assert.equal(collapseTypesAndObjects(unsupported), false);
	assert.equal(fixtureText(root, 'src/data.json'), '{\n  "value": true\n}\n');
});
