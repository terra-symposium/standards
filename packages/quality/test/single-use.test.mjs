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
import ts from 'typescript';
import { createQualityCfg, fixSingleUseDeclarations, fixSingleUseTypes, singleUseFindings } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

test('single-use functions with attached prose require review and remain unchanged', () => {
	const root = fixtureRoot('terra-quality-single-use-comments-');
	fixtureFile(
		root,
		'src/main.ts',
		`/*//////////////////////////////////////////////////
REGRESSIONS CONTRACTS
//////////////////////////////////////////////////*/
describe('fixture', () => {
  /** Walks configured source roots. */
  function walk(dir: string) { /* Keep this body reason. */ return [dir]; }
  /*//////////////////////////////////////////////////
  TESTS
  //////////////////////////////////////////////////*/
  for (const item of walk('src')) void item;
});
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	const result = fixtureText(root, 'src/main.ts');
	assert.match(result, /REGRESSIONS CONTRACTS/);
	assert.match(result, /TESTS/);
	assert.match(result, /Walks configured source roots/);
	assert.match(result, /Keep this body reason/);
	assert.match(result, /function walk\(dir: string\)/);
	assert.equal((result.match(/Walks configured source roots/g) ?? []).length, 1);
	assert.equal(ts.createSourceFile('main.ts', result, ts.ScriptTarget.Latest, true).parseDiagnostics.length, 0);
});

test('inlining keeps attached comments for constants and types', () => {
	const root = fixtureRoot('terra-quality-single-use-comment-kinds-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Explains the displayed value. */
const greeting = 'hello';
/** Defines the wire payload. */
type Payload = { value: string };
const result: Payload = { value: greeting };
void result;
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const result = fixtureText(root, 'src/main.ts');
	assert.doesNotMatch(result, /Explains the displayed value/);
	assert.doesNotMatch(result, /Defines the wire payload/);
	assert.equal(ts.createSourceFile('main.ts', result, ts.ScriptTarget.Latest, true).parseDiagnostics.length, 0);
});

test('single-use analysis blocks function inlining and preserves attached TSDoc', () => {
	const root = fixtureRoot('terra-quality-single-use-callable-tsdoc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Reads the configured value. */
function readValue(value: string): string { return value; }
/** Transforms the configured value. */
const transformValue = (value: string): string => value;
const result = readValue('ready');
void result;
void result;
const transformed = transformValue(result);
void transformed;
void transformed;
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		singleUseFindings(cfg).map(({ name: n, decision }) => [n, decision]),
		[
			['readValue', 'REVIEW'],
			['transformValue', 'REVIEW'],
		],
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	const result = fixtureText(root, 'src/main.ts');
	assert.match(result, /\/\*\* Reads the configured value/);
	assert.match(result, /\/\*\* Transforms the configured value/);
	assert.match(result, /function readValue/);
	assert.match(result, /const transformValue/);
	assert.equal(ts.createSourceFile('main.ts', result, ts.ScriptTarget.Latest, true).parseDiagnostics.length, 0);
});

test('single-use analysis blocks hook calls and other effectful initializers', () => {
	const root = fixtureRoot('terra-quality-single-use-effects-');
	fixtureFile(
		root,
		'src/view.tsx',
		`import { useMemo } from 'react';
export function View({ enabled }: { enabled: boolean }) {
  const memo = useMemo(() => 1, []);
  const property = globalThis.location;
  return enabled ? <>{memo}{property.href}</> : null;
}
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	const findings = singleUseFindings(cfg);
	assert.ok(findings.some((finding) => finding.name === 'memo' && finding.decision === 'REVIEW' && /hook order/.test(finding.reason)));
	assert.ok(findings.some((finding) => finding.name === 'property' && finding.decision === 'REVIEW'));
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/view.tsx'), /const memo = useMemo/);
});

test('single-use agent actions name the actual unsafe boundary without irrelevant React guidance', () => {
	const root = fixtureRoot('terra-quality-single-use-agent-actions-');
	fixtureFile(root, 'src/script.mjs', `const setting = process.env.SETTING;\nconsole.log(setting);\n`);
	fixtureFile(root, 'src/helpers.ts', `const offset = 1;\nexport function addOffset(value: number) { return value + offset; }\n`);
	fixtureFile(root, 'src/consumer.ts', `import { addOffset } from './helpers';\nconsole.log(addOffset(1));\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.mjs', '.ts'] });
	const findings = singleUseFindings(cfg);
	const scriptAction = findings.find((finding) => finding.name === 'setting')?.agentAction ?? '';
	const crossFileAction = findings.find((finding) => finding.name === 'addOffset')?.agentAction ?? '';
	assert.doesNotMatch(scriptAction, /hook order/i);
	assert.match(scriptAction, /evaluation order and timing/);
	assert.match(crossFileAction, /declaring module/);
	assert.match(crossFileAction, /module-local dependencies/);
});

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
	for (const name of ['pureString', 'pureNumber', 'pureTrue', 'pureFalse', 'pureNull']) assert.equal(findings.get(name).decision, 'INLINE', name);
	for (const name of ['pureObject', 'pureArray', 'arrowFunction', 'expressionFunction', 'helper', 'reviewExpression', 'largeLiteral']) assert.equal(findings.get(name).decision, 'REVIEW', name);
	for (const name of ['runtimeCall', 'runtimeNew', 'noInitializer']) assert.equal(findings.get(name).decision, 'REVIEW', name);
	assert.equal(findings.get('publicHelper').decision, 'REVIEW');
	assert.equal(findings.get('runtimeAwait').decision, 'REVIEW');
	assert.equal(findings.get('InlineType').decision, 'INLINE');
	assert.equal(findings.get('InlineInterface').decision, 'INLINE');
	assert.equal(findings.has('twice'), false);
	assert.equal(findings.has('unused'), false);
});
test('single-use analysis counts cross-file consumers but ignores import syntax itself and honors include roots', () => {
	const root = fixtureRoot('terra-quality-single-use-scope-');
	fixtureFile(root, 'src/types.ts', 'export type Payload = { value: string };\nexport const data = { value: true };\n');
	fixtureFile(root, 'src/consumer.ts', `import type { Payload } from '@/types';\nimport { data } from '@/types';\nconst payload: Payload = { value: 'ok' };\nvoid [payload, data];\n`);
	fixtureFile(root, 'src/ambient.d.ts', 'declare global { var API_KEY: string; }\nexport {};\n');
	fixtureFile(root, 'included/consumer.ts', 'const included = true;\nvoid included;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], includeRoots: ['included'], extensions: ['.ts'], aliases: { '@/': 'src/' } });
	const findings = singleUseFindings(cfg);
	assert.deepEqual(
		findings.map((f) => f.name),
		['included', 'Payload', 'data', 'payload'],
	);
	assert.equal(
		findings.some((f) => f.name === 'API_KEY'),
		false,
	);
});
test('single-use type fixing inlines exported aliases and interfaces with one consumer', () => {
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
	const changedFiles = new Set();
	assert.equal(fixSingleUseDeclarations(cfg, changedFiles), 2);
	assert.deepEqual([...changedFiles].sort(), [`${root}/src/consumer.ts`, `${root}/src/types.ts`]);
	assert.doesNotMatch(fixtureText(root, 'src/types.ts'), /export type Payload|export interface Result/);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.match(consumer, /import type \{ Extra \} from '\.\/types';/);
	assert.doesNotMatch(consumer, /import type \{ Result \}/);
	assert.doesNotMatch(consumer, /: Payload|: Result/);
	assert.match(consumer, /void \[payload, result\]/);
	assert.equal(ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS).parseDiagnostics.length, 0);
	assert.equal(fixSingleUseTypes(cfg), 0);
});

test('single-use type fixing preserves grouped imports when several bindings are inlined', () => {
	const root = fixtureRoot('terra-quality-single-use-grouped-types-');
	fixtureFile(root, 'src/types.ts', `export type First = { first: string };\nexport type Second = { second: number };\nexport interface Third { third: boolean; }\nexport type Retained = string;\n`);
	fixtureFile(
		root,
		'src/consumer.ts',
		`import type { First, Second, Third, Retained } from './types';\nconst first: First = { first: 'ok' };\nconst second: Second = { second: 2 };\nconst third: Third = { third: true };\nvoid [first, second, third];\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 2);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.match(consumer, /import type \{ Retained \} from '\.\/types';/);
	assert.doesNotMatch(consumer, /: (?:First|Second|Third)\b/);
	assert.equal(ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS).parseDiagnostics.length, 0);
	const diagnostics = ts.getPreEmitDiagnostics(
		ts.createProgram([`${root}/src/types.ts`, `${root}/src/consumer.ts`], { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true }),
	);
	assert.deepEqual(
		diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
		[],
	);
});

