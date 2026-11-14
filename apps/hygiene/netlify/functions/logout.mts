/**
 * apps/hygiene/netlify/functions/logout.mts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { removeSession, sessionCookie } from '../../src/lib/server/auth.js';

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
	await removeSession(request);
	return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie('', 0) } });
}
