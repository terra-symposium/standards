/**
 * packages/quality/test/inline-if.test.mjs
 * Verifies safe single-statement conditional inlining and idempotence.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { collapseInlineIfs } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('collapseInlineIfs collapses eligible one-statement blocks, preserves indentation and else syntax, and is idempotent', () => {
	const root = fixtureRoot('terra-quality-inline-if-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`if (ready) { start(); }
if (readyAgain) startAgain(); else {
	stop();
}
if (commented) { /* explain */ }
if (lineCommented) { // explain
	keep();
}
if (nested) { if (inner) { run(); } }
if (multiple) { first(); second(); }
`,
	);
	assert.equal(collapseInlineIfs(file), true);
	assert.equal(
		fixtureText(root, 'src/main.ts'),
		`if (ready) start();
if (readyAgain) startAgain(); else {
	stop();
}
if (commented) { /* explain */ }
if (lineCommented) { // explain
	keep();
}
if (nested) { if (inner) { run(); } }
if (multiple) { first(); second(); }
`,
	);
	assert.equal(collapseInlineIfs(file), false);
});
