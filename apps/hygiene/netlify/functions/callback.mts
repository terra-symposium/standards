/**
 * apps/hygiene/netlify/functions/callback.mts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createSession, equalSecret, sessionCookie } from '../../src/lib/server/auth.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Completes GitHub OAuth after validating the one-time state cookie.
 *
 * @param request Callback request containing the OAuth code, state, and matching state cookie.
 *
 * @return A redirect with a session cookie, or an error response when OAuth validation or lookup fails.
 */
export default async function handler(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const state = url.searchParams.get('state') ?? '';
	// terra-quality-ignore single-use -- Read the cookie before the short-circuit check, even when the state parameter is absent.
	const saved =
		request.headers
			.get('cookie')
			?.split(';')
			.map(p => p.trim())
			.find(p => p.startsWith('terra_hygiene_state='))
			?.split('=')[1] ?? '';
	if (!state || !equalSecret(state, saved)) return new Response('Invalid sign-in state', { status: 400 });
	const code = url.searchParams.get('code');
	if (!code) return new Response('Missing sign-in code', { status: 400 });
	const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
	});
	const tokenData = (await tokenResponse.json().catch(() => null)) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string } | null;
	if (!tokenResponse.ok || !tokenData?.access_token) {
		console.error('GitHub OAuth token exchange failed', { status: tokenResponse.status, error: tokenData?.error ?? 'missing_access_token' });
		return new Response('GitHub sign-in failed', { status: 502 });
	}
	const userResponse = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' } });
	if (!userResponse.ok) {
		console.error('GitHub OAuth user lookup failed', { status: userResponse.status });
		return new Response('GitHub user lookup failed', { status: 502 });
	}
	const user = (await userResponse.json()) as { id: number; login: string };
	return new Response(null, {
		status: 302,
		headers: { Location: '/', 'Set-Cookie': sessionCookie(await createSession(user.id, user.login, tokenData.access_token, tokenData.refresh_token, tokenData.expires_in)) },
	});
}
