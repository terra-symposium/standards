/**
 * apps/hygiene/netlify/functions/repo.mts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { canReadRepository, session } from '../../src/lib/server/auth.js';
import { db } from '../../src/lib/server/db.js';
import { score } from '../../src/lib/server/metrics.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const COMMIT_PAGE_SIZE = 25;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reads a repository's tracked branches and history, or updates branch tracking.
 *
 * @param request Authenticated repository request with an ID and optional branch/page filters.
 *
 * @return Repository metadata and selected-branch history, a success response for branch updates, or an error response.
 */
export default async function handler(request: Request): Promise<Response> {
	const user = await session(request);
	if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
	const url = new URL(request.url);
	const id = Number(url.searchParams.get('id'));
	if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: 'Invalid repository' }, { status: 400 });
	const sql = db();
	const repo = (await sql`SELECT id, owner, name, private, installation_id FROM repositories WHERE id = ${id} AND active`)[0] as
		{ id: number; owner: string; name: string; private: boolean; installation_id: number } | undefined;
	if (!repo || !(await canReadRepository(user, repo))) return Response.json({ error: 'Repository not found' }, { status: 404 });
	if (request.method === 'POST') {
		if (request.headers.get('origin') !== process.env.APP_ORIGIN || !request.headers.get('content-type')?.startsWith('application/json'))
			return Response.json({ error: 'Invalid request origin' }, { status: 403 });
		const data = (await request.json()) as { branch?: string; enabled?: boolean };
		if (!data.branch || !/^[A-Za-z0-9._/-]{1,100}$/.test(data.branch) || data.branch.includes('..') || data.branch.startsWith('/')) return Response.json({ error: 'Invalid branch' }, { status: 400 });
		if (typeof data.enabled !== 'boolean') return Response.json({ error: 'Invalid branch' }, { status: 400 });
		await sql`INSERT INTO branches (repository_id, name, enabled) VALUES (${id}, ${data.branch}, ${data.enabled}) ON CONFLICT (repository_id, name) DO UPDATE SET enabled = excluded.enabled, updated_at = now()`;
		return Response.json({ ok: true });
	}
	if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
	const branches = await sql`SELECT name, enabled, history_head, history_count, history_status, history_updated_at FROM branches WHERE repository_id = ${id} ORDER BY name`;
	const branch = url.searchParams.get('branch') ?? 'main';
	const selectedBranch = branches.find((r) => r.name === branch && r.enabled) as { history_status: string; history_count: number } | undefined;
	if (!selectedBranch) return Response.json({ error: 'Branch not tracked' }, { status: 404 });
	const runs =
		await sql`SELECT run_id, run_attempt, head_sha, completed_at, conclusion, run_source AS source, quality_policy_branch, tests_passed, tests_failed, tests_skipped, checks_enabled, checks_total, checks_clean, quality_findings FROM runs WHERE repository_id = ${id} AND branch = ${branch} ORDER BY completed_at DESC LIMIT 300`;
	const requestedPage = Number(url.searchParams.get('commitPage') ?? '1');
	if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) return Response.json({ error: 'Invalid commit page' }, { status: 400 });
	const commitTotal = Number((selectedBranch.history_status === 'complete' ? await sql`SELECT count(*) AS total FROM commits WHERE repository_id = ${id} AND branch = ${branch}` : [])[0]?.total ?? 0);
	const pageCount = Math.max(1, Math.ceil(commitTotal / COMMIT_PAGE_SIZE));
	const commitPage = Math.min(requestedPage, pageCount);
	const [commits, lineHistory, latestCommits] =
		selectedBranch.history_status === 'complete'
			? await Promise.all([
					sql`SELECT position, sha, committed_at, additions, deletions, source_lines FROM commits WHERE repository_id = ${id} AND branch = ${branch} ORDER BY position DESC LIMIT ${COMMIT_PAGE_SIZE} OFFSET ${(commitPage - 1) * COMMIT_PAGE_SIZE}`,
					sql`SELECT position, committed_at, source_lines FROM commits WHERE repository_id = ${id} AND branch = ${branch} ORDER BY position`,
					sql`SELECT position, sha, committed_at, additions, deletions, source_lines FROM commits WHERE repository_id = ${id} AND branch = ${branch} ORDER BY position DESC LIMIT 1`,
				])
			: [[], [], []];
	return Response.json(
		{
			repository: { id: repo.id, owner: repo.owner, name: repo.name, private: repo.private },
			branches,
			branch,
			runs: runs.map((r: Record<string, unknown>) => ({
				...r,
				metrics: score(
					r.tests_passed === null ? null : { passed: Number(r.tests_passed), failed: Number(r.tests_failed), skipped: Number(r.tests_skipped) },
					r.checks_enabled === null ? null : { total: Number(r.checks_total), enabled: Number(r.checks_enabled), clean: Number(r.checks_clean), findings: Number(r.quality_findings) },
				),
			})),
			commits,
			commitPage,
			commitPageSize: COMMIT_PAGE_SIZE,
			commitTotal,
			lineHistory,
			latestCommit: latestCommits[0] ?? null,
		},
		{ headers: { 'Cache-Control': 'private, no-store' } },
	);
}
