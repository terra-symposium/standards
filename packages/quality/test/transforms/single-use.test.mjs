/**
 * packages/quality/test/transforms/single-use.test.mjs
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
import { createQualityCfg, fixSingleUseDeclarations, fixSingleUseTypes, singleUseFindings, srcFiles } from '../../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../../support/fixtures.mjs';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const EXPORT_TYPE_PAYLOAD_REGEX = /export type Payload/;
const EXPORT_FN_PARSEREPORT_REGEX = /export function parseReport/;
test('root-wide single-use fixes ignore dependency files loaded by TypeScript', () => {
	const root = fixtureRoot('terra-quality-single-use-node-modules-');
	const dependencyPath = 'node_modules/.pnpm/sample-package@1.0.0/node_modules/sample-package/index.ts';
	const dependencyText = 'const internalValue = 1;\nconst derivedValue = internalValue + 1;\nexport const exportedValue = derivedValue;\n';
	fixtureFile(root, dependencyPath, dependencyText);
	const mainPath = fixtureFile(root, 'src/main.ts', "import { exportedValue } from '../node_modules/.pnpm/sample-package@1.0.0/node_modules/sample-package/index';\nvoid exportedValue;\n");
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['.'],
		extensions: ['.ts'],
	});
	assert.deepEqual(srcFiles(cfg), [mainPath]);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, dependencyPath), dependencyText);
});
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
test('single-use fixing preserves attached TSDoc for constants and types', () => {
	const root = fixtureRoot('terra-quality-single-use-comment-kinds-');
	const original = `/** Explains the displayed value. */
const greeting = 'hello';
/** Defines the wire payload. */
type Payload = { value: string };
const result: Payload = { value: greeting };
void result;
`;
	fixtureFile(root, 'src/main.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
	assert.equal(ts.createSourceFile('main.ts', original, ts.ScriptTarget.Latest, true).parseDiagnostics.length, 0);
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
test('single-use analysis counts recursive function and arrow references', () => {
	const root = fixtureRoot('terra-quality-single-use-recursion-');
	fixtureFile(
		root,
		'src/main.ts',
		`function walk(node: { child?: { child?: unknown } }): void {
		if (node.child) walk(node.child);
	}
	const visit = (depth: number): number => (depth > 0 ? visit(depth - 1) : 0);
	walk({ child: {} });
	void visit(2);
	`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.deepEqual(
		singleUseFindings(cfg).filter(({ name: n }) => n === 'walk' || n === 'visit'),
		[],
	);
});
test('single-use analysis excludes callback-captured and loop-repeated runtime references', () => {
	const root = fixtureRoot('terra-quality-single-use-repeated-runtime-');
	fixtureFile(
		root,
		'src/main.ts',
		`const callbackRoot = '/callbacks';
const renderFile = (name: string): string => \`\${callbackRoot}/\${name}\`;
void ['one', 'two'].map(renderFile);
const loopRoot = '/loop';
for (const name of ['one', 'two']) {
  const suffix = '.md';
  void \`\${loopRoot}/\${name}\${suffix}\`;
}
const requireFromAstro = (specifier: string) => ({ specifier });
void ['astro', 'vite'].flatMap((dependency) => requireFromAstro(dependency));
const output = '/dist';
function copyRuntime(dir: string): string {
  if (dir.length > 1) copyRuntime(dir.slice(1));
  return \`\${output}/\${dir}\`;
}
void copyRuntime('/src');
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = singleUseFindings(cfg);
	assert.deepEqual(
		findings.map(({ name }) => name),
		['suffix'],
	);
	assert.equal(findings[0]?.autofixable, true);
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	assert.doesNotMatch(fixtureText(root, 'src/main.ts'), /const suffix/);
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.tsx'],
	});
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
	const findings = singleUseFindings(
		createQualityCfg({
			root,
			sourceRoots: ['src'],
			extensions: ['.mjs', '.ts'],
		}),
	);
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
test('single-use fixes inline literals nested in exported functions', () => {
	const root = fixtureRoot('terra-quality-single-use-nested-public-function-');
	const original = `export function createDocument() {
	const tableWidth = 9706;
	return tableWidth;
}
export const documentWidth = createDocument();
`;
	fixtureFile(root, 'src/document.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = singleUseFindings(cfg);
	assert.equal(findings.find(({ name: n }) => n === 'tableWidth')?.autofixable, true);
	assert.equal(findings.find(({ name: n }) => n === 'createDocument')?.autofixable, false);
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/document.ts');
	assert.match(updated, /export function createDocument/);
	assert.doesNotMatch(updated, /const tableWidth/);
	assert.match(updated, /return \(9706\);/);
});
test('single-use analysis marks generated declarations for generator review', () => {
	const root = fixtureRoot('terra-quality-single-use-generated-source-');
	const original = `/**\n * This file has been generated by FixtureBuilder.\n */
export type Payload = { value: string };
const payload: Payload = { value: 'ready' };
void payload;
`;
	fixtureFile(root, 'src/generated.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const finding = singleUseFindings(cfg).find(({ name: n }) => n === 'Payload');
	assert.equal(finding?.autofixable, false);
	assert.match(finding?.reason ?? '', /generated source/);
	assert.match(finding?.agentAction ?? '', /generator/);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/generated.ts'), original);
});
test('single-use analysis marks module exports for contract review', () => {
	const root = fixtureRoot('terra-quality-single-use-module-export-');
	const original = `export type PublicPayload = { value: string };
