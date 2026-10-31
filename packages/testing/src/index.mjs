/**
 * packages/testing/src/index.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const emptyTestPlan = { version: 1, suites: [] };
const isInside = (root, path) => {
	const rel = relative(root, path);
	return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

function listTestFiles(root) {
	const files = [];
	const visit = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (entry.name === 'node_modules' || entry.name === '.git') continue;
			const path = resolve(directory, entry.name);
			if (entry.isDirectory()) visit(path);
			else if (entry.isFile() && ((/(^|\/)(test|tests)\//u.test(relative(root, path).replaceAll('\\', '/')) && /\.[cm]?[jt]sx?$/u.test(entry.name)) || /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(entry.name))) files.push(relative(root, path).replaceAll('\\', '/'));
		}
	};
	visit(root);
	return files;
}

function globRegex(pattern) {
	let source = '^';
	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];
		if (char === '*') {
			if (pattern[i + 1] === '*') {
				i++;
				if (pattern[i + 1] === '/') { i++; source += '(?:.*/)?'; }
				else source += '.*';
			} else source += '[^/]*';
		} else if (char === '?') source += '[^/]';
		else source += char.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
	}
	return new RegExp(`${source}$`, 'u');
}

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Checks the current GitHub event range against the shared linear-history policy.
 *
 * @param {string} root - Absolute repository root used for Git commands.
 *
 * @return {'passed'|'failed'|'skipped'} Whether the shared check passed or could run.
 */
function runLinearHistory(root) {
	const eventPath = process.env.GITHUB_EVENT_PATH;
	const eventName = process.env.GITHUB_EVENT_NAME;
	if (!eventPath || !existsSync(eventPath)) {
		console.log('[SKIP] shared:linear-history (no GitHub event range)');
		return 'skipped';
	}
	let event;
	try {
		event = JSON.parse(readFileSync(eventPath, 'utf8'));
	} catch (err) {
		console.error(`[FAIL] shared:linear-history (cannot read GitHub event: ${err instanceof Error ? err.message : String(err)})`);
		return 'failed';
	}
	let base;
	let head;
	if (eventName === 'pull_request') {
		const targetBranch = event.pull_request?.base?.ref;
		if (!['development', 'main'].includes(targetBranch)) {
			console.log(`[SKIP] shared:linear-history (PR targets ${targetBranch ?? 'an unknown branch'})`);
			return 'skipped';
		}
		base = event.pull_request?.base?.sha;
		head = event.pull_request?.head?.sha;
	} else if (eventName === 'push') {
		base = event.before;
		head = event.after;
		if (typeof base === 'string' && /^0+$/u.test(base)) {
			console.log('[SKIP] shared:linear-history (initial branch push has no prior range)');
			return 'skipped';
		}
	} else {
		console.log(`[SKIP] shared:linear-history (unsupported event: ${eventName ?? 'unknown'})`);
		return 'skipped';
	}
	if (typeof base !== 'string' || typeof head !== 'string' || !base || !head) {
		console.error('[FAIL] shared:linear-history (event is missing its base or head commit)');
		return 'failed';
	}
	const git = (args, options = {}) => spawnSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
	for (const sha of [base, head]) {
		if (git(['cat-file', '-e', `${sha}^{commit}`]).status === 0) continue;
		git(['fetch', '--no-tags', '--depth=1', 'origin', sha]);
		if (git(['cat-file', '-e', `${sha}^{commit}`]).status !== 0) {
			console.error(`[FAIL] shared:linear-history (commit ${sha} is unavailable)`);
			return 'failed';
		}
	}
	if (git(['merge-base', '--is-ancestor', base, head]).status !== 0) {
		console.error(`[FAIL] shared:linear-history (base ${base} is not an ancestor of ${head}; rebase the branch)`);
		return 'failed';
	}
	const range = `${base}..${head}`;
	const merges = git(['rev-list', '--merges', range]);
	if (merges.status !== 0) {
		console.error(`[FAIL] shared:linear-history (could not inspect commit range ${range})`);
		return 'failed';
	}
	if (merges.stdout.trim()) {
		console.error(`Merge commits are not permitted in ${range}:\n${merges.stdout.trim()}`);
		return 'failed';
	}
	console.log(`[PASS] shared:linear-history (${range})`);
	return 'passed';
}

/**
 * Loads and validates one repository test plan.
 *
 * @param {string} root Repository root.
 * @param {string} manifestPath Repository-relative plan path.
 *
 * @return {{version: 1, suites: Array<{name: string, command: string, args: string[], cwd?: string, owns?: string[]}>}}
 */
export function readTestPlan(root, manifestPath = '.terra-tests.json') {
	const absoluteRoot = resolve(root);
	if (!manifestPath) return emptyTestPlan;
	if (isAbsolute(manifestPath) || !isInside(absoluteRoot, resolve(absoluteRoot, manifestPath))) throw new Error(`Test manifest must be inside the repository: ${manifestPath}`);
	const absoluteManifest = resolve(absoluteRoot, manifestPath);
	if (!existsSync(absoluteManifest)) return emptyTestPlan;
	const plan = JSON.parse(readFileSync(absoluteManifest, 'utf8'));
	validateTestPlan(plan, absoluteRoot);
	return plan;
}

/**
 * Validates suite names, command vectors, and test ownership before any process starts.
 *
 * @param {unknown} value Untrusted parsed plan.
 * @param {string} root Repository root.
 *
 * @return {asserts value is {version: 1, suites: Array<{name: string, command: string, args: string[], cwd?: string, owns?: string[]}>}}
 */
