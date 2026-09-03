import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { checkImports, collapseInlineIfs, createQualityConfig, namingFindings, runQualityCli } from '../dist/index.js';

test('resolves aliases and extensionless relative imports', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'helper.ts'), 'export const ok = true;\n');
	writeFileSync(join(root, 'src', 'main.ts'), "import { ok } from './helper';\nimport { ok as alias } from '@/helper';\nvoid ok; void alias;\n");
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '@/': 'src/' } });
	assert.deepEqual(checkImports(config), []);
});

test('reports concise-name drift without changing source', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'main.ts'), 'const organization = true;\nvoid organization;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(namingFindings(config)[0].suggestion, 'org');
});

test('does not collapse comment-only blocks before else', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	const file = join(root, 'main.ts');
	writeFileSync(file, 'if (ok) { /* keep this comment */ } else { fail(); }\n');
	assert.equal(collapseInlineIfs(file), false);
	assert.equal(readFileSync(file, 'utf8'), 'if (ok) { /* keep this comment */ } else { fail(); }\n');
});

test('naming supports warning-only and automatic-fix modes', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const source = 'const organization = true;\nexport const result = organization;\n';
	writeFileSync(file, source);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all', '--warn']);
	assert.equal(readFileSync(file, 'utf8'), source);
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const org = true;\nexport const result = org;\n');
});

test('naming ignores external types, JSX attributes, properties, and exported contracts', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'main.tsx'), "export type ResponseRecord = Record<string, string>;\nexport const response = { value: 'ok' };\nconst view = <input aria-current defaultValue={response.value} />;\nvoid view;\n");
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(namingFindings(config), []);
});

test('naming ignores declarations exported through an export list', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const source = 'function previous() {}\nexport { previous };\n';
	writeFileSync(file, source);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), source);
	assert.deepEqual(namingFindings(config), []);
});
