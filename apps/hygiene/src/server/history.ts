type HistoryCommit = {
	sha: string;
	authorDate: string;
	additions: number;
	deletions: number;
	sourceLines: number;
};

export type HistoryReport = {
	schemaVersion: 1;
	mode: 'snapshot' | 'delta';
	repository: string;
	branch: string;
	headSha: string;
	baseSha: string | null;
	generatedAt: string;
	commits: HistoryCommit[];
};

const COMMIT_SHA = /^[a-f\d]{40}$/i;
const BRANCH_NAME = /^[A-Za-z0-9._/-]{1,100}$/;

/** Reject malformed, unsupported, or repository-mismatched local Git reports. */
export function parseHistoryReport(input: unknown): HistoryReport {
	if (!input || typeof input !== 'object') throw new Error('Invalid history report');
	const report = input as Record<string, unknown>;
	if (report.schemaVersion !== 1) throw new Error('Unsupported history report schema');
	if (report.mode !== 'snapshot' && report.mode !== 'delta') throw new Error('Invalid history report mode');
	if (typeof report.repository !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(report.repository)) throw new Error('Invalid history report repository');
	if (typeof report.branch !== 'string' || !BRANCH_NAME.test(report.branch) || report.branch.includes('..') || report.branch.startsWith('/')) throw new Error('Invalid history report branch');
	if (typeof report.headSha !== 'string' || !COMMIT_SHA.test(report.headSha)) throw new Error('Invalid history report head');
	if (report.baseSha !== null && (typeof report.baseSha !== 'string' || !COMMIT_SHA.test(report.baseSha))) throw new Error('Invalid history report base');
	if (report.mode === 'snapshot' && report.baseSha !== null) throw new Error('Snapshot reports cannot have a base commit');
	if (report.mode === 'delta' && report.baseSha === null) throw new Error('Delta reports require a base commit');
	if (typeof report.generatedAt !== 'string' || !Number.isFinite(Date.parse(report.generatedAt))) throw new Error('Invalid history report timestamp');
	if (!Array.isArray(report.commits)) throw new Error('Invalid history report commits');
	const seen = new Set<string>();
	const commits = report.commits.map((value): HistoryCommit => {
		if (!value || typeof value !== 'object') throw new Error('Invalid history report commit');
		const commit = value as Record<string, unknown>;
		if (typeof commit.sha !== 'string' || !COMMIT_SHA.test(commit.sha) || seen.has(commit.sha)) throw new Error('Invalid or duplicate history commit SHA');
		if (typeof commit.authorDate !== 'string' || !Number.isFinite(Date.parse(commit.authorDate))) throw new Error('Invalid history commit date');
		for (const key of ['additions', 'deletions', 'sourceLines'] as const) {
			if (!Number.isSafeInteger(commit[key]) || Number(commit[key]) < 0) throw new Error(`Invalid history commit ${key}`);
		}
		seen.add(commit.sha);
		return { sha: commit.sha, authorDate: commit.authorDate, additions: Number(commit.additions), deletions: Number(commit.deletions), sourceLines: Number(commit.sourceLines) };
	});
	if (commits.length && commits.at(-1)?.sha !== report.headSha) throw new Error('History report does not end at its head commit');
	return {
		schemaVersion: 1,
		mode: report.mode,
		repository: report.repository,
		branch: report.branch,
		headSha: report.headSha,
		baseSha: report.baseSha as string | null,
		generatedAt: report.generatedAt,
		commits,
	};
}

/** Pure branch guard used before a report is persisted. */
export function reportTargetsTrackedBranch(report: HistoryReport, repository: string, enabledBranches: readonly string[]): boolean {
	return report.repository.toLowerCase() === repository.toLowerCase() && enabledBranches.includes(report.branch);
}