export function validateTestPlan(value, root) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Test plan must be a JSON object.');
	const plan = /** @type {Record<string, unknown>} */ (value);
	if (plan.version !== 1 || !Array.isArray(plan.suites)) throw new Error('Test plan must have version 1 and a suites array.');
	const names = new Set();
	const cmds = new Set();
	const owners = new Map();
	const ownedFiles = new Map();
	const testFiles = listTestFiles(resolve(root));
	for (const [index, raw] of plan.suites.entries()) {
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Test suite ${index + 1} must be an object.`);
		const suite = /** @type {Record<string, unknown>} */ (raw);
		if (typeof suite.name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/u.test(suite.name)) throw new Error(`Test suite ${index + 1} has an invalid name.`);
		if (names.has(suite.name)) throw new Error(`Duplicate test suite name: ${suite.name}`);
		names.add(suite.name);
		if (typeof suite.command !== 'string' || suite.command.trim() === '') throw new Error(`Test suite ${suite.name} must name a command.`);
		if (suite.args !== undefined && (!Array.isArray(suite.args) || suite.args.some((arg) => typeof arg !== 'string'))) throw new Error(`Test suite ${suite.name} args must be strings.`);
		const args = /** @type {string[]} */ (suite.args ?? []);
		const cwd = typeof suite.cwd === 'string' ? suite.cwd : '.';
		const absoluteCwd = resolve(root, cwd);
		if (!isInside(resolve(root), absoluteCwd)) throw new Error(`Test suite ${suite.name} working directory must be inside the repository.`);
		const cmdKey = JSON.stringify([suite.command, args, relative(resolve(root), absoluteCwd)]);
		if (cmds.has(cmdKey)) throw new Error(`Duplicate test command in suite ${suite.name}; each command must run once.`);
		cmds.add(cmdKey);
		if (!Array.isArray(suite.owns) || suite.owns.some((owner) => typeof owner !== 'string' || owner.trim() === ''))
			throw new Error(`Test suite ${suite.name} owns must be a list of non-empty repository-relative file globs.`);
		for (const owner of /** @type {string[]} */ (suite.owns ?? [])) {
			const norm = owner.replaceAll('\\', '/').replace(/\/+$/u, '');
			if (!norm || isAbsolute(norm) || norm === '..' || norm.startsWith('../') || norm.split('/').includes('..')) throw new Error(`Test suite ${suite.name} has an invalid owner: ${owner}`);
			if (owners.has(norm)) throw new Error(`Test ownership overlaps: ${norm} is claimed by ${owners.get(norm)} and ${suite.name}.`);
			owners.set(norm, suite.name);
			for (const file of testFiles.filter((path) => globRegex(norm).test(path))) {
				const previous = ownedFiles.get(file);
				if (previous) throw new Error(`Test file ownership overlaps: ${file} is claimed by ${previous} and ${suite.name}.`);
				ownedFiles.set(file, suite.name);
			}
		}
	}
	const omitted = testFiles.filter((file) => !ownedFiles.has(file));
	if (omitted.length) throw new Error(`Test files are not owned by any suite: ${omitted.join(', ')}`);
}

/**
 * Settings for selecting the repository manifest and requested test suites.
 *
 * @typedef {object} TestPlanOptions
 * @property {string} root - Absolute repository root where the test plan is loaded.
 * @property {string} [manifest] - Repository-relative test manifest path.
 * @property {string[]} [suites] - Optional suite names to run from the manifest.
 * @property {boolean} [sharedOnly] - Run only shared checks without custom suites.
 */

/**
 * Runs the requested suites serially and aggregates failures into one process result.
 *
 * @param {TestPlanOptions} props - Repository root and optional test-plan selections.
 *
 * @return {{passed: number, failed: number, selected: string[]}}
 */
export function runTestPlan({ root, manifest = '.terra-tests.json', suites: requested = [], sharedOnly = false }) {
	const absoluteRoot = resolve(root);
	const plan = sharedOnly ? emptyTestPlan : readTestPlan(absoluteRoot, manifest);
	const allSuites = /** @type {Array<{name: string, command: string, args?: string[], cwd?: string}>} */ (plan.suites);
	const selected = sharedOnly ? [] : requested.length ? allSuites.filter((suite) => requested.includes(suite.name)) : allSuites;
	const known = new Set(allSuites.map((suite) => suite.name));
	const unknown = requested.filter((name) => !known.has(name));
	if (unknown.length) throw new Error(`Unknown test suite${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);
	let passed = 0;
	let failed = 0;
	let skipped = 0;
	const sharedStatus = runLinearHistory(absoluteRoot);
	if (sharedStatus === 'passed') passed++;
	else if (sharedStatus === 'failed') failed++;
	else skipped++;
	for (const suite of selected) {
		console.log(`\n[TEST] ${suite.name}`);
		const result = spawnSync(suite.command, suite.args ?? [], { cwd: resolve(absoluteRoot, suite.cwd ?? '.'), stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
		if (result.error || result.status !== 0) {
			failed += 1;
			console.error(`[FAIL] ${suite.name}${result.error ? `: ${result.error.message}` : ` (exit ${result.status ?? 1})`}`);
		} else {
			passed += 1;
			console.log(`[PASS] ${suite.name}`);
		}
	}
	console.log(`\nTest checks: ${passed} passed, ${failed} failed, ${skipped} skipped`);
	return { passed, failed, selected: ['shared:linear-history', ...selected.map(({ name }) => name)] };
}
