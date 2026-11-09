#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const PRUNED_DIRECTORIES = new Set(['.cache', '.git', '.next', '.playwright-mcp', '.pnpm-store', '.turbo', 'build', 'dist', 'node_modules', 'target', 'vendor', 'venv']);

function options(args) {
	const values = {
		root: join(homedir(), 'Desktop'),
		environment: 'kai-macann-all',
		exclude: new Set(['compression']),
		dryRun: false,
		push: false,
	};
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--root') values.root = args[++index];
		else if (argument === '--env') values.environment = args[++index];
		else if (argument === '--exclude-repo') values.exclude.add(args[++index].toLowerCase());
		else if (argument === '--dry-run') values.dryRun = true;
		else if (argument === '--push') values.push = true;
		else if (argument === '--help') {
			console.log('Usage: provision-quality-chats.mjs [--root DIR] [--env ID] [--exclude-repo NAME] [--push] [--dry-run]');
			process.exit(0);
		} else {
			throw new Error(`Unknown option: ${argument}`);
		}
	}
	values.root = resolve(values.root);
	if (!values.environment) throw new Error('--env requires an environment id.');
	return values;
}

async function findRepositories(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	if (entries.some((entry) => entry.name === '.git')) return [directory];
	const children = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !PRUNED_DIRECTORIES.has(entry.name.toLowerCase()));
	const nested = await Promise.all(children.map((entry) => findRepositories(join(directory, entry.name))));
	return nested.flat();
}

async function repositoryIdentity(root) {
	const { stdout } = await execFileAsync('git', ['-C', root, 'remote', 'get-url', 'origin'], {
		encoding: 'utf8',
	});
	const remote = stdout.trim();
	const ssh = /^(?:[^@]+@)?([^:]+):(.+)$/u.exec(remote);
	const parsed = remote.includes('://') ? new URL(remote) : ssh ? { hostname: ssh[1], pathname: `/${ssh[2]}` } : new URL(remote);
	return `${parsed.hostname}${parsed.pathname.replace(/\.git$/u, '')}`;
}

function promptFor(repository, options) {
	return [
		`Run the Terra quality skill for exactly this repository: ${repository.identity}.`,
		`Use its Cloud checkout at ${repository.cloudPath} and do not modify any other repository.`,
		'Read the repository instructions and its configured quality wrapper or check script first. Run that complete wrapper, fix every finding without waivers or skipped checks, and rerun it until green.',
		'Review the final diff and stage only changes for this task. Commit immediately when the complete wrapper is green; do not wait for other repositories.',
		options.push ? 'Immediately push that commit to the current task branch after it succeeds, and verify the push.' : 'Push only if the user explicitly authorizes it.',
		'Return only a Markdown table with one row for this repository and one column for each configured check, plus Commit and Push. Every cell must be exactly ✓ or ✗. Use ✗ for a failure, blocker, or check that did not run; use ✓ only for a passed or verified not-applicable check.',
	].join('\n\n');
}

function submit(repository, environment, prompt) {
	return new Promise((resolveTask) => {
		console.log(`[${repository.name}] submitting`);
		const child = spawn('codex', ['cloud', 'exec', '-c', 'model="gpt-6-luna"', '--env', environment, prompt], { stdio: ['ignore', 'pipe', 'pipe'] });
		let output = '';
		child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
		child.stderr.setEncoding('utf8').on('data', (chunk) => (output += chunk));
		child.on('error', (error) => resolveTask({ repository, error }));
		child.on('close', (code) => resolveTask({ repository, code, output: output.trim() }));
	});
}

async function main() {
	const config = options(process.argv.slice(2));
	const roots = await findRepositories(config.root);
	const repositories = await Promise.all(
		roots.map(async (root) => ({
			root,
			name: basename(root),
			identity: await repositoryIdentity(root),
			cloudPath: `/workspace/${basename(root)}`,
		})),
	);
	const selected = repositories.filter((repository) => !config.exclude.has(repository.name.toLowerCase()) && !config.exclude.has(repository.identity.split('/').at(-1)?.toLowerCase() ?? ''));
	if (!selected.length) throw new Error(`No repositories found beneath ${config.root}.`);
	const duplicateNames = selected.map((repository) => repository.name).filter((name, index, names) => names.indexOf(name) !== index);
	if (duplicateNames.length) throw new Error(`Cloud checkout names are ambiguous: ${[...new Set(duplicateNames)].join(', ')}`);

	if (config.dryRun) {
		for (const repository of selected) {
			console.log(`\n[${repository.name}] ${repository.identity} → ${repository.cloudPath}`);
			console.log(promptFor(repository, config));
		}
		console.log(`\nDry run: ${selected.length} repository tasks; no Cloud tasks created.`);
		return;
	}

	try {
		await execFileAsync('codex', ['cloud', 'list', '--json', '--limit', '1', '--env', config.environment], { encoding: 'utf8' });
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`Cannot use Cloud environment "${config.environment}" with the authenticated Codex CLI. No tasks were created. ${detail}`);
	}
	const tasks = await Promise.all(selected.map((repository) => submit(repository, config.environment, promptFor(repository, config))));
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
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
