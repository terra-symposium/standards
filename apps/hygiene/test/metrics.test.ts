import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJUnit, parseQualityReport, score } from '../src/server/metrics.js';
import { buildReportCounts, buildRunId } from '../src/server/ingest.js';
import { parseBuildReport, parseHistoryReport, reportTargetsTrackedBranch } from '../src/server/history.js';
import { repositoryAdmin } from '../src/server/github.js';
import { acceptDelivery, repositoryOwner, verifySignature } from '../netlify/functions/webhook.mts';
import { createHmac } from 'node:crypto';
import { hashReportToken, matchesReportToken } from '../src/server/report-auth.js';

test('JUnit counts failures, errors and skipped cases without suite double counting', () => {
  const xml = '<testsuites><testsuite tests="4"><testcase name="a"/><testcase name="b"><failure/></testcase><testcase name="c"><error/></testcase><testcase name="d"><skipped/></testcase></testsuite></testsuites>';
  assert.deepEqual(parseJUnit(xml), { passed: 1, failed: 2, skipped: 1 });
});
test('quality contract rejects unknown versions and counts clean checks', () => {
  assert.deepEqual(parseQualityReport({ schemaVersion: 1, checks: [{ name: 'lint', status: 'passed', findings: 0 }, { name: 'imports', status: 'findings', findings: 2 }, { name: 'format', status: 'skipped', findings: 0 }] }), { total: 3, enabled: 2, clean: 1, findings: 2 });
  assert.throws(() => parseQualityReport({ schemaVersion: 2, checks: [] }), /Unsupported/);
});

test('failed Netlify builds still produce both test and quality metric inputs', () => {
  const report = buildReportCounts({ schemaVersion: 1, repository: 'owner/repo', branch: 'main', headSha: 'a'.repeat(40), completedAt: '2026-01-01T00:00:00.000Z', conclusion: 'failure', junitXml: '<testsuite><testcase name="a"><failure/></testcase></testsuite>', quality: { schemaVersion: 1, checks: [{ name: 'lint', status: 'failed', findings: 1 }] }, history: null });
  assert.deepEqual(report.tests, { passed: 0, failed: 1, skipped: 0 });
  assert.deepEqual(report.quality, { total: 1, enabled: 1, clean: 0, findings: 1 });
  assert.equal(report.report.conclusion, 'failure');
});

test('history-only build reports leave test and quality metrics missing', () => {
  const sha = 'a'.repeat(40);
  const report = buildReportCounts({ schemaVersion: 1, repository: 'owner/repo', branch: 'main', headSha: sha, completedAt: '2026-01-01T00:00:00.000Z', conclusion: 'success', junitXml: null, quality: null, history: {
    schemaVersion: 1, mode: 'snapshot', repository: 'owner/repo', branch: 'main', headSha: sha, baseSha: null,
    generatedAt: '2026-01-01T00:00:00.000Z', commits: [{ sha, authorDate: '2026-01-01T00:00:00.000Z', additions: 0, deletions: 0, sourceLines: 1 }],
  } });
  assert.equal(report.tests, null);
  assert.equal(report.quality, null);
  assert.equal(report.report.history?.commits.length, 1);
  assert.equal(score(report.tests, report.quality).score, null);
});

test('build reports reject unknown versions, mismatched history heads, and another branch', () => {
  const sha = 'b'.repeat(40);
  const report = { schemaVersion: 1, repository: 'owner/repo', branch: 'development', headSha: sha, completedAt: '2026-01-01T00:00:00.000Z', conclusion: 'success', junitXml: null, quality: null, history: null };
  assert.equal(parseBuildReport(report).branch, 'development');
  assert.throws(() => parseBuildReport({ ...report, schemaVersion: 2 }), /Unsupported/);
  const otherHead = 'c'.repeat(40);
  const otherHistory = { schemaVersion: 1, mode: 'snapshot', repository: 'owner/repo', branch: 'development', headSha: otherHead, baseSha: null, generatedAt: report.completedAt, commits: [{ sha: otherHead, authorDate: report.completedAt, additions: 0, deletions: 0, sourceLines: 1 }] };
  assert.throws(() => parseBuildReport({ ...report, history: otherHistory }), /does not match/);
  assert.throws(() => parseHistoryReport({ ...otherHistory, commits: [] }), /at least one commit/);
  assert.equal(reportTargetsTrackedBranch({ schemaVersion: 1, mode: 'snapshot', repository: 'owner/repo', branch: 'development', headSha: sha, baseSha: null, generatedAt: report.completedAt, commits: [{ sha, authorDate: report.completedAt, additions: 0, deletions: 0, sourceLines: 0 }] }, 'owner/repo', ['main']), false);
});

test('empty history deltas are valid only when the base already equals the head', () => {
  const sha = 'd'.repeat(40);
  const delta = { schemaVersion: 1, mode: 'delta', repository: 'owner/repo', branch: 'main', headSha: sha, baseSha: sha, generatedAt: '2026-01-01T00:00:00.000Z', commits: [] };
  assert.deepEqual(parseHistoryReport(delta).commits, []);
  assert.throws(() => parseHistoryReport({ ...delta, baseSha: 'e'.repeat(40) }), /Empty delta/);
});

test('build run identifiers stay stable across retries and change between builds', () => {
  const report = { repository: 'owner/repo', branch: 'main', headSha: 'f'.repeat(40), completedAt: '2026-01-01T00:00:00.000Z' };
  assert.equal(buildRunId(report), buildRunId(report));
  assert.notEqual(buildRunId(report), buildRunId({ ...report, completedAt: '2026-01-01T00:00:01.000Z' }));
});

