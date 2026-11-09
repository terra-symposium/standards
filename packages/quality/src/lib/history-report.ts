/**
 * packages/quality/src/lib/history-report.ts
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
export type HistoryCommitReport = {
	sha: string;
	authorDate: string;
	additions: number;
	deletions: number;
	sourceLines: number;
};

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
	if (!parts.length || parts.some((part) => part === '..' || part === '')) return false;
	if (
		parts
			.slice(0, -1)
			.some((part) =>
				/^(?:\.git|\.github|\.next|\.nuxt|\.output|\.turbo|\.vercel|\.netlify|\.astro|\.cache|build|coverage|dist|docs?|documentation|generated|vendor|node_modules|bower_components|target|out|public|static|storybook-static|test-results|results)$/i.test(
					part,
				),
			)
	)
		return false;
	const file = parts.at(-1) ?? '';
	return (
		/\.(?:astro|c|cc|cpp|cs|css|go|html|java|js|jsx|jsonl|kt|less|m|mdx|php|py|rb|rs|scss|sh|sql|svelte|swift|ts|tsx|vue)$/i.test(file) &&
		!/^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig(?:\.[^.]+)?\.json|(?:astro|eslint|prettier|vite|vitest|webpack|rollup|tailwind|postcss|jest|playwright|babel|next|netlify)\.config\.[^.]+|Dockerfile|Makefile)$/i.test(
			file,
		) &&
		!/\.(?:config|generated|gen|min|map|snap|lock)\.[^.]+$/i.test(file) &&
		!/^\./.test(file)
	);
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
	return execFileSync('git', args, {
		cwd: root,
		encoding: 'utf8',
		input,
		maxBuffer: GIT_OUTPUT_LIMIT,
		stdio: ['pipe', 'pipe', 'pipe'],
	});
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
	const base =
		opts.baseSha === undefined
			? (() => {
					const eventPath = process.env.GITHUB_EVENT_PATH;
					if (!eventPath) return null;
					try {
						const event = JSON.parse(readFileSync(eventPath, 'utf8')) as {
							before?: unknown;
						};
						return typeof event.before === 'string' && A_F_D_40_I_REGEX.test(event.before) && !/^0{40}$/.test(event.before) ? event.before : null;
					} catch {
						return null;
					}
				})()
			: opts.baseSha;
	const delta =
		!!base &&
		(() => {
			try {
				execFileSync('git', ['merge-base', '--is-ancestor', base, headSha], {
					cwd: root,
					stdio: 'ignore',
				});
				return true;
			} catch {
				return false;
			}
		})();
	const range = delta ? `${base}..${headSha}` : headSha;
	const commits = git(root, ['log', '--format=%H%x00%aI%x00%P', '--reverse', '--topo-order', range])
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [sha, authorDate, parents = ''] = line.split('\x00');
			if (!A_F_D_40_I_REGEX.test(sha) || !Number.isFinite(Date.parse(authorDate))) throw new Error('Git returned invalid commit metadata.');
			return {
				sha,
				authorDate,
				parents: parents.trim().split(S_REGEX).filter(Boolean),
			};
		});
	const changes = new Map<string, { additions: number; deletions: number }>();
	(() => {
		const merges = new Set<string>();
		for (const block of git(root, ['log', '-z', '--format=%x1e%H%x00%P%x00', '--numstat', '--no-renames', '--root', '--reverse', '--topo-order', range]).split('\x1e')) {
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
			changes.set(sha, curr);
		}
		for (const commit of commits) {
			if (!merges.has(commit.sha) || !commit.parents.length) continue;
			for (const line of git(root, ['diff', '--numstat', '--no-renames', '--no-ext-diff', commit.parents[0], commit.sha, '--']).split('\n')) {
				if (!line) continue;
				const firstTab = line.indexOf('\t');
				const secondTab = line.indexOf('\t', firstTab + 1);
				if (firstTab < 0 || secondTab < 0) continue;
				if (!isHistorySourcePath(line.slice(secondTab + 1))) continue;
				const current = changes.get(commit.sha) ?? {
					additions: 0,
					deletions: 0,
				};
				current.additions += line.slice(0, firstTab) === '-' ? 0 : Number(line.slice(0, firstTab));
				current.deletions += line.slice(firstTab + 1, secondTab) === '-' ? 0 : Number(line.slice(firstTab + 1, secondTab));
				changes.set(commit.sha, current);
			}
		}
	})();
	const lineCounts = new Map<string, number>();
	const reportCommits: HistoryCommitReport[] = [];
	for (let start = 0; start < commits.length; start += HISTORY_BATCH_SIZE) {
		const batch = commits.slice(start, start + HISTORY_BATCH_SIZE).map((commit) => ({
			commit,
			blobs: (() => {
				const blobs: string[] = [];
				for (const entry of git(root, ['ls-tree', '-r', '-z', '--full-tree', commit.sha]).split('\0')) {
					const tab = entry.indexOf('\t');
					if (tab < 0) continue;
					const [mode, type, blob] = entry.slice(0, tab).split(' ');
					if (type === 'blob' && mode !== '120000' && isHistorySourcePath(entry.slice(tab + 1))) blobs.push(blob);
				}
				return blobs;
			})(),
		}));
		const unknown = [...new Set(batch.flatMap((entry) => entry.blobs))].filter((sha) => !lineCounts.has(sha));
		for (let blobStart = 0; blobStart < unknown.length; blobStart += BLOB_BATCH_SIZE) {
			const blobBatch = unknown.slice(blobStart, blobStart + BLOB_BATCH_SIZE);
			const output = execFileSync('git', ['cat-file', '--batch'], {
				cwd: root,
				input: `${blobBatch.join('\n')}\n`,
				maxBuffer: GIT_OUTPUT_LIMIT,
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			let offset = 0;
			for (const sha of blobBatch) {
				const headerEnd = output.indexOf(10, offset);
				if (headerEnd < 0) throw new Error(`Git did not return blob ${sha}.`);
				const header = output.toString('utf8', offset, headerEnd).split(' ');
				if (header[0] !== sha || header[1] !== 'blob') throw new Error(`Git returned an invalid object for ${sha}.`);
				const contentStart = headerEnd + 1;
				const contentEnd = contentStart + Number(header[2]);
				const content = output.subarray(contentStart, contentEnd);
				if (!content.length) lineCounts.set(sha, 0);
				else {
					let lines = 0;
					for (const byte of content) if (byte === 10) lines++;
					lineCounts.set(sha, content.at(-1) === 10 ? lines : lines + 1);
				}
				offset = contentEnd + 1;
			}
		}
		for (const { commit, blobs } of batch) {
			const changed = changes.get(commit.sha) ?? { additions: 0, deletions: 0 };
			reportCommits.push({
				sha: commit.sha,
				authorDate: commit.authorDate,
				additions: changed.additions,
				deletions: changed.deletions,
				sourceLines: blobs.reduce((total, blob) => total + (lineCounts.get(blob) ?? 0), 0),
			});
		}
	}
	return {
		schemaVersion: 1,
		mode: delta ? 'delta' : 'snapshot',
		repository:
			opts.repository ??
			(() => {
				const fromEnvironment = process.env.GITHUB_REPOSITORY;
				if (fromEnvironment && /^[^/]+\/[^/]+$/.test(fromEnvironment)) return fromEnvironment.replace(GIT_I_REGEX, '');
				const match = git(root, ['config', '--get', 'remote.origin.url'])
					.trim()
					.match(/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/i);
				if (!match) throw new Error('Set GITHUB_REPOSITORY or use a GitHub origin remote to generate a history report.');
				return match[1].replace(GIT_I_REGEX, '');
			})(),
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
