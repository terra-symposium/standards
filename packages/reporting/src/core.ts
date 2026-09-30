/**
 * packages/reporting/src/core.ts
 * Framework-neutral test evidence models and normalization helpers.
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Status values emitted by the reporting pipeline. */
export const VISUAL_STATUSES = ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'] as const;

/** A normalized Playwright result status used by both output writers. */
export type VisualStatus = (typeof VISUAL_STATUSES)[number];

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/**
 * A completed or interrupted test result independent of a test framework's internal types.
 * Screenshot paths are resolved before the result is passed to artifact writers.
 */
export type VisualResult = {
	browserErrors: string;
	duration: number;
	error: string;
	file: string;
	groups: string;
	project: string;
	retry: number;
	screenshot: string;
	status: VisualStatus;
	terminalErrors: string;
	title: string;
	visual: string;
	viewport: string;
	viewportSize: string;
};

/** Playwright project files used to populate the project summary sheet. */
export type ProjectDefinition = { name: string; configuredFiles: readonly string[] };

/** All normalized evidence and run-level diagnostics for one report directory. */
export type ReportRun = { results: readonly VisualResult[]; runDiagnostics: readonly string[]; featureFiles: readonly string[]; projects: readonly ProjectDefinition[] };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Converts an external status into the normalized reporting status set.
 *
 * @param value External status value.
 * @returns A supported reporting status, defaulting to `failed` for unknown values.
 */
export const normalizeVisualStatus = (val: string): VisualStatus => (VISUAL_STATUSES.includes(val as VisualStatus) ? (val as VisualStatus) : 'failed');

/**
 * Converts internal status casing into the label shown in artifacts.
 *
 * @param status Normalized reporting status.
 * @returns The human-readable artifact label.
 */
export const statusLabel = (status: VisualStatus): string => (status === 'timedOut' ? 'timed out' : status);

/**
 * Counts newline-delimited diagnostic messages while treating an empty value as zero.
 *
 * @param value Newline-delimited diagnostic text.
 * @returns The number of non-empty diagnostic lines.
 */
export const diagnosticCount = (val: string): number => (val ? val.split('\n').filter(Boolean).length : 0);

/**
 * Returns one count for every supported status, including statuses absent from the run.
 *
 * @param results Normalized results to count.
 * @returns A complete status-to-count map.
 */
export const statusCounts = (results: readonly VisualResult[]): Record<VisualStatus, number> => {
	const counts = Object.fromEntries(VISUAL_STATUSES.map((s) => [s, 0])) as Record<VisualStatus, number>;
	for (const result of results) counts[result.status] += 1;
	return counts;
};

/**
 * Preserves configured feature-file order and appends unexpected result files once.
 *
 * @param run Normalized run whose configured and observed files are ordered.
 * @returns Unique feature-file names in report order.
 */
export const orderedFiles = (run: ReportRun): string[] => [
	...run.featureFiles.filter((f) => run.results.some((r) => r.file === f)),
	...run.results
		.map((r) => r.file)
		.filter((f) => !run.featureFiles.includes(f))
		.filter((f, i, v) => v.indexOf(f) === i),
];

/**
 * Selects the normalized results that belong to one feature file.
 *
 * @param run Normalized run to search.
 * @param file Feature-file name to select.
 * @returns Results associated with the requested feature file.
 */
export const resultsForFile = (run: ReportRun, file: string): VisualResult[] => run.results.filter((r) => r.file === file);
