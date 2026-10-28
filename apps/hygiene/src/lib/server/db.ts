import { neon } from '@neondatabase/serverless';

export function db() {
  const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL is required');
  return neon(url);
}
