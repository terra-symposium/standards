/**
 * apps/hygiene/scripts/import-local-build-report.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { basename, join, resolve } from 'node:path';
import { db } from '../src/lib/server/db.js';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestBuildReport } from '../src/lib/server/ingest.js';
import { parseBuildReport } from '../src/lib/server/history.js';
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
 * @return The option value after validation.
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
 * @return Standard output without leading or trailing whitespace.
 */
function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * Runs a child command quietly with CI mode enabled.
 *
 * @param cmd Executable to start.
 * @param cmdArgs Arguments passed to the executable.
 * @param cwd Working directory used to resolve the command.
 *
 * @return The command's exit status, using `1` when the process has no status.
 */
function run(cmd: string, cmdArgs: string[], cwd: string): number {
	const result = spawnSync(cmd, cmdArgs, { cwd, stdio: 'ignore', env: { ...process.env, CI: 'true' } });
	if (result.error) throw result.error;
	return result.status ?? 1;
}
// terra-quality-ignore single-use -- Keep the documented import workflow as a named script entry point.
/**
 * Imports verified local test and Quality reports into the Hygiene dashboard.
 *
 * @return Resolves after importing the report and cleaning up its temporary worktree.
 */
async function main(): Promise<void> {
	const localEnv = resolve(fileURLToPath(new URL('..', import.meta.url)), '.env.local');
	if (existsSync(localEnv)) process.loadEnvFile(localEnv);
	const repo = option('--repository');
	const checkout = resolve(option('--checkout'));
	const branch = option('--branch');
	const requestedCompletedAt = (function optionalOption(name: string): string | undefined {
		const index = args.indexOf(name);
		if (index < 0) return undefined;
		const value = args[index + 1];
		if (!value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
		return value;
	})('--completed-at');
	if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error('Repository must use owner/name format.');
	if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Error('Invalid branch name.');
	if (requestedCompletedAt && !Number.isFinite(Date.parse(requestedCompletedAt))) throw new Error('Invalid report timestamp.');
	if (
		(function githubRepo(remote: string): string | null {
			return /(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i.exec(remote)?.[1]?.toLowerCase() ?? null;
		})(git(checkout, ['remote', 'get-url', 'origin'])) !== repo.toLowerCase()
	)
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
	const temporaryRoot = mkdtempSync(join(tmpdir(), 'terra-hygiene-report-'));
	const worktree = join(temporaryRoot, basename(checkout) || 'checkout');
	const reports = join(temporaryRoot, 'reports');
	const junitPath = join(reports, 'junit.xml');
	const qualityPath = join(reports, 'terra-quality.json');
	mkdirSync(reports);
	try {
		git(checkout, ['worktree', 'add', '--detach', worktree, revision]);
		for (const dir of ['node_modules', 'astro/node_modules', 'sanity/node_modules']) {
			const dependencyPath = join(checkout, dir);
			if (!existsSync(dependencyPath)) throw new Error(`Install dependencies before importing reports; missing ${dir}.`);
			symlinkSync(dependencyPath, join(worktree, dir), 'dir');
		}
		const qualityConfigPath = join(worktree, 'config/quality.json');
		const qualityPolicyBranch = existsSync(qualityConfigPath) ? branch : 'development';
		if (!existsSync(qualityConfigPath)) {
			// terra-quality-ignore single-use -- Read the branch policy before creating its destination directory.
			const sharedPolicy = git(checkout, ['show', 'origin/development:config/quality.json']);
			mkdirSync(join(worktree, 'config'), { recursive: true });
			writeFileSync(qualityConfigPath, `${sharedPolicy}\n`);
		}
		const testStatus = run(
			'pnpm',
			['dlx', '--package', 'node@24', 'node', '--import', 'tsx', '--test', '--test-reporter=junit', `--test-reporter-destination=${junitPath}`, 'functions/maintenance-commands/providers.test.ts'],
			join(worktree, 'sanity'),
		);
		const qualityStatus = run(
			'pnpm',
			[
				'dlx',
				'--package',
				'node@24',
				'--package',
				'@terra-symposium/standards-quality@0.5.0',
				'terra-quality',
				'quality',
				'--all',
				'--warn',
				'--skip-commands',
				'--skip-recommendations',
				'--report-json',
				qualityPath,
			],
			worktree,
		);
		// terra-quality-ignore single-use -- Read the JUnit artifact before resolving the checkout head and parsing the report.
		const junitXml = existsSync(junitPath) ? readFileSync(junitPath, 'utf8') : null;
		// terra-quality-ignore single-use -- Read the Quality artifact before resolving the checkout head and parsing the report.
		const quality = existsSync(qualityPath) ? (JSON.parse(readFileSync(qualityPath, 'utf8')) as unknown) : null;
		const headSha = git(worktree, ['rev-parse', 'HEAD']);
		const report = parseBuildReport({
			schemaVersion: 1,
			repository: repo,
			branch,
			headSha,
			completedAt: requestedCompletedAt ?? new Date().toISOString(),
			conclusion: testStatus === 0 && qualityStatus === 0 ? 'success' : 'failure',
			junitXml,
			quality,
			history: null,
		});
		await ingestBuildReport(Number(repoRow.id), report, 'local', qualityPolicyBranch);
		// terra-quality-ignore single-use -- Prepare the test summary before any report lines are emitted.
		const testCounts = report.tests ? `${report.tests.passed} passed, ${report.tests.failed} failed, ${report.tests.skipped} skipped` : 'JUnit report missing';
		// terra-quality-ignore single-use -- Prepare the Quality summary before any report lines are emitted.
		const qualityCounts = report.quality
			? `${report.quality.clean}/${report.quality.enabled} clean checks, ${report.quality.findings} findings, ${report.quality.total} total checks`
			: 'Terra Quality report missing';
		console.info(`Imported local report for ${repo} (${branch}) at ${headSha.slice(0, 9)}.`);
		console.info(`Terra Quality policy: ${qualityPolicyBranch} branch configuration${qualityPolicyBranch === branch ? '' : ' (the target branch has no config/quality.json)'}.`);
		console.info(`Tests: ${testCounts}; command exit ${testStatus}.`);
		console.info(`Quality: ${qualityCounts}; command exit ${qualityStatus}.`);
	} finally {
		try {
			git(checkout, ['worktree', 'remove', '--force', worktree]);
		} catch {
			/* Worktree creation may have failed. */
		}
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
}

main().catch((e: unknown) => {
	console.error(e instanceof Error ? e.message : 'Local report import failed.');
	process.exitCode = 1;
});
