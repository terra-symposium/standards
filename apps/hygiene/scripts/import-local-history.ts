import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHistoryReport } from '../../../packages/quality/src/lib/history-report.js';
import { db } from '../src/lib/server/db.js';
import { parseHistoryReport } from '../src/lib/server/history.js';
import { ingestHistoryReport } from '../src/lib/server/ingest.js';
import { git, option, resolveRevision, validateImportTarget } from './local-import-utils.js';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);

async function main(): Promise<void> {
	const localEnv = resolve(appRoot, '.env.local');
	if (existsSync(localEnv)) process.loadEnvFile(localEnv);
	const repository = option(args, '--repository');
	const checkout = resolve(option(args, '--checkout'));
	const branch = option(args, '--branch');
	validateImportTarget(repository, checkout, branch);

	const sql = db();
	const repositoryRows = await sql`SELECT id FROM repositories WHERE active AND lower(owner || '/' || name) = lower(${repository})`;
	const repositoryRow = repositoryRows[0] as { id: number } | undefined;
	if (!repositoryRow) throw new Error('Repository is not connected to this dashboard database.');
	const branchRows = await sql`SELECT name FROM branches WHERE repository_id = ${repositoryRow.id} AND name = ${branch} AND enabled`;
	if (!branchRows.length) throw new Error(`Branch ${branch} is not enabled for ${repository}.`);

	const revision = resolveRevision(checkout, branch);

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
