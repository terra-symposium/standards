/**
 * apps/hygiene/netlify/functions/report.mts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { db } from '../../src/lib/server/db.js';
import { ingestBuildReport } from '../../src/lib/server/ingest.js';
import { matchesReportToken } from '../../src/lib/server/report-auth.js';
import { parseBuildReport } from '../../src/lib/server/history.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const MAX_REPORT_BYTES = 5_500_000;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Finds an active repository only when its stored report-token hash matches.
 *
 * @param repoName Owner/name identifier supplied by the report client.
 * @param token Bearer credential presented for the report operation.
 *
 * @return The matching repository row, or `null` when no active authorized repository exists.
 */
async function authorizedRepo(repoName: string, token: string) {
	const repo = (
		await db()`SELECT id, owner, name, report_token_hash FROM repositories
		WHERE active AND lower(owner || '/' || name) = lower(${repoName})`
	)[0] as { id: number; owner: string; name: string; report_token_hash: string | null } | undefined;
	return repo && matchesReportToken(token, repo.report_token_hash) ? repo : null;
}

/**
 * Handles report status lookups and authenticated build-report ingestion.
 *
 * @param request GET status request or POST report body authenticated by a repository token.
 *
 * @return A status JSON response, a no-content response after ingestion, or an HTTP error response.
 */
async function handle(request: Request): Promise<Response> {
	const token = (function bearer(request: Request): string {
		return /^Bearer (\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1] ?? '';
	})(request);
	if (!token) return new Response('Unauthorized', { status: 401 });
	if (request.method === 'GET') {
		const url = new URL(request.url);
		const repoName = url.searchParams.get('repository') ?? '';
		const branch = url.searchParams.get('branch') ?? '';
		const repo = await authorizedRepo(repoName, token);
		if (!repo) return new Response('Not found', { status: 404 });
		const state = (
			await db()`SELECT b.history_status, b.history_head, MAX(h.imported_at) FILTER (WHERE h.mode = 'snapshot') AS snapshot_at
			FROM branches b LEFT JOIN history_reports h ON h.repository_id = b.repository_id AND h.branch = b.name
			WHERE b.repository_id = ${repo.id} AND b.name = ${branch} AND b.enabled
			GROUP BY b.history_status, b.history_head`
		)[0] as { history_status: string; history_head: string | null; snapshot_at: string | null } | undefined;
		if (!state) return new Response('Branch is not enabled', { status: 404 });
		const snapshotAt = state.snapshot_at ? Date.parse(state.snapshot_at) : 0;
		return Response.json(
			{
				snapshotRequired: state.history_status !== 'complete' || !snapshotAt || Date.now() - snapshotAt >= 7 * 24 * 60 * 60 * 1000,
				baseSha: state.history_status === 'complete' ? state.history_head : null,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	}
	if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
	if (Number(request.headers.get('content-length') ?? 0) > MAX_REPORT_BYTES) return new Response('Report too large', { status: 413 });
	const body = await request.text();
	if (Buffer.byteLength(body, 'utf8') > MAX_REPORT_BYTES) return new Response('Report too large', { status: 413 });
	let report: ReturnType<typeof parseBuildReport>;
	try {
		report = parseBuildReport(JSON.parse(body) as unknown);
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : 'Invalid report' }, { status: 400 });
	}
	const repo = await authorizedRepo(report.repository, token);
	if (!repo) return new Response('Not found', { status: 404 });
	try {
		await ingestBuildReport(Number(repo.id), report);
		return new Response(null, { status: 204 });
	} catch (error) {
		if (String(error).includes('branch is not enabled')) return new Response('Branch is not enabled', { status: 404 });
		return Response.json({ error: 'Could not process report' }, { status: 500 });
	}
}

/**
 * Provides the report endpoint's common error boundary.
 *
 * @param request Incoming GET or POST report request.
 *
 * @return The report response, or a sanitized 500 response when processing throws.
 */
export default async function handler(request: Request): Promise<Response> {
	try {
		return await handle(request);
	} catch (err) {
		const code = err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' ? err.code : 'no-code';
		console.error('Terra Hygiene report request failed', err instanceof Error ? err.name : 'UnknownError', code);
		return Response.json({ error: 'Report request failed' }, { status: 500 });
	}
}
