/**
 * packages/quality-reports/src/lib/history-report.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const S_REGEX = /\s+/;
const GIT_I_REGEX = /\.git$/i;
const A_F_D_40_I_REGEX = /^[a-f\d]{40}$/i;

/** Per-commit history data that is safe to persist in the dashboard. */
export type HistoryCommitReport = { sha: string; authorDate: string; additions: number; deletions: number; sourceLines: number };

/** Versioned local Git history snapshot or push delta. */
export type HistoryReport = {
	schemaVersion: 1;
	mode: 'snapshot' | 'delta';
	repository: string;
	branch: string;
	headSha: string;
	baseSha: string | null;
	generatedAt: string;
	commits: HistoryCommitReport[];
};
const SRC_EXT = /\.(?:astro|c|cc|cpp|cs|css|go|html|java|js|jsx|jsonl|kt|less|m|mdx|php|py|rb|rs|scss|sh|sql|svelte|swift|ts|tsx|vue)$/i;
const EXCLUDED_DIR =
	/^(?:\.git|\.github|\.next|\.nuxt|\.output|\.turbo|\.vercel|\.netlify|\.astro|\.cache|build|coverage|dist|docs?|documentation|generated|vendor|node_modules|bower_components|target|out|public|static|storybook-static|test-results|results)$/i;
const EXCLUDED_FILE =
	/^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig(?:\.[^.]+)?\.json|(?:astro|eslint|prettier|vite|vitest|webpack|rollup|tailwind|postcss|jest|playwright|babel|next|netlify)\.config\.[^.]+|Dockerfile|Makefile)$/i;
const HISTORY_BATCH_SIZE = 50;
const BLOB_BATCH_SIZE = 250;
const GIT_OUTPUT_LIMIT = 128 * 1024 * 1024;

/**
 * Return whether a tracked path belongs to the dashboard's source and test scope.
 *
 * @param path Repository-relative tracked file path.
 *
 * @return Whether the path contributes to history metrics.
 */
export function isHistorySourcePath(path: string): boolean {
	const parts = path.split('/');
	if (!parts.length || parts.some((p) => p === '..' || p === '')) return false;
	if (parts.slice(0, -1).some((p) => EXCLUDED_DIR.test(p))) return false;
	const file = parts.at(-1) ?? '';
	return SRC_EXT.test(file) && !EXCLUDED_FILE.test(file) && !/\.(?:config|generated|gen|min|map|snap|lock)\.[^.]+$/i.test(file) && !/^\./.test(file);
}

/**
 * Run Git in the selected checkout and return UTF-8 output.
 *
 * @param root Git checkout path.
 * @param args Git command arguments.
 * @param input Optional standard input for the command.
 *
 * @return The command's UTF-8 output.
 */
function git(root: string, args: string[], input?: string): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', input, maxBuffer: GIT_OUTPUT_LIMIT, stdio: ['pipe', 'pipe', 'pipe'] });
}

/**
 * Run Git in the selected checkout and preserve binary object output.
 *
 * @param root Git checkout path.
 * @param args Git command arguments.
 * @param input Standard input for the command.
 *
 * @return The command's binary output.
 */
function gitBuffer(root: string, args: string[], input: string): Buffer {
	return execFileSync('git', args, { cwd: root, input, maxBuffer: GIT_OUTPUT_LIMIT, stdio: ['pipe', 'pipe', 'pipe'] });
}

/**
 * Read the before SHA from a GitHub push event when it is available.
 *
 * @return The push base SHA, or null when no usable base is present.
 */
function pushBase(): string | null {
	const ePath = process.env.GITHUB_EVENT_PATH;
	if (!ePath) return null;
	try {
		const e = JSON.parse(readFileSync(ePath, 'utf8')) as { before?: unknown };
		return typeof e.before === 'string' && A_F_D_40_I_REGEX.test(e.before) && !/^0{40}$/.test(e.before) ? e.before : null;
	} catch {
		return null;
	}
}

/**
 * Calculate source-line additions and deletions against a commit's first parent.
 *
 * @param root Git checkout path.
 * @param head Commit whose source changes are measured.
 * @param parents Commit parent SHAs.
 * @param stats Per-commit source line totals to update.
 */
