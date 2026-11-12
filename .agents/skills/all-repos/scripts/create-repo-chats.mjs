#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { execFile, spawn } from 'node:child_process';
const args = process.argv.slice(2);
const valueOptions = new Set(['--env', '--skill-file', '--skip', '--goal']);
const options = new Map();
const roots = [];

for (let index = 0; index < args.length; index++) {
	const arg = args[index];
	if (valueOptions.has(arg)) {
		if (!args[index + 1] || args[index + 1].startsWith('--')) {
			console.error(`Missing value for ${arg}.`);
			process.exit(2);
		}
		options.set(arg, args[++index]);
	} else if (arg.startsWith('--')) {
		console.error(`Unknown option: ${arg}`);
		process.exit(2);
	} else {
		roots.push(arg);
	}
}

const envId = (options.get('--env') ?? process.env.CODEX_CLOUD_ENVIRONMENT_ID)?.split('~').at(-1);
const skillFile = options.get('--skill-file');
const skipNames = new Set(
	(options.get('--skip') ?? '')
		.split(',')
		.filter(Boolean)
		.map((name) => name.toLowerCase()),
);

if (!envId || !skillFile || roots.length === 0) {
	console.error('Usage: create-repo-chats.mjs --env <environment-id> --skill-file <SKILL.md> [--skip repo1,repo2] [--goal text] <repo-or-parent-path>...');
	process.exit(2);
}

/**
 * Resolve the repository root for a path when the path is inside a Git checkout.
 *
 * @param {string} path - Path to inspect.
 * @returns {Promise<string | undefined>} Repository root, or undefined when the path is not in a repository.
 */
async function gitRoot(path) {
	try {
		const { stdout } = await new Promise((resolveResult, reject) => execFile('git', ['-C', path, 'rev-parse', '--show-toplevel'], (err, stdout) => (err ? reject(err) : resolveResult({ stdout }))));
		return resolve(stdout.trim());
	} catch {
		return undefined;
	}
}

/**
 * Find Git repositories below a path, stopping at each repository root.
 *
 * @param {string} path - File or directory to inspect.
 * @param {Map<string, string>} repos - Repositories already discovered.
 * @returns {Promise<Map<string, string>>} The accumulated repository roots.
 */
async function discover(path, repos = new Map()) {
	const root = await gitRoot(path);
	if (root) {
		repos.set(root, root);
		return repos;
	}

	let entries;
	try {
		entries = await readdir(path, { withFileTypes: true });
	} catch {
		return repos;
	}

	for (const entry of entries) {
		if (!entry.isDirectory() || ['node_modules', '.git', '.cache', 'vendor'].includes(entry.name)) continue;
		await discover(resolve(path, entry.name), repos);
	}
	return repos;
}

const repos = new Map();
for (const root of roots) await discover(resolve(root), repos);
const targets = [...repos.keys()].filter((path) => !skipNames.has(basename(path).toLowerCase())).sort();
if (targets.length === 0) {
	console.error('No Git repositories found after exclusions.');
	process.exit(1);
}

let skill;
try {
	skill = await readFile(resolve(skillFile), 'utf8');
} catch (err) {
	console.error(`Cannot read worker skill ${skillFile}: ${err.message}`);
	process.exit(2);
}

/**
 * Submit one repository task to the Codex Cloud executor and collect its output.
 *
 * @param {string} repo - Repository root assigned to the task.
 * @returns {Promise<{repo: string, code: number, stdout: string, stderr: string}>} Submission result.
 */
async function run(repo) {
	return await new Promise((resolveResult) => {
		const child = spawn(
			'codex',
			[
				'cloud',
				'exec',
				'--env',
				envId,
				'-c',
				'model="gpt-6-luna"',
				`Apply the selected worker skill to repository ${basename(repo)} in this Codex Cloud task. Work only on this repository. Verify its origin, starting branch and commit, initial working-tree state, and repository instructions before editing. Use the skill and user goal below; complete its checks and report verified changes. Preserve unrelated work and use a separate checkout for this repo. Follow the skill's commit, push, and permission rules; do not broaden them. If the user's goal gives an additional-change threshold, count distinct valid changes for this repository only and stop at that threshold or after a full pass finds no further valid changes. Do not invent changes. If a checkout is read-only or temporary writes disappear between commands, move to a persistent writable clone/worktree or interactive session and continue; do not stop at the first mount failure. The final answer must be one Markdown table with one row for this repo, columns for the selected skill's required checks or goal, and commit/push or blocker metadata. Use ✓ and ✗ for every result.\n\nUSER GOAL\n${options.get('--goal') ?? 'Run the selected worker skill to its stated completion criteria.'}\n\nWORKER SKILL\n${skill}`,
			],
			{ cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] },
		);
		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8').on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.setEncoding('utf8').on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', (err) => {
			const result = { repo, code: 127, stdout, stderr: `${stderr}${err.message}` };
			console.log(`\n### ${basename(repo)} (submit exit ${result.code})\n${result.stderr.trim()}`);
			resolveResult(result);
		});
		child.on('close', (code) => {
			const result = { repo, code: code ?? 1, stdout, stderr };
			console.log(`\n### ${basename(repo)} (submit exit ${result.code})\n${result.stdout.trim()}${result.stderr ? `\n${result.stderr.trim()}` : ''}`);
			resolveResult(result);
		});
	});
}

console.log(`Submitting all ${targets.length} ${basename(resolve(skillFile))} Cloud tasks in one parallel batch; excluding: ${[...skipNames].join(', ') || 'none'}`);
if ((await Promise.all(targets.map(run))).some((result) => result.code !== 0)) process.exitCode = 1;
