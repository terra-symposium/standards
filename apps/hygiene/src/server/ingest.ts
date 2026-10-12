import { unzipSync } from 'fflate';
import { db } from './db.js';
import { downloadArtifact, github, installationToken, type WorkflowRun } from './github.js';
import { parseHistoryReport, reportTargetsTrackedBranch, type HistoryReport } from './history.js';
import { parseJUnit, parseQualityReport, type QualityCounts, type TestCounts } from './metrics.js';

type Artifact = { id: number; name: string; expired: boolean };

export function eligibleRun(run: WorkflowRun, branches: string[]): boolean {
  return run.status === 'completed' && run.event !== 'pull_request' && run.event !== 'pull_request_target' && !!run.head_branch && branches.includes(run.head_branch);
}

export function reportsFromZip(bytes: Uint8Array): { tests: TestCounts | null; quality: QualityCounts | null; history: HistoryReport[]; hasJUnit: boolean; hasQuality: boolean } {
  const entries = unzipSync(bytes, { filter: (file) => file.originalSize <= 10_000_000 });
  let tests: TestCounts | null = null;
  let quality: QualityCounts | null = null;
  let hasJUnit = false;
  let hasQuality = false;
  const history: HistoryReport[] = [];
  for (const [path, content] of Object.entries(entries)) {
    const name = path.split('/').at(-1) ?? '';
    if (name === 'terra-quality.json') { quality = parseQualityReport(JSON.parse(new TextDecoder().decode(content)) as unknown); hasQuality = true; }
    if (/^terra-history(?:-[a-z0-9._-]+)?\.json$/i.test(name)) history.push(parseHistoryReport(JSON.parse(new TextDecoder().decode(content)) as unknown));
    if (/^(?:junit|test-results?)(?:[-_.][^/]*)?\.xml$/i.test(name)) {
      const parsed = parseJUnit(new TextDecoder().decode(content));
      if (!tests) tests = { passed: 0, failed: 0, skipped: 0 };
      tests.passed += parsed.passed;
      tests.failed += parsed.failed;
      tests.skipped += parsed.skipped;
      hasJUnit = true;
    }
  }
  return { tests, quality, history, hasJUnit, hasQuality };
}

async function persistHistoryReport(sql: ReturnType<typeof db>, repositoryId: number, run: WorkflowRun, report: HistoryReport): Promise<void> {
  const commits = JSON.stringify(report.commits);
  const snapshot = report.mode === 'snapshot';
  await sql`WITH eligible AS (
      SELECT b.history_head, b.history_count
      FROM branches b JOIN repositories r ON r.id = b.repository_id
      WHERE b.repository_id = ${repositoryId} AND b.name = ${report.branch} AND b.enabled AND r.active
        AND NOT EXISTS (SELECT 1 FROM history_reports h WHERE h.repository_id = ${repositoryId} AND h.run_id = ${run.id} AND h.run_attempt = ${run.run_attempt} AND h.branch = ${report.branch})
        AND ((${snapshot} AND (b.history_updated_at IS NULL OR b.history_updated_at < ${run.updated_at}::timestamptz OR b.history_head = ${report.headSha}))
          OR (NOT ${snapshot} AND b.history_status = 'complete' AND b.history_head = ${report.baseSha} AND b.history_updated_at <= ${run.updated_at}::timestamptz))
    ), incoming AS (
      SELECT ordinality::integer AS ordinal, value->>'sha' AS sha, (value->>'authorDate')::timestamptz AS committed_at,
        (value->>'additions')::integer AS additions, (value->>'deletions')::integer AS deletions, (value->>'sourceLines')::integer AS source_lines
      FROM jsonb_array_elements(${commits}::jsonb) WITH ORDINALITY AS item(value, ordinality)
    ), upserted AS (
      INSERT INTO commits (repository_id, branch, position, sha, committed_at, additions, deletions, source_lines)
      SELECT ${repositoryId}, ${report.branch}, CASE WHEN ${snapshot} THEN incoming.ordinal ELSE eligible.history_count + incoming.ordinal END,
        incoming.sha, incoming.committed_at, incoming.additions, incoming.deletions, incoming.source_lines
      FROM eligible CROSS JOIN incoming
      ON CONFLICT (repository_id, branch, sha) DO UPDATE SET position = excluded.position, committed_at = excluded.committed_at,
        additions = excluded.additions, deletions = excluded.deletions, source_lines = excluded.source_lines
      RETURNING sha
    ), removed AS (
      DELETE FROM commits c WHERE ${snapshot} AND c.repository_id = ${repositoryId} AND c.branch = ${report.branch}
        AND EXISTS (SELECT 1 FROM eligible) AND NOT EXISTS (SELECT 1 FROM incoming WHERE incoming.sha = c.sha)
      RETURNING sha
    ), advanced AS (
      UPDATE branches b SET history_head = ${report.headSha},
        history_count = CASE WHEN ${snapshot} THEN (SELECT count(*) FROM incoming) ELSE b.history_count + (SELECT count(*) FROM incoming) END,
        history_status = 'complete', history_updated_at = ${run.updated_at}::timestamptz, updated_at = now()
      WHERE b.repository_id = ${repositoryId} AND b.name = ${report.branch} AND EXISTS (SELECT 1 FROM eligible)
      RETURNING repository_id, name
    )
    INSERT INTO history_reports (repository_id, run_id, run_attempt, branch, mode, head_sha, imported_at)
    SELECT ${repositoryId}, ${run.id}, ${run.run_attempt}, ${report.branch}, ${report.mode}, ${report.headSha}, now() FROM advanced
    ON CONFLICT (repository_id, run_id, run_attempt, branch) DO NOTHING`;
}