function srcChanges(root: string, head: string, parents: string[], stats: Map<string, { additions: number; deletions: number }>): void {
	if (!parents.length) return;
	for (const line of git(root, ['diff', '--numstat', '--no-renames', '--no-ext-diff', parents[0], head, '--']).split('\n')) {
		if (!line) continue;
		const firstTab = line.indexOf('\t');
		const secondTab = line.indexOf('\t', firstTab + 1);
		if (firstTab < 0 || secondTab < 0) continue;
		if (!isHistorySourcePath(line.slice(secondTab + 1))) continue;
		const additions = line.slice(0, firstTab) === '-' ? 0 : Number(line.slice(0, firstTab));
		const deletions = line.slice(firstTab + 1, secondTab) === '-' ? 0 : Number(line.slice(firstTab + 1, secondTab));
		const curr = stats.get(head) ?? { additions: 0, deletions: 0 };
		curr.additions += additions;
		curr.deletions += deletions;
		stats.set(head, curr);
	}
}

/**
 * Read source-line stats for each commit and return merge commits for first-parent handling.
 *
 * @param root Git checkout path.
 * @param range Git revision range to inspect.
 * @param stats Per-commit source line totals to update.
 *
 * @return Merge commit SHAs requiring first-parent stats.
 */
function readNumstatLog(root: string, range: string, stats: Map<string, { additions: number; deletions: number }>): Set<string> {
	const output = git(root, ['log', '-z', '--format=%x1e%H%x00%P%x00', '--numstat', '--no-renames', '--root', '--reverse', '--topo-order', range]);
	const merges = new Set<string>();
	for (const block of output.split('\x1e')) {
		if (!block) continue;
		const headerEnd = block.indexOf('\n');
		const [sha, parents = ''] = (headerEnd < 0 ? block : block.slice(0, headerEnd)).replace(/^\n/, '').split('\x00');
		if (!A_F_D_40_I_REGEX.test(sha)) continue;
		if (parents.trim().split(S_REGEX).filter(Boolean).length > 1) {
			merges.add(sha);
			continue;
		}
		const curr = { additions: 0, deletions: 0 };
		for (const entry of (headerEnd < 0 ? '' : block.slice(headerEnd + 1)).split('\x00')) {
			const firstTab = entry.indexOf('\t');
			const secondTab = entry.indexOf('\t', firstTab + 1);
			if (firstTab < 0 || secondTab < 0 || !isHistorySourcePath(entry.slice(secondTab + 1))) continue;
			const added = entry.slice(0, firstTab);
			const removed = entry.slice(firstTab + 1, secondTab);
			curr.additions += added === '-' ? 0 : Number(added);
			curr.deletions += removed === '-' ? 0 : Number(removed);
		}
		stats.set(sha, curr);
	}
	return merges;
}

/**
 * Return eligible source blob IDs from a commit's tree.
 *
 * @param root Git checkout path.
 * @param sha Commit SHA to inspect.
 *
 * @return Eligible blob IDs in the commit tree.
 */
function parseTree(root: string, sha: string): string[] {
	const tree = git(root, ['ls-tree', '-r', '-z', '--full-tree', sha]);
	const blobs: string[] = [];
	for (const entry of tree.split('\0')) {
		const tab = entry.indexOf('\t');
		if (tab < 0) continue;
		const [mode, type, blob] = entry.slice(0, tab).split(' ');
		if (type === 'blob' && mode !== '120000' && isHistorySourcePath(entry.slice(tab + 1))) blobs.push(blob);
	}
	return blobs;
}

/**
 * Check whether a push base is reachable from the checked-out head.
 *
 * @param root Git checkout path.
 * @param base Push base SHA.
 * @param head Checked-out head SHA.
 *
 * @return Whether base is an ancestor of head.
 */
