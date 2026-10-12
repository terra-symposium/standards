import { db } from '../../src/server/db.js';
import { ingestBuildReport } from '../../src/server/ingest.js';
import { parseBuildReport } from '../../src/server/history.js';
import { matchesReportToken } from '../../src/server/report-auth.js';

const MAX_REPORT_BYTES = 5_500_000;
const SNAPSHOT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function bearer(request: Request): string {
	return /^Bearer (\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1] ?? '';
}

async function authorizedRepository(repositoryName: string, token: string) {
	const sql = db();
	const rows = await sql`SELECT id, owner, name, report_token_hash FROM repositories
		WHERE active AND lower(owner || '/' || name) = lower(${repositoryName})`;
	const repo = rows[0] as { id: number; owner: string; name: string; report_token_hash: string | null } | undefined;
	return repo && matchesReportToken(token, repo.report_token_hash) ? repo : null;
}

async function handle(request: Request): Promise<Response> {
	const token = bearer(request);
	if (!token) return new Response('Unauthorized', { status: 401 });
	if (request.method === 'GET') {
		const url = new URL(request.url);
		const repositoryName = url.searchParams.get('repository') ?? '';
		const branch = url.searchParams.get('branch') ?? '';
		const repo = await authorizedRepository(repositoryName, token);
		if (!repo) return new Response('Not found', { status: 404 });
		const sql = db();
		const rows = await sql`SELECT b.history_status, b.history_head, MAX(h.imported_at) FILTER (WHERE h.mode = 'snapshot') AS snapshot_at
			FROM branches b LEFT JOIN history_reports h ON h.repository_id = b.repository_id AND h.branch = b.name
			WHERE b.repository_id = ${repo.id} AND b.name = ${branch} AND b.enabled
			GROUP BY b.history_status, b.history_head`;
		const state = rows[0] as { history_status: string; history_head: string | null; snapshot_at: string | null } | undefined;
		if (!state) return new Response('Branch is not enabled', { status: 404 });
		const snapshotAt = state.snapshot_at ? Date.parse(state.snapshot_at) : 0;
		const snapshotRequired = state.history_status !== 'complete' || !snapshotAt || Date.now() - snapshotAt >= SNAPSHOT_INTERVAL_MS;
		return Response.json({ snapshotRequired, baseSha: state.history_status === 'complete' ? state.history_head : null }, { headers: { 'Cache-Control': 'no-store' } });
	}
	if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
	const length = Number(request.headers.get('content-length') ?? 0);
	if (length > MAX_REPORT_BYTES) return new Response('Report too large', { status: 413 });
	const body = await request.text();
	if (Buffer.byteLength(body, 'utf8') > MAX_REPORT_BYTES) return new Response('Report too large', { status: 413 });
	let report: ReturnType<typeof parseBuildReport>;
	try { report = parseBuildReport(JSON.parse(body) as unknown); }
	catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Invalid report' }, { status: 400 }); }
	const repo = await authorizedRepository(report.repository, token);
	if (!repo) return new Response('Not found', { status: 404 });
	try {
		await ingestBuildReport(Number(repo.id), report);
		return new Response(null, { status: 204 });
	} catch (error) {
		if (String(error).includes('branch is not enabled')) return new Response('Branch is not enabled', { status: 404 });
		return Response.json({ error: 'Could not process report' }, { status: 500 });
	}
}

export default async function handler(request: Request): Promise<Response> {
	try {
		return await handle(request);
	} catch (error) {
		const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'no-code';
		console.error('Terra Hygiene report request failed', error instanceof Error ? error.name : 'UnknownError', code);
		return Response.json({ error: 'Report request failed' }, { status: 500 });
	}
}
