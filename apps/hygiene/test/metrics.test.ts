import assert from 'node:assert/strict';
import test from 'node:test';
import { zipSync, strToU8 } from 'fflate';
import { parseJUnit, parseQualityReport, score } from '../src/server/metrics.js';
import { reportsFromZip, eligibleRun } from '../src/server/ingest.js';
import { parseHistoryReport, reportTargetsTrackedBranch } from '../src/server/history.js';
import { appJwt, repositoryAdmin } from '../src/server/github.js';
import { acceptDelivery, repositoryOwner, verifySignature } from '../netlify/functions/webhook.mts';
import { createHmac, generateKeyPairSync, verify } from 'node:crypto';
import { validInternalSecret } from '../src/server/auth.js';

test('JUnit counts failures, errors and skipped cases without suite double counting', () => {
  const xml = '<testsuites><testsuite tests="4"><testcase name="a"/><testcase name="b"><failure/></testcase><testcase name="c"><error/></testcase><testcase name="d"><skipped/></testcase></testsuite></testsuites>';
  assert.deepEqual(parseJUnit(xml), { passed: 1, failed: 2, skipped: 1 });
});

test('quality contract rejects unknown versions and counts clean checks', () => {
  assert.deepEqual(parseQualityReport({ schemaVersion: 1, checks: [{ name: 'lint', status: 'passed', findings: 0 }, { name: 'imports', status: 'findings', findings: 2 }, { name: 'format', status: 'skipped', findings: 0 }] }), { total: 3, enabled: 2, clean: 1, findings: 2 });
  assert.throws(() => parseQualityReport({ schemaVersion: 2, checks: [] }), /Unsupported/);
});

test('failed workflow artifact still produces both metric inputs', () => {
  const bytes = zipSync({ 'terra-quality.json': strToU8(JSON.stringify({ schemaVersion: 1, checks: [{ name: 'lint', status: 'failed', findings: 1 }] })), 'junit.xml': strToU8('<testsuite><testcase name="a"><failure/></testcase></testsuite>') });
  const reports = reportsFromZip(bytes);
  assert.deepEqual(reports.tests, { passed: 0, failed: 1, skipped: 0 });
  assert.deepEqual(reports.quality, { total: 1, enabled: 1, clean: 0, findings: 1 });
  assert.equal(reports.hasJUnit, true);
  assert.equal(reports.hasQuality, true);
  assert.deepEqual(reports.history, []);
  const run = { status: 'completed', conclusion: 'failure', event: 'push', head_branch: 'main' } as Parameters<typeof eligibleRun>[0];
  assert.equal(eligibleRun(run, ['main']), true);
  assert.equal(eligibleRun({ ...run, event: 'pull_request' }, ['main']), false);
});

test('history-only artifacts leave test and quality metrics missing', () => {
  const sha = 'a'.repeat(40);
  const reports = reportsFromZip(zipSync({ 'terra-history-main.json': strToU8(JSON.stringify({
    schemaVersion: 1, mode: 'snapshot', repository: 'owner/repo', branch: 'main', headSha: sha, baseSha: null,
    generatedAt: '2026-01-01T00:00:00.000Z', commits: [{ sha, authorDate: '2026-01-01T00:00:00.000Z', additions: 0, deletions: 0, sourceLines: 1 }],
  })) }));
  assert.equal(reports.tests, null);
  assert.equal(reports.quality, null);
  assert.equal(reports.hasJUnit, false);
  assert.equal(reports.hasQuality, false);
  assert.equal(reports.history.length, 1);
  assert.equal(score(reports.tests, reports.quality).score, null);
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

test('internal jobs reject a missing server secret', () => {
  assert.equal(validInternalSecret('', undefined), false);
  assert.equal(validInternalSecret('wrong', 'expected'), false);
  assert.equal(validInternalSecret('expected', 'expected'), true);
});

test('repository admin check denies another repository administrator', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (input) => new Response(JSON.stringify({ permission: String(input).includes('/repos/owner/own/') ? 'admin' : 'read' }), { status: 200 });
  try {
    assert.equal(await repositoryAdmin('owner', 'own', 'alice', 'token'), true);
    assert.equal(await repositoryAdmin('other', 'private', 'alice', 'token'), false);
  } finally { globalThis.fetch = previous; }
});

test('App JWT accepts a base64-prefixed private key', () => {
  const previousAppId = process.env.GITHUB_APP_ID;
  const previousPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
  process.env.GITHUB_APP_ID = '1234';
  process.env.GITHUB_APP_PRIVATE_KEY = `base64:${Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64')}`;
  try {
    const [header, payload, signature] = appJwt().split('.');
    assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')), true);
  } finally {
    if (previousAppId === undefined) delete process.env.GITHUB_APP_ID;
    else process.env.GITHUB_APP_ID = previousAppId;
    if (previousPrivateKey === undefined) delete process.env.GITHUB_APP_PRIVATE_KEY;
    else process.env.GITHUB_APP_PRIVATE_KEY = previousPrivateKey;
  }
});