export async function ingestRun(repositoryId: number, runId: number): Promise<void> {
  const sql = db();
  const repositories = await sql`SELECT id, installation_id, owner, name FROM repositories WHERE id = ${repositoryId} AND active`;
  const repo = repositories[0] as { id: number; installation_id: number; owner: string; name: string } | undefined;
  if (!repo) return;
  const token = await installationToken(Number(repo.installation_id));
  const path = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
  const run = await github<WorkflowRun>(`${path}/actions/runs/${runId}`, token);
  const branches = await sql`SELECT name FROM branches WHERE repository_id = ${repositoryId} AND enabled`;
  if (!eligibleRun(run, branches.map((item) => String(item.name)))) return;
  const artifacts = await github<{ artifacts: Artifact[] }>(`${path}/actions/runs/${runId}/artifacts?per_page=100`, token);
  const artifact = artifacts.artifacts.find((item) => item.name === 'terra-hygiene' && !item.expired);
  let tests: TestCounts | null = null;
  let quality: QualityCounts | null = null;
  let history: HistoryReport[] = [];
  let hasJUnit = false;
  let hasQuality = false;
  if (artifact) ({ tests, quality, history, hasJUnit, hasQuality } = reportsFromZip(await downloadArtifact(repo.owner, repo.name, artifact.id, token)));
  const repositoryName = `${repo.owner}/${repo.name}`;
  for (const report of history) {
    if (!reportTargetsTrackedBranch(report, repositoryName, branches.map((item) => String(item.name)))) continue;
    await persistHistoryReport(sql, repositoryId, run, report);
  }
  if (!artifact || hasJUnit || hasQuality) {
    const metricReport = history.length === 1 && reportTargetsTrackedBranch(history[0], repositoryName, branches.map((item) => String(item.name))) ? history[0] : null;
    await sql`INSERT INTO runs (repository_id, branch, run_id, run_attempt, head_sha, completed_at, conclusion, tests_passed, tests_failed, tests_skipped, checks_enabled, checks_total, checks_clean, quality_findings)
      VALUES (${repositoryId}, ${metricReport?.branch ?? run.head_branch}, ${run.id}, ${run.run_attempt}, ${metricReport?.headSha ?? run.head_sha}, ${run.updated_at}, ${run.conclusion ?? 'unknown'}, ${tests?.passed ?? null}, ${tests?.failed ?? null}, ${tests?.skipped ?? null}, ${quality?.enabled ?? null}, ${quality?.total ?? null}, ${quality?.clean ?? null}, ${quality?.findings ?? null})
      ON CONFLICT (repository_id, run_id, run_attempt) DO UPDATE SET conclusion = excluded.conclusion,
        tests_passed = COALESCE(excluded.tests_passed, runs.tests_passed), tests_failed = COALESCE(excluded.tests_failed, runs.tests_failed),
        tests_skipped = COALESCE(excluded.tests_skipped, runs.tests_skipped), checks_enabled = COALESCE(excluded.checks_enabled, runs.checks_enabled),
        checks_total = COALESCE(excluded.checks_total, runs.checks_total), checks_clean = COALESCE(excluded.checks_clean, runs.checks_clean),
        quality_findings = COALESCE(excluded.quality_findings, runs.quality_findings), processed_at = now()`;
  }
}