const payload: PublicPayload = { value: 'ready' };
void payload;
`;
	fixtureFile(root, 'src/public.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const finding = singleUseFindings(cfg).find(({ name: n }) => n === 'PublicPayload');
	assert.equal(finding?.autofixable, false);
	assert.match(finding?.reason ?? '', /external contract/);
	assert.match(finding?.agentAction ?? '', /external consumers/);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/public.ts'), original);
});
test('single-use analysis counts cross-file consumers but ignores import syntax itself and honors include roots', () => {
	const root = fixtureRoot('terra-quality-single-use-scope-');
	fixtureFile(root, 'src/types.ts', 'export type Payload = { value: string };\nexport const data = { value: true };\n');
	fixtureFile(root, 'src/consumer.ts', `import type { Payload } from '@/types';\nimport { data } from '@/types';\nconst payload: Payload = { value: 'ok' };\nvoid [payload, data];\n`);
	fixtureFile(root, 'src/ambient.d.ts', 'declare global { var API_KEY: string; }\nexport {};\n');
	fixtureFile(root, 'included/consumer.ts', 'const included = true;\nvoid included;\n');
	const findings = singleUseFindings(
		createQualityCfg({
			root,
			sourceRoots: ['src'],
			includeRoots: ['included'],
			extensions: ['.ts'],
			aliases: { '@/': 'src/' },
		}),
	);
	assert.deepEqual(
		findings.map((f) => f.name),
		['included', 'Payload', 'data', 'payload'],
	);
	assert.equal(
		findings.some((f) => f.name === 'API_KEY'),
		false,
	);
});
test('single-use type fixing preserves exported aliases and interfaces with one consumer', () => {
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const changedFiles = new Set();
	assert.equal(fixSingleUseDeclarations(cfg, changedFiles), 0);
	assert.deepEqual([...changedFiles], []);
	assert.match(fixtureText(root, 'src/types.ts'), /export type Payload/);
	assert.match(fixtureText(root, 'src/types.ts'), /export interface Result/);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.match(consumer, /import type \{ Payload, Extra \} from '\.\/types';/);
	assert.match(consumer, /import type \{ Result \}/);
	assert.match(consumer, /: Payload|: Result/);
	assert.match(consumer, /void \[payload, result\]/);
	assert.equal(ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS).parseDiagnostics.length, 0);
	assert.equal(fixSingleUseTypes(cfg), 0);
});
for (const [fixerName, fixer] of [
	['fixSingleUseDeclarations', fixSingleUseDeclarations],
	['fixSingleUseTypes', fixSingleUseTypes],
]) {
	test(`${fixerName} preserves exported application and UI contracts`, () => {
		const root = fixtureRoot(`terra-quality-single-use-public-types-${fixerName}-`);
		const publicTypes = `export type MoveGroup = { id: string };
export type QualityFilter = 'all' | 'saved';
export type ActionVariant = 'primary' | 'secondary';
export type SurfaceVariant = 'default' | 'subtle';
export interface SpotifyUser { id: string; displayName: string; }
export type ButtonProps = { variant: 'primary' | 'secondary' };
export type ButtonVariant = 'primary' | 'secondary';
export type CardVariant = 'compact' | 'expanded';
`;
		fixtureFile(root, 'src/public-types.ts', publicTypes);
		fixtureFile(
			root,
			'src/consumer.ts',
			`import type { MoveGroup, QualityFilter, ActionVariant, SurfaceVariant, SpotifyUser, ButtonProps, ButtonVariant, CardVariant } from './public-types';
