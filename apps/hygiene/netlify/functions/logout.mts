import { removeSession, sessionCookie } from '../../src/lib/server/auth.js';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  await removeSession(request);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie('', 0) } });
}
