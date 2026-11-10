#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultRoot = resolve(process.env.QUALITY_REPO_ROOT || `${homedir()}/Desktop`);
const ignoredDirectoryNames = new Set(['.git', '.next', '.nuxt', '.turbo', '.venv', '.codex', '.cache', '.pnpm-store', 'build', 'coverage', 'dist', 'node_modules', 'target', 'vendor']);
const canonicalRemoteAliases = new Map([['github.com/terra-symposium/terra-symposium-website', 'github.com/terra-symposium/website']]);

function parseArgs(args) {
	const options = { concurrency: Number.POSITIVE_INFINITY, dryRun: false, env: 'kai-macann-all', root: defaultRoot, skips: [] };
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
						.map((item) => item.trim().toLowerCase())
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

async function findRepositories(root) {
	const repositories = new Set();
	const visit = async (directory, depth = 0) => {
		let entries;
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			if (error.code === 'ENOENT' || error.code === 'EACCES' || error.code === 'EPERM') return;
			throw error;
		}
		if (entries.some((entry) => entry.name === '.git')) repositories.add(directory);
		if (depth >= 10) return;
		await Promise.all(
			entries.filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && !ignoredDirectoryNames.has(entry.name)).map((entry) => visit(resolve(directory, entry.name), depth + 1)),
		);
	};
	await visit(root);
	return [...repositories].sort((first, second) => first.localeCompare(second));
}

function gitValue(directory, args) {
	const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
	if (result.status !== 0) return '';
	return result.stdout.trim();
}

function remoteIdentity(remote) {
	const value = remote.trim().toLowerCase();
	const url = value.match(/^https?:\/\//) ? new URL(value) : undefined;
	const ssh = url ? undefined : value.match(/^(?:[^@]+@)?([^:]+):(.+)$/);
	const parsed = url ? `${url.hostname}${url.pathname}` : ssh ? `${ssh[1]}/${ssh[2]}` : value;
	const normalized = parsed.replace(/\.git$/, '').replace(/\/+$/, '');
	return canonicalRemoteAliases.get(normalized) || normalized;
}

function uniqueRepositories(repositories) {
	const groups = new Map();
	for (const repository of repositories) {
		const remote = gitValue(repository, ['remote', 'get-url', 'origin']);
		const commonDir = resolve(repository, gitValue(repository, ['rev-parse', '--git-common-dir']) || '.git');
		const gitDir = resolve(repository, gitValue(repository, ['rev-parse', '--git-dir']) || '.git');
		const identity = remote ? remoteIdentity(remote) : commonDir;
		const candidates = groups.get(identity) || [];
		candidates.push({ commonDir, gitDir, repository });
		groups.set(identity, candidates);
	}
	return [...groups.values()]
		.map(
			(candidates) =>
				candidates.sort((first, second) => {
					const firstWorktree = first.gitDir === first.commonDir ? 0 : 1;
					const secondWorktree = second.gitDir === second.commonDir ? 0 : 1;
					if (firstWorktree !== secondWorktree) return firstWorktree - secondWorktree;
					const firstTaskCheckout = /(?:^|[-_])(work|worktree|clone)(?:$|[-_])/i.test(basename(first.repository)) ? 1 : 0;
					const secondTaskCheckout = /(?:^|[-_])(work|worktree|clone)(?:$|[-_])/i.test(basename(second.repository)) ? 1 : 0;
					if (firstTaskCheckout !== secondTaskCheckout) return firstTaskCheckout - secondTaskCheckout;
					return first.repository.length - second.repository.length || first.repository.localeCompare(second.repository);
				})[0].repository,
		)
		.sort((first, second) => first.localeCompare(second));
}

function isSkipped(repository, root, skips) {
	const name = basename(repository).toLowerCase();
	const path = relative(root, repository).toLowerCase().split(/[\\/]/);
	return skips.includes(name) || path.some((segment) => skips.includes(segment));
}

function taskPrompt(repository, skillText) {
	return [
		'Run a full quality sweep for this one repository as a single-repository worker. Do not create additional chats.',
		`Repository: ${basename(repository)}`,
		`Current branch: ${gitValue(repository, ['branch', '--show-current']) || '(detached HEAD)'}`,
		'',
		'Read and follow the embedded Terra Standards Quality skill below. Use this repository’s own quality wrapper or check script, fix its findings, and continue until every configured check is green. Preserve unrelated work and checker rules. After the full gate is green, review the diff, commit task-only changes, push normally to the matching branch, and verify the remote SHA. Never force-push.',
		'',
		'## Terra Standards Quality skill',
		'',
		skillText.trim(),
	].join('\n');
}

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

function submitTask(repository, env, prompt) {
	return new Promise((resolveTask) => {
		const child = spawn('codex', ['cloud', 'exec', '--env', env, prompt], { cwd: repository, stdio: ['ignore', 'pipe', 'pipe'] });
		for (const [stream, output] of [
			['stdout', child.stdout],
			['stderr', child.stderr],
		]) {
			output.on('data', (chunk) => {
				for (const line of chunk.toString().split(/(?<=\n)/)) {
					if (line) process[stream].write(`[${basename(repository)}] ${line}`);
				}
			});
		}
		child.on('error', (error) => {
			process.stderr.write(`[${basename(repository)}] ${error.message}\n`);
			resolveTask(1);
		});
		child.on('close', (code) => resolveTask(code ?? 1));
	});
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) return printHelp();
	const skillText = await readFile(resolve(skillRoot, 'SKILL.md'), 'utf8');
	const found = await findRepositories(options.root);
	const unique = uniqueRepositories(found);
	const repositories = unique.filter((repository) => !isSkipped(repository, options.root, options.skips));
	if (!repositories.length) throw new Error(`No repositories found under ${options.root} after exclusions`);
	const missingRemotes = repositories.filter((repository) => !gitValue(repository, ['remote', 'get-url', 'origin']));
	if (missingRemotes.length) {
		throw new Error(`Cannot provision Cloud tasks without an origin remote:\n${missingRemotes.map((repository) => `- ${relative(options.root, repository)}`).join('\n')}`);
	}
	process.stdout.write(
		`Selected ${repositories.length} unique repositories under ${options.root}; skipped ${unique.length - repositories.length} by request and collapsed ${found.length - unique.length} duplicate worktrees or remotes.\n`,
	);
	if (options.dryRun) {
		for (const repository of repositories) {
			process.stdout.write(`DRY RUN ${relative(options.root, repository)}: codex cloud exec --env ${options.env} <quality task>\n`);
		}
		return;
	}
	let nextIndex = 0;
	let failed = 0;
	const worker = async () => {
		while (nextIndex < repositories.length) {
			const repository = repositories[nextIndex];
			nextIndex += 1;
			const code = await submitTask(repository, options.env, taskPrompt(repository, skillText));
			if (code !== 0) failed += 1;
		}
	};
	const workers = Math.min(repositories.length, options.concurrency);
	await Promise.all(Array.from({ length: workers }, worker));
	process.stdout.write(`Submitted ${repositories.length - failed}/${repositories.length} Cloud tasks.\n`);
	if (failed) process.exitCode = 1;
}

try {
	await main();
} catch (error) {
	process.stderr.write(`${error.message}\n`);
	process.exitCode = 1;
}
