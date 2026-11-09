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
 * @returns A private no-store JSON response containing the user login and accessible repositories.
 */
export default async function handler(request: Request): Promise<Response> {
	const user = await session(request);
	if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
	return Response.json(
		{
			user: user.github_login,
			repositories: (
				await Promise.all(
					(await db()`SELECT id, owner, name, private, installation_id FROM repositories WHERE active ORDER BY owner, name`).map(async (row) =>
						(await canReadRepository(user, row as { owner: string; name: string; installation_id: number })) ? row : null,
					),
				)
			)
				.filter(Boolean)
				.map((row) => ({ id: row?.id, owner: row?.owner, name: row?.name, private: row?.private })),
		},
		{ headers: { 'Cache-Control': 'private, no-store' } },
	);
}
