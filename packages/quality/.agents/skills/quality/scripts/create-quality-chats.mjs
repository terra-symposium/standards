#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const WORK_WORKTREE_CLONE_I_REGEX = /(?:^|[-_])(work|worktree|clone)(?:$|[-_])/i;

const defaultRoot = resolve(process.env.QUALITY_REPO_ROOT || `${homedir()}/Desktop`);
const ignoredDirNames = new Set(['.git', '.next', '.nuxt', '.turbo', '.venv', '.codex', '.cache', '.pnpm-store', 'build', 'coverage', 'dist', 'node_modules', 'target', 'vendor']);
const canonicalRemoteAliases = new Map([['github.com/terra-symposium/terra-symposium-website', 'github.com/terra-symposium/website']]);

// terra-quality-ignore single-use -- Keep the documented parseArgs declaration so its parameter and return contract remains attached.
/**
 * Parses discovery, Cloud submission, concurrency, and dry-run options.
 *
 * @param args Command-line arguments following the script name.
 *
 * @return Normalized options for the repository batch.
 */
function parseArgs(args) {
	const options = {
		concurrency: Number.POSITIVE_INFINITY,
		dryRun: false,
		env: 'kai-macann-all',
		root: defaultRoot,
		skips: [],
	};
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--help' || arg === '-h') {
			options.help = true;
			continue;
		}
		if (arg === '--dry-run') {
			options.dryRun = true;
			continue;
		}
		if (['--root', '--env', '--skip', '--concurrency'].includes(arg)) {
			const value = args[index + 1];
			if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
			index += 1;
			if (arg === '--root') options.root = resolve(value);
			if (arg === '--env') options.env = value;
			if (arg === '--skip')
				options.skips.push(
					...value
						.split(',')
						.map(item => item.trim().toLowerCase())
						.filter(Boolean),
				);
			if (arg === '--concurrency') {
				options.concurrency = Number.parseInt(value, 10);
				if (!Number.isInteger(options.concurrency) || options.concurrency < 1) throw new Error('--concurrency must be a positive integer');
			}
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}
	return options;
}

// terra-quality-ignore single-use -- Keep the documented findRepos declaration so its parameter and return contract remains attached.
/**
 * Finds Git repositories below a root without traversing dependency/build trees.
 *
 * @param root Directory from which repository discovery begins.
 *
 * @return Sorted repository paths found below the root.
 */
async function findRepos(root) {
	const repos = new Set();
	const visit = async (dir, depth = 0) => {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch (err) {
			if (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'EPERM') return;
			throw err;
		}
		if (entries.some(entry => entry.name === '.git')) repos.add(dir);
		if (depth >= 10) return;
		await Promise.all(entries.filter(entry => entry.isDirectory() && !entry.isSymbolicLink() && !ignoredDirNames.has(entry.name)).map(entry => visit(resolve(dir, entry.name), depth + 1)));
	};
	await visit(root);
	return [...repos].sort((first, second) => first.localeCompare(second));
}

/**
 * Reads one Git value, returning an empty string when the command fails.
 *
 * @param dir Repository whose Git metadata should be queried.
 * @param args Git subcommand and arguments.
 *
 * @return Trimmed standard output, or an empty string on command failure.
 */
function gitValue(dir, args) {
	const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
	if (result.status !== 0) return '';
	return result.stdout.trim();
}

/**
 * Canonicalizes an origin URL while applying known repository aliases.
 *
 * @param remote Git remote URL to normalize.
 *
 * @return Canonical host and repository path for the remote.
 */
function remoteIdentity(remote) {
	const value = remote.trim().toLowerCase();
	const url = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? new URL(value) : undefined;
	const ssh = url ? undefined : value.match(/^(?:[^@]+@)?([^:]+):(.+)$/);
	const norm = (url ? `${url?.port ? `${url.hostname}:${url.port}` : url?.hostname}${url.pathname}` : ssh ? `${ssh[1]}/${ssh[2]}` : value).replace(/\.git$/, '').replace(/\/+$/, '');
	return canonicalRemoteAliases.get(norm) || norm;
}

// terra-quality-ignore single-use -- Keep the documented uniqueRepos declaration so its parameter and return contract remains attached.
/**
 * Collapses duplicate worktrees or clones that share one remote identity.
 *
 * @param repos Repository paths discovered under the configured root.
 *
 * @return One preferred checkout for each canonical repository identity.
 */
function uniqueRepos(repos) {
	const groups = new Map();
	for (const repo of repos) {
		const remote = gitValue(repo, ['remote', 'get-url', 'origin']);
		const commonDir = resolve(repo, gitValue(repo, ['rev-parse', '--git-common-dir']) || '.git');
		const gitDir = resolve(repo, gitValue(repo, ['rev-parse', '--git-dir']) || '.git');
		const identity = remote ? remoteIdentity(remote) : commonDir;
		const candidates = groups.get(identity) || [];
		candidates.push({ commonDir, gitDir, repository: repo });
		groups.set(identity, candidates);
	}
	return [...groups.values()]
		.map(
			candidates =>
				candidates.sort((first, second) => {
					const firstWorktree = first.gitDir === first.commonDir ? 0 : 1;
					const secondWorktree = second.gitDir === second.commonDir ? 0 : 1;
					if (firstWorktree !== secondWorktree) return firstWorktree - secondWorktree;
					const firstTaskCheckout = WORK_WORKTREE_CLONE_I_REGEX.test(basename(first.repository)) ? 1 : 0;
					const secondTaskCheckout = WORK_WORKTREE_CLONE_I_REGEX.test(basename(second.repository)) ? 1 : 0;
					if (firstTaskCheckout !== secondTaskCheckout) return firstTaskCheckout - secondTaskCheckout;
					return first.repository.length - second.repository.length || first.repository.localeCompare(second.repository);
				})[0].repository,
		)
		.sort((first, second) => first.localeCompare(second));
}

