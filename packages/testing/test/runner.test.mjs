/**
 * packages/testing/test/runner.test.mjs
 * Verifies shared policy checks and repository-defined suite execution.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readTestPlan, runTestPlan, validateTestPlan } from '../src/index.mjs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

function fixtureRoot() {
	return mkdtempSync(join(tmpdir(), 'standards-testing-'));
}

function git(root, ...args) {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function commit(root, message) {
	git(root, 'add', '.');
	git(root, '-c', 'user.name=Standards Tests', '-c', 'user.email=standards-tests@example.invalid', 'commit', '-m', message);
	return git(root, 'rev-parse', 'HEAD');
}

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
		assert.throws(
			() => validateTestPlan({ version: 1, suites: [{ name: 'first', command: 'node', args: ['test.mjs'], owns: ['tests/unit/*.spec.mjs'] }] }, root),
			/Test files are not owned/u,
		);
		assert.throws(
			() => validateTestPlan({ version: 1, suites: [{ name: 'first', command: 'node', args: ['test.mjs'], cwd: '../outside' }] }, root),
			/working directory must be inside the repository/u,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

function mkdirTest(root, path) {
	mkdirSync(join(root, path, '..'), { recursive: true });
	writeFileSync(join(root, path), '');
}

test('consumer-defined suites run once each in manifest order and aggregate into one result', () => {
	const root = fixtureRoot();
	const logPath = join(root, 'runs.log');
	const scriptPath = join(root, 'record.mjs');
	const manifestPath = join(root, '.terra-tests.json');
	writeFileSync(scriptPath, `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(logPath)}, process.argv[2] + '\\n');\n`);
	const names = ['contracts', 'unit', 'custom'];
	writeFileSync(manifestPath, JSON.stringify({ version: 1, suites: names.map((name) => ({ name, command: process.execPath, args: [scriptPath, name], owns: [`tests/${name}`] })) }));
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
		const head = commit(root, 'head');
		const event = { pull_request: { base: { ref: 'development', sha: base }, head: { sha: head } } };
		const result = withGitHubEvent(root, 'pull_request', event, () => runTestPlan({ root }));
		assert.deepEqual(result, { passed: 1, failed: 0, selected: ['shared:linear-history'] });
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
		const head = git(root, 'rev-parse', 'HEAD');
		const event = { pull_request: { base: { ref: 'development', sha: base }, head: { sha: head } } };
		const result = withGitHubEvent(root, 'pull_request', event, () => runTestPlan({ root }));
		assert.deepEqual(result, { passed: 0, failed: 1, selected: ['shared:linear-history'] });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
