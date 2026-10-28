/**
 * packages/quality/test/checks/patterns.test.mjs
 * Verifies repeated classes, UI-pattern diagnostics, regex deduplication, and
 * Tailwind canonicalisation, including configured skips and safe autofixes.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { createQualityCfg, fixRegexDedup, fixRepeatedClasses, performancePatternFindings, regexFindings, repeatedClassFindings, runTailwindCanonical, uiPatternFindings } from '../../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../../support/fixtures.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('repeated-class detection normalizes whitespace and ignores dynamic and one-word values', () => {
	const root = fixtureRoot('terra-quality-classes-');
	const repeated = 'className="rounded   border bg-card"';
	fixtureFile(root, 'src/one.tsx', `<div ${repeated} />\n<div class="rounded border bg-card" />\n`);
	fixtureFile(root, 'src/two.tsx', `<div ${repeated} />\n<div className="rounded border bg-card" />\n`);
	fixtureFile(root, 'src/dynamic.tsx', `<div className={classes} /><div className="rounded {conditional}" />\n`);
	fixtureFile(root, 'src/test/fixture.tsx', `<div className="rounded border bg-card" />\n`);
	fixtureFile(root, 'src/generated/fixture.tsx', `<div className="rounded border bg-card" />\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], repeatedClasses: { minimumCount: 4 } });
	assert.deepEqual(repeatedClassFindings(cfg), [
		{ value: 'rounded border bg-card', count: 6, locations: ['src/generated/fixture.tsx:1', 'src/one.tsx:1', 'src/one.tsx:2', 'src/test/fixture.tsx:1', 'src/two.tsx:1', 'src/two.tsx:2'] },
	]);
});
test('performance patterns are opt-in and report linear lookups nested in collection callbacks', () => {
	const root = fixtureRoot('terra-quality-performance-patterns-');
	fixtureFile(
		root,
		'src/view.ts',
		`const result = items.map((item) => records.find((record) => record.id === item.id));\nconst filtered = items.map((item) => records.filter((record) => record.group === item.group));\nconst direct = items.find((item) => item.active);\nconst computed = items.map((item) => createRecords().find((record) => record.id === item.id));\n`,
	);
	const base = { root, sourceRoots: ['src'], extensions: ['.ts'] };
	const cfg = createQualityCfg(base);
	assert.deepEqual(performancePatternFindings(cfg), []);
	const enabled = createQualityCfg({ ...base, performancePatterns: {} });
	assert.deepEqual(
		performancePatternFindings(enabled).map(({ method, receiver, line }) => ({ method, receiver, line })),
		[
			{ method: 'find', receiver: 'records', line: 1 },
			{ method: 'filter', receiver: 'records', line: 2 },
		],
	);
});
test('UI pattern detection applies configured extensions to all matching files', () => {
	const root = fixtureRoot('terra-quality-ui-patterns-');
	fixtureFile(root, 'src/visible.tsx', '<div><button className="legacy">Save</button></div>\n');
	fixtureFile(root, 'src/ignored.tsx', '<button className="legacy">Ignore</button>\n');
	fixtureFile(root, 'src/notes.html', '<button class="legacy">HTML</button>\n');
	fixtureFile(root, 'src/no-match.tsx', '<Button>Shared primitive</Button>\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx', '.html'], uiPatterns: { forbidden: ['<button\\b'], extensions: ['.tsx', '.html'] } });
	const findings = uiPatternFindings(cfg);
	assert.equal(findings.length, 3);
	assert.deepEqual(
		findings.map((f) => f.file),
		['src/ignored.tsx', 'src/notes.html', 'src/visible.tsx'],
	);
	assert.ok(findings.every((f) => f.pattern === '<button\\b'));
});
test('regex deduplication inventories literals and RegExp constructors across configured source files', () => {
	const root = fixtureRoot('terra-quality-regex-');
	fixtureFile(root, 'src/one.ts', `const first = /alpha/;\nconst second = new RegExp('constructor');\nvoid [first, second];\n`);
	fixtureFile(root, 'src/two.ts', `const first = /alpha/;\nconst second = new RegExp('constructor');\nvoid [first, second];\n`);
	fixtureFile(root, 'src/three.ts', `const first = /alpha/;\nvoid first;\n`);
	fixtureFile(root, 'src/ignored.ts', `const first = /alpha/;\nvoid first;\n`);
	fixtureFile(root, 'src/tests/test.ts', `const first = /alpha/;\nvoid first;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { minimumCount: 2 } });
	assert.deepEqual(regexFindings(cfg), [
		{ source: 'alpha', count: 5, locations: ['src/ignored.ts:1', 'src/one.ts:1', 'src/tests/test.ts:1', 'src/three.ts:1', 'src/two.ts:1'] },
		{ source: "'constructor'", count: 2, locations: ['src/one.ts:2', 'src/two.ts:2'] },
	]);
	const stricter = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { minimumCount: 5 } });
	assert.deepEqual(regexFindings(stricter), [{ source: 'alpha', count: 5, locations: ['src/ignored.ts:1', 'src/one.ts:1', 'src/tests/test.ts:1', 'src/three.ts:1', 'src/two.ts:1'] }]);
});
test('repeated-class fixer creates deterministic file-local CLASSES constants and leaves dynamic/HTML sources alone', () => {
	const root = fixtureRoot('terra-quality-classes-fix-');
	fixtureFile(
		root,
		'src/view.tsx',
		`/*//////////////////////////////////////////////////\nCONFIG\n//////////////////////////////////////////////////*/\nexport const view = <><div className="rounded border bg-card" /><div class="rounded   border bg-card" /><div className="rounded border bg-card" /></>;\n`,
	);
	fixtureFile(root, 'src/notes.html', `<div class="rounded border bg-card"></div>\n<div class="rounded border bg-card"></div>\n<div class="rounded border bg-card"></div>\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx', '.html'], repeatedClasses: {} });
	assert.deepEqual(fixRepeatedClasses(cfg), { fixed: 3, skipped: 0 });
	const src = fixtureText(root, 'src/view.tsx');
	assert.match(src, /CLASSES/);
	assert.match(src, /const ROUNDED_BORDER_BG_CARD_CLASS = 'rounded border bg-card';/);
	assert.equal((src.match(/ROUNDED_BORDER_BG_CARD_CLASS/g) ?? []).length, 4);
	assert.deepEqual(repeatedClassFindings(createQualityCfg({ root, sourceRoots: ['src/view.tsx'], extensions: ['.tsx'], repeatedClasses: {} })), []);
	assert.match(fixtureText(root, 'src/notes.html'), /class="rounded border bg-card"/);
});
test('regex fixer deduplicates stateless literals and preserves fresh stateful instances through factories', () => {
	const root = fixtureRoot('terra-quality-regex-fix-');
	fixtureFile(
		root,
		'src/view.ts',
		`/*//////////////////////////////////////////////////\nCONFIG\n//////////////////////////////////////////////////*/\nconst first = /alpha/;\nconst second = /alpha/;\nconst stateful = /beta/g;\nconst statefulAgain = /beta/g;\nvoid [first, second, stateful, statefulAgain];\n`,
	);
	fixtureFile(root, 'src/other.ts', 'const other = /alpha/;\nvoid other;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: {} });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 4, skipped: 0 });
	const src = fixtureText(root, 'src/view.ts');
	assert.match(src, /REGEX/);
	assert.match(src, /const ALPHA_REGEX = \/alpha\//);
	assert.equal((src.match(/ALPHA_REGEX/g) ?? []).length, 3);
	assert.match(src, /const BETA_G_REGEX = \(\) => \/beta\/g/);
	assert.equal((src.match(/BETA_G_REGEX\(\)/g) ?? []).length, 2);
	assert.deepEqual(regexFindings(cfg), []);
});
test('shared regex registry rewrites TypeScript and MJS literals and constructors with relative namespace imports', async () => {
	const root = fixtureRoot('terra-quality-regex-shared-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(
		root,
		'src/nested/use.ts',
		`// eslint-disable-next-line @typescript-eslint/no-explicit-any\nconst TerraQualityRegex = 'local collision';\nexport const alpha = /alpha/g;\nexport const constructorPattern = new RegExp('constructor', 'gy');\nvoid TerraQualityRegex;\n`,
	);
	fixtureFile(root, 'scripts/use.mjs', `export const alpha = /alpha/g;\nexport const constructorPattern = new RegExp('constructor', 'gy');\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src', 'scripts'], extensions: ['.ts', '.mjs'], regexDedup: { extensions: ['.ts', '.mjs'], sharedModule: 'shared/regex.mjs' } });
	assert.equal(regexFindings(cfg).length, 2);
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 4, skipped: 0 });
	assert.deepEqual(regexFindings(cfg), []);
	const tsSrc = fixtureText(root, 'src/nested/use.ts');
	const mjsSrc = fixtureText(root, 'scripts/use.mjs');
	assert.match(tsSrc, /import \* as TerraQualityRegex2 from '\.\.\/\.\.\/shared\/regex\.mjs';/);
	assert.ok(tsSrc.indexOf('import * as TerraQualityRegex2') < tsSrc.indexOf('eslint-disable-next-line'));
	assert.match(mjsSrc, /import \* as TerraQualityRegex from '\.\.\/shared\/regex\.mjs';/);
	assert.equal((tsSrc.match(/import \* as TerraQualityRegex2 /g) ?? []).length, 1);
	assert.match(tsSrc, /TerraQualityRegex2\.REGEX_ALPHA_G_REGEX\(\)/);
	assert.match(mjsSrc, /TerraQualityRegex\.REGEX_ALPHA_G_REGEX\(\)/);
	assert.match(mjsSrc, /TerraQualityRegex\.REGEX_CONSTRUCTOR_GY_REGEX\(\)/);
	const registrySrc = fixtureText(root, 'shared/regex.mjs');
	const registryTypes = fixtureText(root, 'shared/regex.d.mts');
	assert.match(registrySrc, /export const REGEX_ALPHA_G_REGEX = \(\) => \(/);
	assert.match(registrySrc, /new RegExp\('constructor', 'gy'\)/);
	assert.match(registryTypes, /export declare const REGEX_ALPHA_G_REGEX: \(\) => RegExp;/);
	assert.match(registryTypes, /export declare const REGEX_CONSTRUCTOR_GY_REGEX: \(\) => RegExp;/);
	const program = ts.createProgram([resolve(root, 'src/nested/use.ts')], {
		allowJs: true,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		noEmit: true,
		target: ts.ScriptTarget.ESNext,
	});
	assert.deepEqual(ts.getPreEmitDiagnostics(program), []);
	const registry = await import(`${pathToFileURL(resolve(root, 'shared/regex.mjs')).href}?fresh=1`);
	const alphaFactoryName = registrySrc.match(/\/\/ @terra-quality-regex-key "alpha\/g"\nexport const (\w+)/)?.[1];
	assert.ok(alphaFactoryName);
	const alphaFactory = registry[alphaFactoryName];
	const first = alphaFactory();
	assert.equal(first.test('alpha'), true);
	assert.equal(first.lastIndex, 5);
	const second = alphaFactory();
	assert.notEqual(first, second);
	assert.equal(second.lastIndex, 0);
	const constructorFactory = registry.REGEX_CONSTRUCTOR_GY_REGEX;
	assert.equal(constructorFactory().flags, 'gy');
	assert.notEqual(constructorFactory(), constructorFactory());
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 0 });
	assert.equal(fixtureText(root, 'shared/regex.mjs'), registrySrc);
});
test('shared regex export allocation avoids names already owned by the registry', () => {
	const root = fixtureRoot('terra-quality-regex-name-collision-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.ts', 'export const first = /alpha/;\n');
	fixtureFile(root, 'src/two.ts', 'export const second = /alpha/;\n');
	fixtureFile(root, 'shared/regex.mjs', `// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\nexport const REGEX_ALPHA_REGEX = () => /existing/;\n`);
	fixtureFile(root, 'shared/regex.d.mts', `// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\nexport declare const REGEX_ALPHA_REGEX: () => RegExp;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 2, skipped: 0 });
	assert.match(fixtureText(root, 'shared/regex.mjs'), /export const REGEX_ALPHA_REGEX_2 =/);
	assert.match(fixtureText(root, 'src/one.ts'), /\.REGEX_ALPHA_REGEX_2\(\)/);
});
test('shared regex fixer leaves a duplicate group unchanged when any consumer is CommonJS', () => {
	const root = fixtureRoot('terra-quality-regex-commonjs-');
	fixtureFile(root, 'src/one.cjs', 'const first = /alpha/;\n');
	fixtureFile(root, 'src/two.cjs', 'const second = /alpha/;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.cjs'], regexDedup: { extensions: ['.cjs'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 2 });
	assert.deepEqual(regexFindings(cfg), [{ source: 'alpha', count: 2, locations: ['src/one.cjs:1', 'src/two.cjs:1'] }]);
	assert.equal(fixtureText(root, 'src/one.cjs'), 'const first = /alpha/;\n');
});
test('shared regex fixer does not overwrite an unowned registry or partially rewrite consumers', () => {
	const root = fixtureRoot('terra-quality-regex-occupied-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.ts', 'export const first = /alpha/;\n');
	fixtureFile(root, 'src/two.ts', 'export const second = /alpha/;\n');
	fixtureFile(root, 'shared/regex.mjs', 'export const userOwned = true;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 2 });
	assert.equal(fixtureText(root, 'shared/regex.mjs'), 'export const userOwned = true;\n');
	assert.equal(fixtureText(root, 'src/one.ts'), 'export const first = /alpha/;\n');
	assert.equal(fixtureText(root, 'src/two.ts'), 'export const second = /alpha/;\n');
});
test('Tailwind canonical diagnostics support missing configuration, missing stylesheets, skipped v4 packages, fixes, and nested stylesheet loading', async () => {
	const noCfg = createQualityCfg({ root: fixtureRoot('terra-quality-tailwind-none-'), sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.equal(await runTailwindCanonical(noCfg), 0);
	const missingStylesheetRoot = fixtureRoot('terra-quality-tailwind-missing-style-');
	fixtureFile(missingStylesheetRoot, 'package.json', '{}');
	const missingStylesheet = createQualityCfg({ root: missingStylesheetRoot, sourceRoots: ['src'], extensions: ['.tsx'], tailwindCanonical: { stylesheet: 'missing.css' } });
	await assert.rejects(runTailwindCanonical(missingStylesheet), /Tailwind stylesheet not found/);
	const root = fixtureRoot('terra-quality-tailwind-');
	fixtureFile(root, 'package.json', '{}');
	fixtureFile(root, 'styles.css', '@import "./nested.css";\n');
	fixtureFile(root, 'nested.css', '@theme { --color-test: red; }\n');
	fixtureFile(root, 'node_modules/tailwindcss/package.json', JSON.stringify({ name: 'tailwindcss', type: 'module', main: 'index.mjs' }));
	fixtureFile(
		root,
		'node_modules/tailwindcss/index.mjs',
		`export async function __unstable__loadDesignSystem(css, opts) {
	const nested = await opts.loadStylesheet('./nested.css', opts.from.slice(0, opts.from.lastIndexOf('/')));
	if (!nested.content.includes('--color-test')) throw new Error('nested stylesheet was not loaded');
	return { canonicalizeCandidates(candidates) { return candidates.map((candidate) => candidate === 'text-muted' ? 'text-foreground' : candidate); } };
}\n`,
	);
	fixtureFile(
		root,
		'src/view.tsx',
		`export const view = <div className="text-muted" />;
	const template = <div className={\`text-muted \${active ? 'text-muted' : ''}\`} />;
	const composed = cn('text-muted', active && 'text-muted');
	void [view, template, composed];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], tailwindCanonical: { stylesheet: 'styles.css' } });
	await assert.rejects(runTailwindCanonical(cfg), /failed with 4 suggestions/);
	assert.equal(await runTailwindCanonical(cfg, true), 0);
	assert.equal(fixtureText(root, 'src/view.tsx').split('text-muted').length - 1, 1, 'the dynamic interpolation remains intentionally untouched');
	assert.equal(fixtureText(root, 'src/view.tsx').split('text-foreground').length - 1, 4);
	assert.equal(await runTailwindCanonical(cfg), 0);
	assert.ok(fixtureText(root, 'src/view.tsx').endsWith('void [view, template, composed];\n'));
});
test('Tailwind canonical diagnostics cleanly skip a package without the unstable v4 API', async () => {
	const root = fixtureRoot('terra-quality-tailwind-v3-');
	fixtureFile(root, 'package.json', '{}');
	fixtureFile(root, 'styles.css', ':root {}\n');
	fixtureFile(root, 'node_modules/tailwindcss/package.json', JSON.stringify({ name: 'tailwindcss', main: 'index.cjs' }));
	fixtureFile(root, 'node_modules/tailwindcss/index.cjs', 'module.exports = {};\n');
	fixtureFile(root, 'src/view.tsx', '<div className="text-muted" />\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], tailwindCanonical: { stylesheet: 'styles.css' } });
	assert.equal(await runTailwindCanonical(cfg), 0);
});
