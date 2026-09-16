/**
 * packages/quality/test/single-use.test.mjs
 * Verifies candidate discovery, semantic safety classification, cross-file
 * type inlining, import editing, report generation, and no-op boundaries.
 * The fixtures intentionally exercise every classification branch. A finding
 * is only considered single-use when imports are excluded and exactly one
 * in-scope consumer remains.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityCfg, fixSingleUseDeclarations, singleUseFindings, writeSingleUseReport } from '../dist/index.js';
import { existsSync, readFileSync } from 'node:fs';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';
import { join } from 'node:path';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('single-use analysis classifies pure data, runtime boundaries, callable declarations, large values, and type consumers', () => {
	const root = fixtureRoot('terra-quality-single-use-classify-');
	fixtureFile(
		root,
		'src/main.ts',
		`export {};
const pureObject = { value: true };
const pureArray = [true];
const pureString = 'value';
const pureNumber = 1;
const pureTrue = true;
const pureFalse = false;
const pureNull = null;
const runtimeCall = makeValue();
const runtimeNew = new Date();
const runtimeAwait = await Promise.resolve(true);
const arrowFunction = () => true;
const expressionFunction = function named() { return true; };
const reviewExpression = left + right;
const largeLiteral = '${'x'.repeat(801)}';
function helper() { return true; }
export function publicHelper() { return true; }
const noInitializer: any;
type InlineType = { value: string };
interface InlineInterface { value: string; }
const twice = { value: true };
const unused = { value: true };
const typed: InlineType = { value: 'x' };
const interfaced: InlineInterface = { value: 'x' };
void [pureObject, pureArray, pureString, pureNumber, pureTrue, pureFalse, pureNull, runtimeCall, runtimeNew, runtimeAwait, arrowFunction, expressionFunction, reviewExpression, largeLiteral, helper, publicHelper, noInitializer, typed, interfaced, twice];
void twice;
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = new Map(singleUseFindings(cfg).map((f) => [f.name, f]));
	for (const name of ['pureObject', 'pureArray', 'pureString', 'pureNumber', 'pureTrue', 'pureFalse', 'pureNull', 'noInitializer', 'InlineType', 'InlineInterface'])
		assert.ok(findings.has(name), name);
	for (const name of ['pureObject', 'pureArray', 'pureString', 'pureNumber', 'pureTrue', 'pureFalse', 'pureNull']) assert.equal(findings.get(name).decision, 'INLINE', name);
	for (const name of ['runtimeCall', 'runtimeNew', 'runtimeAwait', 'arrowFunction', 'expressionFunction', 'helper', 'publicHelper']) assert.equal(findings.get(name).decision, 'KEEP', name);
	assert.equal(findings.get('reviewExpression').decision, 'REVIEW');
	assert.equal(findings.get('largeLiteral').decision, 'INLINE');
	assert.equal(findings.get('noInitializer').decision, 'REVIEW');
	assert.equal(findings.get('InlineType').decision, 'INLINE');
	assert.equal(findings.get('InlineInterface').decision, 'INLINE');
	assert.equal(findings.has('twice'), false);
	assert.equal(findings.has('unused'), false);
});
test('single-use analysis counts cross-file consumers but ignores import syntax itself and honors include roots', () => {
	const root = fixtureRoot('terra-quality-single-use-scope-');
	fixtureFile(root, 'src/types.ts', 'export type Payload = { value: string };\nexport const data = { value: true };\n');
	fixtureFile(root, 'src/consumer.ts', `import type { Payload } from './types';\nimport { data } from './types';\nconst payload: Payload = { value: 'ok' };\nvoid [payload, data];\n`);
	fixtureFile(root, 'included/consumer.ts', 'const included = true;\nvoid included;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], includeRoots: ['included'], extensions: ['.ts'] });
	const findings = singleUseFindings(cfg);
	assert.deepEqual(findings.map((f) => f.name).sort(), ['Payload', 'data', 'included', 'payload']);
	assert.equal(findings.find((f) => f.name === 'Payload').file, 'src/types.ts');
	assert.equal(findings.find((f) => f.name === 'data').file, 'src/types.ts');
});
test('single-use type fixing inlines aliases and interfaces, removes only the corresponding imports, and reports changed files', () => {
	const root = fixtureRoot('terra-quality-single-use-fix-');
	fixtureFile(root, 'src/types.ts', `export type Payload = { value: string };\nexport interface Result { ok: boolean; }\n`);
	fixtureFile(
		root,
		'src/consumer.ts',
		`import type { Payload, Extra } from './types';
import type { Result } from './types';
const payload: Payload = { value: 'ok' };
const result: Result = { ok: true };
void [payload, result];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 2);
	assert.equal(fixtureText(root, 'src/types.ts').includes('Payload'), false);
	assert.equal(fixtureText(root, 'src/types.ts').includes('Result'), false);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.match(consumer, /import type \{ Extra \} from '\.\/types';/);
	assert.equal(consumer.includes('import type { Result }'), false);
	assert.match(consumer, /const payload: \{ value: string \}/);
	assert.match(consumer, /const result: \{ ok: boolean; \}/);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
});
test('single-use fixing leaves reused aliases unchanged and inlines pure single-use variables', () => {
	const root = fixtureRoot('terra-quality-single-use-no-fix-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`type Reused = { value: string };
const first: Reused = { value: 'a' };
const second: Reused = { value: 'b' };
const pure = { value: true };
const pureArray = ['one', 'two'];
const sharedItem = { value: true };
void [first, second, pure, pureArray];
void { sharedItem, nested: { ...sharedItem } };
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/main.ts');
	assert.equal(updated.includes('const pure ='), false);
	assert.equal(updated.includes('const pureArray ='), false);
	assert.equal(updated.includes('const sharedItem ='), true);
	assert.match(updated, /void \[first, second, \(\{ value: true \}\), \(\['one', 'two'\]\)\]/);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(file.endsWith('src/main.ts'), true);
});
test('single-use fixing discovers nested literals wrapped with const assertions', () => {
	const root = fixtureRoot('terra-quality-single-use-nested-');
	fixtureFile(
		root,
		'src/main.ts',
		`export function View() {
		const improvementCards = [{ key: 'one' }, { key: 'two' }] as const;
		return improvementCards.map((card) => card.key).join(',');
	}
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(singleUseFindings(cfg).map((f) => f.name), ['improvementCards']);
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	assert.equal(fixtureText(root, 'src/main.ts').includes('const improvementCards'), false);
	assert.match(fixtureText(root, 'src/main.ts'), /return \(\[\{ key: 'one' \}, \{ key: 'two' \}\] as const\)\.map/);
});
test('single-use report writes stable JSON and Markdown inventories with all decision sections', () => {
	const root = fixtureRoot('terra-quality-single-use-report-');
	fixtureFile(root, 'src/main.ts', "type Payload = { value: string };\nconst payload: Payload = { value: 'ok' };\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = writeSingleUseReport(cfg);
	assert.deepEqual(
		findings.map((f) => f.name),
		['Payload'],
	);
	const jsonPath = join(root, 'docs', 'quality', 'single-use-declarations.json');
	const markdownPath = join(root, 'docs', 'quality', 'single-use-declarations.md');
	assert.equal(existsSync(jsonPath), true);
	assert.equal(existsSync(markdownPath), true);
	const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
	assert.match(json.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
	assert.deepEqual(json.scope, [join(root, 'src')]);
	assert.deepEqual(json.findings, findings);
	const markdown = readFileSync(markdownPath, 'utf8');
	assert.match(markdown, /^# Single-use declaration recommendations/m);
	assert.match(markdown, /## INLINE \(1\)/);
	assert.match(markdown, /## KEEP \(0\)/);
	assert.match(markdown, /## REVIEW \(0\)/);
	assert.match(markdown, /`src\/main\.ts:1` \*\*Payload\*\*/);
});
