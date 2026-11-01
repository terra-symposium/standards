/**
 * apps/hygiene/scripts/local-import-utils.ts
 * Shared command-line and Git helpers for local report imports.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { execFileSync } from 'node:child_process';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reads a required command-line option and rejects malformed or repeated values.
 *
 * @param args Parsed command-line arguments to inspect.
 * @param name Option name whose following argument supplies the value.
 *
 * @returns The option value after validation.
 */
export function option(args: readonly string[], name: string): string {
	const index = args.indexOf(name);
	const value = args[index + 1];
	if (index < 0 || !value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
	return value;
}

/**
 * Reads an optional command-line option while rejecting malformed or repeated values.
 *
 * @param args Parsed command-line arguments to inspect.
 * @param name Option name whose following argument supplies the value when present.
 *
 * @returns The option value, or `undefined` when the option is absent.
 */
export function optionalOption(args: readonly string[], name: string): string | undefined {
	const index = args.indexOf(name);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (!value || value.startsWith('--') || args.lastIndexOf(name) !== index) throw new Error(`Pass ${name} <value>.`);
	return value;
}

/**
 * Runs Git in a selected checkout and trims its textual output.
 *
 * @param root Working tree in which Git resolves the command.
 * @param args Git subcommand and arguments to execute.
 *
 * @returns Standard output without leading or trailing whitespace.
 */
export function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * Extracts a normalized owner/name identifier from a GitHub remote URL.
 *
 * @param remote Git remote URL in HTTPS or SSH form.
 *
 * @returns Lowercase owner/name, or `null` when the URL is not a GitHub repository remote.
 */
export function githubRepository(remote: string): string | null {
	const match = /(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i.exec(remote);
	return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Confirms that an import target matches the requested GitHub repository and branch.
 *
 * @param repo Requested GitHub repository in owner/name form.
 * @param checkout Local Git checkout whose origin and branch refs will be inspected.
 * @param branch Branch name to validate before importing its report.
 * @throws {Error} When the owner/name, branch syntax, or origin remote does not match.
 */
export function validateImportTarget(repo: string, checkout: string, branch: string): void {
	if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error('Repository must use owner/name format.');
	if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Error('Invalid branch name.');
	if (githubRepository(git(checkout, ['remote', 'get-url', 'origin'])) !== repo.toLowerCase()) throw new Error('Checkout origin does not match the requested GitHub repository.');
}

/**
 * Resolves a branch to its remote-tracking commit, falling back to its local branch.
 *
 * @param checkout Git working tree containing the branch refs.
 * @param branch Branch name whose commit should be selected.
 *
 * @returns The full commit SHA selected from the remote or local ref.
 */
export function resolveRevision(checkout: string, branch: string): string {
	try {
		return git(checkout, ['rev-parse', '--verify', `refs/remotes/origin/${branch}^{commit}`]);
	} catch {
		return git(checkout, ['rev-parse', '--verify', `refs/heads/${branch}^{commit}`]);
	}
}
