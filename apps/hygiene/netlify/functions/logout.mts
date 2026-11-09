/**
 * apps/hygiene/netlify/functions/logout.mts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createHash } from 'node:crypto';
import { db } from '../../src/lib/server/db.js';
import { sessionCookie } from '../../src/lib/server/auth.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Ends the current session and expires its browser cookie.
 *
 * @param request Logout request; only POST is accepted.
 *
 * @returns A 204 response after logout, or a 405 response for other methods.
 */
export default async function handler(request: Request): Promise<Response> {
	if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
	const sessionToken = request.headers
		.get('cookie')
		?.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith('terra_hygiene_session='))
		?.slice('terra_hygiene_session='.length);
	if (sessionToken) await db()`DELETE FROM sessions WHERE token_hash = ${createHash('sha256').update(sessionToken).digest('hex')}`;
	return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie('', 0) } });
}
