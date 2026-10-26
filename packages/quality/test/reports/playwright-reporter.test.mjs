/**
 * packages/quality/test/reports/playwright-reporter.test.mjs
 * Verifies Playwright reporter retries, terminal statuses, and output ordering.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import QualityPlaywrightReporter from '../../dist/lib/playwright-reporter.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates a structural Playwright test case without importing Playwright.
 *
 * @param title Test title.
 * @param opts Optional case expectations and outcome.
 *
 * @return A minimal reporter-compatible test case.
 */
function testCase(title, opts = {}) {
	return { title, expectedStatus: opts.expectedStatus ?? 'passed', retries: opts.retries ?? 0, results: [], titlePath: () => opts.titlePath ?? [title], outcome: () => opts.outcome ?? 'expected' };
}

/**
 * Creates one reporter-compatible attempt result.
 *
 * @param status Terminal status for this attempt.
 * @param retry Attempt index.
 *
 * @return A structural Playwright result.
 */
function testResult(status, retry = 0) {
	return { status, retry };
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('Playwright reporter counts retries once and writes terminal results in discovery order', () => {
	const output = [];
	const progress = [];
	const flaky = testCase('flaky case', { retries: 1, outcome: 'flaky', titlePath: ['file.spec.ts', 'suite', 'flaky case'] });
	const expectedFailure = testCase('expected failure', { expectedStatus: 'failed', outcome: 'expected' });
	const unexpectedFailure = testCase('unexpected failure', { outcome: 'unexpected' });
	const skipped = testCase('skipped case', { expectedStatus: 'skipped', outcome: 'skipped' });
	const tests = [flaky, expectedFailure, unexpectedFailure, skipped];
	const reporter = new QualityPlaywrightReporter({ write: (chunk) => output.push(chunk), writeProgress: (chunk) => progress.push(chunk) });

	reporter.onBegin({}, { allTests: () => tests });
	reporter.onTestBegin(flaky);
	const firstAttempt = testResult('failed', 0);
	flaky.results.push(firstAttempt);
	reporter.onTestEnd(flaky, firstAttempt);
	assert.doesNotMatch(progress.join(''), /1\/4/);

	reporter.onTestBegin(unexpectedFailure);
	reporter.onTestBegin(flaky);
	const retry = testResult('passed', 1);
	flaky.results.push(retry);
	reporter.onTestEnd(flaky, retry);

	reporter.onTestBegin(expectedFailure);
	const expectedAttempt = testResult('failed');
	expectedFailure.results.push(expectedAttempt);
	reporter.onTestEnd(expectedFailure, expectedAttempt);

	const failedAttempt = { ...testResult('timedOut'), error: { message: 'unexpected timeout' } };
	unexpectedFailure.results.push(failedAttempt);
	reporter.onTestEnd(unexpectedFailure, failedAttempt);

	reporter.onEnd({ status: 'failed' });

	assert.equal(output.join(''), '  [FAIL] unexpected failure — unexpected timeout\n  [SKIP] skipped case\nPlaywright failed: 2 passed, 1 failed, 1 skipped\n');
	assert.match(progress.join(''), /4\/4/);
	assert.equal((progress.join('').match(/Cases/g) ?? []).length, 5);
	assert.equal(reporter.printsToStdio(), true);
});

test('Playwright reporter handles an empty discovery set', () => {
	const output = [];
	const progress = [];
	const reporter = new QualityPlaywrightReporter({ write: (chunk) => output.push(chunk), writeProgress: (chunk) => progress.push(chunk) });

	reporter.onBegin({}, { allTests: () => [] });
	reporter.onEnd({ status: 'passed' });

	assert.match(progress.join(''), /0\/0/);
	assert.deepEqual(output, ['Playwright passed: 0 passed, 0 failed, 0 skipped\n']);
});
