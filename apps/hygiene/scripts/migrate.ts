/**
 * apps/hygiene/scripts/migrate.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'node:fs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.NETLIFY_DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
const sql = neon(url);
const dir = new URL('../migrations/', import.meta.url);
const migrations = readdirSync(dir)
	.filter((file) => file.endsWith('.sql'))
	.sort();
if (!url) throw new Error('A direct database URL is required to run schema migrations');
let statementCount = 0;
for (const migration of migrations) {
	const statements = readFileSync(new URL(migration, dir), 'utf8')
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean);
	for (const statement of statements) await sql.query(statement);
	statementCount += statements.length;
}
console.info(`Applied ${statementCount} schema statements from ${migrations.length} migrations.`);
