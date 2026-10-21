/**
 * packages/quality/test/runner/progress.test.mjs
 * Verifies that quality progress always renders a bar on one updated line.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { qualityProgress, setQualityProgressSuppressed } from '../../dist/progress.js';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('progress updates always include a bar and rewrite one line even without a TTY', () => {
	const writes = [];
	const capture = (chunk) => writes.push(chunk);
	const stderr = process.stderr;
	const hadTTY = Object.hasOwn(stderr, 'isTTY');
	const originalTTY = stderr.isTTY;
	const hadCI = Object.hasOwn(process.env, 'CI');
	const originalCI = process.env.CI;
	try {
		stderr.isTTY = false;
		process.env.CI = 'true';
		qualityProgress('CI scan', 0, 4, capture);
		qualityProgress('CI scan', 2, 4, capture);
		qualityProgress('CI scan', 4, 4, capture);
		qualityProgress('Empty scan', 0, 0, capture);
		stderr.isTTY = true;
		delete process.env.CI;
		qualityProgress('TTY scan', 1, 2, capture);
	} finally {
		if (hadTTY) stderr.isTTY = originalTTY;
		else delete stderr.isTTY;
		if (hadCI) process.env.CI = originalCI;
		else delete process.env.CI;
	}
	const updates = writes.filter((write) => write.startsWith('\r'));
	assert.equal(updates.length, 5);
	assert.ok(
		updates.every((write) => /\[[█░]{24}\] \d+\/\d+$/.test(write.slice(1).trimEnd())),
		writes.join(''),
	);
	assert.equal((writes.join('').match(/\n/g) ?? []).length, 2);
	assert.ok(updates[0]?.includes('[░░░░░░░░░░░░░░░░░░░░░░░░] 0/4'));
	assert.ok(updates[1]?.includes('[████████████░░░░░░░░░░░░] 2/4'));
	assert.ok(updates[2]?.includes('[████████████████████████] 4/4'));
	assert.ok(updates[3]?.includes('[████████████████████████] 0/0'));
	assert.ok(updates[4]?.includes('[████████████░░░░░░░░░░░░] 1/2'));
	const streaming = [];
	qualityProgress('Cases', 1, 1, (write) => streaming.push(write), { finalize: false });
	qualityProgress('Cases', 2, 2, (write) => streaming.push(write), { finalize: false });
	qualityProgress('Cases', 2, 2, (write) => streaming.push(write), { finalize: true });
	assert.deepEqual(
		streaming.map((write) => write.endsWith('\n')),
		[false, false, true],
	);
});

test('quiet output suppresses progress writes', () => {
	const writes = [];
	setQualityProgressSuppressed(true);
	try {
		qualityProgress('Quiet scan', 1, 2, (chunk) => writes.push(chunk));
	} finally {
		setQualityProgressSuppressed(false);
	}
	assert.deepEqual(writes, []);
});
