/**
 * packages/quality/test/quality.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API

import { checkImports, collapseInlineIfs, createQualityConfig, maintainSourceFile, namingFindings, protectLongImports, runQualityCli } from '../dist/index.js';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('resolves aliases and extensionless relative imports', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'helper.ts'), 'export const ok = true;\n');
	writeFileSync(join(root, 'src', 'main.ts'), "import { ok } from './helper';\nimport { ok as alias } from '@/helper';\nvoid ok; void alias;\n");
	const config = createQualityConfig({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		aliases: { '@/': 'src/' },
	});
	assert.deepEqual(checkImports(config), []);
});

test('reports concise-name drift without changing source', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'main.ts'), 'const organization = true;\nvoid organization;\n');
	const config = createQualityConfig({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(namingFindings(config)[0].suggestion, 'org');
});

test('does not collapse comment-only blocks before else', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	const file = join(root, 'main.ts');
	writeFileSync(file, 'if (ok) { /* keep this comment */ } else { fail(); }\n');
	assert.equal(collapseInlineIfs(file), false);
	assert.equal(readFileSync(file, 'utf8'), 'if (ok) { /* keep this comment */ } else { fail(); }\n');
});

test('maintenance adds headers and grouped sorted imports', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	writeFileSync(
		file,
		`/** test */

/*//////////////////////////////////////////////////
 IMPORTS
 //////////////////////////////////////////////////*/
// API

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
import type { Zed } from './z';
import { Widget, API_URL, beta } from 'beta';
import { alpha } from 'alpha';
void alpha; void beta;
`,
	);
	assert.equal(maintainSourceFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.match(src, /^\/\*\* test \*\//);
	assert.ok(src.indexOf("from 'alpha'") < src.indexOf("from 'beta'"));
	assert.ok(src.indexOf('// API') < src.indexOf('// COMPONENTS'));
	assert.ok(src.indexOf('// COMPONENTS') < src.indexOf('// DATA'));
	assert.ok(src.indexOf('// DATA') < src.indexOf('// TYPES'));
	assert.equal(src.match(/IMPORTS/g)?.length, 1);
	assert.ok(src.includes(`${'/'.repeat(50)}*/\n\n// API`));
	assert.ok(src.includes('// API\n\nimport'));
	assert.ok(src.includes('// COMPONENTS\n\nimport'));
	assert.ok(src.includes('// DATA\n\nimport'));
	assert.ok(src.includes('// TYPES\n\nimport'));
	assert.ok(src.endsWith('\n') && !src.endsWith('\n\n'));
	assert.equal(maintainSourceFile(root, file), false);
});

test('protects long one-line imports from Prettier wrapping', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	const file = join(root, 'main.ts');
	const src = `import { ${'VeryLongTypeName, '.repeat(18)}result } from '@terra-symposium/a-very-long-package-name';\n`;
	writeFileSync(file, src);
	assert.equal(protectLongImports(file, 80), true);
	assert.equal(readFileSync(file, 'utf8'), `// prettier-ignore\n${src}`);
	assert.equal(protectLongImports(file, 80), false);
});

test('domain runs one configured quality command', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	const marker = join(root, 'marker.txt');
	const config = createQualityConfig({
		root,
		sourceRoots: [],
		extensions: ['.ts'],
		qualityCommands: [
			{
				name: 'fixture',
				command: process.execPath,
				args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ok')`],
			},
		],
	});
	runQualityCli(config, ['domain', 'fixture', '--all']);
	assert.equal(readFileSync(marker, 'utf8'), 'ok');
});

test('naming supports warning-only and automatic-fix modes', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'const organization = true;\nexport const result = organization;\n';
	writeFileSync(file, src);
	const config = createQualityConfig({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	runQualityCli(config, ['naming', '--all', '--warn']);
	assert.equal(readFileSync(file, 'utf8'), src);
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const org = true;\nexport const result = org;\n');
});

test('naming automatically fixes local declarations in Astro frontmatter', () => {
	const root = mkdtempSync(join(tmpdir(), 'quality-naming-astro-'));
	mkdirSync(join(root, 'src'));
	writeFileSync(join(root, 'src', 'Page.astro'), '---\nconst error = new Error("x");\nconsole.log(error);\n---\n<Component error={error} />\n<p>{error.message}</p>\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.astro'] });
	runQualityCli(config, ['naming', '--all']);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /const err = new Error/);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /console\.log\(err\)/);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /<Component error=\{err\} \/>/);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /<p>\{err\.message\}<\/p>/);
	assert.deepEqual(namingFindings(config), []);
});

test('naming preserves shorthand property keys while renaming their values', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'function result(error: Error) { return { error }; }\nvoid result;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'function result(err: Error) { return { error: err }; }\nvoid result;\n');
});

test('naming updates JSDoc parameter tags with parameter declarations', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, '/** @param value - Input value. */\nfunction result(value: string) { return value; }\nvoid result;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), '/** @param val - Input value. */\nfunction result(val: string) { return val; }\nvoid result;\n');
});

test('naming preserves explicitly unused underscore parameters', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'const proxy = new Proxy({}, { get(_target, key) { return key; } });\nvoid proxy;\n';
	writeFileSync(file, src);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
	assert.deepEqual(namingFindings(config), []);
});

test('naming refuses file-level destination collisions', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'const target = 1;\nconst tgt = 2;\nvoid [target, tgt];\n';
	writeFileSync(file, src);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
});

test('naming ignores external types, JSX attributes, properties, and exported contracts', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(
		join(root, 'src', 'main.tsx'),
		"export type ResponseRecord = Record<string, string>;\nexport const response = { value: 'ok' };\nconst view = <input aria-current defaultValue={response.value} />;\nvoid view;\n",
	);
	const config = createQualityConfig({
		root,
		sourceRoots: ['src'],
		extensions: ['.tsx'],
	});
	assert.deepEqual(namingFindings(config), []);
});

test('naming ignores declarations exported through an export list', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'function previous() {}\nexport { previous };\n';
	writeFileSync(file, src);
	const config = createQualityConfig({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
	assert.deepEqual(namingFindings(config), []);
});
