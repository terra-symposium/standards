import { readdirSync, readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED
	?? process.env.NETLIFY_DATABASE_URL_UNPOOLED
	?? process.env.DATABASE_URL
	?? process.env.NETLIFY_DATABASE_URL;
if (!url) throw new Error('A direct database URL is required to run schema migrations');
const sql = neon(url);
const directory = new URL('../migrations/', import.meta.url);
const migrations = readdirSync(directory).filter((file) => file.endsWith('.sql')).sort();
let statementCount = 0;
for (const migration of migrations) {
  const statements = readFileSync(new URL(migration, directory), 'utf8').split(';').map((part) => part.trim()).filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  statementCount += statements.length;
}
console.info(`Applied ${statementCount} schema statements from ${migrations.length} migrations.`);
