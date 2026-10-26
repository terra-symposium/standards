import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHistoryReport } from '../../../packages/quality/src/lib/history-report.js';
import { db } from '../src/server/db.js';
import { parseHistoryReport } from '../src/server/history.js';
import { ingestHistoryReport } from '../src/server/ingest.js';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);

function option(name: string): string {
	const index = args.indexOf(name);
	const value = args[index + 1];
	if (index < 0 || !value || value.startsWith('--') || args.lastIndexOf(name) !== index) {
		throw new Error(`Pass ${name} <value>.`);
	}
	return value;
}

function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function githubRepository(remote: string): string | null {
	const match = /(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i.exec(remote);
	return match?.[1]?.toLowerCase() ?? null;
}

async function main(): Promise<void> {
	const localEnv = resolve(appRoot, '.env.local');
	if (existsSync(localEnv)) process.loadEnvFile(localEnv);
	const repository = option('--repository');
	const checkout = resolve(option('--checkout'));
	const branch = option('--branch');
	if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error('Repository must use owner/name format.');
	if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Error('Invalid branch name.');
	if (githubRepository(git(checkout, ['remote', 'get-url', 'origin'])) !== repository.toLowerCase()) {
		throw new Error('Checkout origin does not match the requested GitHub repository.');
	}

	const sql = db();
	const repositoryRows = await sql`SELECT id FROM repositories WHERE active AND lower(owner || '/' || name) = lower(${repository})`;
	const repositoryRow = repositoryRows[0] as { id: number } | undefined;
	if (!repositoryRow) throw new Error('Repository is not connected to this dashboard database.');
	const branchRows = await sql`SELECT name FROM branches WHERE repository_id = ${repositoryRow.id} AND name = ${branch} AND enabled`;
	if (!branchRows.length) throw new Error(`Branch ${branch} is not enabled for ${repository}.`);

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
		const history = parseHistoryReport(createHistoryReport(worktree, { repository, branch, baseSha: null }));
		await ingestHistoryReport(repositoryRow.id, history);
		console.info(`Imported ${history.commits.length.toLocaleString()} commits for ${repository} (${branch}) through ${history.headSha.slice(0, 9)}.`);
	} finally {
		try {
			git(checkout, ['worktree', 'remove', '--force', worktree]);
		} catch {
			/* Worktree creation may have failed. */
		}
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : 'Local history import failed.');
	process.exitCode = 1;
});