function isAncestor(root: string, base: string, head: string): boolean {
	try {
		execFileSync('git', ['merge-base', '--is-ancestor', base, head], { cwd: root, stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Build a complete snapshot or push delta from the local Git object database.
 *
 * @param root Path to the full Git checkout.
 * @param opts Optional repository, branch, or push-base overrides.
 *
 * @return A versioned history report with normalized commit counts.
 */
export function createHistoryReport(root: string, opts: { repository?: string; branch?: string; baseSha?: string | null } = {}): HistoryReport {
	const headSha = git(root, ['rev-parse', 'HEAD']).trim();
	const branch = opts.branch ?? process.env.GITHUB_REF_NAME ?? git(root, ['branch', '--show-current']).trim();
	if (!branch) throw new Error('Set GITHUB_REF_NAME or pass a checked-out branch to generate a history report.');
	const base = opts.baseSha === undefined ? pushBase() : opts.baseSha;
	const delta = !!base && isAncestor(root, base, headSha);
	const range = delta ? `${base}..${headSha}` : headSha;
	const commits = (function commitMetadata(root: string, range: string): { sha: string; authorDate: string; parents: string[] }[] {
		return git(root, ['log', '--format=%H%x00%aI%x00%P', '--reverse', '--topo-order', range])
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((l) => {
				const [sha, authorDate, parents = ''] = l.split('\x00');
				if (!A_F_D_40_I_REGEX.test(sha) || !Number.isFinite(Date.parse(authorDate))) throw new Error('Git returned invalid commit metadata.');
				return { sha, authorDate, parents: parents.trim().split(S_REGEX).filter(Boolean) };
			});
	})(root, range);
	const changes = new Map<string, { additions: number; deletions: number }>();
	const merges = readNumstatLog(root, range, changes);
	for (const commit of commits) if (merges.has(commit.sha)) srcChanges(root, commit.sha, commit.parents, changes);
	const lineCounts = new Map<string, number>();
	const reportCommits: HistoryCommitReport[] = [];
	for (let start = 0; start < commits.length; start += HISTORY_BATCH_SIZE) {
		const batch = commits.slice(start, start + HISTORY_BATCH_SIZE).map((c) => ({ commit: c, blobs: parseTree(root, c.sha) }));
		(function blobLineCounts(root: string, blobs: string[], cache: Map<string, number>): void {
			const unknown = [...new Set(blobs)].filter((s) => !cache.has(s));
			for (let start = 0; start < unknown.length; start += BLOB_BATCH_SIZE) {
				const batch = unknown.slice(start, start + BLOB_BATCH_SIZE);
				const output = gitBuffer(root, ['cat-file', '--batch'], `${batch.join('\n')}\n`);
				let offset = 0;
				for (const sha of batch) {
					const headerEnd = output.indexOf(10, offset);
					if (headerEnd < 0) throw new Error(`Git did not return blob ${sha}.`);
					const header = output.toString('utf8', offset, headerEnd).split(' ');
					if (header[0] !== sha || header[1] !== 'blob') throw new Error(`Git returned an invalid object for ${sha}.`);
					const size = Number(header[2]);
					const contentStart = headerEnd + 1;
					const contentEnd = contentStart + size;
					cache.set(
						sha,
						(function lineCount(content: Uint8Array): number {
							if (!content.length) return 0;
							let lines = 0;
							for (const byte of content) if (byte === 10) lines++;
							return content.at(-1) === 10 ? lines : lines + 1;
						})(output.subarray(contentStart, contentEnd)),
					);
					offset = contentEnd + 1;
				}
			}
		})(
			root,
			batch.flatMap((i) => i.blobs),
			lineCounts,
		);
		for (const { commit, blobs } of batch) {
			const changed = changes.get(commit.sha) ?? { additions: 0, deletions: 0 };
			reportCommits.push({
				sha: commit.sha,
				authorDate: commit.authorDate,
				additions: changed.additions,
				deletions: changed.deletions,
				sourceLines: blobs.reduce((t, b) => t + (lineCounts.get(b) ?? 0), 0),
			});
		}
	}
	return {
		schemaVersion: 1,
		mode: delta ? 'delta' : 'snapshot',
		repository:
			opts.repository ??
			(function repoName(root: string): string {
				const fromEnvironment = process.env.GITHUB_REPOSITORY;
				if (fromEnvironment && /^[^/]+\/[^/]+$/.test(fromEnvironment)) return fromEnvironment.replace(GIT_I_REGEX, '');
				const match = git(root, ['config', '--get', 'remote.origin.url'])
					.trim()
					.match(/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i);
				if (!match) throw new Error('Set GITHUB_REPOSITORY or use a GitHub origin remote to generate a history report.');
				return match[1].replace(GIT_I_REGEX, '');
			})(root),
		branch,
		headSha,
		baseSha: delta ? base : null,
		generatedAt: new Date().toISOString(),
		commits: reportCommits,
	};
}

/**
 * Write a generated report to a JSON file in the checkout.
 *
 * @param root Path to the full Git checkout.
 * @param path Output path relative to the checkout.
 * @param opts Optional repository, branch, or push-base overrides.
 *
 * @return The generated history report.
 */
export function writeHistoryReport(root: string, path: string, opts?: { repository?: string; branch?: string; baseSha?: string | null }): HistoryReport {
	const report = createHistoryReport(root, opts);
	writeFileSync(resolve(root, path), `${JSON.stringify(report, null, 2)}\n`);
	return report;
}
