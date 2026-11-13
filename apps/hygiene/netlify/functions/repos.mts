/**
 * apps/hygiene/netlify/functions/repos.mts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { canReadRepository, session } from '../../src/lib/server/auth.js';
import { db } from '../../src/lib/server/db.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Lists the active repositories the signed-in GitHub user can read.
 *
 * @param request Repository-list request carrying the user's session cookie.
 *
 * @return A private no-store JSON response containing the user login and accessible repositories.
 */
export default async function handler(request: Request): Promise<Response> {
	const user = await session(request);
	if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
	// terra-quality-ignore single-use -- Finish the repository query before starting per-repository permission checks.
	const rows = await db()`SELECT id, owner, name, private, installation_id FROM repositories WHERE active ORDER BY owner, name`;
	// terra-quality-ignore single-use -- Complete every permission check before constructing the JSON response.
	const allowed = await Promise.all(rows.map(async r => ((await canReadRepository(user, r as { owner: string; name: string; installation_id: number })) ? r : null)));
	return Response.json(
		{ user: user.github_login, repositories: allowed.filter(Boolean).map(r => ({ id: r?.id, owner: r?.owner, name: r?.name, private: r?.private })) },
		{ headers: { 'Cache-Control': 'private, no-store' } },
	);
}
