/**
 * packages/quality/src/lib/progress.ts
 * Shared single-line progress display for quality work.
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const PROGRESS_BAR_WIDTH = 24;
let progressSuppressed = false;

/**
 * Suppresses progress bars while preserving completed findings and summaries.
 *
 * @param suppressed Whether updates should be omitted until suppression is disabled.
 */
export function setQualityProgressSuppressed(suppressed: boolean): void {
	progressSuppressed = suppressed;
}

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Writes one progress update to the shared in-place progress line.
 *
 * @param label Short description of the work currently progressing.
 * @param curr Number of completed units.
 * @param total Total units, or zero when there is no work to process.
 * @param write Optional output writer used by tests; production writes to standard error.
 * @param opts Optional line-finalization policy for streams with late discoveries.
 *
 * @return Nothing; the progress bar is written to standard error and may end with a newline.
 */
export function qualityProgress(label: string, curr: number, total: number, write: (text: string) => void = (text) => void process.stderr.write(text), opts: { finalize?: boolean } = {}): void {
	if (progressSuppressed) return;
	const sTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
	const completed = sTotal ? Math.min(Math.max(Math.floor(curr), 0), sTotal) : 0;
	const fraction = sTotal ? completed / sTotal : 1;
	const filled = Math.round(fraction * PROGRESS_BAR_WIDTH);
	const line = `  ${label} [${'█'.repeat(filled)}${'░'.repeat(PROGRESS_BAR_WIDTH - filled)}] ${completed}/${sTotal}`;
	const finalize = opts.finalize ?? completed >= sTotal;
	write(`\r${line}${finalize ? '\n' : ''}`);
}