test('score averages components and disappears with missing data', () => {
  assert.equal(score({ passed: 3, failed: 1, skipped: 5 }, { total: 2, enabled: 2, clean: 1, findings: 1 }).score, 63);
  assert.equal(score(null, { total: 2, enabled: 2, clean: 1, findings: 1 }).score, null);
  assert.equal(score({ passed: 3, failed: 1, skipped: 0 }, null).score, null);
});

test('history reports reject unknown versions and are scoped to enabled repository branches', () => {
  const report = { schemaVersion: 1, mode: 'snapshot', repository: 'Terra/repo', branch: 'main', headSha: 'a'.repeat(40), baseSha: null,
    generatedAt: '2026-01-01T00:00:00.000Z', commits: [{ sha: 'a'.repeat(40), authorDate: '2026-01-01T00:00:00.000Z', additions: 1, deletions: 0, sourceLines: 1 }] };
  assert.equal(parseHistoryReport(report).headSha, 'a'.repeat(40));
  assert.throws(() => parseHistoryReport({ ...report, schemaVersion: 2 }), /Unsupported/);
  assert.equal(reportTargetsTrackedBranch(parseHistoryReport(report), 'terra/repo', ['main']), true);
  assert.equal(reportTargetsTrackedBranch(parseHistoryReport(report), 'terra/repo', ['development']), false);
  assert.equal(reportTargetsTrackedBranch(parseHistoryReport(report), 'other/repo', ['main']), false);
});

test('webhook signature validation is repeatable for duplicate deliveries', () => {
  const body = JSON.stringify({ action: 'completed' });
  const signature = `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`;
  assert.equal(verifySignature(body, signature, 'secret'), true);
  assert.equal(verifySignature(body, signature, 'secret'), true);
  assert.equal(verifySignature(body + ' ', signature, 'secret'), false);
});

test('duplicate webhook deliveries are acknowledged without reprocessing', async () => {
  let claimed = false;
  let processCalls = 0;
  const claim = async (): Promise<boolean> => {
    if (claimed) return false;
    claimed = true;
    return true;
  };
  const process = async (): Promise<void> => { processCalls++; };
  const release = async (): Promise<void> => { claimed = false; };
  assert.equal(await acceptDelivery('delivery-1', claim, process, release), true);
  assert.equal(await acceptDelivery('delivery-1', claim, process, release), false);
  assert.equal(await acceptDelivery(null, claim, process, release), true);
  assert.equal(processCalls, 2);
});

test('concurrent duplicate webhook deliveries are claimed once', async () => {
  let claimed = false;
  let finishProcessing: (() => void) | undefined;
  let processCalls = 0;
  const claim = async (): Promise<boolean> => {
    if (claimed) return false;
    claimed = true;
    return true;
  };
  const process = async (): Promise<void> => {
    processCalls++;
    await new Promise<void>((resolve) => { finishProcessing = resolve; });
  };
  const first = acceptDelivery('delivery-1', claim, process, async () => { claimed = false; });
  await Promise.resolve();
  assert.equal(await acceptDelivery('delivery-1', claim, process, async () => { claimed = false; }), false);
  finishProcessing?.();
  assert.equal(await first, true);
  assert.equal(processCalls, 1);
});

test('failed webhook processing releases its claim for GitHub retry', async () => {
  let claimed = false;
  let processCalls = 0;
  const claim = async (): Promise<boolean> => {
    if (claimed) return false;
    claimed = true;
    return true;
  };
  const process = async (): Promise<void> => { if (++processCalls === 1) throw new Error('temporary failure'); };
  const release = async (): Promise<void> => { claimed = false; };
  await assert.rejects(acceptDelivery('delivery-1', claim, process, release), /temporary failure/);
  assert.equal(claimed, false);
  assert.equal(await acceptDelivery('delivery-1', claim, process, release), true);
  assert.equal(claimed, true);
  assert.equal(processCalls, 2);
});

test('installation repository payloads can omit the owner object', () => {
  assert.equal(repositoryOwner({ id: 1, name: 'repo', private: true, full_name: 'Terra-Symposium/repo' }), 'Terra-Symposium');
  assert.equal(repositoryOwner({ id: 1, name: 'repo', private: true }, 'Terra-Symposium'), 'Terra-Symposium');
  assert.equal(repositoryOwner({ id: 1, name: 'repo', private: true, owner: { login: 'owner' } }), 'owner');
  assert.throws(() => repositoryOwner({ id: 1, name: 'repo', private: true }), /missing an owner/);
});

test('repository build tokens are stored and compared as repository-scoped hashes', () => {
  const token = 'netlify-build-token';
  const hash = hashReportToken(token);
  assert.notEqual(hash, token);
  assert.equal(matchesReportToken(token, hash), true);
  assert.equal(matchesReportToken('another-repository-token', hash), false);
  assert.equal(matchesReportToken(token, null), false);
});

test('repository admin check denies another repository administrator', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (input) => new Response(JSON.stringify({ permission: String(input).includes('/repos/owner/own/') ? 'admin' : 'read' }), { status: 200 });
  try {
    assert.equal(await repositoryAdmin('owner', 'own', 'alice', 'token'), true);
    assert.equal(await repositoryAdmin('other', 'private', 'alice', 'token'), false);
  } finally { globalThis.fetch = previous; }
});
