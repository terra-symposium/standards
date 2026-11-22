#!/usr/bin/env node
/**
 * scripts/quality-runner.mjs
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const script = fileURLToPath(import.meta.url);
const root = dirname(dirname(script));
const cwd = resolve(process.cwd());
const packagePath = relative(root, cwd);
if (packagePath.startsWith('..' + sep) || packagePath === '..') throw new Error(`Quality must run inside ${root}`);
const repoPackage = packagePath === '' || packagePath === 'config';
const baseConfig = [join(root, 'quality.json'), join(root, 'config/quality.json')].find(existsSync);
if (!baseConfig) throw new Error(`Missing quality.json in ${root}`);
const args = process.argv.slice(2).filter(arg => arg !== '--');

if (process.env.QUALITY_RUNNER_SCOPE_ONLY === '1') {
	console.log(JSON.stringify({ root, package: packagePath || '.', scope: repoPackage ? 'repository' : 'package', config: baseConfig, args }));
	process.exit(0);
}

const repoName = basename(root);
if ((repoName === 'uni' || repoName === 'standards') && process.env.QUALITY_RUNNER_UV_ACTIVE !== '1') {
	const env = { ...process.env, QUALITY_RUNNER_UV_ACTIVE: '1' };
	if (repoName === 'uni') env.UV_PROJECT_ENVIRONMENT = join(root, 'dist/cache/quality-venv');
	if (repoName === 'standards') {
		env.UV_PROJECT_ENVIRONMENT = join(root, 'dist/cache/venv');
		mkdirSync(join(root, 'dist/cache/apps/hygiene/astro-types/collections'), { recursive: true });
		mkdirSync(join(root, 'dist/cache/dependencies/apps/hygiene/node_modules/.astro/vite-sync'), { recursive: true });
	}
	const result = spawnSync('uv', ['run', '--project', repoName === 'uni' ? join(root, 'config') : root, '--locked', '--', process.execPath, script, ...args], { cwd, env, stdio: 'inherit' });
	if (result.error) throw result.error;
	process.exit(result.status ?? 1);
}

const raw = JSON.parse(readFileSync(baseConfig, 'utf8'));
raw.root = root;
raw.configRoot = existsSync(join(root, 'config')) ? join(root, 'config') : root;
const genLinks = [];
const scan = [root];
const pruned = new Set(['.git', 'node_modules', 'dist', 'target', '.venv', 'vendor']);
while (scan.length) {
	const dir = scan.pop();
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isSymbolicLink()) {
			if (raw.extensions?.some(ext => entry.name.endsWith(ext)) && statSync(path, { throwIfNoEntry: false })?.isDirectory()) genLinks.push(relative(root, path));
		} else if (entry.isDirectory() && !pruned.has(entry.name)) scan.push(path);
	}
}
raw.skippedFiles = [...new Set([...(raw.skippedFiles ?? []), ...genLinks])];
/**
 * Identifies repository commands that Quality must not invoke recursively.
 *
 * @param entry Configured command with a name and optional arguments.
 *
 * @returns Whether the command would launch a build or test suite.
 */
const isBuildOrTest = entry => {
	return /(^|[^a-z])(build|test)([^a-z]|$)/.test(String(entry.name ?? '').toLowerCase()) || (entry.args ?? []).map(String).some(arg => /^(?:test(?::.*)?|build(?::.*)?|docs:build)$/.test(arg));
};
raw.qualityCommands = (raw.qualityCommands ?? []).filter(entry => !isBuildOrTest(entry));
if (!repoPackage) {
	raw.sourceRoots = [packagePath];
	raw.includeRoots = [];
	raw.lintRoots = [packagePath];
	raw.typecheckRoots = [];
	delete raw.typecheckCommand;
	raw.qualityCommands = [];
	raw.recommendationCommands = [];
	raw.enabledChecks = {
		...raw.enabledChecks,
		type: false,
		knip: false,
		diff: false,
		github: false,
		command: false,
		'documented-commands': false,
	};
}
const cacheRoot = join(root, 'dist/cache/quality-runner');
mkdirSync(cacheRoot, { recursive: true });
const tempDir = mkdtempSync(join(cacheRoot, 'run-'));
const configPath = join(tempDir, 'quality.json');
writeFileSync(configPath, JSON.stringify(raw));
try {
	let modulePath;
	if (repoName === 'standards' && existsSync(join(root, 'packages/hygiene/dist/lib/runner.js'))) modulePath = join(root, 'packages/hygiene/dist/lib/runner.js');
	else {
		for (const manifest of [join(cwd, 'package.json'), join(root, 'package.json'), join(root, 'config/package.json')]) {
			if (!existsSync(manifest)) continue;
			try {
				modulePath = createRequire(manifest).resolve('@terra-symposium/hygiene/cli');
				break;
			} catch (err) {
				if (err.code !== 'MODULE_NOT_FOUND') throw err;
			}
		}
	}
	if (!modulePath) throw new Error('Install @terra-symposium/hygiene in this repository before running Quality.');
	if (args[0] === 'quality' && !args.includes('--warn') && !args.includes('--fix') && !args.includes('--safe-fix') && readFileSync(modulePath, 'utf8').includes('Options: --all, --warn, --fix'))
		args.push('--fix');
	const { runQualityFromCfg } = await import(pathToFileURL(modulePath).href);
	await runQualityFromCfg(configPath, args);
} finally {
	rmSync(tempDir, { recursive: true, force: true });
}
