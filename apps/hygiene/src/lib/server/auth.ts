/**
 * apps/hygiene/src/lib/server/auth.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { repositoryAdmin } from './github.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** GitHub identity and decrypted access token associated with an authenticated session. */
export type Session = { github_user_id: number; github_login: string; access_token: string };
const COOKIE = 'terra_hygiene_session';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Hashes a secret before it is used as a database lookup key.
 *
 * @param value Secret value to hash.
 * @returns The lowercase hexadecimal SHA-256 digest.
 */
function digest(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

/**
 * Selects the cookie's `Secure` attribute for the configured application origin.
 *
 * @param origin Application origin used to distinguish local HTTP from HTTPS deployments.
 * @returns The cookie attribute, or an empty string for loopback HTTP.
 */
export function cookieSecurityAttribute(origin = process.env.APP_ORIGIN): string {
	if (!origin) return '; Secure';
	const { hostname, protocol } = new URL(origin);
	return protocol === 'http:' && (hostname === '127.0.0.1' || hostname === '[::1]') ? '' : '; Secure';
}

/**
 * Derives the fixed-size encryption key from the configured session secret.
 *
 * @returns A 256-bit key for AES-GCM operations.
 * @throws {Error} If `SESSION_SECRET` is missing or shorter than 32 characters.
 */
function key(): Buffer {
	const secret = process.env.SESSION_SECRET;
	if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
	return createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a string with AES-256-GCM and encodes the IV, tag, and ciphertext.
 *
 * @param value Plaintext value to encrypt.
 * @returns A base64url-encoded authenticated ciphertext.
 */
function encrypt(value: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(), iv);
	const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

/**
 * Decrypts an AES-256-GCM value produced by {@link encrypt}.
 *
 * @param value Base64url-encoded IV, authentication tag, and ciphertext.
 * @returns The decrypted UTF-8 string.
 * @throws {Error} If the value is malformed or its authentication tag is invalid.
 */
function decrypt(value: string): string {
	const data = Buffer.from(value, 'base64url');
	const decipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
	decipher.setAuthTag(data.subarray(12, 28));
	return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}

/**
 * Reads the session token from the request's cookie header.
 *
 * @param request Incoming request whose cookie header may contain the session cookie.
 * @returns The raw session token, or `undefined` when no session cookie is present.
 */
function sessionToken(request: Request): string | undefined {
	return request.headers
		.get('cookie')
		?.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${COOKIE}=`))
		?.slice(COOKIE.length + 1);
}

/**
 * Creates a random session token and stores its hash and encrypted GitHub credentials.
 *
 * @param userId GitHub numeric account ID.
 * @param login GitHub account login.
 * @param accessToken OAuth access token to encrypt and store.
 * @param refreshToken Optional OAuth refresh token to encrypt and store.
 * @param expiresIn Optional access-token lifetime in seconds.
 * @returns The raw random token to place in the user's cookie.
 */
export async function createSession(userId: number, login: string, accessToken: string, refreshToken?: string, expiresIn?: number): Promise<string> {
	const token = randomBytes(32).toString('base64url');
	const sql = db();
	const tokenExpires = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
	await sql`INSERT INTO sessions (token_hash, github_user_id, github_login, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, expires_at) VALUES (${digest(token)}, ${userId}, ${login}, ${encrypt(accessToken)}, ${refreshToken ? encrypt(refreshToken) : null}, ${tokenExpires}, now() + interval '7 days')`;
	return token;
}

/**
 * Formats the HTTP-only session cookie with its security attributes.
 *
 * @param token Raw session token, or an empty value when clearing the cookie.
 * @param maxAge Cookie lifetime in seconds.
 * @param origin Application origin used to select the `Secure` attribute.
 * @returns A `Set-Cookie` header value.
 */
export function sessionCookie(token: string, maxAge = 604800, origin = process.env.APP_ORIGIN): string {
	return `${COOKIE}=${token}; Path=/; HttpOnly${cookieSecurityAttribute(origin)}; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * Loads a valid session and refreshes its GitHub access token near expiration.
 *
 * @param request Request that may carry a session cookie.
 * @returns The authenticated GitHub identity and access token, or `null` when the session is absent or invalid.
 */
export async function session(request: Request): Promise<Session | null> {
	const raw = sessionToken(request);
	if (!raw) return null;
	const sql = db();
	const rows =
		await sql`SELECT github_user_id, github_login, access_token_ciphertext, refresh_token_ciphertext, token_expires_at FROM sessions WHERE token_hash = ${digest(raw)} AND expires_at > now()`;
	const row = rows[0] as { github_user_id: number; github_login: string; access_token_ciphertext: string; refresh_token_ciphertext: string | null; token_expires_at: string | null } | undefined;
	if (!row) return null;
	let accessToken = decrypt(row.access_token_ciphertext);
	if (row.token_expires_at && new Date(row.token_expires_at).getTime() < Date.now() + 60_000) {
		if (!row.refresh_token_ciphertext) return null;
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				grant_type: 'refresh_token',
				refresh_token: decrypt(row.refresh_token_ciphertext),
			}),
		});
		if (!response.ok) return null;
		const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
		if (!data.access_token) return null;
		accessToken = data.access_token;
		const expires = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
		await sql`UPDATE sessions SET access_token_ciphertext = ${encrypt(accessToken)}, refresh_token_ciphertext = ${data.refresh_token ? encrypt(data.refresh_token) : row.refresh_token_ciphertext}, token_expires_at = ${expires} WHERE token_hash = ${digest(raw)}`;
	}
	return { github_user_id: Number(row.github_user_id), github_login: row.github_login, access_token: accessToken };
}

/**
 * Deletes the current session from the database when its cookie contains a token.
 *
 * @param request Request whose session token should be removed.
 */
export async function removeSession(request: Request): Promise<void> {
	const raw = sessionToken(request);
	if (raw) {
		const sql = db();
		await sql`DELETE FROM sessions WHERE token_hash = ${digest(raw)}`;
	}
}

/**
 * Checks whether a GitHub user has administrator access to a repository.
 *
 * @param user Authenticated GitHub session used for the permission request.
 * @param repo Repository owner and name to check.
 * @returns Whether GitHub reports the user permission as `admin`.
 */
export async function canReadRepository(user: Session, repo: { owner: string; name: string }): Promise<boolean> {
	return repositoryAdmin(repo.owner, repo.name, user.github_login, user.access_token);
}

/**
 * Compares secret strings without returning early for matching prefixes.
 *
 * @param a First secret value.
 * @param b Second secret value.
 * @returns Whether the UTF-8 byte sequences are equal.
 */
export function equalSecret(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}
