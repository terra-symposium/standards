/**
 * packages/quality/src/lib/node-reporter.ts
 * Per-case progress reporter for the Node.js test runner.
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
 * Describes the subset of Node test events used for progress and case summaries.
 */
type NodeTestE = {
	type: string;
	data?: {
		name?: string;
		nesting?: number;
		type?: string;
		testId?: number;
		testNumber?: number;
		file?: string;
		line?: number;
		skip?: boolean | string;
		todo?: boolean | string;
		counts?: { tests?: number; passed?: number; failed?: number; skipped?: number; todo?: number; cancelled?: number };
		details?: { type?: string; passed?: boolean; skip?: boolean | string; todo?: boolean | string; error?: { message?: string } | string };
	};
};

/*//////////////////////////////////////////////////
OPTIONS
//////////////////////////////////////////////////*/

/**
 * Replaces any inherited Node test reporter with the shared quality reporter.
 *
 * @param curr Existing `NODE_OPTIONS`, if set.
 * @param reporterUrl URL of the compiled shared reporter.
 *
 * @return Node options that retain unrelated flags and select one quality reporter.
 */
export function qualityNodeReporterOptions(curr: string | undefined, reporterUrl: string): string {
	const opts = curr?.match(/(?:[^\s"'=]+=)?(?:"[^"]*"|'[^']*'|[^\s]+)/gu) ?? [];
	const retained: string[] = [];
	for (let idx = 0; idx < opts.length; idx++) {
		const opt = opts[idx]!;
		if (opt === '--test-reporter' || opt === '--test-reporter-destination') {
			idx++;
			continue;
		}
		if (opt.startsWith('--test-reporter=') || opt.startsWith('--test-reporter-destination=')) continue;
		retained.push(opt);
	}
	return [...retained, `--test-reporter=${reporterUrl}`, '--test-reporter-destination=stdout'].join(' ');
}

/*//////////////////////////////////////////////////
REPORTER
//////////////////////////////////////////////////*/

/**
 * Node.js custom test reporter with one progress unit per non-suite test.
 *
 * Node 24's `test:complete` events provide execution-order progress and
 * file-scoped test IDs. The reporter also handles Node 18's older enqueue
 * events, which omit test IDs and suite types, by correlating source metadata
 * with terminal events. Discovery can continue while earlier files finish, so
 * live updates leave the line open and finalize once the event stream ends.
 * Test stdout, stderr, and diagnostics are intentionally ignored to avoid
 * replaying output already written by child processes.
 *
 * @param src Node.js test event stream.
 * @param opts Optional writer used by focused tests; opaque reporter arguments are ignored.
 *
 * @return The per-case result lines accepted by the Node reporter API.
 */
export async function* qualityNodeReporter(src: AsyncIterable<NodeTestE>, opts?: unknown): AsyncGenerator<string> {
	const reportProgress = typeof opts === 'function' ? (opts as (text: string) => void) : (text: string) => void process.stderr.write(text);
	let enqueued = 0;
	let completed = 0;
	const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
	let hasProgress = false;
	let lastProgressCompleted = -1;
	let lastProgressTotal = -1;
	let terminalProtocol: 'complete' | 'legacy' | undefined;
	let summaryCounts: NonNullable<NodeTestE['data']>['counts'];
	const pendingByIdentity = new Map<string, { counted: boolean }[]>();
	const seenTerminal = new Set<string>();
	/**
	 * Creates a stable identity for a test event used to match completion records.
	 * @param data Event metadata that may identify the test by ID, source, or position.
	 * @param terminal Whether terminal events may use the test number as an identity.
	 *
	 * @return A serialized identity key for the event.
	 */
	const identity = (data: NodeTestE['data'], terminal = false): string => {
		const file = data?.file ?? '';
		if (data?.testId !== undefined) return JSON.stringify([file, 'id', data.testId]) ?? '';
		if (terminal && data?.testNumber !== undefined) return JSON.stringify([file, 'number', data.testNumber]) ?? '';
		return JSON.stringify([file, 'source', data?.line ?? null, data?.nesting ?? 0, data?.name ?? 'unnamed test']) ?? '';
	};
	/**
	 * Determines whether an event represents the file-level test suite.
	 * @param data Event metadata to compare with the test file.
	 *
	 * @return `true` when the event is a top-level suite event.
	 */
	const isFileSuite = (data: NodeTestE['data']): boolean => {
		if (data?.nesting !== 0 || !data.name) return false;
		/**
		 * Extracts a normalized basename from a file path or file URL.
		 * @param path File path to normalize.
		 *
		 * @return The final path segment.
		 */
		const basename = (path: string): string =>
			path
				.replace(/^file:\/\//u, '')
				.replace(/\\/gu, '/')
				.split('/')
				.at(-1) ?? '';
		return (
			data.name === data.file ||
			(data.file !== undefined && basename(data.name) === basename(data.file)) ||
			(/(?:^|[/\\])[^/\\]+\.(?:test|spec)\.(?:[cm]?js|tsx?)$/u.test(data.name) && (data.file === undefined || data.line === 1))
		);
	};
	/**
	 * Updates the visible progress counts after processing a test event.
	 */
	const liveProgress = (): void => {
		lastProgressCompleted = completed;
		lastProgressTotal = Math.max(completed, enqueued);
		qualityProgress('Cases', lastProgressCompleted, lastProgressTotal, reportProgress, { finalize: false });
	};
	for await (const e of src) {
		if (e.type === 'test:summary') {
			const data = e.data;
			if (data?.file === undefined && data?.counts) summaryCounts = data.counts;
			continue;
		}
		if (e.type === 'test:enqueue') {
			if (isFileSuite(e.data)) continue;
			const counted = e.data?.type !== 'suite';
			if (counted) enqueued += 1;
			const key = identity(e.data);
			pendingByIdentity.set(key, [...(pendingByIdentity.get(key) ?? []), { counted }]);
			continue;
		}
		if (e.type !== 'test:complete' && e.type !== 'test:pass' && e.type !== 'test:fail') continue;
		const protocol = e.type === 'test:complete' ? 'complete' : 'legacy';
		terminalProtocol ??= protocol;
		if (protocol !== terminalProtocol) continue;
		const data = e.data;
		if (isFileSuite(data)) continue;
		const details = data?.details;
		const terminalKey = identity(data, true);
		if (seenTerminal.has(terminalKey)) continue;
		seenTerminal.add(terminalKey);
		if (details?.type === 'suite' || data?.type === 'suite') {
			const pendingKey = identity(data);
			const pendingEntries = pendingByIdentity.get(pendingKey) ?? [];
			const [pending] = pendingEntries.splice(0, 1);
			if (pendingEntries.length) pendingByIdentity.set(pendingKey, pendingEntries);
			else pendingByIdentity.delete(pendingKey);
			if (pending?.counted) {
				enqueued = Math.max(completed, enqueued - 1);
				if (hasProgress) liveProgress();
			}
			continue;
		}
		const pendingKey = identity(data);
		const pendingEntries = pendingByIdentity.get(pendingKey) ?? [];
		const [pending] = pendingEntries.splice(0, 1);
		if (pendingEntries.length) pendingByIdentity.set(pendingKey, pendingEntries);
		else pendingByIdentity.delete(pendingKey);
		if (pending && !pending.counted) enqueued += 1;
		completed += 1;
		liveProgress();
		hasProgress = true;
		const failed = e.type === 'test:fail' || (e.type === 'test:complete' && details?.passed === false);
		const status = (details?.skip ?? data?.skip) || ((details?.todo ?? data?.todo) && failed) ? 'SKIP' : failed ? 'FAIL' : 'PASS';
		counts[status] += 1;
		if (status !== 'PASS') {
			const err = e.data?.details?.error;
			const msg = typeof err === 'string' ? err : err?.message;
			yield `${'  '.repeat(Math.max(0, e.data?.nesting ?? 0))}[${status}] ${e.data?.name ?? 'unnamed test'}${status === 'FAIL' && msg ? ` — ${msg.replace(/\s+/gu, ' ').trim()}` : ''}\n`;
		}
	}
	const total = summaryCounts?.tests ?? enqueued;
	const finalCompleted = summaryCounts?.tests ?? completed;
	if (summaryCounts) {
		counts.PASS = summaryCounts.passed ?? counts.PASS;
		counts.FAIL = summaryCounts.failed ?? counts.FAIL;
		counts.SKIP = (summaryCounts.skipped ?? 0) + (summaryCounts.todo ?? 0) + (summaryCounts.cancelled ?? 0);
	}
	if (!hasProgress && total === 0) qualityProgress('Cases', 0, 0, reportProgress, { finalize: true });
	else if (lastProgressCompleted === finalCompleted && lastProgressTotal === total) reportProgress('\n');
	else qualityProgress('Cases', finalCompleted, total, reportProgress, { finalize: true });
	if (finalCompleted < total) yield `Node tests incomplete: ${total - finalCompleted} enqueued cases did not report a result\n`;
	yield `Node tests: ${counts.PASS} passed, ${counts.FAIL} failed, ${counts.SKIP} skipped\n`;
}

/**
 * Uses the shared reporter once in each test-runner process tree.
 *
 * Node propagates NODE_OPTIONS to isolated test workers and nested child
 * processes. The first runner owns progress; nested runners drain their event
 * streams so they cannot replay the same suite output.
 *
 * @param src Node.js test event stream.
 * @param opts Optional writer used by focused tests; opaque reporter arguments are ignored.
 *
 * @return The per-case result lines accepted by the Node reporter API.
 */
export default (async function* defaultQualityNodeReporter(src: AsyncIterable<NodeTestE>, opts?: unknown): AsyncGenerator<string> {
	const isTestWorker = process.env.NODE_TEST_CONTEXT === 'child-v8';
	if (isTestWorker) delete process.env.TERRA_QUALITY_NODE_REPORTER_OWNER;
	if (process.env.TERRA_QUALITY_NODE_REPORTER_OWNER !== '1' || isTestWorker) {
		for await (const _event of src) void _event;
		return;
	}
	yield* qualityNodeReporter(src, opts);
});
