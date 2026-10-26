import { randomBytes } from 'node:crypto';
import { session, canReadRepository } from '../../src/lib/server/auth.js';
import { db } from '../../src/lib/server/db.js';
import { hashReportToken } from '../../src/lib/server/report-auth.js';

export default async function handler(request: Request): Promise<Response> {
	if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
	if (request.headers.get('origin') !== process.env.APP_ORIGIN || !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Invalid request origin' }, { status: 403 });
	const user = await session(request);
	if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
	const body = await request.json() as { id?: number };
	const id = Number(body.id);
	if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: 'Invalid repository' }, { status: 400 });
	const sql = db();
	const rows = await sql`SELECT id, owner, name, installation_id FROM repositories WHERE id = ${id} AND active`;
	const repo = rows[0] as { id: number; owner: string; name: string; installation_id: number } | undefined;
	if (!repo || !(await canReadRepository(user, repo))) return new Response('Repository not found', { status: 404 });
	const token = randomBytes(32).toString('base64url');
	await sql`UPDATE repositories SET report_token_hash = ${hashReportToken(token)}, updated_at = now() WHERE id = ${id}`;
	return Response.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
}
