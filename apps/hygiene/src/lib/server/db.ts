/**
 * apps/hygiene/src/lib/server/db.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { neon } from '@neondatabase/serverless';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates the Neon SQL client from the available database connection URL.
 *
 * @returns A tagged-template SQL client for the configured database.
 * @throws {Error} If neither supported database URL variable is configured.
 */
export function db() {
	const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL is required');
	return neon(url);
}
