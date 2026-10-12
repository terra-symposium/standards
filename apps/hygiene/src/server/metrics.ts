import { XMLParser } from 'fast-xml-parser';

export type TestCounts = { passed: number; failed: number; skipped: number };
export type QualityCounts = { total: number; enabled: number; clean: number; findings: number };
export type Metrics = { tests: TestCounts | null; quality: QualityCounts | null; testRate: number | null; qualityRate: number | null; score: number | null };

type XmlNode = Record<string, unknown>;

/** Count testcases once; suite totals can double count nested suites. */
export function parseJUnit(xml: string): TestCounts {
  const root = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', allowBooleanAttributes: true }).parse(xml) as XmlNode;
  const counts: TestCounts = { passed: 0, failed: 0, skipped: 0 };
  function visit(value: unknown): void {
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    if (!value || typeof value !== 'object') return;
    const node = value as XmlNode;
    if ('testcase' in node) {
      for (const test of [node.testcase].flat() as XmlNode[]) {
        if ('failure' in test || 'error' in test) counts.failed++;
        else if ('skipped' in test) counts.skipped++;
        else counts.passed++;
      }
    }
    if ('testsuite' in node) visit(node.testsuite);
    if ('testsuites' in node) visit(node.testsuites);
  }
  visit(root);
  return counts;
}

export function parseQualityReport(input: unknown): QualityCounts {
  if (!input || typeof input !== 'object') throw new Error('Invalid quality report');
  const report = input as Record<string, unknown>;
  if (report.schemaVersion !== 1 || !Array.isArray(report.checks)) throw new Error('Unsupported quality report schema');
  const names = new Set<string>();
  let enabled = 0;
  let clean = 0;
  let findings = 0;
  for (const value of report.checks) {
    if (!value || typeof value !== 'object') throw new Error('Invalid quality check');
    const check = value as Record<string, unknown>;
    if (typeof check.name !== 'string' || names.has(check.name) || !['passed', 'findings', 'failed', 'skipped'].includes(String(check.status)) || !Number.isSafeInteger(check.findings) || Number(check.findings) < 0)
      throw new Error('Invalid quality check');
    names.add(check.name);
    if (check.status !== 'skipped') enabled++;
    if (check.status === 'passed' && check.findings === 0) clean++;
    findings += Number(check.findings);
  }
  return { total: names.size, enabled, clean, findings };
}

export function score(tests: TestCounts | null, quality: QualityCounts | null): Metrics {
  const testTotal = tests ? tests.passed + tests.failed : 0;
  const testRate = tests && testTotal > 0 ? tests.passed / testTotal : null;
  const qualityRate = quality && quality.enabled > 0 ? quality.clean / quality.enabled : null;
  return { tests, quality, testRate, qualityRate, score: testRate === null || qualityRate === null ? null : Math.round(50 * (testRate + qualityRate)) };
}
