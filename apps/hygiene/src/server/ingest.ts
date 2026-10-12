import { createHash } from 'node:crypto';
import { db } from './db.js';
import { parseBuildReport, reportTargetsTrackedBranch, type BuildReport, type HistoryReport } from './history.js';

/** Normalize report inputs before they are written to Neon. */
export function buildReportCounts(input: unknown): { report: BuildReport; tests: BuildReport['tests']; quality: BuildReport['quality'] } {
	const report = parseBuildReport(input);
	return { report, tests: report.tests, quality: report.quality };
}

/** Give each build a stable numeric key so retries of the same payload are idempotent. */
export function buildRunId(report: Pick<BuildReport, 'repository' | 'branch' | 'headSha' | 'completedAt'>): number {
	const identity = [report.repository.toLowerCase(), report.branch, report.headSha, report.completedAt].join('\0');
	return Number.parseInt(createHash('sha256').update(identity).digest('hex').slice(0, 13), 16) + 1;
}

async function persistHistoryReport(repositoryId: number, runId: number, report: HistoryReport, completedAt: string): Promise<void> {
	const sql = db();
	const snapshot = report.mode === 'snapshot';
	const commits = JSON.stringify(report.commits);
	await sql`WITH eligible AS (
		SELECT b.history_count
		FROM branches b JOIN repositories r ON r.id = b.repository_id
		WHERE b.repository_id = ${repositoryId} AND b.name = ${report.branch} AND b.enabled AND r.active
			AND ((${snapshot} AND (b.history_updated_at IS NULL OR b.history_updated_at <= ${completedAt}::timestamptz))
				OR (NOT ${snapshot} AND b.history_status = 'complete' AND b.history_head = ${report.baseSha}))
	), incoming AS (
		SELECT ordinality::integer AS ordinal, value->>'sha' AS sha, (value->>'authorDate')::timestamptz AS committed_at,
			(value->>'additions')::integer AS additions, (value->>'deletions')::integer AS deletions, (value->>'sourceLines')::integer AS source_lines
		FROM jsonb_array_elements(${commits}::jsonb) WITH ORDINALITY AS item(value, ordinality)
	), recorded AS (
		INSERT INTO history_reports (repository_id, run_id, run_attempt, branch, mode, head_sha, imported_at)
		SELECT ${repositoryId}, ${runId}, 1, ${report.branch}, ${report.mode}, ${report.headSha}, now() FROM eligible
		ON CONFLICT (repository_id, run_id, run_attempt, branch) DO NOTHING
		RETURNING branch
	), upserted AS (
		INSERT INTO commits (repository_id, branch, position, sha, committed_at, additions, deletions, source_lines)
		SELECT ${repositoryId}, ${report.branch}, CASE WHEN ${snapshot} THEN incoming.ordinal ELSE eligible.history_count + incoming.ordinal END,
			incoming.sha, incoming.committed_at, incoming.additions, incoming.deletions, incoming.source_lines
		FROM eligible CROSS JOIN incoming CROSS JOIN recorded
		ON CONFLICT (repository_id, branch, sha) DO UPDATE SET position = excluded.position, committed_at = excluded.committed_at,
			additions = excluded.additions, deletions = excluded.deletions, source_lines = excluded.source_lines
		RETURNING sha
	), removed AS (
		DELETE FROM commits c WHERE ${snapshot} AND c.repository_id = ${repositoryId} AND c.branch = ${report.branch}
			AND EXISTS (SELECT 1 FROM recorded) AND NOT EXISTS (SELECT 1 FROM incoming WHERE incoming.sha = c.sha)
		RETURNING sha
	)
	UPDATE branches b SET history_head = ${report.headSha},
		history_count = CASE WHEN ${snapshot} THEN (SELECT count(*) FROM incoming) ELSE b.history_count + (SELECT count(*) FROM incoming) END,
		history_status = 'complete', history_updated_at = ${completedAt}::timestamptz, updated_at = now()
	WHERE b.repository_id = ${repositoryId} AND b.name = ${report.branch} AND EXISTS (SELECT 1 FROM recorded)`;
}

/** Persist only normalized build metrics and history metadata from a validated report. */
export async function ingestBuildReport(repositoryId: number, report: BuildReport): Promise<void> {
	const sql = db();
	const rows = await sql`SELECT owner, name FROM repositories WHERE id = ${repositoryId} AND active`;
	const repository = rows[0] as { owner: string; name: string } | undefined;
	if (!repository || `${repository.owner}/${repository.name}`.toLowerCase() !== report.repository.toLowerCase()) throw new Error('report does not match an active repository');

	const branchRows = await sql`SELECT name FROM branches WHERE repository_id = ${repositoryId} AND name = ${report.branch} AND enabled`;
	if (!branchRows.length) throw new Error('branch is not enabled');

	const runId = buildRunId(report);
	await sql`INSERT INTO runs (repository_id, branch, run_id, run_attempt, head_sha, completed_at, conclusion, tests_passed, tests_failed, tests_skipped, checks_enabled, checks_total, checks_clean, quality_findings)
		VALUES (${repositoryId}, ${report.branch}, ${runId}, 1, ${report.headSha}, ${report.completedAt}, ${report.conclusion}, ${report.tests?.passed ?? null}, ${report.tests?.failed ?? null}, ${report.tests?.skipped ?? null}, ${report.quality?.enabled ?? null}, ${report.quality?.total ?? null}, ${report.quality?.clean ?? null}, ${report.quality?.findings ?? null})
		ON CONFLICT (repository_id, run_id, run_attempt) DO UPDATE SET branch = excluded.branch, head_sha = excluded.head_sha, completed_at = excluded.completed_at,
			conclusion = excluded.conclusion, tests_passed = excluded.tests_passed, tests_failed = excluded.tests_failed, tests_skipped = excluded.tests_skipped,
			checks_enabled = excluded.checks_enabled, checks_total = excluded.checks_total, checks_clean = excluded.checks_clean,
			quality_findings = excluded.quality_findings, processed_at = now()`;

	if (report.history && reportTargetsTrackedBranch(report.history, `${repository.owner}/${repository.name}`, [report.branch])) {
		await persistHistoryReport(repositoryId, runId, report.history, report.completedAt);
	}
}
