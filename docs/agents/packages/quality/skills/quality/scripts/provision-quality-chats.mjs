#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const PRUNED_DIRS = new Set(['.cache', '.git', '.next', '.playwright-mcp', '.pnpm-store', '.turbo', 'build', 'dist', 'node_modules', 'target', 'vendor', 'venv']);

/**
 * Parses repository scan, Cloud environment, exclusion, and submission options.
 *
 * @param args Command-line arguments following the script name.
 *
 * @return Normalized root, environment, exclusions, and run mode.
 */
function options(args) {
	const values = { root: join(homedir(), 'Desktop'), environment: 'kai-macann-all', exclude: new Set(['compression']), dryRun: false, push: true };
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--root') values.root = args[++index];
		else if (argument === '--env') values.environment = args[++index];
		else if (argument === '--exclude-repo') values.exclude.add(args[++index].toLowerCase());
		else if (argument === '--dry-run') values.dryRun = true;
		else if (argument === '--push') values.push = true;
		else if (argument === '--no-push') values.push = false;
		else if (argument === '--help') {
			console.log('Usage: provision-quality-chats.mjs [--root DIR] [--env ID] [--exclude-repo NAME] [--no-push] [--dry-run]');
			process.exit(0);
		} else {
			throw new Error(`Unknown option: ${argument}`);
		}
	}
	values.root = resolve(values.root);
	if (!values.environment) throw new Error('--env requires an environment id.');
	return values;
}

/**
 * Finds Git repositories recursively while pruning generated and dependency trees.
 *
 * @param dir Directory to inspect for a repository or child directories.
 *
 * @return Absolute paths for every repository discovered below the directory.
 */
async function findRepos(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	if (entries.some((entry) => entry.name === '.git')) return [dir];
	const children = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !PRUNED_DIRS.has(entry.name.toLowerCase()));
	const nested = await Promise.all(children.map((entry) => findRepos(join(dir, entry.name))));
	return nested.flat();
}

/**
 * Converts the configured Git origin into a canonical remote identity.
 *
 * @param root Repository checkout whose `origin` remote should be read.
 *
 * @return Canonical host and repository path, such as `github.com/owner/name`.
 */
async function repoIdentity(root) {
	const { stdout } = await execFileAsync('git', ['-C', root, 'remote', 'get-url', 'origin'], { encoding: 'utf8' });
	const remote = stdout.trim();
	const ssh = /^(?:[^@]+@)?([^:]+):(.+)$/u.exec(remote);
	const parsed = remote.includes('://') ? new URL(remote) : ssh ? { hostname: ssh[1], pathname: `/${ssh[2]}` } : new URL(remote);
	return `${parsed.hostname}${parsed.pathname.replace(/\.git$/u, '')}`;
}

/**
 * Builds the one-line skill trigger scoped to one discovered repository.
 *
 * @param repo Repository name, identity, and workspace path.
 * @param options Whether the user explicitly requested no push.
 * @return Instructions to show or submit for this repository.
 */
function promptFor(repo, options) {
	const repository = repo.identity.split('/').slice(-2).join('/');
	return `Read and follow the Terra Standards Quality skill for this repository: ${repository}.${options.push ? '' : ' Do not push.'}`;
}

/**
 * Starts one Cloud task and captures its process result.
 *
 * @param repo Repository record being submitted.
 * @param environment Cloud environment selected by the caller.
 * @param prompt Task instructions scoped to this repository.
 *
 * @return Promise resolving with the child process result.
 */
function submit(repo, environment, prompt) {
	return new Promise((resolveTask) => {
		console.log(`[${repo.name}] submitting`);
		const child = spawn('codex', ['cloud', 'exec', '-c', 'model="gpt-6-luna"', '--env', environment, prompt], { stdio: ['ignore', 'pipe', 'pipe'] });
		let output = '';
		child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
		child.stderr.setEncoding('utf8').on('data', (chunk) => (output += chunk));
		child.on('error', (err) => resolveTask({ repository: repo, error: err }));
		child.on('close', (code) => resolveTask({ repository: repo, code, output: output.trim() }));
	});
}

/** Discovers repositories, validates Cloud access, and submits selected tasks. */
async function main() {
	const config = options(process.argv.slice(2));
	const roots = await findRepos(config.root);
	const repos = await Promise.all(roots.map(async (root) => ({ root, name: basename(root), identity: await repoIdentity(root), cloudPath: `/workspace/${basename(root)}` })));
	const selected = repos.filter((repo) => !config.exclude.has(repo.name.toLowerCase()) && !config.exclude.has(repo.identity.split('/').at(-1)?.toLowerCase() ?? ''));
	if (!selected.length) throw new Error(`No repositories found beneath ${config.root}.`);
	const duplicateNames = selected.map((repo) => repo.name).filter((name, i, names) => names.indexOf(name) !== i);
	if (duplicateNames.length) throw new Error(`Cloud checkout names are ambiguous: ${[...new Set(duplicateNames)].join(', ')}`);

	if (config.dryRun) {
		for (const repo of selected) {
			console.log(`\n[${repo.name}] ${repo.identity} → ${repo.cloudPath}`);
			console.log(promptFor(repo, config));
		}
		console.log(`\nDry run: ${selected.length} repository tasks; no Cloud tasks created.`);
		return;
	}

	try {
		await execFileAsync('codex', ['cloud', 'list', '--json', '--limit', '1', '--env', config.environment], { encoding: 'utf8' });
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(`Cannot use Cloud environment "${config.environment}" with the authenticated Codex CLI. No tasks were created. ${detail}`, { cause: err });
	}
	const tasks = await Promise.all(selected.map((repo) => submit(repo, config.environment, promptFor(repo, config))));
	for (const task of tasks) {
		console.log(`\n[${task.repository.name}]`);
		if (task.output) console.log(task.output);
		if (task.error) console.error(task.error.message);
		else if (task.code !== 0) console.error(`Cloud submission exited with ${task.code}.`);
	}
	if (tasks.some((task) => task.error || task.code !== 0)) process.exitCode = 1;
}

try {
	await main();
} catch (err) {
	console.error(err instanceof Error ? err.message : String(err));
	process.exitCode = 1;
}
