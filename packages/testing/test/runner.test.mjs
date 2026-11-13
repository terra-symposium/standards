/**
 * packages/testing/test/runner.test.mjs
 * Verifies shared policy checks and repository-defined suite execution.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readTestPlan, runTestPlan, validateTestPlan } from '../src/index.mjs';
import { tmpdir } from 'node:os';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates a unique temporary directory for one test fixture.
 *
 * @return Absolute path to the new fixture directory.
 */
function fixtureRoot() {
	return mkdtempSync(join(tmpdir(), 'standards-testing-'));
}

/**
 * Runs Git in a fixture repository and returns trimmed standard output.
 *
 * @param root Fixture repository root.
 * @param args Git subcommand and arguments.
 *
 * @return Trimmed output from the Git command.
 */
function git(root, ...args) {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

/**
 * Stages fixture changes, commits them, and returns the new commit SHA.
 *
 * @param root Fixture repository root.
 * @param message Commit subject used by the test.
 *
 * @return Full SHA of the fixture commit.
 */
function commit(root, message) {
	git(root, 'add', '.');
	git(root, '-c', 'user.name=Standards Tests', '-c', 'user.email=standards-tests@example.invalid', 'commit', '-m', message);
	return git(root, 'rev-parse', 'HEAD');
}

/**
 * Sets GitHub event variables for one callback and restores the prior environment.
 *
 * @param root Fixture root used to store the event JSON file.
 * @param eventName GitHub event name for the callback.
 * @param event Event payload to serialize.
 * @param run Callback invoked while the event environment is active.
 *
 * @return Value returned by the callback.
 */
function withGitHubEvent(root, eventName, event, run) {
	const eventPath = join(root, 'event.json');
	writeFileSync(eventPath, JSON.stringify(event));
	const previousPath = process.env.GITHUB_EVENT_PATH;
	const previousName = process.env.GITHUB_EVENT_NAME;
	process.env.GITHUB_EVENT_PATH = eventPath;
	process.env.GITHUB_EVENT_NAME = eventName;
	try {
		return run();
	} finally {
		if (previousPath === undefined) delete process.env.GITHUB_EVENT_PATH;
		else process.env.GITHUB_EVENT_PATH = previousPath;
		if (previousName === undefined) delete process.env.GITHUB_EVENT_NAME;
		else process.env.GITHUB_EVENT_NAME = previousName;
	}
}

/**
 * Creates a temporary development-branch repository with one base commit.
 *
 * @return Fixture root and base commit SHA.
 */
function initGitFixture() {
	const root = fixtureRoot();
	git(root, '-c', 'init.defaultBranch=development', 'init', '-q');
	git(root, 'config', 'user.name', 'Standards Tests');
	git(root, 'config', 'user.email', 'standards-tests@example.invalid');
	writeFileSync(join(root, 'base.txt'), 'base\n');
	const base = commit(root, 'base');
	return { root, base };
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('missing consumer manifests produce an empty test plan', () => {
	const root = fixtureRoot();
	try {
		assert.deepEqual(readTestPlan(root), { version: 1, suites: [] });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('default discovery prefers config/terra-tests.json and preserves explicit manifest selection', () => {
	const root = fixtureRoot();
	try {
		const configPlan = { version: 1, suites: [{ name: 'config-plan', command: 'node', args: [], owns: ['tests/plan.test.mjs'] }] };
		const testsPlan = { version: 1, suites: [{ name: 'tests-plan', command: 'node', args: [], owns: ['tests/plan.test.mjs'] }] };
		mkdirTest(root, 'tests/plan.test.mjs');
		mkdirSync(join(root, 'config'), { recursive: true });
		mkdirSync(join(root, 'tests'), { recursive: true });
		writeFileSync(join(root, 'config/terra-tests.json'), JSON.stringify(configPlan));
		writeFileSync(join(root, 'tests/terra-tests.json'), JSON.stringify(testsPlan));

		assert.deepEqual(readTestPlan(root), configPlan);
		assert.deepEqual(readTestPlan(root, 'tests/terra-tests.json'), testsPlan);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('manifest validation rejects duplicate commands, overlapping file ownership, omitted tests, and paths outside the repository', () => {
	const root = fixtureRoot();
	try {
		mkdirTest(root, 'tests/unit/one.test.mjs');
		assert.throws(
			() =>
				validateTestPlan(
					{
						version: 1,
						suites: [
							{ name: 'first', command: 'node', args: ['test.mjs'], owns: ['tests/*.test.mjs'] },
							{ name: 'second', command: 'node', args: ['test.mjs'], owns: ['tests/*.test.mjs'] },
						],
					},
					root,
				),
			/each command must run once/u,
		);
		assert.throws(
			() =>
				validateTestPlan(
					{
						version: 1,
						suites: [
							{ name: 'first', command: 'node', args: ['first.mjs'], owns: ['tests/**/*.test.mjs'] },
							{ name: 'second', command: 'node', args: ['second.mjs'], owns: ['tests/unit/*.test.mjs'] },
						],
					},
					root,
				),
			/Test file ownership overlaps/u,
		);
		assert.throws(() => validateTestPlan({ version: 1, suites: [{ name: 'first', command: 'node', args: ['test.mjs'], owns: ['tests/unit/*.spec.mjs'] }] }, root), /Test files are not owned/u);
		assert.throws(
			() => validateTestPlan({ version: 1, suites: [{ name: 'first', command: 'node', args: ['test.mjs'], cwd: '../outside' }] }, root),
			/working directory must be inside the repository/u,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
/**
 * Creates an empty test file and any parent directories it needs.
 *
 * @param root Fixture repository root.
 * @param path Repository-relative test file path.
 */
function mkdirTest(root, path) {
	mkdirSync(join(root, path, '..'), { recursive: true });
	writeFileSync(join(root, path), '');
}
test('consumer-defined suites run once each in manifest order and aggregate into one result', () => {
	const root = fixtureRoot();
	const logPath = join(root, 'runs.log');
	const scriptPath = join(root, 'record.mjs');
	mkdirSync(join(root, 'tests'), { recursive: true });
	writeFileSync(scriptPath, `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(logPath)}, process.argv[2] + '\\n');\n`);
	const names = ['contracts', 'unit', 'custom'];
	writeFileSync(
		join(root, 'tests/terra-tests.json'),
		JSON.stringify({ version: 1, suites: names.map((name) => ({ name, command: process.execPath, args: [scriptPath, name], owns: [`tests/${name}`] })) }),
	);
	const previousPath = process.env.GITHUB_EVENT_PATH;
	const previousName = process.env.GITHUB_EVENT_NAME;
	delete process.env.GITHUB_EVENT_PATH;
	delete process.env.GITHUB_EVENT_NAME;
	try {
		const result = runTestPlan({ root });
		assert.deepEqual(readFileSync(logPath, 'utf8').trim().split('\n'), names);
		assert.deepEqual(result, { passed: names.length, failed: 0, selected: ['shared:linear-history', ...names] });
	} finally {
		if (previousPath === undefined) delete process.env.GITHUB_EVENT_PATH;
		else process.env.GITHUB_EVENT_PATH = previousPath;
		if (previousName === undefined) delete process.env.GITHUB_EVENT_NAME;
		else process.env.GITHUB_EVENT_NAME = previousName;
		rmSync(root, { recursive: true, force: true });
	}
});
test('linear-history accepts an ancestor-only pull-request range', () => {
	const { root, base } = initGitFixture();
	try {
		writeFileSync(join(root, 'head.txt'), 'head\n');
		assert.deepEqual(
			withGitHubEvent(root, 'pull_request', { pull_request: { base: { ref: 'development', sha: base }, head: { sha: commit(root, 'head') } } }, () => runTestPlan({ root })),
			{ passed: 1, failed: 0, selected: ['shared:linear-history'] },
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('linear-history rejects merge commits in a pull-request range', () => {
	const { root, base } = initGitFixture();
	try {
		git(root, 'checkout', '-b', 'side');
		writeFileSync(join(root, 'side.txt'), 'side\n');
		commit(root, 'side');
		git(root, 'checkout', 'development');
		writeFileSync(join(root, 'main.txt'), 'main\n');
		commit(root, 'main');
		git(root, 'merge', '--no-edit', 'side');
		assert.deepEqual(
			withGitHubEvent(root, 'pull_request', { pull_request: { base: { ref: 'development', sha: base }, head: { sha: git(root, 'rev-parse', 'HEAD') } } }, () => runTestPlan({ root })),
			{ passed: 0, failed: 1, selected: ['shared:linear-history'] },
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
