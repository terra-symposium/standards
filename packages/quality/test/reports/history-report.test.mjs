import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createHistoryReport, isHistorySourcePath } from '../../dist/lib/history-report.js';
import { runQualityFromCfg } from '../../dist/lib/runner.js';

/**
 * Run a Git fixture command with a stable author and committer date.
 *
 * @param root Temporary repository path.
 * @param args Git command arguments.
 * @param date Optional date for the fixture commit.
 */
function git(root, args, date) {
	execFileSync('git', args, { cwd: root, env: { ...process.env, ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}) }, stdio: 'ignore' });
}

/**
 * Create a temporary repository with source, tests, exclusions, renames, and dated commits.
 *
 * @return A temporary Git repository and cleanup helper.
 */
function historyFixture() {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-history-'));
	git(root, ['init', '-q']);
	git(root, ['config', 'user.name', 'Terra Test']);
	git(root, ['config', 'user.email', 'terra@example.test']);
	const write = (path, contents) => {
		const tgt = join(root, path);
		mkdirSync(join(tgt, '..'), { recursive: true });
		writeFileSync(tgt, contents);
	};
	write('src/main.ts', 'one\ntwo\n');
	write('test/main.test.ts', 'test\n');
	write('docs/example.ts', 'documentation\n');
	write('src/vite.config.ts', 'configuration\n');
	git(root, ['add', '.']);
	git(root, ['commit', '-qm', 'first source files'], '2022-04-03T05:06:07+00:00');
	const firstSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
	renameSync(join(root, 'src/main.ts'), join(root, 'docs/main.ts'));
	write('src/new.ts', 'alpha\nbeta\ngamma\n');
	write('docs/example.ts', 'documentation updated\n');
	git(root, ['add', '-A']);
	git(root, ['commit', '-qm', 'move source into docs'], '2023-05-04T06:07:08+00:00');
	const secondSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
	renameSync(join(root, 'src/new.ts'), join(root, 'src/renamed.ts'));
	git(root, ['add', '-A']);
	git(root, ['commit', '-qm', 'rename source file'], '2024-06-05T07:08:09+00:00');
	const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
	return { root, firstSha, secondSha, headSha };
}

test('full snapshots include dates, source totals, and source-only changes across renames', () => {
	const { root, firstSha, headSha } = historyFixture();
	try {
		const report = createHistoryReport(root, { repository: 'owner/repo', branch: 'main' });
		assert.equal(report.schemaVersion, 1);
		assert.equal(report.mode, 'snapshot');
		assert.equal(report.headSha, headSha);
		assert.equal(report.baseSha, null);
		assert.equal(report.commits.length, 3);
		assert.equal(report.commits[0].sha, firstSha);
		assert.equal(report.commits[0].authorDate, '2022-04-03T05:06:07Z');
		assert.equal(report.commits[0].additions, 3);
		assert.equal(report.commits[0].sourceLines, 3);
		assert.equal(report.commits[1].additions, 3);
		assert.equal(report.commits[1].deletions, 2);
		assert.equal(report.commits[1].sourceLines, 4);
		assert.equal(report.commits[2].additions, 3);
		assert.equal(report.commits[2].deletions, 3);
		assert.equal(report.commits[2].sourceLines, 4);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('history scope includes tests and excludes generated, vendor, documentation, dependency, build and configuration files', () => {
	assert.equal(isHistorySourcePath('src/main.ts'), true);
	assert.equal(isHistorySourcePath('test/main.test.ts'), true);
	for (const path of ['node_modules/a.ts', 'vendor/a.py', 'dist/a.js', 'docs/example.ts', 'src/generated/a.ts', 'src/vite.config.ts', 'tsconfig.json'])
		assert.equal(isHistorySourcePath(path), false, path);
});

test('push deltas contain commits after the supplied base and the CLI writes schema version 1', () => {
	const { root, secondSha, headSha } = historyFixture();
	const oldRepo = process.env.GITHUB_REPOSITORY;
	const oldBranch = process.env.GITHUB_REF_NAME;
	const prevCwd = process.cwd();
	try {
		const delta = createHistoryReport(root, { repository: 'owner/repo', branch: 'main', baseSha: secondSha });
		assert.equal(delta.mode, 'delta');
		assert.equal(delta.baseSha, secondSha);
		assert.equal(delta.headSha, headSha);
		assert.equal(delta.commits.length, 1);
		assert.equal(delta.commits[0].sha, headSha);
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		process.env.GITHUB_REF_NAME = 'main';
		process.chdir(root);
		runQualityFromCfg(undefined, ['history', '--branch', 'main', '--report-json', 'history.json']);
		const snapshot = JSON.parse(readFileSync(join(root, 'history.json'), 'utf8'));
		assert.equal(snapshot.schemaVersion, 1);
		assert.equal(snapshot.mode, 'snapshot');
		assert.equal(snapshot.branch, 'main');
		runQualityFromCfg(undefined, ['history', '--branch', 'main', '--base-sha', secondSha, '--report-json', 'delta.json']);
		const deltaReport = JSON.parse(readFileSync(join(root, 'delta.json'), 'utf8'));
		assert.equal(deltaReport.mode, 'delta');
		assert.equal(deltaReport.baseSha, secondSha);
		assert.equal(deltaReport.commits.length, 1);
	} finally {
		process.chdir(prevCwd);
		if (oldRepo === undefined) delete process.env.GITHUB_REPOSITORY;
		else process.env.GITHUB_REPOSITORY = oldRepo;
		if (oldBranch === undefined) delete process.env.GITHUB_REF_NAME;
		else process.env.GITHUB_REF_NAME = oldBranch;
		rmSync(root, { recursive: true, force: true });
	}
});

test('merge commits count source changes against their first parent', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-merge-'));
	try {
		git(root, ['init', '-q', '--initial-branch=main']);
		git(root, ['config', 'user.name', 'Terra Test']);
		git(root, ['config', 'user.email', 'terra@example.test']);
		const write = (path, contents) => {
			const tgt = join(root, path);
			mkdirSync(join(tgt, '..'), { recursive: true });
			writeFileSync(tgt, contents);
		};
		write('src/main.ts', 'main\n');
		git(root, ['add', '.']);
		git(root, ['commit', '-qm', 'base']);
		git(root, ['checkout', '-qb', 'feature']);
		write('src/feature.ts', 'feature\n');
		git(root, ['add', '.']);
		git(root, ['commit', '-qm', 'feature']);
		git(root, ['checkout', '-q', 'main']);
		write('src/main.ts', 'main\nmain change\n');
		git(root, ['add', '.']);
		git(root, ['commit', '-qm', 'main change']);
		git(root, ['merge', '--no-ff', '-qm', 'merge feature', 'feature']);
		const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
		const report = createHistoryReport(root, { repository: 'owner/repo', branch: 'main' });
		const merge = report.commits.find((commit) => commit.sha === headSha);
		assert.ok(merge);
		assert.equal(merge.additions, 1);
		assert.equal(merge.deletions, 0);
		assert.equal(merge.sourceLines, 3);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
