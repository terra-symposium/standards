/**
 * packages/quality/test/object-forwarding.test.mjs
 * Verifies forwarding thresholds, recommendations, ignored payload calls, and
 * reuse of the shared TypeScript analysis context.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityAnalysis, createQualityCfg, fixObjectForwarding, objectForwardingFindings } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('object forwarding does not promote shape-changing whole-object rewrites', () => {
	const root = fixtureRoot('terra-quality-forwarding-');
	fixtureFile(
		root,
		'src/main.ts',
		`send({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
send({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities, role: 'admin' });
outer(inner({ first: source.first, second: source.second, third: source.third }));
send({ first: input.first, second: input.second });
send({ first: input.first, second: other.second, third: input.third });
repo.insert({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
repo.upsert({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
repo.update({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
repo.set({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
repo.push({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
repo.add({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
repo.append({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
repo.assign({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = objectForwardingFindings(cfg);
	assert.deepEqual(findings, []);
});
test('object forwarding accepts a shared analysis cache without reporting ambiguous projections', () => {
	const root = fixtureRoot('terra-quality-forwarding-analysis-');
	fixtureFile(root, 'src/main.ts', 'send({ a: first.a, b: first.b, c: first.c }, { a: second.a, b: second.b, c: second.c });\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const analysis = createQualityAnalysis(cfg);
	const findings = objectForwardingFindings(cfg, analysis);
	assert.deepEqual(findings, []);
});
test('object forwarding fixer removes only exact properties already covered by a preceding spread', () => {
	const root = fixtureRoot('terra-quality-forwarding-fix-');
	fixtureFile(
		root,
		'src/main.ts',
		`send({ ...input, organizationId: input.organizationId, userId: input.userId });\nsend({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(fixObjectForwarding(cfg), { fixed: 2, skipped: 0 });
	assert.equal(fixtureText(root, 'src/main.ts'), `send({ ...input });\nsend({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });\n`);
	assert.equal(objectForwardingFindings(cfg).length, 0);
});