test('single-use type analysis distinguishes same-named declarations by resolved symbol', () => {
	const root = fixtureRoot('terra-quality-single-use-same-name-');
	fixtureFile(root, 'src/first.ts', `export type Payload = { first: string };\n`);
	fixtureFile(root, 'src/second.ts', `export type Payload = { second: number };\n`);
	fixtureFile(root, 'src/consumer.ts', `import type { Payload } from './second';\nconst payload: Payload = { second: 1 };\nvoid payload;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = singleUseFindings(cfg).filter((finding) => finding.name === 'Payload');
	assert.deepEqual(
		findings.map(({ file: f }) => f),
		['src/second.ts'],
	);
	assert.equal(fixSingleUseDeclarations(cfg), 2);
	assert.match(fixtureText(root, 'src/first.ts'), /export type Payload/);
	assert.doesNotMatch(fixtureText(root, 'src/second.ts'), /export type Payload/);
});
test('single-use type fixing substitutes generic alias and interface arguments', () => {
	const root = fixtureRoot('terra-quality-single-use-generic-');
	fixtureFile(root, 'src/types.ts', `export type Prepared<T> = { value: T };\nexport interface Wrapped<T> { item: T; }\n`);
	fixtureFile(
		root,
		'src/consumer.ts',
		`import type { Prepared, Wrapped } from './types';\nconst prepared: Prepared<string> = { value: 'ready' };\nconst wrapped: Wrapped<number> = { item: 1 };\nvoid [prepared, prepared, wrapped, wrapped];\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 2);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.doesNotMatch(consumer, /Prepared<string>|Wrapped<number>/);
	const parsed = ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	assert.equal(parsed.parseDiagnostics.length, 0);
});
test('single-use type fixing expands generic references through namespace imports', () => {
	const root = fixtureRoot('terra-quality-single-use-namespace-generic-');
	fixtureFile(root, 'src/types.ts', `export type Prepared<T> = { value: T };\n`);
	fixtureFile(root, 'src/consumer.ts', `import * as Types from './types';\nconst prepared: Types.Prepared<string> = { value: 'ready' };\nvoid [prepared, prepared];\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 2);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.doesNotMatch(consumer, /Types\.Prepared<string>/);
	const parsed = ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	assert.equal(parsed.parseDiagnostics.length, 0);
});
test('single-use fixing inlines only primitive constants and leaves object identity intact', () => {
	const root = fixtureRoot('terra-quality-single-use-no-fix-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`type Reused = { value: string };
const first: Reused = { value: 'a' };
const second: Reused = { value: 'b' };
const pure = true;
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
	assert.equal(updated.includes('const pureArray ='), true);
	assert.equal(updated.includes('const sharedItem ='), true);
	assert.match(updated, /void \[first, second, \(true\), pureArray\]/);
	assert.equal(singleUseFindings(cfg).find((finding) => finding.name === 'pureArray')?.decision, 'REVIEW');
	assert.equal(fixSingleUseTypes(cfg), 0);
	assert.equal(file.endsWith('src/main.ts'), true);
});
test('single-use fixing leaves typed variables that depend on imported types intact', () => {
	const root = fixtureRoot('terra-quality-single-use-imported-type-');
	fixtureFile(root, 'src/types.ts', `export type ReportRun = { results: string[] };\n`);
	fixtureFile(
		root,
		'src/main.ts',
		`import type { ReportRun } from './types.js';\nconst run: ReportRun = { results: [] };\nwrite(run);\nexport function record(value: ReportRun): void { void value; }\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/main.ts'), /import type \{ ReportRun \}/);
	assert.match(fixtureText(root, 'src/main.ts'), /const run: ReportRun/);
});
test('single-use fixing leaves nested object identities behind for review', () => {
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
	assert.deepEqual(
		singleUseFindings(cfg).map((f) => f.name),
		['improvementCards'],
	);
	assert.equal(singleUseFindings(cfg).find((finding) => finding.name === 'improvementCards')?.decision, 'REVIEW');
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/main.ts'), /const improvementCards/);
});
test('single-use analysis does not move awaited initializers into callback bodies', () => {
	const root = fixtureRoot('terra-quality-single-use-await-');
	fixtureFile(root, 'src/main.ts', `const externalNews = await loadNews();\nsetBrief(current => current ? { ...current, externalNews } : current);\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(singleUseFindings(cfg).find((f) => f.name === 'externalNews')?.decision, 'REVIEW');
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/main.ts'), /const externalNews = await loadNews\(\)/);
});
test('single-use fixing retains module values until a nested component has moved', () => {
	const root = fixtureRoot('terra-quality-single-use-component-default-');
	fixtureFile(
		root,
		'src/main.tsx',
		`const LEVELS = [{ value: 'ready' }] as const;\nfunction Figure({ levels = LEVELS }: { levels?: typeof LEVELS }) { return <div>{levels[0].value}</div>; }\nexport function Page() { return <Figure />; }\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.ok(singleUseFindings(cfg).some((f) => f.name === 'LEVELS'));
	assert.ok(singleUseFindings(cfg).some((f) => f.name === 'Figure'));
	fixSingleUseDeclarations(cfg);
	const updated = fixtureText(root, 'src/main.tsx');
	assert.match(updated, /const LEVELS =/);
	assert.match(updated, /levels = LEVELS/);
	assert.match(updated, /typeof LEVELS/);
	assert.match(updated, /^function Figure/m);
	assert.match(updated, /value: 'ready'/);
	const parsed = ts.createSourceFile('main.tsx', updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	assert.equal(parsed.parseDiagnostics.length, 0);
});
test('single-use fixing preserves exported functions consumed by Astro frontmatter', () => {
	const root = fixtureRoot('terra-quality-single-use-astro-consumer-');
	fixtureFile(root, 'src/admin.tsx', `export function AdminPage() { return null; }\n`);
	fixtureFile(root, 'src/index.astro', `---\nimport { AdminPage } from './admin';\n---\n<AdminPage client:load />\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx', '.astro'] });
	assert.equal(
		singleUseFindings(cfg).some((f) => f.name === 'AdminPage'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/admin.tsx'), /export function AdminPage/);
});
test('single-use analysis preserves an aliased export consumed by Astro frontmatter and markup', () => {
	const root = fixtureRoot('terra-quality-single-use-astro-alias-markup-');
	fixtureFile(root, 'src/constants.ts', `export const APP_LABEL = 'Salesphere';\n`);
	fixtureFile(root, 'src/consumer.ts', `import { APP_LABEL } from './constants';\nexport const label = APP_LABEL;\n`);
	fixtureFile(root, 'src/page.astro', `---\nimport { APP_LABEL as PageLabel } from './constants';\n---\n<h1>{PageLabel}</h1>\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.astro'] });
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'APP_LABEL'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/constants.ts'), `export const APP_LABEL = 'Salesphere';\n`);
});
test('unused Astro import syntax is not a framework consumer', () => {
	const root = fixtureRoot('terra-quality-single-use-astro-import-only-');
	fixtureFile(root, 'src/admin.tsx', `export function AdminPage() { return null; }\nvoid AdminPage;\n`);
	fixtureFile(root, 'src/index.astro', `---\nimport { AdminPage } from './admin';\n---\n<p>Ready</p>\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx', '.astro'] });
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'AdminPage'),
		true,
	);
});
test('single-use analysis includes exports unless an external framework consumer is configured', () => {
	const root = fixtureRoot('terra-quality-single-use-public-export-');
	fixtureFile(root, 'src/main.ts', `export function parseReport() { return { ok: true }; }\nwrite(parseReport());\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		singleUseFindings(cfg).map(({ name, decision }) => [name, decision]),
		[['parseReport', 'REVIEW']],
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/main.ts'), /export function parseReport/);
});
test('package entry exports are preserved without exempting private declarations in the same module', () => {
	const root = fixtureRoot('terra-quality-single-use-package-entry-');
	fixtureFile(root, 'src/main.ts', `export function parseReport() { return { ok: true }; }\nfunction formatInternal() { return 'ready'; }\nwrite(parseReport(), formatInternal());\n`);
	fixtureFile(root, 'package.json', JSON.stringify({ exports: { '.': './dist/main.js' } }));
	fixtureFile(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { rootDir: 'src', outDir: 'dist' }, include: ['src'] }));
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		singleUseFindings(cfg).map(({ name }) => name),
		['formatInternal'],
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/main.ts'), /export function parseReport/);
});
test('single-use fixing never removes a multi-use explicit-any compatibility alias', () => {
	const root = fixtureRoot('terra-quality-single-use-any-alias-');
	fixtureFile(
		root,
		'src/main.ts',
		`type UncheckedActionRow = any;\nconst first = rows.map((row: UncheckedActionRow) => row.id);\nconst second = rows.filter((row: UncheckedActionRow) => row.active);\nvoid [first, second];\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(
		singleUseFindings(cfg).some((f) => f.name === 'UncheckedActionRow'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	const updated = fixtureText(root, 'src/main.ts');
	assert.match(updated, /type UncheckedActionRow = any/);
	assert.doesNotMatch(updated, /row: any/);
});
test('single-use scope includes every configured directory and reports manual cases explicitly', () => {
	const root = fixtureRoot('terra-quality-single-use-skip-');
	fixtureFile(root, 'src/components/button.tsx', 'export function Button() { return null; }\nvoid Button;\n');
	fixtureFile(root, 'src/domain.ts', 'export const value = { ok: true };\nvoid value;\n');
	fixtureFile(root, 'src/types.ts', 'export type SharedByComponents = { value: string };\n');
	fixtureFile(root, 'src/components/consumer.ts', `import type { SharedByComponents } from '../types';\nconst value: SharedByComponents = { value: 'ok' };\nvoid value;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] });
	const findings = singleUseFindings(cfg);
	assert.ok(findings.some((f) => f.file.startsWith('src/components/')));
	assert.ok(findings.some((f) => f.name === 'value'));
	assert.ok(findings.some((f) => f.name === 'SharedByComponents'));
	assert.ok(findings.every((f) => ['INLINE', 'REVIEW'].includes(f.decision)));
});
test('single-use skipped directories exclude candidates but still count their references', () => {
	const root = fixtureRoot('terra-quality-single-use-skipped-directory-');
	fixtureFile(root, 'src/quality/internal.ts', 'const internalOnly = 1;\nvoid internalOnly;\n');
	fixtureFile(root, 'src/shared.ts', 'export const sharedValue = 1;\n');
	fixtureFile(root, 'src/quality/consumer.ts', "import { sharedValue } from '../shared.js';\nvoid sharedValue;\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], singleUse: { skippedDirectories: ['src/quality'] } });
	assert.deepEqual(
		singleUseFindings(cfg).map((finding) => finding.name),
		['sharedValue'],
	);
});
test('single-use fixer does not treat an export specifier as a local consumer', () => {
	const root = fixtureRoot('terra-quality-single-use-export-');
	fixtureFile(root, 'src/module.ts', `function Action() { return true; }\nexport { Action };\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(
		singleUseFindings(cfg).some((f) => f.name === 'Action'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/module.ts'), /export \{ Action \}/);
});
test('single-use analysis ignores destructuring bindings as declaration consumers', () => {
	const root = fixtureRoot('terra-quality-single-use-binding-');
	fixtureFile(root, 'src/main.ts', `function summarize() { return true; }\nconst { summarize: localSummarize } = source;\nvoid localSummarize;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(
		singleUseFindings(cfg).some((f) => f.name === 'summarize'),
		false,
	);
});
test('single-use analysis keeps cross-file closures and write-target values intact', () => {
	const root = fixtureRoot('terra-quality-single-use-context-safety-');
	fixtureFile(root, 'src/helpers.ts', `const offset = 1;\nexport function addOffset(value: number) { return value + offset; }\nexport let position = 0;\n`);
	fixtureFile(root, 'src/consumer.ts', `import { addOffset, position } from './helpers';\nconst result = addOffset(1);\nposition++;\nvoid result;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		singleUseFindings(cfg)
			.filter((f) => ['addOffset', 'position'].includes(f.name))
			.map(({ name, decision }) => [name, decision]),
		[
			['addOffset', 'REVIEW'],
			['position', 'REVIEW'],
		],
	);
	assert.ok(fixSingleUseDeclarations(cfg) <= 2);
	assert.match(fixtureText(root, 'src/consumer.ts'), /position\+\+/);
});
test('single-use fixing retains object values referenced through typeof', () => {
	const root = fixtureRoot('terra-quality-single-use-value-type-query-');
	fixtureFile(root, 'src/main.ts', `const value = { status: 'ready' as const };\ntype Value = typeof value;\nvoid (null as unknown as Value);\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/main.ts');
	assert.match(updated, /typeof value/);
	assert.match(updated, /const value = \{ status: 'ready' as const \}/);
	const parsed = ts.createSourceFile('main.ts', updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	assert.equal(parsed.parseDiagnostics.length, 0);
});
test('single-use fixer reports functions in call, JSX, and type-query positions for review', () => {
	const root = fixtureRoot('terra-quality-single-use-context-');
	fixtureFile(
		root,
		'src/main.tsx',
		`function add(value: number): number { return value + 1; }
function Card({ label }: { label: string }) { return <span>{label}</span>; }
function build<T extends object>(value: T): T { return value; }
const built: ReturnType<typeof build> = { ok: true };
const result = add(1);
export function Page() { return <Card label={String(result)} />; }
void built;
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] });
	assert.ok(singleUseFindings(cfg).some((f) => f.decision === 'REVIEW'));
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	const updated = fixtureText(root, 'src/main.tsx');
	assert.match(updated, /^function add\(/m);
	assert.match(updated, /^function Card\(/m);
	assert.match(updated, /^function build</m);
	assert.match(updated, /ReturnType/);
	assert.doesNotMatch(updated, /__terraQualityCreateElement/);
	const parsed = ts.createSourceFile('main.tsx', updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	assert.equal(parsed.parseDiagnostics.length, 0);
});
