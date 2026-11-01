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

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
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
 * Reads an optional command-line option while rejecting malformed or repeated values.
 *
 * @param name Option name whose following argument supplies the value when present.
 *
 * @returns The option value, or `undefined` when the option is absent.
 */
function optionalOption(name: string): string | undefined {
	const index = args.indexOf(name);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (!value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
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

/**
 * Extracts a normalized owner/name identifier from a GitHub remote URL.
 *
 * @param remote Git remote URL in HTTPS or SSH form.
 *
 * @returns Lowercase owner/name, or `null` when the URL is not a GitHub repository remote.
 */
function githubRepo(remote: string): string | null {
	const match = /(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i.exec(remote);
	return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Runs a child command quietly with CI mode enabled.
 *
 * @param cmd Executable to start.
 * @param cmdArgs Arguments passed to the executable.
 * @param cwd Working directory used to resolve the command.
 *
 * @returns The command's exit status, using `1` when the process has no status.
 */
function run(cmd: string, cmdArgs: string[], cwd: string): number {
	const result = spawnSync(cmd, cmdArgs, { cwd, stdio: 'ignore', env: { ...process.env, CI: 'true' } });
	if (result.error) throw result.error;
	return result.status ?? 1;
}

/**
 * Imports a local build and quality report for a validated repository checkout.
 *
 * The script creates a detached temporary worktree, runs the selected checks there,
 * ingests their report, and always removes the temporary worktree and directory.
 */
async function main(): Promise<void> {
	const localEnv = resolve(appRoot, '.env.local');
	if (existsSync(localEnv)) process.loadEnvFile(localEnv);
	const repo = option('--repository');
	const checkout = resolve(option('--checkout'));
	const branch = option('--branch');
	const requestedCompletedAt = optionalOption('--completed-at');
	if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error('Repository must use owner/name format.');
	if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Error('Invalid branch name.');
	if (requestedCompletedAt && !Number.isFinite(Date.parse(requestedCompletedAt))) throw new Error('Invalid report timestamp.');
	if (githubRepo(git(checkout, ['remote', 'get-url', 'origin'])) !== repo.toLowerCase()) throw new Error('Checkout origin does not match the requested GitHub repository.');
	const sql = db();
	const repoRows = await sql`SELECT id FROM repositories WHERE active AND lower(owner || '/' || name) = lower(${repo})`;
	const repoRow = repoRows[0] as { id: number } | undefined;
	if (!repoRow) throw new Error('Repository is not connected to this dashboard database.');
	const branchRows = await sql`SELECT name FROM branches WHERE repository_id = ${repoRow.id} AND name = ${branch} AND enabled`;
	if (!branchRows.length) throw new Error(`Branch ${branch} is not enabled for ${repo}.`);
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
		const qualityConfigPath = join(worktree, 'quality.json');
		const qualityPolicyBranch = existsSync(qualityConfigPath) ? branch : 'development';
		if (!existsSync(qualityConfigPath)) {
			const sharedPolicy = git(checkout, ['show', 'origin/development:quality.json']);
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
		const junitXml = existsSync(junitPath) ? readFileSync(junitPath, 'utf8') : null;
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
		const testCounts = report.tests ? `${report.tests.passed} passed, ${report.tests.failed} failed, ${report.tests.skipped} skipped` : 'JUnit report missing';
		const qualityCounts = report.quality
			? `${report.quality.clean}/${report.quality.enabled} clean checks, ${report.quality.findings} findings, ${report.quality.total} total checks`
			: 'Terra Quality report missing';
		console.info(`Imported local report for ${repo} (${branch}) at ${headSha.slice(0, 9)}.`);
		console.info(`Terra Quality policy: ${qualityPolicyBranch} branch configuration${qualityPolicyBranch === branch ? '' : ' (main has no quality.json)'}.`);
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
main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : 'Local report import failed.');
	process.exitCode = 1;
});
