import { session, canReadRepository } from '../../src/lib/server/auth.js';
import { db } from '../../src/lib/server/db.js';

export default async function handler(request: Request): Promise<Response> {
  const user = await session(request);
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const sql = db();
  const rows = await sql`SELECT id, owner, name, private, installation_id FROM repositories WHERE active ORDER BY owner, name`;
  const allowed = await Promise.all(rows.map(async (row) => (await canReadRepository(user, row as { owner: string; name: string; installation_id: number })) ? row : null));
  return Response.json({ user: user.github_login, repositories: allowed.filter(Boolean).map((row) => ({ id: row?.id, owner: row?.owner, name: row?.name, private: row?.private })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
