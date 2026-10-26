/**
 * packages/quality/src/lib/playwright-reporter.ts
 * Structural Playwright reporter for per-test progress and final results.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { qualityProgress } from './progress.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/**
 * Status values reported by Playwright for an individual test attempt.
 */
type PlaywrightStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
/**
 * Normalized status rendered by the shared quality reporter.
 */
type QualityStatus = 'PASS' | 'FAIL' | 'SKIP';
/**
 * Result data retained for one Playwright test attempt.
 */
type PlaywrightTestResult = { status: PlaywrightStatus; retry: number; error?: { message?: string } };
/**
 * Structural test data needed to report progress without importing Playwright.
 */
type PlaywrightTestCase = {
	title: string;
	titlePath?: () => string[];
	expectedStatus?: PlaywrightStatus;
	retries?: number;
	results?: PlaywrightTestResult[];
	outcome?: () => 'skipped' | 'expected' | 'unexpected' | 'flaky';
};
/**
 * Minimal Playwright suite contract used to enumerate discovered tests.
 */
type PlaywrightSuite = { allTests(): PlaywrightTestCase[] };
/**
 * Final run status passed to the Playwright reporter's `onEnd` callback.
 */
type PlaywrightFullResult = { status: 'passed' | 'failed' | 'timedout' | 'interrupted' };
/**
 * Optional output sinks for the Playwright progress reporter.
 */
export type QualityPlaywrightReporterOptions = { write?: (text: string) => void; writeProgress?: (text: string) => void };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Resolves a completed Playwright test to one of the supported case statuses.
 *
 * @param test Playwright test case.
 * @param result Last result recorded for the test, if it ran.
 *
 * @return Normalized pass, fail, or skip status.
 */
function qualityStatus(test: PlaywrightTestCase, result?: PlaywrightTestResult): QualityStatus {
	if (!result || result.status === 'skipped' || test.expectedStatus === 'skipped') return 'SKIP';
	const outcome = test.outcome?.();
	if (outcome === 'skipped') return 'SKIP';
	if (outcome === 'expected' || outcome === 'flaky') return 'PASS';
	if (outcome === 'unexpected') return 'FAIL';
	if (result.status === (test.expectedStatus ?? 'passed')) return 'PASS';
	return result.status === 'passed' || result.status === 'failed' || result.status === 'timedOut' || result.status === 'interrupted' ? 'FAIL' : 'SKIP';
}

/**
 * Returns a stable display name for a test, including its suite path when present.
 *
 * @param test Playwright test case.
 *
 * @return A deterministic display name.
 */
function testName(test: PlaywrightTestCase): string {
	const titlePath = test.titlePath?.();
	return titlePath?.length ? titlePath.join(' › ') : test.title;
}

/*//////////////////////////////////////////////////
REPORTER
//////////////////////////////////////////////////*/

/**
 * Playwright reporter that counts tests once and prints final results in
 * discovery order. Playwright is structural here and remains a peer runtime
 * supplied by the consuming project.
 */
export default class QualityPlaywrightReporter {
	private readonly write: (text: string) => void;
	private readonly writeProgress: (text: string) => void;
	private tests: PlaywrightTestCase[] = [];
	private readonly started = new Set<PlaywrightTestCase>();
	private readonly finished = new Set<PlaywrightTestCase>();
	private readonly lastResults = new Map<PlaywrightTestCase, PlaywrightTestResult>();

	/**
	 * Creates a reporter with optional output sinks.
	 *
	 * @param opts Optional sinks for output and progress.
	 */
	constructor(opts: QualityPlaywrightReporterOptions = {}) {
		this.write = opts.write ?? ((text) => void process.stdout.write(text));
		this.writeProgress = opts.writeProgress ?? ((text) => void process.stderr.write(text));
	}

	/**
	 * Initializes progress from the discovered test cases.
	 *
	 * @param _config Playwright's resolved configuration.
	 * @param suite Root test suite supplied by Playwright.
	 */
	onBegin(_config: unknown, suite: PlaywrightSuite): void {
		this.tests = suite.allTests();
		qualityProgress('Cases', 0, this.tests.length, this.writeProgress);
	}

	/**
	 * Records that a test has started; retries reuse the same test identity.
	 *
	 * @param test Playwright test case.
	 */
	onTestBegin(test: PlaywrightTestCase): void {
		this.started.add(test);
	}

	/**
	 * Stores the latest attempt and advances progress only when no retry remains.
	 *
	 * @param test Playwright test case.
	 * @param result Result for this attempt.
	 */
	onTestEnd(test: PlaywrightTestCase, result: PlaywrightTestResult): void {
		this.lastResults.set(test, result);
		const canRetry = (result.status === 'failed' || result.status === 'timedOut') && result.retry < (test.retries ?? 0) && test.expectedStatus !== result.status;
		if (!canRetry) this.finish(test);
	}

	/**
	 * Resolves tests not observed in onTestEnd, then emits one ordered result and summary.
	 *
	 * @param result Final Playwright run result.
	 */
	onEnd(result: PlaywrightFullResult): void {
		const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
		for (const test of this.tests) {
			const latestResult = this.lastResults.get(test) ?? test.results?.at(-1);
			const status = this.started.has(test) && !latestResult ? 'FAIL' : qualityStatus(test, latestResult);
			counts[status] += 1;
			const msg = status === 'FAIL' ? latestResult?.error?.message?.replace(/\s+/gu, ' ').trim() : undefined;
			if (status !== 'PASS') this.write(`  [${status}] ${testName(test)}${msg ? ` — ${msg}` : ''}\n`);
			this.finish(test);
		}
		this.write(`Playwright ${result.status}: ${counts.PASS} passed, ${counts.FAIL} failed, ${counts.SKIP} skipped\n`);
	}

	/**
	 * Confirms this reporter owns terminal output so Playwright does not add another reporter.
	 *
	 * @return True because this reporter writes result lines and a summary.
	 */
	printsToStdio(): boolean {
		return true;
	}

	/**
	 * Adds a test to the completed set once and updates the shared progress bar.
	 *
	 * @param test Completed Playwright test case.
	 */
	private finish(test: PlaywrightTestCase): void {
		if (this.finished.has(test)) return;
		this.finished.add(test);
		qualityProgress('Cases', this.finished.size, this.tests.length, this.writeProgress);
	}
}
