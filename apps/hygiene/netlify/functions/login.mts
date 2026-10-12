import { randomBytes } from 'node:crypto';
import { cookieSecurityAttribute } from '../../src/server/auth.js';

export default async function handler(): Promise<Response> {
  const state = randomBytes(24).toString('base64url');
  const origin = process.env.APP_ORIGIN;
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!origin || !clientId) throw new Error('APP_ORIGIN and GITHUB_CLIENT_ID are required');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', new URL('/api/callback', origin).toString());
  url.searchParams.set('state', state);
  return new Response(null, { status: 302, headers: { Location: url.toString(), 'Set-Cookie': `terra_hygiene_state=${state}; Path=/api/callback; HttpOnly${cookieSecurityAttribute(origin)}; SameSite=Lax; Max-Age=600` } });
}
