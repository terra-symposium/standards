/**
 * packages/quality/test/db-shapes.test.mjs
 * Verifies advisory DB-shape projection detection and its no-autofix contract.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { dbShapeFindings, createQualityCfg } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

test('finds wrapped DB-row projections in named functions', () => {
	const root = fixtureRoot('terra-quality-db-shapes-');
	const file = fixtureFile(
		root,
		'src/history.ts',
		`function historyRec(r: Record<string, unknown>) {
	return {
		id: String(r.id),
		organizationId: String(r.organization_id),
		salesBatchId: String(r.sales_batch_id),
		fromStageId: stringOrNull(r.from_stage_id),
		createdAt: String(r.created_at),
	};
}
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = dbShapeFindings(cfg);
	assert.equal(findings.length, 1);
	assert.equal(findings[0].file, 'src/history.ts');
	assert.equal(findings[0].name, 'historyRec');
	assert.deepEqual(findings[0].mappings, [
		{ output: 'id', source: 'id' },
		{ output: 'organizationId', source: 'organization_id' },
		{ output: 'salesBatchId', source: 'sales_batch_id' },
		{ output: 'fromStageId', source: 'from_stage_id' },
		{ output: 'createdAt', source: 'created_at' },
	]);
	assert.match(findings[0].message, /organization_id -> organizationId/);
	void file;
});

test('finds arrow and map projections, including reverse persistence aliases', () => {
	const root = fixtureRoot('terra-quality-db-shapes-arrows-');
	fixtureFile(
		root,
		'src/events.ts',
		`const events = rows.map((row) => ({ subjectType: row.subject_type, observedAt: row.observed_at }));
const persistence = (event) => ({ dedupe_key: event.dedupeKey, observed_at: event.observedAt });
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = dbShapeFindings(cfg);
	assert.equal(findings.length, 2);
	assert.deepEqual(
		findings.map((f) => f.source),
		['row', 'event'],
	);
});

test('ignores computed objects and direct mutation payloads', () => {
	const root = fixtureRoot('terra-quality-db-shapes-ignore-');
	fixtureFile(
		root,
		'src/payloads.ts',
		`const cards = rows.map((row) => ({ label: format(row.name), total: row.amount * 2 }));
repo.insert({ organization_id: input.organizationId, created_by: input.userId });
repo.update({ organization_id: input.organizationId });
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(dbShapeFindings(cfg), []);
});

test('does not edit source files because the check is advisory-only', () => {
	const root = fixtureRoot('terra-quality-db-shapes-no-fix-');
	const original = `function historyRec(row) { return { customerId: row.customer_id, name: row.name }; }\n`;
	fixtureFile(root, 'src/card.ts', original);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(dbShapeFindings(cfg).length, 1);
	assert.equal(fixtureText(root, 'src/card.ts'), original);
});

test('does not exempt an adapter based on its name alone', () => {
	const root = fixtureRoot('terra-quality-db-shapes-adapter-');
	fixtureFile(root, 'src/card.ts', `function toCard(row) { return { customerId: row.customer_id, name: row.name }; }\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(dbShapeFindings(cfg).length, 1);
});

test('allows an explicitly annotated adapter boundary', () => {
	const root = fixtureRoot('terra-quality-db-shapes-annotation-');
	fixtureFile(root, 'src/legacy.ts', `// terra-quality: db-shape-adapter\nfunction loadLegacy(row) { return { customerId: row.customer_id }; }\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(dbShapeFindings(cfg), []);
});

test('finds projections in Astro frontmatter while preserving source locations', () => {
	const root = fixtureRoot('terra-quality-db-shapes-astro-');
	fixtureFile(
		root,
		'src/pages/index.astro',
		`---
const rows = data.map((row) => ({ customerId: row.customer_id, updatedAt: row.updated_at }));
---
<h1>{rows.length}</h1>
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.astro'] });
	const findings = dbShapeFindings(cfg);
	assert.equal(findings.length, 1);
	assert.equal(findings[0].line, 2);
});
