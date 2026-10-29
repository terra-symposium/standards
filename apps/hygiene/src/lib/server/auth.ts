import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { repositoryAdmin } from './github.js';

export type Session = { github_user_id: number; github_login: string; access_token: string };
const COOKIE = 'terra_hygiene_session';

function digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }

export function cookieSecurityAttribute(origin = process.env.APP_ORIGIN): string {
  if (!origin) return '; Secure';
  const { hostname, protocol } = new URL(origin);
  return protocol === 'http:' && (hostname === '127.0.0.1' || hostname === '[::1]') ? '' : '; Secure';
}

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return createHash('sha256').update(secret).digest();
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

function decrypt(value: string): string {
  const data = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}

function sessionToken(request: Request): string | undefined {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}

export async function createSession(userId: number, login: string, accessToken: string, refreshToken?: string, expiresIn?: number): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const sql = db();
  const tokenExpires = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  await sql`INSERT INTO sessions (token_hash, github_user_id, github_login, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, expires_at) VALUES (${digest(token)}, ${userId}, ${login}, ${encrypt(accessToken)}, ${refreshToken ? encrypt(refreshToken) : null}, ${tokenExpires}, now() + interval '7 days')`;
  return token;
}

export function sessionCookie(token: string, maxAge = 604800, origin = process.env.APP_ORIGIN): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly${cookieSecurityAttribute(origin)}; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function session(request: Request): Promise<Session | null> {
  const raw = sessionToken(request);
  if (!raw) return null;
  const sql = db();
  const rows = await sql`SELECT github_user_id, github_login, access_token_ciphertext, refresh_token_ciphertext, token_expires_at FROM sessions WHERE token_hash = ${digest(raw)} AND expires_at > now()`;
  const row = rows[0] as { github_user_id: number; github_login: string; access_token_ciphertext: string; refresh_token_ciphertext: string | null; token_expires_at: string | null } | undefined;
  if (!row) return null;
  let accessToken = decrypt(row.access_token_ciphertext);
  if (row.token_expires_at && new Date(row.token_expires_at).getTime() < Date.now() + 60_000) {
    if (!row.refresh_token_ciphertext) return null;
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: decrypt(row.refresh_token_ciphertext) }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    accessToken = data.access_token;
    const expires = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
    await sql`UPDATE sessions SET access_token_ciphertext = ${encrypt(accessToken)}, refresh_token_ciphertext = ${data.refresh_token ? encrypt(data.refresh_token) : row.refresh_token_ciphertext}, token_expires_at = ${expires} WHERE token_hash = ${digest(raw)}`;
  }
  return { github_user_id: Number(row.github_user_id), github_login: row.github_login, access_token: accessToken };
}

export async function removeSession(request: Request): Promise<void> {
  const raw = sessionToken(request);
  if (raw) { const sql = db(); await sql`DELETE FROM sessions WHERE token_hash = ${digest(raw)}`; }
}

export async function canReadRepository(user: Session, repository: { owner: string; name: string }): Promise<boolean> {
  return repositoryAdmin(repository.owner, repository.name, user.github_login, user.access_token);
}

export function equalSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