/**
 * Checks whether an explicit skip matches a repository name or path segment.
 *
 * @param repo Repository checkout path to test.
 * @param root Search root used to compute relative path segments.
 * @param skips Lowercase repository names or path segments to omit.
 *
 * @return Whether the repository matches an explicit skip.
 */
function isSkipped(repo, root, skips) {
	const name = basename(repo).toLowerCase();
	const path = relative(root, repo).toLowerCase().split(/[\\/]/);
	return skips.includes(name) || path.some(segment => skips.includes(segment));
}

/**
 * Builds the worker prompt with repository identity, branch, and skill instructions.
 *
 * @param repo Repository checkout assigned to the worker.
 * @param skillText Full quality skill text to include in the prompt.
 *
 * @return Instructions scoped to exactly one repository.
 */
function taskPrompt(repo, skillText) {
	return [
		'Run a full quality sweep for this one repository as a single-repository worker. Do not create additional chats.',
		`Repository: ${basename(repo)}`,
		`Current branch: ${gitValue(repo, ['branch', '--show-current']) || '(detached HEAD)'}`,
		'',
		'Read and follow the embedded Terra Standards Quality skill below. Use this repository’s own quality wrapper or check script, fix its findings, and continue until every configured check is green. Preserve unrelated work and checker rules. After the full gate is green, review the diff, commit task-only changes, push normally to the matching branch, and verify the remote SHA. Never force-push.',
		'',
		'## Terra Standards Quality skill',
		'',
		skillText.trim(),
	].join('\n');
}

// terra-quality-ignore single-use -- Keep the documented printHelp declaration so its parameter and return contract remains attached.
/** Prints the supported command-line options. */
function printHelp() {
	process.stdout.write(
		[
			'Create one Codex Cloud quality task for every discovered Git repository in a single concurrent batch.',
			'',
			'Usage: node create-quality-chats.mjs [options]',
			'',
			'Options:',
			`  --root <path>          Repository search root (default: ${defaultRoot})`,
			'  --env <id>             Codex Cloud environment (default: kai-macann-all)',
			'  --skip <name[,name]>   Exclude repository names or path segments (repeatable)',
			'  --concurrency <count>  Maximum simultaneous submissions (default: all)',
			'  --dry-run              List the batch without creating Cloud tasks',
			'  --help                 Show this message',
			'',
		].join('\n'),
	);
}

/**
 * Starts one repository task and streams its output with a repository label.
 *
 * @param repo Checkout assigned to the task.
 * @param env Codex Cloud environment identifier.
 * @param prompt Scoped task instructions.
 *
 * @return Exit code from the Cloud command, or `1` when it cannot start.
 */
function submitTask(repo, env, prompt) {
	return new Promise(resolveTask => {
		const child = spawn('codex', ['cloud', 'exec', '--env', env, prompt], {
			cwd: repo,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		for (const [stream, output] of [
			['stdout', child.stdout],
			['stderr', child.stderr],
		]) {
			output.on('data', chunk => {
				for (const line of chunk.toString().split(/(?<=\n)/)) {
					if (line) process[stream].write(`[${basename(repo)}] ${line}`);
				}
			});
		}
		child.on('error', err => {
			process.stderr.write(`[${basename(repo)}] ${err.message}\n`);
			resolveTask(1);
		});
		child.on('close', code => resolveTask(code ?? 1));
	});
}

// terra-quality-ignore single-use -- Keep the documented main declaration so its parameter and return contract remains attached.
/**
 * Discovers the repository batch and submits tasks within the concurrency limit.
 *
 * @return Resolves after the selected tasks have been submitted or reports an error.
 */
async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		return;
	}
	const skillText = await readFile(resolve(fileURLToPath(new URL('..', import.meta.url)), 'SKILL.md'), 'utf8');
	const found = await findRepos(options.root);
	const unique = uniqueRepos(found);
	const repos = unique.filter(repo => !isSkipped(repo, options.root, options.skips));
	if (!repos.length) throw new Error(`No repositories found under ${options.root} after exclusions`);
	const missingRemotes = repos.filter(repo => !gitValue(repo, ['remote', 'get-url', 'origin']));
	if (missingRemotes.length) throw new Error(`Cannot provision Cloud tasks without an origin remote:\n${missingRemotes.map(repo => `- ${relative(options.root, repo)}`).join('\n')}`);
	process.stdout.write(
		`Selected ${repos.length} unique repositories under ${options.root}; skipped ${unique.length - repos.length} by request and collapsed ${found.length - unique.length} duplicate worktrees or remotes.\n`,
	);
	if (options.dryRun) {
		for (const repo of repos) {
			process.stdout.write(`DRY RUN ${relative(options.root, repo)}: codex cloud exec --env ${options.env} <quality task>\n`);
		}
		return;
	}
	let nextIndex = 0;
	let failed = 0;
	const worker = async () => {
		while (nextIndex < repos.length) {
			const repo = repos[nextIndex];
			nextIndex += 1;
			if ((await submitTask(repo, options.env, taskPrompt(repo, skillText))) !== 0) failed += 1;
		}
	};
	await Promise.all(Array.from({ length: Math.min(repos.length, options.concurrency) }, worker));
	process.stdout.write(`Submitted ${repos.length - failed}/${repos.length} Cloud tasks.\n`);
	if (failed) process.exitCode = 1;
}

try {
	await main();
} catch (err) {
	process.stderr.write(`${err.message}\n`);
	process.exitCode = 1;
}
