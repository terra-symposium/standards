/**
 * packages/quality/test/progress.test.mjs
 * Verifies that quality progress always renders a bar on one updated line.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { qualityProgress } from '../dist/progress.js';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('progress updates always include a bar and rewrite one line even without a TTY', () => {
	const writes = [];
	const capture = (chunk) => writes.push(chunk);
	qualityProgress('Sample scan', 0, 4, capture);
	qualityProgress('Sample scan', 2, 4, capture);
	qualityProgress('Sample scan', 4, 4, capture);
	qualityProgress('Empty scan', 0, 0, capture);

	const updates = writes.filter((write) => write.startsWith('\r'));
	assert.equal(updates.length, 4);
	assert.ok(
		updates.every((write) => /\[[= ]{24}\] \d+\/\d+$/.test(write.slice(1).trimEnd())),
		writes.join(''),
	);
	assert.equal((writes.join('').match(/\n/g) ?? []).length, 2);
	assert.ok(updates[0]?.includes('[                        ] 0/4'));
	assert.ok(updates[1]?.includes('[============            ] 2/4'));
	assert.ok(updates[2]?.includes('[========================] 4/4'));
	assert.ok(updates[3]?.includes('[========================] 0/0'));
});
