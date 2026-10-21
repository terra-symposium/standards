import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/server/db.js';
import { parseBuildReport } from '../src/server/history.js';
import { ingestBuildReport } from '../src/server/ingest.js';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);

function option(name: string): string {
	const index = args.indexOf(name);
	const value = args[index + 1];
	if (index < 0 || !value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
	return value;
}

function optionalOption(name: string): string | undefined {
	const index = args.indexOf(name);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (!value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
	return value;
}

function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function githubRepository(remote: string): string | null {
	const match = /(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i.exec(remote);
	return match?.[1]?.toLowerCase() ?? null;
}

function run(command: string, commandArgs: string[], cwd: string): number {
	const result = spawnSync(command, commandArgs, { cwd, stdio: 'ignore', env: { ...process.env, CI: 'true' } });
	if (result.error) throw result.error;
	return result.status ?? 1;
}

async function main(): Promise<void> {
	const localEnv = resolve(appRoot, '.env.local');
	if (existsSync(localEnv)) process.loadEnvFile(localEnv);
	const repository = option('--repository');
	const checkout = resolve(option('--checkout'));
	const branch = option('--branch');
	const requestedCompletedAt = optionalOption('--completed-at');
	if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error('Repository must use owner/name format.');
	if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Error('Invalid branch name.');
	if (requestedCompletedAt && !Number.isFinite(Date.parse(requestedCompletedAt))) throw new Error('Invalid report timestamp.');
	if (githubRepository(git(checkout, ['remote', 'get-url', 'origin'])) !== repository.toLowerCase()) throw new Error('Checkout origin does not match the requested GitHub repository.');

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

	const temporaryRoot = mkdtempSync(join(tmpdir(), 'terra-hygiene-report-'));
	const worktree = join(temporaryRoot, basename(checkout) || 'checkout');
	const reports = join(temporaryRoot, 'reports');
	const junitPath = join(reports, 'junit.xml');
	const qualityPath = join(reports, 'terra-quality.json');
	mkdirSync(reports);
	try {
		git(checkout, ['worktree', 'add', '--detach', worktree, revision]);
		for (const directory of ['node_modules', 'astro/node_modules', 'sanity/node_modules']) {
			const dependencyPath = join(checkout, directory);
			if (!existsSync(dependencyPath)) throw new Error(`Install dependencies before importing reports; missing ${directory}.`);
			symlinkSync(dependencyPath, join(worktree, directory), 'dir');
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
			repository,
			branch,
			headSha,
			completedAt: requestedCompletedAt ?? new Date().toISOString(),
			conclusion: testStatus === 0 && qualityStatus === 0 ? 'success' : 'failure',
			junitXml,
			quality,
			history: null,
		});
		await ingestBuildReport(Number(repositoryRow.id), report, 'local', qualityPolicyBranch);

		const testCounts = report.tests ? `${report.tests.passed} passed, ${report.tests.failed} failed, ${report.tests.skipped} skipped` : 'JUnit report missing';
		const qualityCounts = report.quality
			? `${report.quality.clean}/${report.quality.enabled} clean checks, ${report.quality.findings} findings, ${report.quality.total} total checks`
			: 'Terra Quality report missing';
		console.info(`Imported local report for ${repository} (${branch}) at ${headSha.slice(0, 9)}.`);
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

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : 'Local report import failed.');
	process.exitCode = 1;
});
