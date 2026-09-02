import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { checkImports, createQualityConfig, namingFindings } from '../dist/index.js';

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
	writeFileSync(join(root, 'src', 'main.ts'), 'export const organization = true;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(namingFindings(config)[0].suggestion, 'org');
});
