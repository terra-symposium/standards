/**
 * apps/hygiene/scripts/local-import-utils.ts
 * Shared command-line and Git helpers for local report imports.
 */

import { execFileSync } from 'node:child_process';

export function option(args: readonly string[], name: string): string {
	const index = args.indexOf(name);
	const value = args[index + 1];
	if (index < 0 || !value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
	return value;
}

export function optionalOption(args: readonly string[], name: string): string | undefined {
	const index = args.indexOf(name);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (!value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
	return value;
}

export function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function githubRepository(remote: string): string | null {
	const match = /(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i.exec(remote);
	return match?.[1]?.toLowerCase() ?? null;
}

export function validateImportTarget(repository: string, checkout: string, branch: string): void {
	if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error('Repository must use owner/name format.');
	if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Error('Invalid branch name.');
	if (githubRepository(git(checkout, ['remote', 'get-url', 'origin'])) !== repository.toLowerCase()) throw new Error('Checkout origin does not match the requested GitHub repository.');
}

export function resolveRevision(checkout: string, branch: string): string {
	try {
		return git(checkout, ['rev-parse', '--verify', `refs/remotes/origin/${branch}^{commit}`]);
	} catch {
		return git(checkout, ['rev-parse', '--verify', `refs/heads/${branch}^{commit}`]);
	}
}
