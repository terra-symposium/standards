import { createHash, timingSafeEqual } from 'node:crypto';

export function hashReportToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function matchesReportToken(token: string, expectedHash: string | null): boolean {
	if (!expectedHash || !token) return false;
	const actual = Buffer.from(hashReportToken(token), 'hex');
	const expected = Buffer.from(expectedHash, 'hex');
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
