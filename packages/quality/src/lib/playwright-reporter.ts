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
 * Result data retained for one Playwright test attempt.
 */
type PlaywrightTestResult = {
	status: PlaywrightStatus;
	retry: number;
	error?: { message?: string };
};
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

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

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
	constructor(
		opts: {
			write?: (text: string) => void;
			writeProgress?: (text: string) => void;
		} = {},
	) {
		this.write = opts.write ?? ((text) => void process.stdout.write(text));
		this.writeProgress = opts.writeProgress ?? ((text) => void process.stderr.write(text));
	}

	/**
	 * Initializes progress from the discovered test cases.
	 *
	 * @param _config Playwright's resolved configuration.
	 * @param suite Root test suite supplied by Playwright.
	 */
	onBegin(
		_config: unknown,
		suite: {
			/**
			 * Return every test case discovered under the root suite.
			 * @returns The test cases used to initialize the progress reporter.
			 */
			allTests(): PlaywrightTestCase[];
		},
	): void {
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
		if (!((result.status === 'failed' || result.status === 'timedOut') && result.retry < (test.retries ?? 0) && test.expectedStatus !== result.status)) this.finish(test);
	}

	/**
	 * Resolves tests not observed in onTestEnd, then emits one ordered result and summary.
	 *
	 * @param result Final Playwright run result.
	 */
	onEnd(result: { status: 'passed' | 'failed' | 'timedout' | 'interrupted' }): void {
		const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
		for (const test of this.tests) {
			const latestResult = this.lastResults.get(test) ?? test.results?.at(-1);
			let status: 'PASS' | 'FAIL' | 'SKIP';
			if (this.started.has(test) && !latestResult) {
				status = 'FAIL';
			} else if (!latestResult || latestResult.status === 'skipped' || test.expectedStatus === 'skipped') {
				status = 'SKIP';
			} else {
				const outcome = test.outcome?.();
				if (outcome === 'skipped') status = 'SKIP';
				else if (outcome === 'expected' || outcome === 'flaky') status = 'PASS';
				else if (outcome === 'unexpected') status = 'FAIL';
				else if (latestResult.status === (test.expectedStatus ?? 'passed')) status = 'PASS';
				else status = latestResult.status === 'passed' || latestResult.status === 'failed' || latestResult.status === 'timedOut' || latestResult.status === 'interrupted' ? 'FAIL' : 'SKIP';
			}
			counts[status] += 1;
			const msg = status === 'FAIL' ? latestResult?.error?.message?.replace(/\s+/gu, ' ').trim() : undefined;
			if (status !== 'PASS')
				this.write(
					`  [${status}] ${(() => {
						const titlePath = test.titlePath?.();
						return titlePath?.length ? titlePath.join(' › ') : test.title;
					})()}${msg ? ` — ${msg}` : ''}\n`,
				);
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
