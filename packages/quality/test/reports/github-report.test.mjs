/**
 * packages/quality/test/reports/github-report.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGitHubReport, runQualityCli } from '../../dist/index.js';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const repo = 'acme/project';
/**
 *
 * @param endpoint
 *
 * @return
 */
const apiPath = (endpoint) => `repos/acme/project${endpoint ? `/${endpoint}` : ''}`;
test('GitHub report classifies open issues and security alerts without exposing secret values', () => {
	const calls = new Map([
		[
			apiPath(''),
			{
				ok: true,
				value: {
					default_branch: 'development',
					security_and_analysis: {
						dependency_graph: { status: 'enabled' },
						secret_scanning: { status: 'enabled' },
						secret_scanning_push_protection: { status: 'enabled' },
						code_security: { status: 'enabled' },
					},
				},
			},
		],
		[
			`${apiPath('issues')}?state=open&per_page=100`,
			{
				ok: true,
				value: [
					[
						{ number: 8, title: 'Fix\u001b[31m input\r\nparsing', labels: [{ name: 'bug' }] },
						{ number: 9, title: 'PR', pull_request: { url: 'https://api.github.com/pulls/9' } },
					],
				],
			},
		],
		[
			`${apiPath('dependabot/alerts')}?state=open&per_page=100&classification=general`,
			{
				ok: true,
				value: [
					[
						{
							number: 2,
							dependency: { package: { ecosystem: 'npm', name: 'left-pad' }, manifest_path: 'package.json' },
							security_vulnerability: { severity: 'high', vulnerable_version_range: '< 2.0.0', first_patched_version: { identifier: '2.0.0' } },
							security_advisory: { summary: 'Unsafe package' },
						},
					],
				],
			},
		],
		[
			`${apiPath('dependabot/alerts')}?state=open&per_page=100&classification=malware`,
			{
				ok: true,
				value: [
					[
						{
							number: 3,
							dependency: { package: { ecosystem: 'npm', name: 'evil-package' }, manifest_path: 'package.json' },
							security_vulnerability: { severity: 'critical' },
							security_advisory: { summary: 'Malicious package' },
						},
					],
				],
			},
		],
		[
			`${apiPath('code-scanning/alerts')}?state=open&per_page=100`,
			{
				ok: true,
				value: [[{ number: 4, rule: { id: 'js/injection', description: 'Unsafe query', severity: 'error' }, most_recent_instance: { location: { path: 'src/query.ts', start_line: 11 } } }]],
			},
		],
		[
			`${apiPath('secret-scanning/alerts')}?state=open&per_page=100`,
			{ ok: true, value: [[{ number: 5, secret_type_display_name: 'API token', secret: 'must-never-appear', first_location_detected: { path: 'src/config.ts', start_line: 6 }, validity: 'active' }]] },
		],
		[apiPath('vulnerability-alerts'), { ok: true, value: null }],
		[apiPath('automated-security-fixes'), { ok: true, value: { enabled: true } }],
		[
			`${apiPath('contents/.github/dependabot.yml')}?ref=development`,
			{
				ok: true,
				value: {
					encoding: 'base64',
					content: Buffer.from(
						'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly\n    groups:\n      all:\n        applies-to: security-updates\n        patterns:\n          - "*"\n',
					).toString('base64'),
				},
			},
		],
	]);
	const report = buildGitHubReport(
		[repo],
		['dependabotAlerts', 'malwareAlerts', 'securityUpdates', 'versionUpdates', 'groupedUpdates'],
		(path) => calls.get(path) ?? { ok: false, state: 'unavailable', detail: 'unmatched test endpoint' },
	);
	const result = report.repositories[0];
	assert.equal(report.state, 'complete');
	assert.deepEqual(result.metrics, { openIssues: 1, openPullRequests: 1, dependabotAlerts: 1, malwareAlerts: 1, codeScanningAlerts: 1, secretScanningAlerts: 1 });
	assert.equal(result.features.dependencyGraph, 'enabled');
	assert.equal(result.features.groupedUpdates, 'enabled');
	assert.doesNotMatch(result.findings.find((finding) => finding.category === 'issue').title, /\p{Cc}/u);
	assert.deepEqual(new Set(result.findings.map((finding) => finding.category)), new Set(['issue', 'dependabot', 'malware', 'code-scanning', 'secret-scanning']));
	assert.ok(result.findings.every((finding) => finding.agentInstructions.length > 30));
	assert.equal(JSON.stringify(report).includes('must-never-appear'), false);
	assert.match(result.findings.find((finding) => finding.category === 'malware').agentInstructions, /Remove the affected package/);
	assert.match(result.findings.find((finding) => finding.category === 'secret-scanning').agentInstructions, /Never read, copy, print/);
});
test('GitHub report keeps unavailable alert counts unknown instead of reporting zero', () => {
	/**
	 *
	 * @param path
	 *
	 * @return
	 */
	const api = (path) => {
		if (path === apiPath('')) return { ok: true, value: { default_branch: 'main' } };
		if (path.includes('/issues?')) return { ok: true, value: [[]] };
		if (path.endsWith('/vulnerability-alerts')) return { ok: true, value: null };
		if (path.endsWith('/automated-security-fixes')) return { ok: false, state: 'permission-denied', detail: 'read permission required' };
		if (path.includes('/contents/')) return { ok: false, state: 'not-configured', detail: 'not found' };
		return { ok: false, state: 'not-configured', detail: 'not enabled' };
	};
	const result = buildGitHubReport([repo], [], api).repositories[0];
	assert.equal(result.metrics.dependabotAlerts, null);
	assert.equal(result.resources.dependabot.state, 'not-configured');
	assert.equal(result.metrics.secretScanningAlerts, null);
	assert.equal(result.resources.secretScanning.state, 'not-configured');
	assert.equal(result.features.dependencyGraph, 'enabled');
	assert.equal(result.features.groupedUpdates, 'unknown');
});
test('github CLI writes the analytics stage and agent instructions to the quality JSON report', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-github-'));
	const bin = join(root, 'bin');
	mkdirSync(bin);
	const gh = join(bin, 'gh');
	writeFileSync(
		gh,
		`#!/usr/bin/env node
const args = process.argv.slice(2).join(' ');
if (args === 'auth status') process.exit(0);
if (args.includes('contents/.github/dependabot.yml') || args.includes('contents/.github/dependabot.yaml')) { process.stderr.write('gh: Not Found (HTTP 404)\\n'); process.exit(1); }
if (args.includes('automated-security-fixes')) { process.stdout.write('{\\"enabled\\":true}'); process.exit(0); }
if (args.includes('vulnerability-alerts')) process.exit(0);
if (args.includes('/code-scanning/alerts?')) { process.stderr.write('gh: Code scanning is not enabled for this repository. Please enable code scanning in the repository settings. (HTTP 403)\\n'); process.exit(1); }
if (args.includes('/secret-scanning/alerts?')) { process.stderr.write('gh: Secret scanning is disabled on this repository. (HTTP 404)\\n'); process.exit(1); }
if (args.includes('--paginate')) {
	if (args.includes('/issues?')) process.stdout.write(JSON.stringify({ number: 11, title: 'Fixture issue' }) + '\\n');
	process.exit(0);
}
if (args.endsWith('repos/acme/project')) { process.stdout.write('{\\"default_branch\\":\\"main\\",\\"security_and_analysis\\":{\\"dependency_graph\\":{\\"status\\":\\"enabled\\"}}}'); process.exit(0); }
process.stdout.write('[]');
`,
	);
	chmodSync(gh, 0o755);
	const originalPath = process.env.PATH;
	const originalToken = process.env.GH_TOKEN;
	try {
		process.env.PATH = `${bin}:${originalPath}`;
		process.env.GH_TOKEN = 'fixture-token';
		const cfg = { root, sourceRoots: ['src'], extensions: ['.ts'], github: { repositories: [repo] } };
		runQualityCli(cfg, ['github', '--repository', repo, '--report-json', 'github-report.json']);
		const report = JSON.parse(readFileSync(join(root, 'github-report.json'), 'utf8'));
		assert.equal(report.checks.find((check) => check.name === 'github').status, 'findings');
		assert.equal(report.github.repositories[0].repository, repo);
		assert.equal(report.github.repositories[0].metrics.openIssues, 1);
		assert.ok(report.github.repositories[0].findings[0].agentInstructions);
		assert.equal(report.github.repositories[0].features.codeScanning, 'disabled');
		assert.equal(report.github.repositories[0].features.secretScanning, 'disabled');
		assert.ok(report.checks.some((check) => check.name === 'documentation' && check.status === 'skipped'));
	} finally {
		process.env.PATH = originalPath;
		if (originalToken === undefined) delete process.env.GH_TOKEN;
		else process.env.GH_TOKEN = originalToken;
		process.exitCode = undefined;
	}
});