export function consumeContracts(
	group: MoveGroup,
	filter: QualityFilter,
	action: ActionVariant,
	surface: SurfaceVariant,
	user: SpotifyUser,
	button: ButtonProps,
	buttonVariant: ButtonVariant,
	cardVariant: CardVariant,
) {
	return [group.id, filter, action, surface, user.displayName, button.variant, buttonVariant, cardVariant];
}
`,
		);
		const cfg = createQualityCfg({
			root,
			sourceRoots: ['src'],
			extensions: ['.ts'],
		});
		const originalConsumer = fixtureText(root, 'src/consumer.ts');
		fixer(cfg);
		assert.equal(fixtureText(root, 'src/public-types.ts'), publicTypes);
		const consumer = fixtureText(root, 'src/consumer.ts');
		for (const name of ['MoveGroup', 'QualityFilter', 'ActionVariant', 'SurfaceVariant', 'SpotifyUser', 'ButtonProps', 'ButtonVariant', 'CardVariant'])
			assert.match(consumer, new RegExp(`\\b${name}\\b`));
		assert.equal(consumer, originalConsumer);
		assert.equal(ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS).parseDiagnostics.length, 0);
	});
}
test('single-use type fixing preserves exported declarations in grouped imports', () => {
	const root = fixtureRoot('terra-quality-single-use-grouped-types-');
	fixtureFile(root, 'src/types.ts', `export type First = { first: string };\nexport type Second = { second: number };\nexport interface Third { third: boolean; }\nexport type Retained = string;\n`);
	fixtureFile(
		root,
		'src/consumer.ts',
		`import type { First, Second, Third, Retained } from './types';\nconst first: First = { first: 'ok' };\nconst second: Second = { second: 2 };\nconst third: Third = { third: true };\nvoid [first, second, third];\n`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.match(consumer, /import type \{ First, Second, Third, Retained \} from '\.\/types';/);
	assert.match(consumer, /: (?:First|Second|Third)\b/);
	assert.equal(ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS).parseDiagnostics.length, 0);
	const diagnostics = ts.getPreEmitDiagnostics(
		ts.createProgram([`${root}/src/types.ts`, `${root}/src/consumer.ts`], {
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			strict: true,
			noEmit: true,
		}),
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = singleUseFindings(cfg).filter((finding) => finding.name === 'Payload');
	assert.deepEqual(
		findings.map(({ file: f }) => f),
		['src/second.ts'],
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/first.ts'), EXPORT_TYPE_PAYLOAD_REGEX);
	assert.match(fixtureText(root, 'src/second.ts'), EXPORT_TYPE_PAYLOAD_REGEX);
	assert.match(fixtureText(root, 'src/consumer.ts'), /: Payload/);
});
test('single-use type fixing substitutes generic alias and interface arguments', () => {
	const root = fixtureRoot('terra-quality-single-use-generic-');
	fixtureFile(root, 'src/types.ts', `export type Prepared<T> = { value: T };\nexport interface Wrapped<T> { item: T; }\n`);
	fixtureFile(
		root,
		'src/consumer.ts',
		`import type { Prepared, Wrapped } from './types';\nconst prepared: Prepared<string> = { value: 'ready' };\nconst wrapped: Wrapped<number> = { item: 1 };\nvoid [prepared, prepared, wrapped, wrapped];\n`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.match(consumer, /Prepared<string>/);
	assert.match(consumer, /Wrapped<number>/);
	const parsed = ts.createSourceFile('consumer.ts', consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	assert.equal(parsed.parseDiagnostics.length, 0);
});
test('single-use type fixing expands generic references through namespace imports', () => {
	const root = fixtureRoot('terra-quality-single-use-namespace-generic-');
	fixtureFile(root, 'src/types.ts', `export type Prepared<T> = { value: T };\n`);
	fixtureFile(root, 'src/consumer.ts', `import * as Types from './types';\nconst prepared: Types.Prepared<string> = { value: 'ready' };\nvoid [prepared, prepared];\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	const consumer = fixtureText(root, 'src/consumer.ts');
	assert.match(consumer, /Types\.Prepared<string>/);
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
test('single-use fixing moves initializers only to an immediate first-evaluation use', () => {
	const root = fixtureRoot('terra-quality-single-use-immediate-value-');
	fixtureFile(
		root,
		'src/direct.ts',
		`function readSnapshot() { return { ready: true }; }
function build() {
  const snapshot = readSnapshot();
  return snapshot;
}
`,
	);
	fixtureFile(
		root,
		'src/nested.ts',
		`function readSnapshot() { return { ready: true }; }
function otherValue() { return { ready: false }; }
function merge(first: unknown, second: unknown) { return [first, second]; }
function build() {
  const nestedValue = readSnapshot();
  return merge(otherValue(), nestedValue);
}
`,
	);
	fixtureFile(
		root,
		'src/separated.ts',
		`function readSnapshot() { return { ready: true }; }
function recordBoundary() {}
function build() {
  const separatedValue = readSnapshot();
  recordBoundary();
  return separatedValue;
}
`,
	);
	fixtureFile(
		root,
		'src/deferred.ts',
		`function readSnapshot() { return { ready: true }; }
function build() {
  const deferredValue = readSnapshot();
  return () => deferredValue;
}
`,
	);
	fixtureFile(
		root,
		'src/awaited.ts',
		`async function readSnapshot() { return { ready: true }; }
async function build() {
  const awaitedValue = await readSnapshot();
  return awaitedValue.ready;
}
`,
	);
	fixtureFile(
		root,
		'src/member.ts',
		`async function readRows() { return [{ ready: true }]; }
async function build() {
  const rows = await readRows();
  return rows[0].ready;
}
`,
	);
	fixtureFile(
		root,
		'src/first-operand.ts',
		`function loadFirst() { return { value: 1 }; }
function loadSecond() { return 2; }
function build() {
  const first = loadFirst();
  return first.value + loadSecond();
}
`,
	);
	fixtureFile(
		root,
		'src/later-operand.ts',
		`function loadValue() { return 1; }
function prepare() { return 2; }
function build() {
  const later = loadValue();
  return prepare() + later;
}
`,
	);
	fixtureFile(
		root,
		'src/argument.ts',
		`function loadValue() { return 1; }
function combine(value: number) { return value; }
function build() {
  const argument = loadValue();
  return combine(argument);
}
`,
	);
	fixtureFile(
		root,
		'src/conditional.ts',
		`function loadValue() { return 1; }
function build(condition: boolean) {
  const branch = loadValue();
  return condition ? branch : 0;
}
`,
	);
	fixtureFile(
		root,
		'src/method-binding.ts',
		`const service = { read() { return true; } };
function build() {
  const callback = service.read;
  return callback();
}
`,
	);
	fixtureFile(
		root,
		'src/dynamic.ts',
		`function readSnapshot() { return { ready: true }; }
function build() {
  const dynamicValue = readSnapshot();
  eval('dynamicValue');
  return dynamicValue;
}
`,
	);
	fixtureFile(
		root,
		'src/commented.ts',
		`function readSnapshot() { return { ready: true }; }
function build() {
  const commentedValue = readSnapshot(); // Keep this declaration boundary visible.
  return commentedValue;
}
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = new Map(singleUseFindings(cfg).map(({ file, name, autofixable }) => [`${file}:${name}`, autofixable]));
	assert.equal(findings.get('src/direct.ts:snapshot'), true);
	assert.equal(findings.get('src/nested.ts:nestedValue'), false);
	assert.equal(findings.get('src/separated.ts:separatedValue'), false);
	assert.equal(findings.get('src/deferred.ts:deferredValue'), false);
	assert.equal(findings.get('src/awaited.ts:awaitedValue'), true);
	assert.equal(findings.get('src/member.ts:rows'), true);
	assert.equal(findings.get('src/first-operand.ts:first'), true);
	assert.equal(findings.get('src/later-operand.ts:later'), false);
	assert.equal(findings.get('src/argument.ts:argument'), false);
	assert.equal(findings.get('src/conditional.ts:branch'), false);
	assert.equal(findings.get('src/method-binding.ts:callback'), false);
	assert.equal(findings.get('src/dynamic.ts:dynamicValue'), false);
	assert.equal(findings.get('src/commented.ts:commentedValue'), false);
	assert.equal(fixSingleUseDeclarations(cfg), 4);
	assert.match(fixtureText(root, 'src/direct.ts'), /return \(readSnapshot\(\)\);/u);
	assert.match(fixtureText(root, 'src/nested.ts'), /const nestedValue = readSnapshot\(\)/u);
	assert.match(fixtureText(root, 'src/awaited.ts'), /return \(await readSnapshot\(\)\)\.ready;/u);
	assert.match(fixtureText(root, 'src/member.ts'), /return \(await readRows\(\)\)\[0\]\.ready;/u);
	assert.match(fixtureText(root, 'src/first-operand.ts'), /return \(loadFirst\(\)\)\.value \+ loadSecond\(\);/u);
	assert.match(fixtureText(root, 'src/later-operand.ts'), /const later = loadValue\(\)/u);
	assert.match(fixtureText(root, 'src/argument.ts'), /const argument = loadValue\(\)/u);
	assert.match(fixtureText(root, 'src/conditional.ts'), /const branch = loadValue\(\)/u);
	assert.match(fixtureText(root, 'src/method-binding.ts'), /const callback = service\.read/u);
	assert.match(fixtureText(root, 'src/commented.ts'), /Keep this declaration boundary visible/u);
	assert.equal(ts.createSourceFile('direct.ts', fixtureText(root, 'src/direct.ts'), ts.ScriptTarget.Latest, true).parseDiagnostics.length, 0);
});
test('single-use fixing inlines data-only object arguments only at module call boundaries', () => {
	const root = fixtureRoot('terra-quality-single-use-call-literal-');
	fixtureFile(
		root,
		'src/main.ts',
		`const viewportOptions = {
  tag: "@viewport:xl",
  annotation: { type: "viewport-reason", description: "Desktop editor." },
} as const;
registerTest("desktop", viewportOptions, () => {});
const deferredOptions = { tag: "@viewport:xl" } as const;
const typedOptions: { tag: string } = { tag: "@viewport:typed" };
registerTest("typed", typedOptions, () => {});
function registerLater() {
  registerTest("deferred", deferredOptions, () => {});
}
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = singleUseFindings(cfg);
	assert.equal(findings.find(({ name }) => name === 'viewportOptions')?.autofixable, true);
	assert.equal(findings.find(({ name }) => name === 'deferredOptions')?.decision, 'REVIEW');
	assert.equal(findings.find(({ name }) => name === 'typedOptions')?.decision, 'REVIEW');
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/main.ts');
	assert.doesNotMatch(updated, /const viewportOptions/u);
	assert.match(updated, /registerTest\("desktop", \(\{/u);
	assert.match(updated, /description: "Desktop editor\."\s*\},\s*\} as const\),/u);
	assert.match(updated, /const deferredOptions =/u);
	assert.match(updated, /registerTest\("deferred", deferredOptions/u);
	assert.match(updated, /const typedOptions: \{ tag: string \}/u);
	assert.match(updated, /registerTest\("typed", typedOptions/u);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), updated);
});
for (const [fixerName, fixer] of [
	['fixSingleUseDeclarations', fixSingleUseDeclarations],
	['fixSingleUseTypes', fixSingleUseTypes],
]) {
	test(`${fixerName} inlines adjacent static configuration at a default export`, () => {
		const root = fixtureRoot(`terra-quality-single-use-default-config-${fixerName}-`);
		fixtureFile(
			root,
			'src/config.mjs',
			`import * as prettierPluginAstro from 'prettier-plugin-astro';
/* CONFIG */
const cfg = {
	$schema: 'http://json.schemastore.org/prettierrc',
	plugins: [prettierPluginAstro],
	overrides: [{ files: ['*.ts'], options: { parser: 'typescript' } }],
};
export default cfg;
`,
		);
		const cfg = createQualityCfg({
			root,
			sourceRoots: ['src'],
			extensions: ['.mjs'],
		});
		assert.equal(singleUseFindings(cfg).find(({ name }) => name === 'cfg')?.autofixable, true);
		assert.equal(fixer(cfg), 1);
		const updated = fixtureText(root, 'src/config.mjs');
		assert.doesNotMatch(updated, /const cfg\b/u);
		assert.match(updated, /\/\* CONFIG \*\/\s*export default \{/u);
		assert.match(updated, /plugins: \[prettierPluginAstro\]/u);
		assert.match(updated, /files: \['\*\.ts'\]/u);
		assert.equal(ts.createSourceFile('config.mjs', updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS).parseDiagnostics.length, 0);
		assert.equal(fixer(cfg), 0);
		assert.equal(fixtureText(root, 'src/config.mjs'), updated);
	});
}
test('single-use analysis rejects default-export inlining across execution or comment boundaries', () => {
	const root = fixtureRoot('terra-quality-single-use-default-config-boundaries-');
	fixtureFile(root, 'src/dynamic.mjs', `const cfg = buildConfig();\nexport default cfg;\n`);
	fixtureFile(root, 'src/separated.mjs', `const cfg = { enabled: true };\nrunSetup();\nexport default cfg;\n`);
	fixtureFile(root, 'src/commented.mjs', `const cfg = { /* preserve authored note */ enabled: true };\nexport default cfg;\n`);
	fixtureFile(root, 'src/gapped-comment.mjs', `const cfg = { enabled: true }; // preserve boundary note\nexport default cfg;\n`);
	fixtureFile(root, 'src/named-and-default.mjs', `export const cfg = { enabled: true };\nexport default cfg;\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.mjs'],
	});
	const findings = new Map(singleUseFindings(cfg).map(({ file, name, autofixable }) => [`${file}:${name}`, autofixable]));
	assert.equal(findings.size, 5);
	for (const file of ['src/dynamic.mjs', 'src/separated.mjs', 'src/commented.mjs', 'src/gapped-comment.mjs', 'src/named-and-default.mjs']) {
		assert.equal(findings.get(`${file}:cfg`), false, file);
	}
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/dynamic.mjs'), /const cfg = buildConfig\(\)/u);
	assert.match(fixtureText(root, 'src/separated.mjs'), /const cfg = \{ enabled: true \}/u);
	assert.match(fixtureText(root, 'src/commented.mjs'), /preserve authored note/u);
	assert.match(fixtureText(root, 'src/gapped-comment.mjs'), /preserve boundary note/u);
});
test('single-use autofix batches every independent safe declaration in one pass', () => {
	const root = fixtureRoot('terra-quality-single-use-batch-');
	fixtureFile(
		root,
		'src/main.ts',
		`const label = 'ready';
const retryCount = 3;
const available = true;
export const status = [label, retryCount, available];
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(singleUseFindings(cfg).filter((finding) => finding.autofixable).length, 3);
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/main.ts');
	assert.doesNotMatch(updated, /const (?:label|retryCount|available)\b/u);
	assert.match(updated, /export const status = \[\('ready'\), \(3\), \(true\)\]/u);
	assert.deepEqual(singleUseFindings(cfg), []);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), updated);
});
test('single-use fixing inlines static queries from actual Playwright receiver types', () => {
	const root = fixtureRoot('terra-quality-single-use-playwright-query-');
	fixtureFile(root, 'node_modules/playwright-core/package.json', JSON.stringify({ name: 'playwright-core', types: 'types.d.ts' }));
	fixtureFile(
		root,
		'node_modules/playwright-core/types.d.ts',
		`export interface Locator {
  getByRole(role: string, options?: { name?: string | RegExp }): Locator;
  locator(selector: string): Locator;
  first(): Locator;
  click(): Promise<void>;
}
export interface Page extends Locator {}
`,
	);
	fixtureFile(
		root,
		'src/main.spec.ts',
		`import type { Page } from 'playwright-core';
async function inspect(page: Page, selector: string) {
  const saveButton = page.getByRole('button', { name: 'Save' });
  await saveButton.click();
  const dynamic = page.locator(selector).first();
  await dynamic.click();
}
async function inspectLocal(page: { getByRole(role: string, options?: { name?: string }): { click(): Promise<void> } }) {
  const localButton = page.getByRole('button', { name: 'Save' });
  await localButton.click();
}
async function runInspection(page: Page) {
  await inspect(page, 'dynamic');
}
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = singleUseFindings(cfg);
	assert.equal(findings.find((finding) => finding.name === 'saveButton')?.autofixable, true);
	assert.equal(findings.find((finding) => finding.name === 'dynamic')?.autofixable, false);
	assert.equal(findings.find((finding) => finding.name === 'localButton')?.autofixable, false);
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/main.spec.ts');
	assert.match(updated, /await \(?page\.getByRole\('button', \{ name: 'Save' \}\)\)?\.click\(\)/u);
	assert.match(updated, /const dynamic = page\.locator\(selector\)\.first\(\)/u);
	assert.match(updated, /const localButton = page\.getByRole\('button', \{ name: 'Save' \}\)/u);
});
test('single-use inlining removes the declaration line without leaving indentation whitespace', () => {
	const root = fixtureRoot('terra-quality-single-use-line-removal-');
	fixtureFile(
		root,
		'src/main.ts',
		`function write(value: string) { return value; }
function run() {
	const label = 'ready';
	write(label);
}
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/main.ts');
	assert.match(updated, /function run\(\) \{\n\twrite\(\('ready'\)\);\n\}/u);
	assert.doesNotMatch(updated, /^[\t ]+$/mu);
});
test('single-use fixing leaves typed variables that depend on imported types intact', () => {
	const root = fixtureRoot('terra-quality-single-use-imported-type-');
	fixtureFile(root, 'src/types.ts', `export type ReportRun = { results: string[] };\n`);
	fixtureFile(
		root,
		'src/main.ts',
		`import type { ReportRun } from './types.js';\nconst run: ReportRun = { results: [] };\nwrite(run);\nexport function record(value: ReportRun): void { void value; }\n`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.tsx'],
	});
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts', '.tsx', '.astro'],
	});
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts', '.astro'],
	});
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'APP_LABEL'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/constants.ts'), `export const APP_LABEL = 'Salesphere';\n`);
});
test('single-use analysis discovers Astro named imports outside the configured TypeScript extensions', () => {
	const root = fixtureRoot('terra-quality-single-use-astro-configured-extensions-');
	fixtureFile(root, 'src/SiteLayout.tsx', `export function SiteLayout({ children }: { children: unknown }) { return children; }\n`);
	fixtureFile(root, 'src/page.astro', `---\nimport { SiteLayout as PageLayout } from './SiteLayout';\n---\n<PageLayout><p>Ready</p></PageLayout>\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts', '.tsx'],
	});
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'SiteLayout'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/SiteLayout.tsx'), /export function SiteLayout/);
});
test('unused Astro import syntax is not a framework consumer', () => {
	const root = fixtureRoot('terra-quality-single-use-astro-import-only-');
	fixtureFile(root, 'src/admin.tsx', `export function AdminPage() { return null; }\nvoid AdminPage;\n`);
	fixtureFile(root, 'src/index.astro', `---\nimport { AdminPage } from './admin';\n---\n<p>Ready</p>\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts', '.tsx', '.astro'],
	});
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'AdminPage'),
		true,
	);
});
test('single-use analysis includes exports unless an external framework consumer is configured', () => {
	const root = fixtureRoot('terra-quality-single-use-public-export-');
	fixtureFile(root, 'src/main.ts', `export function parseReport() { return { ok: true }; }\nwrite(parseReport());\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.deepEqual(
		singleUseFindings(cfg).map(({ name, decision }) => [name, decision]),
		[['parseReport', 'REVIEW']],
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/main.ts'), EXPORT_FN_PARSEREPORT_REGEX);
});
test('package entry exports are preserved without exempting private declarations in the same module', () => {
	const root = fixtureRoot('terra-quality-single-use-package-entry-');
	fixtureFile(root, 'src/main.ts', `export function parseReport() { return { ok: true }; }\nfunction formatInternal() { return 'ready'; }\nwrite(parseReport(), formatInternal());\n`);
	fixtureFile(root, 'package.json', JSON.stringify({ exports: { '.': './dist/main.js' } }));
	fixtureFile(
		root,
		'tsconfig.json',
		JSON.stringify({
			compilerOptions: { rootDir: 'src', outDir: 'dist' },
			include: ['src'],
		}),
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.deepEqual(
		singleUseFindings(cfg).map(({ name }) => name),
		['formatInternal'],
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/main.ts'), EXPORT_FN_PARSEREPORT_REGEX);
});
test('package entry barrels protect declarations re-exported from their source modules', () => {
	const root = fixtureRoot('terra-quality-single-use-package-entry-barrel-');
	fixtureFile(root, 'src/lib/api.ts', `export function parseReport() { return { ok: true }; }\nconst report = parseReport();\nvoid report;\n`);
	fixtureFile(root, 'src/index.ts', `export { parseReport } from './lib/api.js';\n`);
	fixtureFile(root, 'package.json', JSON.stringify({ exports: { '.': './dist/index.js' } }));
	fixtureFile(
		root,
		'tsconfig.json',
		JSON.stringify({
			compilerOptions: { rootDir: 'src', outDir: 'dist' },
			include: ['src'],
		}),
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(
		singleUseFindings(cfg).some(({ name }) => name === 'parseReport'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/lib/api.ts'), EXPORT_FN_PARSEREPORT_REGEX);
});
test('package-local tsconfig remains preferred over the shared configRoot tsconfig', () => {
	const root = fixtureRoot('terra-quality-single-use-package-config-root-');
	fixtureFile(root, 'packages/widget/src/main.ts', `export function parseReport() { return { ok: true }; }\nfunction formatInternal() { return 'ready'; }\nwrite(parseReport(), formatInternal());\n`);
	fixtureFile(root, 'packages/widget/package.json', JSON.stringify({ exports: { '.': './dist/main.js' } }));
	fixtureFile(
		root,
		'packages/widget/config/tsconfig.json',
		JSON.stringify({
			compilerOptions: { rootDir: '../src', outDir: '../dist' },
			include: ['../src'],
		}),
	);
	fixtureFile(
		root,
		'tooling/tsconfig.json',
		JSON.stringify({
			compilerOptions: {
				rootDir: '../packages/widget/src',
				outDir: '../packages/widget/lib',
			},
			include: ['../packages/widget/src'],
		}),
	);
	const cfg = createQualityCfg({
		root,
		configRoot: 'tooling',
		sourceRoots: ['packages/widget/src'],
		extensions: ['.ts'],
	});
	assert.deepEqual(
		singleUseFindings(cfg).map(({ name }) => name),
		['formatInternal'],
	);
});
test('single-use fixing never removes a multi-use explicit-any compatibility alias', () => {
	const root = fixtureRoot('terra-quality-single-use-any-alias-');
	fixtureFile(
		root,
		'src/main.ts',
		`type UncheckedActionRow = any;\nconst first = rows.map((row: UncheckedActionRow) => row.id);\nconst second = rows.filter((row: UncheckedActionRow) => row.active);\nvoid [first, second];\n`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
	const findings = singleUseFindings(
		createQualityCfg({
			root,
			sourceRoots: ['src'],
			extensions: ['.ts', '.tsx'],
		}),
	);
	assert.ok(findings.some((f) => f.file.startsWith('src/components/')));
	assert.ok(findings.some((f) => f.name === 'value'));
	assert.ok(findings.some((f) => f.name === 'SharedByComponents'));
	assert.ok(findings.every((f) => ['INLINE', 'REVIEW'].includes(f.decision)));
});
test('single-use directory skips exclude candidates but retain their references', () => {
	const root = fixtureRoot('terra-quality-single-use-skipped-reference-');
	fixtureFile(root, 'src/shared.ts', 'export const sharedValue = 1;\n');
	fixtureFile(root, 'src/app.ts', "import { sharedValue } from './shared.js';\nvoid sharedValue;\n");
	fixtureFile(root, 'src/generated/reference.ts', "import { sharedValue } from '../shared.js';\nvoid sharedValue;\n");
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		singleUse: { skippedDirectories: ['src/generated'] },
	});
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'sharedValue'),
		false,
	);
});
test('single-use analysis includes candidates in every configured directory', () => {
	const root = fixtureRoot('terra-quality-single-use-all-directories-');
	fixtureFile(root, 'src/quality/internal.ts', 'const internalOnly = 1;\nvoid internalOnly;\n');
	fixtureFile(root, 'src/shared.ts', 'export const sharedValue = 1;\n');
	fixtureFile(root, 'src/quality/consumer.ts', "import { sharedValue } from '../shared.js';\nvoid sharedValue;\n");
	const names = singleUseFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] })).map((finding) => finding.name);
	assert.ok(names.includes('internalOnly'));
	assert.ok(names.includes('sharedValue'));
});
test('single-use fixer does not treat an export specifier as a local consumer', () => {
	const root = fixtureRoot('terra-quality-single-use-export-');
	fixtureFile(root, 'src/module.ts', `function Action() { return true; }\nexport { Action };\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(
		singleUseFindings(cfg).some((f) => f.name === 'summarize'),
		false,
	);
});
test('single-use analysis preserves currentTarget snapshots captured by inline and named callbacks', () => {
	const root = fixtureRoot('terra-quality-current-target-snapshot-');
	fixtureFile(
		root,
		'src/main.ts',
		`type InputEvent = { currentTarget: { value: string } };
type Setter = (callback: (current: string[]) => string[]) => void;
function updateInline(event: InputEvent, set: Setter) {
	const inlineSnapshot = event.currentTarget.value;
	set(current => current.map((name, index) => index === 0 ? inlineSnapshot : name));
}
function updateNamed(event: InputEvent, set: Setter) {
	const namedSnapshot = event.currentTarget.value;
	function applyName(current: string[]) { return current.map((name, index) => index === 0 ? namedSnapshot : name); }
	set(applyName);
}
void [updateInline, updateNamed];
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(
		singleUseFindings(cfg).some((finding) => ['inlineSnapshot', 'namedSnapshot'].includes(finding.name)),
		false,
	);
});
test('single-use analysis keeps cross-file closures and write-target values intact', () => {
	const root = fixtureRoot('terra-quality-single-use-context-safety-');
	fixtureFile(root, 'src/helpers.ts', `const offset = 1;\nexport function addOffset(value: number) { return value + offset; }\nexport let position = 0;\n`);
	fixtureFile(root, 'src/consumer.ts', `import { addOffset, position } from './helpers';\nconst result = addOffset(1);\nposition++;\nvoid result;\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
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
test('single-use analysis preserves values captured from event currentTarget for callbacks', () => {
	const root = fixtureRoot('terra-quality-single-use-current-target-');
	fixtureFile(
		root,
		'src/main.ts',
		`function onChange(event: { currentTarget: { value: string } }, setValue: (update: (current: string) => string) => void) {
	const value = event.currentTarget.value;
	setValue((current) => (current === value ? current : value));
}
void onChange;
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'value'),
		false,
	);
});
test('single-use analysis preserves event currentTarget snapshots referenced by named callbacks', () => {
	const root = fixtureRoot('terra-quality-single-use-current-target-named-');
	fixtureFile(
		root,
		'src/main.ts',
		`function onChange(event: { currentTarget: { value: string } }, schedule: (callback: () => void) => void) {
	const value = event.currentTarget.value;
	function update() {
		console.log(value);
	}
	schedule(update);
}
void onChange;
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'value'),
		false,
	);
});
test('single-use fixing retains object values referenced through typeof', () => {
	const root = fixtureRoot('terra-quality-single-use-value-type-query-');
	fixtureFile(root, 'src/main.ts', `const value = { status: 'ready' as const };\ntype Value = typeof value;\nvoid (null as unknown as Value);\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(fixSingleUseDeclarations(cfg), 1);
	const updated = fixtureText(root, 'src/main.ts');
	assert.match(updated, /typeof value/);
	assert.match(updated, /const value = \{ status: 'ready' as const \}/);
	const parsed = ts.createSourceFile('main.ts', updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	assert.equal(parsed.parseDiagnostics.length, 0);
});
test('single-use fixing leaves documented type declarations and their comments intact', () => {
	const root = fixtureRoot('terra-quality-single-use-documented-type-');
	const original = `/** Canonical groups used to order and label source imports. */\ntype ImportGroup = 'API' | 'COMPONENTS' | 'DATA' | 'TYPES';\nexport const selected: ImportGroup = 'API';\n/** Context-menu target and its optional node or edge identifier. */\ntype FlowMenuContext = { type: 'pane' | '_node' | 'e'; id: string | null };\nfunction selectMenu(context: FlowMenuContext) { return context; }\nconst selectedMenu = selectMenu({ type: 'pane', id: null });\nvoid selectedMenu;\n`;
	fixtureFile(root, 'src/main.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
	const finding = singleUseFindings(cfg).find((candidate) => candidate.name === 'ImportGroup');
	assert.equal(finding?.decision, 'REVIEW');
	assert.equal(finding?.autofixable, false);
	assert.match(finding?.reason ?? '', /authored documentation and requires agent review/);
	const contextFinding = singleUseFindings(cfg).find((candidate) => candidate.name === 'FlowMenuContext');
	assert.equal(contextFinding?.decision, 'REVIEW');
	assert.equal(contextFinding?.autofixable, false);
	assert.match(contextFinding?.reason ?? '', /authored documentation and requires agent review/);
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts', '.tsx'],
	});
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
test('single-use inline markers never suppress review findings or allow autofix to rewrite them', () => {
	const root = fixtureRoot('terra-quality-single-use-inline-ignore-');
	const original = `function keepBoundary() { return 'ready'; } // terra-quality-ignore single-use -- The named boundary preserves a stable stack frame for the caller.\nexport const result = keepBoundary();\n`;
	fixtureFile(root, 'src/main.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = singleUseFindings(cfg);
	assert.ok(findings.some((f) => f.name === 'keepBoundary' && f.decision === 'REVIEW'));
	assert.ok(findings.some((f) => f.name === 'single-use-ignore'));
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
});
test('single-use inline markers remain discoverable after template literals', () => {
	const root = fixtureRoot('terra-quality-single-use-inline-ignore-template-');
	const original = `const route = \`/resource/${'${id}'}\`;\nfunction keepBoundary() { return route; } // terra-quality-ignore single-use -- Preserve the named boundary after the preceding template expression.\nexport const result = keepBoundary();\n`;
	fixtureFile(root, 'src/main.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const findings = singleUseFindings(cfg);
	assert.ok(findings.some((f) => f.name === 'route' && f.decision === 'REVIEW'));
	assert.ok(findings.some((f) => f.name === 'keepBoundary' && f.decision === 'REVIEW'));
	assert.ok(findings.some((f) => f.name === 'single-use-ignore'));
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
});
test('single-use inline markers are always reported and never suppress candidates', () => {
	const root = fixtureRoot('terra-quality-single-use-inline-ignore-stale-');
	fixtureFile(
		root,
		'src/main.ts',
		`function malformed() { return 1; } // terra-quality-ignore single-use --\nexport const malformedResult = malformed();\n// terra-quality-ignore single-use -- This marker is detached from the declaration.\nfunction detached() { return 2; }\nexport const first = detached();\nfunction stale() { return 3; } // terra-quality-ignore single-use -- This declaration now has multiple consumers.\nexport const third = stale();\nexport const fourth = stale();\n`,
	);
	const findings = singleUseFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] }));
	const directiveFindings = findings.filter((f) => f.name === 'single-use-ignore');
	assert.equal(directiveFindings.length, 3);
	assert.ok(directiveFindings.every((f) => f.reason.includes('cannot suppress Quality findings')));
	assert.ok(
		findings.some((f) => f.name === 'malformed'),
		'malformed markers do not hide the candidate',
	);
	assert.ok(
		findings.some((f) => f.name === 'detached'),
		'detached markers do not hide the candidate',
	);
});
test('inline markers remain agent-owned and block automatic declaration edits', () => {
	const root = fixtureRoot('terra-quality-single-use-malformed-inline-');
	const original = `const safe = 3; // terra-quality-ignore single-use --\nexport const result = safe;\n`;
	fixtureFile(root, 'src/main.ts', original);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
	});
	const initial = singleUseFindings(cfg);
	assert.ok(initial.some((f) => f.name === 'single-use-ignore'));
	assert.ok(initial.some((f) => f.name === 'safe' && f.decision === 'REVIEW'));
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
	assert.ok(singleUseFindings(cfg).some((f) => f.name === 'single-use-ignore'));
});
