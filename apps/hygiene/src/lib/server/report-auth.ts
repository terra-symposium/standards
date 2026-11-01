/**
 * apps/hygiene/src/lib/server/report-auth.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createHash, timingSafeEqual } from 'node:crypto';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Hashes a report bearer token before it is stored or compared with a stored value.
 *
 * @param token Raw report token.
 * @returns The lowercase hexadecimal SHA-256 digest.
 */
export function hashReportToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/**
 * Compares a report token with its stored digest using a timing-safe byte comparison.
 *
 * @param token Raw bearer token supplied with a report request.
 * @param expectedHash Stored lowercase hexadecimal digest, or `null` when no token is configured.
 * @returns Whether the token hashes to the expected digest.
 */
export function matchesReportToken(token: string, expectedHash: string | null): boolean {
	if (!expectedHash || !token) return false;
	const actual = Buffer.from(hashReportToken(token), 'hex');
	const expected = Buffer.from(expectedHash, 'hex');
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
