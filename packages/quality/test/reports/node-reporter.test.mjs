/**
 * packages/quality/test/reports/node-reporter.test.mjs
 * Verifies Node reporter case handling and child-output isolation.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import defaultQualityNodeReporter from '../../dist/node-reporter.js';
import { qualityNodeReporter, qualityNodeReporterOptions } from '../../dist/node-reporter.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates an async event source accepted by the Node custom reporter API.
 *
 * @param vals Reporter events.
 *
 * @return An async event stream.
 */
async function* eSrc(vals) {
	for (const val of vals) yield val;
}

/**
 * Runs the reporter with captured progress and returns its own output.
 *
 * @param vals Reporter events.
 *
 * @return Reporter output and progress writes.
 */
async function render(vals) {
	const progress = [];
	const output = [];
	for await (const chunk of qualityNodeReporter(eSrc(vals), (chunk) => progress.push(chunk))) output.push(chunk);
	return { output: output.join(''), progress: progress.join('') };
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('Node reporter reports nested cases once and ignores suite and child output events', async () => {
	const rendered = await render([
		{ type: 'test:enqueue', data: { name: 'quality.test.mjs', nesting: 0, file: '/repo/test/quality.test.mjs', line: 1, type: 'test' } },
		{ type: 'test:enqueue', data: { name: 'group', nesting: 0, file: 'quality.test.mjs', line: 10, type: 'suite' } },
		{ type: 'test:enqueue', data: { name: 'nested pass', nesting: 1, file: 'quality.test.mjs', line: 11 } },
		{ type: 'test:enqueue', data: { name: 'nested skip', nesting: 1, file: 'quality.test.mjs', line: 12 } },
		{ type: 'test:enqueue', data: { name: 'top failure', nesting: 0, file: 'quality.test.mjs', line: 13 } },
		{ type: 'test:enqueue', data: { name: 'top pass', nesting: 0, file: 'quality.test.mjs', line: 14 } },
		{ type: 'test:stdout', data: { message: 'captured child stdout' } },
		{ type: 'test:stderr', data: { message: 'captured child stderr' } },
		{ type: 'test:diagnostic', data: { message: 'captured diagnostic' } },
		{ type: 'test:pass', data: { name: 'nested pass', nesting: 1, file: 'quality.test.mjs', line: 11, testNumber: 1, details: {} } },
		{ type: 'test:pass', data: { name: 'nested skip', nesting: 1, file: 'quality.test.mjs', line: 12, testNumber: 2, details: { skip: true } } },
		{ type: 'test:fail', data: { name: 'top failure', nesting: 0, file: 'quality.test.mjs', line: 13, testNumber: 3, details: { error: new Error('failure') } } },
		{ type: 'test:pass', data: { name: 'top pass', nesting: 0, file: 'quality.test.mjs', line: 14, testNumber: 4, details: {} } },
		{ type: 'test:pass', data: { name: 'group', nesting: 0, file: 'quality.test.mjs', line: 10, testNumber: 5, details: { type: 'suite' } } },
		{ type: 'test:complete', data: { name: 'quality.test.mjs', nesting: 0, file: '/repo/test/quality.test.mjs', line: 1, testNumber: 6, details: { type: 'test', passed: true } } },
	]);

	assert.equal(rendered.output, '  [SKIP] nested skip\n[FAIL] top failure — failure\nNode tests: 2 passed, 1 failed, 1 skipped\n');
	assert.deepEqual(
		[...rendered.progress.matchAll(/(\d+\/\d+)/gu)].map(([, count]) => count),
		['1/4', '2/4', '3/4', '4/4'],
	);
	assert.doesNotMatch(rendered.output, /captured child|group/);
});

test('Node reporter renders an empty-run bar through the shared progress helper', async () => {
	const rendered = await render([]);
	assert.equal(rendered.output, 'Node tests: 0 passed, 0 failed, 0 skipped\n');
	assert.match(rendered.progress, /0\/0/);
	assert.match(rendered.progress, /\n$/);
});

test('Node reporter tracks concurrent, late-discovered cases and file-scoped ids on one bar', async () => {
	const rendered = await render([
		{ type: 'test:enqueue', data: { name: 'slow.test.mjs', nesting: 0, file: 'slow.test.mjs', line: 1, type: 'test' } },
		{ type: 'test:enqueue', data: { name: 'fast.test.mjs', nesting: 0, file: 'fast.test.mjs', line: 1, type: 'test' } },
		{ type: 'test:enqueue', data: { name: 'slow case', nesting: 0, file: 'slow.test.mjs', line: 3, testId: 1 } },
		{ type: 'test:enqueue', data: { name: 'fast case', nesting: 0, file: 'fast.test.mjs', line: 3, testId: 1 } },
		{ type: 'test:complete', data: { name: 'fast case', nesting: 0, file: 'fast.test.mjs', line: 3, testId: 1, details: { type: 'test', passed: true } } },
		{ type: 'test:enqueue', data: { name: 'late.test.mjs', nesting: 0, file: 'late.test.mjs', line: 1, type: 'test' } },
		{ type: 'test:enqueue', data: { name: 'late case', nesting: 0, file: 'late.test.mjs', line: 3, testId: 1 } },
		{
			type: 'test:complete',
			data: { name: 'slow case', nesting: 0, file: 'slow.test.mjs', line: 3, testId: 1, details: { type: 'test', passed: false, error: { message: 'failed after running concurrently' } } },
		},
		{ type: 'test:pass', data: { name: 'slow case', nesting: 0, file: 'slow.test.mjs', line: 3, testId: 1, testNumber: 1, details: {} } },
		{ type: 'test:pass', data: { name: 'fast case', nesting: 0, file: 'fast.test.mjs', line: 3, testId: 1, testNumber: 1, details: {} } },
		{ type: 'test:complete', data: { name: 'late case', nesting: 0, file: 'late.test.mjs', line: 3, testId: 1, details: { type: 'test', passed: true } } },
		{ type: 'test:complete', data: { name: 'slow.test.mjs', nesting: 0, file: 'slow.test.mjs', line: 1, testNumber: 2, details: { type: 'test', passed: true } } },
		{ type: 'test:complete', data: { name: 'fast.test.mjs', nesting: 0, file: 'fast.test.mjs', line: 1, testNumber: 2, details: { type: 'test', passed: true } } },
		{ type: 'test:complete', data: { name: 'late.test.mjs', nesting: 0, file: 'late.test.mjs', line: 1, testNumber: 2, details: { type: 'test', passed: true } } },
		{ type: 'test:summary', data: { counts: { tests: 3, passed: 2, failed: 1, skipped: 0, todo: 0, cancelled: 0 } } },
	]);

	assert.equal(rendered.output, '[FAIL] slow case — failed after running concurrently\nNode tests: 2 passed, 1 failed, 0 skipped\n');
	assert.deepEqual(
		[...rendered.progress.matchAll(/(\d+\/\d+)/gu)].map(([, count]) => count),
		['1/2', '2/3', '3/3'],
	);
	assert.equal((rendered.progress.match(/\n/gu) ?? []).length, 1);
});
test('Node reporter options replace inherited reporters and preserve unrelated runtime flags', () => {
	assert.equal(
		qualityNodeReporterOptions('--require preload.mjs --test-reporter=spec --test-reporter-destination=stderr', 'file:///quality-reporter.js'),
		'--require preload.mjs --test-reporter=file:///quality-reporter.js --test-reporter-destination=stdout',
	);
	assert.equal(
		qualityNodeReporterOptions('--test-reporter "path with spaces.mjs" --test-reporter-destination stderr', 'file:///quality-reporter.js'),
		'--test-reporter=file:///quality-reporter.js --test-reporter-destination=stdout',
	);
});

test('Node reporter ignores reporter API context values that are not progress writers', async () => {
	const stderr = [];
	const originalWrite = process.stderr.write;
	process.stderr.write = (chunk) => {
		stderr.push(String(chunk));
		return true;
	};
	try {
		for await (const chunk of qualityNodeReporter(eSrc([]), { destination: 'stdout' })) {
			assert.equal(typeof chunk, 'string');
		}
	} finally {
		process.stderr.write = originalWrite;
	}

	assert.match(stderr.join(''), /Cases .*0\/0/u);

	const nestedOutput = [];
	const originalReporterState = process.env.TERRA_QUALITY_NODE_REPORTER_OWNER;
	process.env.TERRA_QUALITY_NODE_REPORTER_OWNER = '1';
	try {
		for await (const chunk of defaultQualityNodeReporter(eSrc([{ type: 'test:fail', data: { name: 'nested child failure', nesting: 0, details: { error: 'failure' } } }]), (chunk) =>
			nestedOutput.push(chunk),
		))
			void chunk;
	} finally {
		if (originalReporterState === undefined) delete process.env.TERRA_QUALITY_NODE_REPORTER_OWNER;
		else process.env.TERRA_QUALITY_NODE_REPORTER_OWNER = originalReporterState;
	}
	assert.deepEqual(nestedOutput, []);
});
