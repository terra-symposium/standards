/**
 * apps/hygiene/scripts/import-local-history.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { basename, join, resolve } from 'node:path';
import { createHistoryReport } from '@terra-symposium/standards-quality/reports';
import { db } from '../src/lib/server/db.js';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestHistoryReport } from '../src/lib/server/ingest.js';
import { parseHistoryReport } from '../src/lib/server/history.js';
import { tmpdir } from 'node:os';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const args = process.argv.slice(2);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reads a required command-line option and rejects missing or repeated values.
 *
 * @param name Option name whose following argument supplies the value.
 *
 * @returns The option value after validation.
 */
function option(name: string): string {
	const index = args.indexOf(name);
	const value = args[index + 1];
	if (index < 0 || !value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
	return value;
}

/**
 * Runs Git in a selected checkout and trims its textual output.
 *
 * @param root Working tree in which Git resolves the command.
 * @param args Git subcommand and arguments to execute.
 *
 * @returns Standard output without leading or trailing whitespace.
 */
function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/*
 * Imports local Git history for a repository and enabled branch.
 *
 * The script reads the local database configuration, builds a detached temporary
 * worktree at the branch head, ingests its history, and removes the worktree.
 */

void (async (): Promise<void> => {
	const localEnv = resolve(fileURLToPath(new URL('..', import.meta.url)), '.env.local');
	if (existsSync(localEnv)) process.loadEnvFile(localEnv);
	const repo = option('--repository');
	const checkout = resolve(option('--checkout'));
	const branch = option('--branch');
	if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error('Repository must use owner/name format.');
	if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Error('Invalid branch name.');
	if (/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i.exec(git(checkout, ['remote', 'get-url', 'origin']))?.[1]?.toLowerCase() !== repo.toLowerCase())
		throw new Error('Checkout origin does not match the requested GitHub repository.');
	const sql = db();
	const repoRow = (await sql`SELECT id FROM repositories WHERE active AND lower(owner || '/' || name) = lower(${repo})`)[0] as { id: number } | undefined;
	if (!repoRow) throw new Error('Repository is not connected to this dashboard database.');
	if (!(await sql`SELECT name FROM branches WHERE repository_id = ${repoRow.id} AND name = ${branch} AND enabled`).length) throw new Error(`Branch ${branch} is not enabled for ${repo}.`);
	let revision: string;
	try {
		revision = git(checkout, ['rev-parse', '--verify', `refs/remotes/origin/${branch}^{commit}`]);
	} catch {
		revision = git(checkout, ['rev-parse', '--verify', `refs/heads/${branch}^{commit}`]);
	}
	const temporaryRoot = mkdtempSync(join(tmpdir(), 'terra-hygiene-history-'));
	const worktree = join(temporaryRoot, basename(checkout) || 'checkout');
	try {
		git(checkout, ['worktree', 'add', '--detach', worktree, revision]);
		const history = parseHistoryReport(createHistoryReport(worktree, { repository: repo, branch, baseSha: null }));
		const report = parseHistoryReport(history);
		await ingestHistoryReport(repoRow.id, report);
		console.info(`Imported ${history.commits.length.toLocaleString()} commits for ${repo} (${branch}) through ${history.headSha.slice(0, 9)}.`);
	} finally {
		try {
			git(checkout, ['worktree', 'remove', '--force', worktree]);
		} catch {
			/* Worktree creation may have failed. */
		}
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
})().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : 'Local history import failed.');
	process.exitCode = 1;
});
