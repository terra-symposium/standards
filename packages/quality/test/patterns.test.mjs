/**
 * packages/quality/test/patterns.test.mjs
 * Verifies repeated classes, UI-pattern diagnostics, regex deduplication, and
 * Tailwind canonicalisation, including configured skips and safe autofixes.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityCfg, fixRegexDedup, fixRepeatedClasses, regexFindings, repeatedClassFindings, runTailwindCanonical, uiPatternFindings } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('repeated-class detection normalizes whitespace and ignores dynamic, one-word, test, and configured paths', () => {
	const root = fixtureRoot('terra-quality-classes-');
	const repeated = 'className="rounded   border bg-card"';
	fixtureFile(root, 'src/one.tsx', `<div ${repeated} />\n<div class="rounded border bg-card" />\n`);
	fixtureFile(root, 'src/two.tsx', `<div ${repeated} />\n<div className="rounded border bg-card" />\n`);
	fixtureFile(root, 'src/dynamic.tsx', `<div className={classes} /><div className="rounded {conditional}" />\n`);
	fixtureFile(root, 'src/test/fixture.tsx', `<div className="rounded border bg-card" />\n`);
	fixtureFile(root, 'src/generated/fixture.tsx', `<div className="rounded border bg-card" />\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], repeatedClasses: { minimumCount: 5, ignoredDirectories: ['generated'] } });
	assert.deepEqual(repeatedClassFindings(cfg), []);
	const defaultCfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], repeatedClasses: {} });
	assert.deepEqual(repeatedClassFindings(defaultCfg), []);
});
test('UI pattern detection applies configured extensions and ignored repository-relative files', () => {
	const root = fixtureRoot('terra-quality-ui-patterns-');
	fixtureFile(root, 'src/visible.tsx', '<div><button className="legacy">Save</button></div>\n');
	fixtureFile(root, 'src/ignored.tsx', '<button className="legacy">Ignore</button>\n');
	fixtureFile(root, 'src/notes.html', '<button class="legacy">HTML</button>\n');
	fixtureFile(root, 'src/no-match.tsx', '<Button>Shared primitive</Button>\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.tsx', '.html'],
		uiPatterns: { forbidden: ['<button\\b'], ignoredFiles: ['src/ignored.tsx'], extensions: ['.tsx', '.html'] },
	});
	const findings = uiPatternFindings(cfg);
	assert.equal(findings.length, 2);
	assert.deepEqual(
		findings.map((f) => f.file),
		['src/notes.html', 'src/visible.tsx'],
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
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { ignoredFiles: ['src/ignored.ts'], minimumCount: 2 } });
	assert.deepEqual(regexFindings(cfg), []);
	const stricter = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { minimumCount: 5 } });
	assert.deepEqual(regexFindings(stricter), []);
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
