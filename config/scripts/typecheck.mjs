import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ignoredDirs = new Set(['.git', '.next', '.nuxt', '.turbo', '.vercel', '.vite', 'build', 'coverage', 'dist', 'node_modules', 'out']);

/**
 * Lists immediate workspace directories without descending into generated trees.
 *
 * @param dir Parent directory containing workspaces.
 *
 * @return Absolute paths to eligible child directories.
 */
function childDirs(dir) {
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !ignoredDirs.has(entry.name))
		.map((entry) => join(dir, entry.name));
}

/**
 * Checks whether a workspace contains authored TypeScript or Astro source.
 *
 * @param dir Workspace directory to inspect.
 *
 * @return Whether the workspace contains a source file that needs a typecheck.
 */
function hasTypeScriptSource(dir) {
	const pending = [dir];
	while (pending.length) {
		const current = pending.pop();
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (!ignoredDirs.has(entry.name)) pending.push(join(current, entry.name));
			} else if (/\.(?:[cm]?tsx?|astro)$/u.test(entry.name) && !/\.d\.ts$/u.test(entry.name)) return true;
		}
	}
	return false;
}

/**
 * Discovers TypeScript-bearing workspaces and requires each one to declare a runnable typecheck.
 *
 * @param repoRoot Standards repository root to inspect.
 *
 * @return Sorted workspace commands ready to run.
 */
export function discoverTypecheckTargets(repoRoot = root) {
	const targets = [];
	for (const group of ['packages', 'apps']) {
		const groupRoot = join(repoRoot, group);
		if (!statSync(groupRoot, { throwIfNoEntry: false })?.isDirectory()) continue;
		for (const dir of childDirs(groupRoot)) {
			const manifestPath = join(dir, 'package.json');
			if (!statSync(manifestPath, { throwIfNoEntry: false })?.isFile()) continue;
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
			const tsconfigPath = [join(dir, 'config', 'tsconfig.json'), join(dir, 'tsconfig.json')].find((path) => statSync(path, { throwIfNoEntry: false })?.isFile());
			if (!tsconfigPath && !hasTypeScriptSource(dir)) continue;
			if (!tsconfigPath) throw new Error(`${relative(repoRoot, dir)} has TypeScript source but no tsconfig.json`);
			if (typeof manifest.scripts?.typecheck !== 'string' || !manifest.scripts.typecheck.trim())
				throw new Error(`${relative(repoRoot, dir)} has a TypeScript project but no package.json typecheck script`);
			targets.push({ directory: dir, name: manifest.name ?? relative(repoRoot, dir), script: 'typecheck' });
		}
	}
	return targets.sort((left, right) => left.directory.localeCompare(right.directory));
}

/**
 * Runs each discovered workspace typecheck and returns the first failure status.
 *
 * @param targets Workspace scripts returned by discoverTypecheckTargets.
 * @param repoRoot Standards repository root.
 * @param spawn Child process runner, replaceable by tests.
 *
 * @return Zero when every workspace passes, otherwise the first nonzero status.
 */
export function runTypecheckTargets(targets, repoRoot = root, spawn = spawnSync) {
	for (const target of targets) {
		const result = spawn('pnpm', ['--dir', relative(repoRoot, target.directory), 'run', target.script], { cwd: repoRoot, stdio: 'inherit' });
		if (result.error) throw result.error;
		if (result.status !== 0) return result.status ?? 1;
	}
	return 0;
}

/**
 * Discovers and runs every eligible package or app typecheck.
 *
 * @param repoRoot Standards repository root to inspect.
 * @param spawn Child process runner, replaceable by tests.
 *
 * @return Zero when all projects pass, or the failing child exit status.
 */
export function main(repoRoot = root, spawn = spawnSync) {
	const targets = discoverTypecheckTargets(repoRoot);
	if (!targets.length) throw new Error('No TypeScript workspaces with typecheck scripts were discovered.');
	const status = runTypecheckTargets(targets, repoRoot, spawn);
	if (status) process.exitCode = status;
	return status;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
