import { createSession, equalSecret, sessionCookie } from '../../src/server/auth.js';

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';
  const saved = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith('terra_hygiene_state='))?.split('=')[1] ?? '';
  if (!state || !equalSecret(state, saved)) return new Response('Invalid sign-in state', { status: 400 });
  const code = url.searchParams.get('code');
  if (!code) return new Response('Missing sign-in code', { status: 400 });
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
  });
  if (!tokenResponse.ok) return new Response('GitHub sign-in failed', { status: 502 });
  const tokenData = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!tokenData.access_token) return new Response('GitHub sign-in failed', { status: 502 });
  const userResponse = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' } });
  if (!userResponse.ok) return new Response('GitHub user lookup failed', { status: 502 });
  const user = await userResponse.json() as { id: number; login: string };
  const token = await createSession(user.id, user.login, tokenData.access_token, tokenData.refresh_token, tokenData.expires_in);
  return new Response(null, { status: 302, headers: { Location: '/', 'Set-Cookie': sessionCookie(token) } });
}
