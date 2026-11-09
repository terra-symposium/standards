#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const valueOptions = new Set(["--env", "--skill-file", "--skip", "--goal"]);
const options = new Map();
const roots = [];

for (let index = 0; index < args.length; index++) {
	const arg = args[index];
	if (valueOptions.has(arg)) {
		if (!args[index + 1] || args[index + 1].startsWith("--")) {
			console.error(`Missing value for ${arg}.`);
			process.exit(2);
		}
		options.set(arg, args[++index]);
	} else if (arg.startsWith("--")) {
		console.error(`Unknown option: ${arg}`);
		process.exit(2);
	} else {
		roots.push(arg);
	}
}

const configuredEnvId = options.get("--env") ?? process.env.CODEX_CLOUD_ENVIRONMENT_ID;
const envId = configuredEnvId?.split("~").at(-1);
const skillFile = options.get("--skill-file");
const skipNames = new Set((options.get("--skip") ?? "").split(",").filter(Boolean).map(name => name.toLowerCase()));
const goal = options.get("--goal");

if (!envId || !skillFile || roots.length === 0) {
	console.error("Usage: create-repo-chats.mjs --env <environment-id> --skill-file <SKILL.md> [--skip repo1,repo2] [--goal text] <repo-or-parent-path>...");
	process.exit(2);
}

async function gitRoot(path) {
	try {
		const { stdout } = await execFileAsync("git", ["-C", path, "rev-parse", "--show-toplevel"]);
		return resolve(stdout.trim());
	} catch {
		return undefined;
	}
}

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
		if (!entry.isDirectory() || ["node_modules", ".git", ".cache", "vendor"].includes(entry.name)) continue;
		await discover(resolve(path, entry.name), repos);
	}
	return repos;
}

const repos = new Map();
for (const root of roots) await discover(resolve(root), repos);
const targets = [...repos.keys()].filter(path => !skipNames.has(basename(path).toLowerCase())).sort();
if (targets.length === 0) {
	console.error("No Git repositories found after exclusions.");
	process.exit(1);
}

let skill;
try {
	skill = await readFile(resolve(skillFile), "utf8");
} catch (error) {
	console.error(`Cannot read worker skill ${skillFile}: ${error.message}`);
	process.exit(2);
}

const task = repo => `Apply the selected worker skill to repository ${basename(repo)} in this Codex Cloud task. Work only on this repository. Verify its origin, starting branch and commit, initial working-tree state, and repository instructions before editing. Use the skill and user goal below; complete its checks and report verified changes. Preserve unrelated work and use a separate checkout for this repo. Follow the skill's commit, push, and permission rules; do not broaden them. If the user's goal gives an additional-change threshold, count distinct valid changes for this repository only and stop at that threshold or after a full pass finds no further valid changes. Do not invent changes. If a checkout is read-only or temporary writes disappear between commands, move to a persistent writable clone/worktree or interactive session and continue; do not stop at the first mount failure. The final answer must be one Markdown table with one row for this repo, columns for the selected skill's required checks or goal, and commit/push or blocker metadata. Use ✓ and ✗ for every result.\n\nUSER GOAL\n${goal ?? "Run the selected worker skill to its stated completion criteria."}\n\nWORKER SKILL\n${skill}`;

async function run(repo) {
	const commandArgs = ["cloud", "exec", "--env", envId, "-c", 'model="gpt-6-luna"', task(repo)];
	return await new Promise(resolveResult => {
		const child = spawn("codex", commandArgs, { cwd: repo, stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
		child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
		child.on("error", error => {
			const result = { repo, code: 127, stdout, stderr: `${stderr}${error.message}` };
			console.log(`\n### ${basename(repo)} (submit exit ${result.code})\n${result.stderr.trim()}`);
			resolveResult(result);
		});
		child.on("close", code => {
			const result = { repo, code: code ?? 1, stdout, stderr };
			console.log(`\n### ${basename(repo)} (submit exit ${result.code})\n${result.stdout.trim()}${result.stderr ? `\n${result.stderr.trim()}` : ""}`);
			resolveResult(result);
		});
	});
}

console.log(`Submitting all ${targets.length} ${basename(resolve(skillFile))} Cloud tasks in one parallel batch; excluding: ${[...skipNames].join(", ") || "none"}`);
const results = await Promise.all(targets.map(run));

if (results.some(result => result.code !== 0)) process.exitCode = 1;
