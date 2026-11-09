/**
 * packages/quality/test/transforms/inline-if.test.mjs
 * Verifies safe single-statement conditional inlining and idempotence.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { collapseInlineIfs } from '../../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../../support/fixtures.mjs';
import { runInNewContext } from 'node:vm';

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
if (outer) { if (inner) run(); } else stop();
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
if (outer) { if (inner) run(); } else stop();
if (multiple) { first(); second(); }
`,
	);
	assert.equal(collapseInlineIfs(file), false);
});
test('collapseInlineIfs preserves the historical nested-if else owner and runtime behavior', () => {
	const root = fixtureRoot('terra-quality-inline-if-else-owner-');
	const file = fixtureFile(root, 'src/main.ts', 'if (outer) { if (inner) run(); } else stop();\n');
	const original = fixtureText(root, 'src/main.ts');
	/**
	 * Evaluates conditional source with recording branch functions.
	 *
	 * @param src Conditional statement to evaluate.
	 * @param outer Value used for the outer condition.
	 * @param inner Value used for the inner condition.
	 *
	 * @return Branch names recorded in execution order.
	 */
	const execute = (src, outer, inner) => {
		const result = [];
		/**
		 * Records that the conditional source called its `run` branch.
		 *
		 * @return The number of recorded branch calls.
		 */
		const run = () => result.push('run');
		/**
		 * Records that the conditional source called its `stop` branch.
		 *
		 * @return The number of recorded branch calls.
		 */
		const stop = () => result.push('stop');
		runInNewContext(`(() => { const outer = ${outer}; const inner = ${inner}; ${src} return result; })()`, { result, run, stop });
		return result;
	};
	assert.equal(collapseInlineIfs(file), false);
	const retained = fixtureText(root, 'src/main.ts');
	assert.equal(retained, original);
	for (const outer of [false, true]) {
		for (const inner of [false, true]) assert.deepEqual(execute(retained, outer, inner), execute(original, outer, inner));
	}
	assert.deepEqual(execute(retained, false, false), ['stop']);
	assert.deepEqual(execute(retained, true, false), []);
	assert.deepEqual(execute(retained, true, true), ['run']);
});
