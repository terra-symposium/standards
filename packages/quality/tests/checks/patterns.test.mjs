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
import { dirname, relative, resolve } from 'node:path';

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
	assert.deepEqual(repeatedClassFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], repeatedClasses: { minimumCount: 4 } })), [
		{ value: 'rounded border bg-card', count: 6, locations: ['src/generated/fixture.tsx:1', 'src/one.tsx:1', 'src/one.tsx:2', 'src/test/fixture.tsx:1', 'src/two.tsx:1', 'src/two.tsx:2'] },
	]);
});
test('repeated-class analysis and fixing ignore markup inside JavaScript strings but process JSX', () => {
	const root = fixtureRoot('terra-quality-classes-string-data-');
	const genSource = `export const courseHtml = ${JSON.stringify('<div class="rounded border bg-card"></div> <div class="rounded border bg-card"></div> <div class="rounded border bg-card"></div>')};\n`;
	fixtureFile(root, 'src/course-data.js', genSource);
	fixtureFile(root, 'src/view.tsx', '<><div className="rounded border bg-card" /><div className="rounded border bg-card" /><div class="rounded border bg-card" /></>;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.js', '.tsx'], repeatedClasses: {} });
	assert.deepEqual(repeatedClassFindings(cfg), [{ value: 'rounded border bg-card', count: 3, locations: ['src/view.tsx:1', 'src/view.tsx:1', 'src/view.tsx:1'] }]);
	assert.deepEqual(fixRepeatedClasses(cfg), { fixed: 3, skipped: 0 });
	assert.equal(fixtureText(root, 'src/course-data.js'), genSource);
	assert.match(fixtureText(root, 'src/view.tsx'), /const ROUNDED_BORDER_BG_CARD_CLASS = 'rounded border bg-card';/);
	assert.deepEqual(repeatedClassFindings(cfg), []);
});
test('performance patterns are opt-in and report linear lookups nested in collection callbacks', () => {
	const root = fixtureRoot('terra-quality-performance-patterns-');
	fixtureFile(
		root,
		'src/view.ts',
		`type Item = { id: number; name: string; group: number; active: boolean };\ntype CourseRecord = { id: number; group: number };\nconst items: Item[] = [];\nconst records: CourseRecord[] = [];\nconst labels: string[] = [];\nconst result = items.map((item) => records.find((record) => record.id === item.id));\nconst filtered = items.map((item) => records.filter((record) => record.group === item.group));\nconst stringMatch = items.map((item) => item.name.includes(item.id.toString()));\nconst arrayMatch = items.map((item) => labels.includes(item.name));\nconst direct = items.find((item) => item.active);\nconst computed = items.map((item) => createRecords().find((record) => record.id === item.id));\n`,
	);
	const base = { root, sourceRoots: ['src'], extensions: ['.ts'] };
	assert.deepEqual(performancePatternFindings(createQualityCfg(base)), []);
	assert.deepEqual(
		performancePatternFindings(createQualityCfg({ ...base, performancePatterns: {} })).map(({ method: m, receiver: r, line: l }) => ({ method: m, receiver: r, line: l })),
		[
			{ method: 'find', receiver: 'records', line: 6 },
			{ method: 'filter', receiver: 'records', line: 7 },
			{ method: 'includes', receiver: 'labels', line: 9 },
		],
	);
});
test('UI pattern detection applies configured extensions to all matching files', () => {
	const root = fixtureRoot('terra-quality-ui-patterns-');
	fixtureFile(root, 'src/visible.tsx', '<div><button className="legacy">Save</button></div>\n');
	fixtureFile(root, 'src/ignored.tsx', '<button className="legacy">Ignore</button>\n');
	fixtureFile(root, 'src/notes.html', '<button class="legacy">HTML</button>\n');
	fixtureFile(root, 'src/no-match.tsx', '<Button>Shared primitive</Button>\n');
	const findings = uiPatternFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx', '.html'], uiPatterns: { forbidden: ['<button\\b'], extensions: ['.tsx', '.html'] } }));
	assert.equal(findings.length, 3);
	assert.deepEqual(
		findings.map(f => f.file),
		['src/ignored.tsx', 'src/notes.html', 'src/visible.tsx'],
	);
	assert.ok(findings.every(f => f.pattern === '<button\\b'));
});
test('regex deduplication inventories literals and RegExp constructors across configured source files', () => {
	const root = fixtureRoot('terra-quality-regex-');
	fixtureFile(root, 'src/one.ts', `const first = /alpha/;\nconst second = new RegExp('constructor');\nvoid [first, second];\n`);
	fixtureFile(root, 'src/two.ts', `const first = /alpha/;\nconst second = new RegExp('constructor');\nvoid [first, second];\n`);
	fixtureFile(root, 'src/three.ts', `const first = /alpha/;\nvoid first;\n`);
	fixtureFile(root, 'src/ignored.ts', `const first = /alpha/;\nvoid first;\n`);
	fixtureFile(root, 'src/tests/test.ts', `const first = /alpha/;\nvoid first;\n`);
	assert.deepEqual(regexFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { minimumCount: 2 } })), [
		{ source: 'alpha', count: 5, locations: ['src/ignored.ts:1', 'src/one.ts:1', 'src/tests/test.ts:1', 'src/three.ts:1', 'src/two.ts:1'] },
		{ source: "'constructor'", count: 2, locations: ['src/one.ts:2', 'src/two.ts:2'] },
	]);
	assert.deepEqual(regexFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { minimumCount: 5 } })), [
		{ source: 'alpha', count: 5, locations: ['src/ignored.ts:1', 'src/one.ts:1', 'src/tests/test.ts:1', 'src/three.ts:1', 'src/two.ts:1'] },
	]);
});
test('shared regex checks can exclude test directories where repeated literals are intentional assertions', () => {
	const root = fixtureRoot('terra-quality-regex-skipped-directories-');
	fixtureFile(root, 'src/use.ts', 'export const sourcePattern = /record/g;\n');
	fixtureFile(root, 'tests/use.test.ts', 'const one = /record/g;\nconst two = /record/g;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src', 'tests'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs', skippedDirectories: ['tests'] } });
	assert.deepEqual(regexFindings(cfg), []);
	assert.equal(fixRegexDedup(cfg).fixed, 0);
	assert.match(fixtureText(root, 'tests/use.test.ts'), /const one = \/record\/g;/);
});
test('regex dedup ignores inline test expressions while keeping named test regexes in scope', () => {
	const root = fixtureRoot('terra-quality-inline-test-regex-');
	fixtureFile(root, 'src/use.ts', `export const sourcePattern = /shared/g;\n`);
	fixtureFile(
		root,
		'tests/use.test.ts',
		`import assert from 'node:assert/strict';\nassert.match('record', /record/);\nassert.match('record', /record/);\nconst reusablePattern = /shared/g;\nvoid reusablePattern;\n`,
	);
	assert.deepEqual(regexFindings(createQualityCfg({ root, sourceRoots: ['src', 'tests'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } })), [
		{ source: 'shared/g', count: 2, locations: ['src/use.ts:1', 'tests/use.test.ts:4'] },
	]);
});
test('repeated-class fixer creates deterministic file-local CLASSES constants and leaves dynamic/HTML sources alone', () => {
	const root = fixtureRoot('terra-quality-classes-fix-');
	fixtureFile(
		root,
		'src/view.tsx',
		`/*//////////////////////////////////////////////////\nCONFIG\n//////////////////////////////////////////////////*/\nexport const view = <><div className="rounded border bg-card" /><div class="rounded   border bg-card" /><div className="rounded border bg-card" /></>;\n`,
	);
	fixtureFile(root, 'src/notes.html', `<div class="rounded border bg-card"></div>\n<div class="rounded border bg-card"></div>\n<div class="rounded border bg-card"></div>\n`);
	assert.deepEqual(fixRepeatedClasses(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx', '.html'], repeatedClasses: {} })), { fixed: 3, skipped: 0 });
	const src = fixtureText(root, 'src/view.tsx');
	assert.doesNotMatch(src, /\/\*\/{10,}\r?\n[ \t]*(?:CLASSES|REGEX)[ \t]*\r?\n/u);
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
	assert.doesNotMatch(src, /\/\*\/{10,}\r?\n[ \t]*(?:CLASSES|REGEX)[ \t]*\r?\n/u);
	assert.match(src, /const ALPHA_REGEX = \/alpha\//);
	assert.equal((src.match(/ALPHA_REGEX/g) ?? []).length, 3);
	assert.match(src, /const BETA_G_REGEX = \(\) => \/beta\/g/);
	assert.equal((src.match(/BETA_G_REGEX\(\)/g) ?? []).length, 2);
	assert.deepEqual(regexFindings(cfg), []);
});
test('regex fixer inserts declarations after a real CONFIG section, not one inside a template literal', () => {
	const root = fixtureRoot('terra-quality-regex-template-config-');
	const configText = `/*//////////////////////////////////////////////////\nCONFIG\n//////////////////////////////////////////////////*/`;
	fixtureFile(root, 'src/view.ts', `const generated = \`${configText}\`;\n${configText}\nconst first = /alpha/;\nconst second = /alpha/;\nvoid [generated, first, second];\n`);
	assert.deepEqual(fixRegexDedup(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: {} })), { fixed: 2, skipped: 0 });
	const src = fixtureText(root, 'src/view.ts');
	const genSection = src.indexOf('const generated');
	const cfgSection = src.indexOf(configText, genSection + 1);
	const genDeclaration = src.indexOf('const ALPHA_REGEX');
	assert.ok(genSection < cfgSection && cfgSection < genDeclaration && genDeclaration < src.indexOf('const first'));
	assert.doesNotMatch(src, /\/\*\/{10,}\r?\n[ \t]*REGEX[ \t]*\r?\n/u);
	assert.match(src, /const first = ALPHA_REGEX;/);
	assert.match(src, /const second = ALPHA_REGEX;/);
});
test('regex fixer keeps authored comments and does not generate a section label', () => {
	const root = fixtureRoot('terra-quality-regex-comments-');

	fixtureFile(root, 'src/view.ts', `// Keep this authored note.\nconst first = /alpha/;\nconst second = /alpha/;\nvoid [first, second];\n`);
	assert.deepEqual(fixRegexDedup(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: {} })), { fixed: 2, skipped: 0 });
	const updated = fixtureText(root, 'src/view.ts');
	assert.match(updated, /\/\/ Keep this authored note\./u);
	assert.doesNotMatch(updated, /\/\*\/{10,}\r?\n[ \t]*REGEX[ \t]*\r?\n/u);
	assert.equal((updated.match(/\/\*|\/\//gu) ?? []).length, 1);
	assert.match(updated, /const ALPHA_REGEX = \/alpha\//u);
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
	assert.match(registrySrc, /\/\/ @terra-quality-regex-key "alpha\/g"\n(?:\/\*\*[\s\S]*?\*\/\n)?export const REGEX_ALPHA_G_REGEX/);
	assert.doesNotMatch(registrySrc, /Creates a fresh regular expression instance|Generated by regex-dedup from key/u);
	assert.match(registrySrc, /export const REGEX_ALPHA_G_REGEX = \(\) => \(/);
	assert.match(registrySrc, /new RegExp\('constructor', 'gy'\)/);
	assert.match(registryTypes, /export declare const REGEX_ALPHA_G_REGEX: \(\) => RegExp;/);
	assert.match(registryTypes, /export declare const REGEX_CONSTRUCTOR_GY_REGEX: \(\) => RegExp;/);
	assert.doesNotMatch(registrySrc, /@returns?\s/u);
	assert.doesNotMatch(registryTypes, /@returns?\s/u);
	assert.deepEqual(
		ts.getPreEmitDiagnostics(
			ts.createProgram([resolve(root, 'src/nested/use.ts')], {
				allowJs: true,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.Bundler,
				noEmit: true,
				target: ts.ScriptTarget.ESNext,
			}),
		),
		[],
	);
	const registry = await import(`${pathToFileURL(resolve(root, 'shared/regex.mjs')).href}?fresh=1`);
	const alphaFactoryName = registrySrc.match(/\/\/ @terra-quality-regex-key "alpha\/g"\n(?:\/\*\*[\s\S]*?\*\/\n)?export const (\w+)/)?.[1];
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
test('shared regex pruning preserves exports referenced through a configured namespace alias', () => {
	const root = fixtureRoot('terra-quality-regex-shared-alias-');
	const marker = '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n';
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(
		root,
		'src/regex.mjs',
		`${marker}// @terra-quality-regex-key "timezone/i"\nexport const REGEX_TIMEZONE_I_REGEX = () => /timezone/i;\n// @terra-quality-regex-key "city/i"\nexport const REGEX_CITY_I_REGEX = () => /city/i;\n`,
	);
	fixtureFile(root, 'src/regex.d.mts', `${marker}export declare const REGEX_TIMEZONE_I_REGEX: () => RegExp;\nexport declare const REGEX_CITY_I_REGEX: () => RegExp;\n`);
	fixtureFile(
		root,
		'src/consumer.ts',
		`import * as Regex from "@/regex.mjs";\nexport const timezone = Regex.REGEX_TIMEZONE_I_REGEX().test("UTC");\nexport const city = Regex.REGEX_CITY_I_REGEX().test("Sydney");\n`,
	);
	fixtureFile(root, 'src/one.ts', 'export const first = /alpha/g;\n');
	fixtureFile(root, 'src/two.ts', 'export const second = /alpha/g;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.mjs'], aliases: { '@/': 'src/' }, regexDedup: { extensions: ['.ts', '.mjs'], sharedModule: 'src/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 2, skipped: 0 });
	const registry = fixtureText(root, 'src/regex.mjs');
	const declarations = fixtureText(root, 'src/regex.d.mts');
	assert.match(registry, /export const REGEX_TIMEZONE_I_REGEX/u);
	assert.match(registry, /export const REGEX_CITY_I_REGEX/u);
	assert.match(declarations, /REGEX_TIMEZONE_I_REGEX/u);
	assert.match(declarations, /REGEX_CITY_I_REGEX/u);
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 0 });
});
test('shared regex regeneration preserves authored registry TSDoc and carries it to declarations', () => {
	const root = fixtureRoot('terra-quality-regex-doc-preservation-');
	const documentation = '/**\n * Matches an ASCII word boundary for course identifiers.\n *\n * @returns A matcher for ASCII word boundaries in course identifiers.\n */';
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.ts', 'export const first = /course\\b/g;\n');
	fixtureFile(root, 'src/two.ts', 'export const second = /course\\b/g;\n');
	fixtureFile(
		root,
		'shared/regex.mjs',
		`// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n// @terra-quality-regex-key "course\\\\b/g"\n\n${documentation}\nexport const REGEX_COURSE_G_REGEX = () => /course\\b/g;\n`,
	);
	fixtureFile(
		root,
		'shared/regex.d.mts',
		`// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n${'/**\n * Older declaration description that no longer matches the registry.\n *\n * @returns A stale matcher description.\n */'}\nexport declare const REGEX_COURSE_G_REGEX: () => RegExp;\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 2, skipped: 0 });
	const registry = fixtureText(root, 'shared/regex.mjs');
	const declarations = fixtureText(root, 'shared/regex.d.mts');
	assert.equal((registry.match(/Matches an ASCII word boundary for course identifiers\./gu) ?? []).length, 1);
	assert.equal((declarations.match(/Matches an ASCII word boundary for course identifiers\./gu) ?? []).length, 1);
	assert.equal((registry.match(/@returns A matcher for ASCII word boundaries in course identifiers\./gu) ?? []).length, 1);
	assert.equal((declarations.match(/@returns A matcher for ASCII word boundaries in course identifiers\./gu) ?? []).length, 1);
	assert.ok(registry.includes(`${documentation}\nexport const REGEX_COURSE_G_REGEX`));
	assert.ok(declarations.includes(`${documentation}\nexport declare const REGEX_COURSE_G_REGEX`));
	assert.doesNotMatch(declarations, /Older declaration description|A stale matcher description/u);
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 0 });
	assert.equal(fixtureText(root, 'shared/regex.mjs'), registry);
	assert.equal(fixtureText(root, 'shared/regex.d.mts'), declarations);
});
test('shared regex generation carries authored use-site TSDoc without generating return prose', () => {
	const root = fixtureRoot('terra-quality-regex-source-docs-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.ts', `${'/**\n * Matches course identifiers at an ASCII word boundary.\n */'}\nexport const first = /course\\b/g;\n`);
	fixtureFile(root, 'src/two.ts', 'export const second = /course\\b/g;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 2, skipped: 0 });
	const registry = fixtureText(root, 'shared/regex.mjs');
	const declarations = fixtureText(root, 'shared/regex.d.mts');
	for (const gen of [registry, declarations]) {
		assert.match(gen, /Matches course identifiers at an ASCII word boundary\./u);
		assert.doesNotMatch(gen, /Generated by regex-dedup from key|fresh RegExp instance so each caller owns its match state/u);
		assert.doesNotMatch(gen, /@returns?\s/u);
	}
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 0 });
	assert.equal(fixtureText(root, 'shared/regex.mjs'), registry);
	assert.equal(fixtureText(root, 'shared/regex.d.mts'), declarations);
});
test('shared regex regeneration removes obsolete local factories and templated return comments', () => {
	const root = fixtureRoot('terra-quality-regex-generated-hygiene-');
	const oldReturn = 'A fresh RegExp instance so each caller owns its match state.';
	const coursePattern = String.raw`course\b`;
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.ts', `export const firstCourse = /${coursePattern}/g;\nexport const firstFresh = /fresh\\b/g;\n`);
	fixtureFile(root, 'src/two.ts', `export const secondCourse = /${coursePattern}/g;\nexport const secondFresh = /fresh\\b/g;\n`);
	fixtureFile(
		root,
		'shared/regex.mjs',
		`// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n// @terra-quality-regex-key ${JSON.stringify(`${coursePattern}/g`)}\n/**\n * Matches a course identifier at a word boundary.\n *\n * @return ${oldReturn}\n */\nexport const REGEX_COURSE_G_REGEX = () => /${coursePattern}/g;\n// @terra-quality-regex-key "stale/g"\nconst REGEX_STALE_LOCAL_REGEX = () => /stale/g;\n/**\n * Obsolete private factory.\n */\nconst REGEX_UNUSED_LOCAL_REGEX = () => /unused/g;\n`,
	);
	fixtureFile(
		root,
		'shared/regex.d.mts',
		`// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n/**\n * Matches a course identifier at a word boundary.\n *\n * @return ${oldReturn}\n */\nexport declare const REGEX_COURSE_G_REGEX: () => RegExp;\n`,
	);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 4, skipped: 0 });
	const registry = fixtureText(root, 'shared/regex.mjs');
	const declarations = fixtureText(root, 'shared/regex.d.mts');
	assert.match(registry, /Matches a course identifier at a word boundary\./u);
	assert.match(declarations, /Matches a course identifier at a word boundary\./u);
	assert.doesNotMatch(registry, new RegExp(oldReturn, 'u'));
	assert.doesNotMatch(declarations, new RegExp(oldReturn, 'u'));
	assert.doesNotMatch(registry, /@returns?\s/u);
	assert.doesNotMatch(declarations, /@returns?\s/u);
	assert.doesNotMatch(registry, /REGEX_STALE_LOCAL_REGEX|REGEX_UNUSED_LOCAL_REGEX/u);
});
test('shared regex regeneration cleans stale registry entries when no duplicate source expressions remain', () => {
	const root = fixtureRoot('terra-quality-regex-registry-cleanup-');
	const oldReturn = 'A fresh RegExp instance so each caller owns its match state.';
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/only.ts', `import * as Regex from '../shared/regex.mjs';\nexport const matches = Regex.REGEX_KEEP_REGEX().test('keep');\n`);
	fixtureFile(
		root,
		'shared/regex.mjs',
		`// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n// @terra-quality-regex-key "keep/g"\n/**\n *\n */\n/**\n * Matches the retained source token.\n *\n * @return ${oldReturn}\n */\nexport const REGEX_KEEP_REGEX = () => /keep/g;\n// @terra-quality-regex-key "stale/g"\nconst REGEX_KEEP_REGEX = () => /stale/g;\nconst REGEX_UNUSED_LOCAL_REGEX_2 = () => /unused/g;\n`,
	);
	fixtureFile(
		root,
		'shared/regex.d.mts',
		`// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n/**\n *\n */\n/**\n * Matches the retained source token.\n *\n * @return ${oldReturn}\n */\nexport declare const REGEX_KEEP_REGEX: () => RegExp;\n`,
	);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 0 });
	const registry = fixtureText(root, 'shared/regex.mjs');
	assert.match(registry, /REGEX_KEEP_REGEX/u);
	assert.doesNotMatch(registry, new RegExp(oldReturn, 'u'));
	assert.doesNotMatch(registry, /\/\*\*\r?\n\s*\*\r?\n\s*\*\//u);
	assert.doesNotMatch(fixtureText(root, 'shared/regex.d.mts'), new RegExp(oldReturn, 'u'));
	assert.doesNotMatch(fixtureText(root, 'shared/regex.d.mts'), /\/\*\*\r?\n\s*\*\r?\n\s*\*\//u);
	assert.doesNotMatch(fixtureText(root, 'shared/regex.d.mts'), /@returns?\s/u);
	assert.doesNotMatch(registry, /REGEX_UNUSED_LOCAL_REGEX_2/u);
	assert.equal((registry.match(/(?:export )?const REGEX_KEEP_REGEX =/gu) ?? []).length, 1);
});
test('shared regex regeneration preserves a leading source header before the generated marker', () => {
	const root = fixtureRoot('terra-quality-regex-header-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.ts', 'export const first = /header/g;\n');
	fixtureFile(root, 'src/two.ts', 'export const second = /header/g;\n');
	fixtureFile(root, 'shared/regex.mjs', '/**\n * shared/regex.mjs\n */\n\n// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n');
	fixtureFile(root, 'shared/regex.d.mts', '/**\n * shared/regex.d.mts\n */\n\n// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n');
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 2, skipped: 0 });
	assert.match(fixtureText(root, 'shared/regex.mjs'), /^\/\*\*[\s\S]*?\*\/\n\n\/\/ Generated by/u);
	assert.match(fixtureText(root, 'shared/regex.d.mts'), /^\/\*\*[\s\S]*?\*\/\n\n\/\/ Generated by/u);
	assert.equal((fixtureText(root, 'shared/regex.mjs').match(/shared\/regex\.mjs/gu) ?? []).length, 1);
	assert.equal((fixtureText(root, 'shared/regex.d.mts').match(/shared\/regex\.d\.mts/gu) ?? []).length, 1);
	assert.match(fixtureText(root, 'shared/regex.d.mts'), /REGEX_HEADER_G_REGEX/u);
});
test('changed-file regex fixing retains exports referenced by unchanged source', () => {
	const root = fixtureRoot('terra-quality-regex-changed-scope-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/unchanged.mjs', "import * as Regex from '../shared/regex.mjs';\nexport const match = Regex.REGEX_KEEP_REGEX().test('keep');\n");
	fixtureFile(root, 'src/changed.mjs', 'export const first = /new/g;\nexport const second = /new/g;\n');
	fixtureFile(
		root,
		'shared/regex.mjs',
		'// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n// @terra-quality-regex-key "keep"\nexport const REGEX_KEEP_REGEX = () => /keep/;\n',
	);
	fixtureFile(root, 'shared/regex.d.mts', '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\nexport declare const REGEX_KEEP_REGEX: () => RegExp;\n');
	assert.deepEqual(
		fixRegexDedup(createQualityCfg({ root, sourceRoots: ['src/changed.mjs'], extensions: ['.mjs'], regexDedup: { extensions: ['.mjs'], sharedModule: 'shared/regex.mjs' } }), {
			files: [resolve(root, 'src/changed.mjs')],
			sources: new Map(),
			texts: new Map(),
		}),
		{ fixed: 2, skipped: 0 },
	);
	assert.match(fixtureText(root, 'shared/regex.mjs'), /export const REGEX_KEEP_REGEX/u);
	assert.match(fixtureText(root, 'shared/regex.d.mts'), /REGEX_KEEP_REGEX/u);
});
test('shared regex allocation keeps distinct line-ending expressions distinct from colliding export names', async () => {
	const root = fixtureRoot('terra-quality-regex-line-endings-');
	const crlfSource = String.raw`/\r\n?/g`;
	const lineEndSource = String.raw`/\n+$/`;
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.mjs', `export const firstCrLf = ${crlfSource};\nexport const firstLineEnd = ${lineEndSource};\n`);
	fixtureFile(root, 'src/two.mjs', `export const secondCrLf = ${crlfSource};\nexport const secondLineEnd = ${lineEndSource};\n`);
	fixtureFile(
		root,
		'shared/regex.mjs',
		`// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n// @terra-quality-regex-key ${JSON.stringify(String.raw`\r\n/g`)}\nexport const REGEX_R_N_G_REGEX = () => /\\r\\n/g;\n`,
	);
	fixtureFile(root, 'shared/regex.d.mts', '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\nexport declare const REGEX_R_N_G_REGEX: () => RegExp;\n');
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.mjs'], regexDedup: { extensions: ['.mjs'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 4, skipped: 0 });
	const genEntries = new Map([...fixtureText(root, 'shared/regex.mjs').matchAll(/export const (\w+) = \(\) => \(\n\t([^\n]+)\n\);/gu)].map(([, name, expression]) => [expression, name]));
	const crlfName = genEntries.get(crlfSource);
	const lineEndName = genEntries.get(lineEndSource);
	assert.equal(crlfName, 'REGEX_R_N_G_REGEX_2');
	assert.ok(lineEndName);
	assert.match(fixtureText(root, 'src/one.mjs'), new RegExp(`\\.${crlfName}\\(\\)`));
	assert.match(fixtureText(root, 'src/one.mjs'), new RegExp(`\\.${lineEndName}\\(\\)`));
	const runtime = await import(`${pathToFileURL(resolve(root, 'shared/regex.mjs')).href}?line-endings=1`);
	assert.equal(runtime[crlfName]().test('\r'), true);
	assert.equal(runtime[crlfName]().test('\r\n'), true);
	assert.equal(runtime[lineEndName]().test('text\n\n'), true);
});
test('shared regex imports resolve inside the owning package from shallow and deeply nested sources', () => {
	const root = fixtureRoot('terra-quality-regex-package-paths-');
	fixtureFile(root, '.git/HEAD', 'ref: refs/heads/test\n');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'site/package.json', '{"name":"site","type":"module"}\n');
	fixtureFile(root, 'src/lib/terra/regex.mjs', '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n');
	fixtureFile(root, 'src/lib/terra/regex.d.mts', '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n');
	const files = [
		['src/lib/markdown-model.ts', `import * as TerraQualityRegex from './terra/regex.mjs';\nexport const first = /shared/g;\nvoid TerraQualityRegex;\n`],
		['src/components/StaticWorkspace.tsx', `import * as TerraQualityRegex from '../lib/terra/regex.mjs';\nexport const second = /shared/g;\nvoid TerraQualityRegex;\n`],
		['src/components/terra/editor/docs/_Embed.tsx', `export const third = /shared/g;\n`],
		['site/config/astro.config.mjs', `export const fourth = /shared/g;\n`],
		['site/src/lib/catalog.ts', `import * as TerraQualityRegex from '../../../src/lib/terra/regex.mjs';\nexport const fifth = /shared/g;\nvoid TerraQualityRegex;\n`],
	];
	for (const [file, source] of files) fixtureFile(root, file, source);
	assert.deepEqual(
		fixRegexDedup(createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.ts', '.tsx', '.mjs'], regexDedup: { extensions: ['.ts', '.tsx', '.mjs'], sharedModule: 'src/lib/terra/regex.mjs' } })),
		{ fixed: files.length, skipped: 0 },
	);
	const registry = resolve(root, 'src/lib/terra/regex.mjs');
	for (const [file] of files) {
		const imports = [...fixtureText(root, file).matchAll(/^import \* as \w+ from ['"]([^'"]+)['"];?$/gm)];
		assert.equal(imports.length, 1, `${file} should keep exactly one namespace import`);
		const resolvedImport = resolve(dirname(resolve(root, file)), imports[0][1]);
		assert.equal(resolvedImport, registry, `${file} should resolve to the registry in its package`);
		const pathFromRoot = relative(root, resolvedImport);
		assert.notEqual(pathFromRoot, '..');
		assert.ok(!pathFromRoot.startsWith(`..${process.platform === 'win32' ? '\\\\' : '/'}`));
	}
});
test('shared regex fixer skips a registry outside the consumer package boundary', () => {
	const workspaceRoot = fixtureRoot('terra-quality-regex-package-boundary-');
	fixtureFile(workspaceRoot, 'src/lib/terra/regex.mjs', '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n');
	fixtureFile(workspaceRoot, 'src/lib/terra/regex.d.mts', '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n');
	fixtureFile(workspaceRoot, 'docs/package.json', '{"name":"docs","type":"module"}\n');
	fixtureFile(workspaceRoot, 'docs/src/one.ts', 'export const first = /shared/g;\n');
	fixtureFile(workspaceRoot, 'docs/src/two.ts', 'export const second = /shared/g;\n');
	assert.deepEqual(
		fixRegexDedup(createQualityCfg({ root: workspaceRoot, sourceRoots: ['docs/src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'src/lib/terra/regex.mjs' } })),
		{ fixed: 0, skipped: 2 },
	);
	assert.equal(fixtureText(workspaceRoot, 'docs/src/one.ts'), 'export const first = /shared/g;\n');
	assert.equal(fixtureText(workspaceRoot, 'docs/src/two.ts'), 'export const second = /shared/g;\n');
	assert.equal(fixtureText(workspaceRoot, 'src/lib/terra/regex.mjs'), '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\n');
});
test('shared regex export allocation avoids names already owned by the registry', () => {
	const root = fixtureRoot('terra-quality-regex-name-collision-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'src/one.ts', 'export const first = /alpha/;\n');
	fixtureFile(root, 'src/two.ts', 'export const second = /alpha/;\n');
	fixtureFile(root, 'shared/regex.mjs', `// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\nexport const REGEX_ALPHA_REGEX = () => /existing/;\n`);
	fixtureFile(root, 'shared/regex.d.mts', `// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\nexport declare const REGEX_ALPHA_REGEX: () => RegExp;\n`);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { extensions: ['.ts'], sharedModule: 'shared/regex.mjs' } });
	assert.deepEqual(fixRegexDedup(cfg), { fixed: 0, skipped: 2 });
	assert.equal(fixtureText(root, 'shared/regex.mjs'), 'export const userOwned = true;\n');
	assert.equal(fixtureText(root, 'src/one.ts'), 'export const first = /alpha/;\n');
	assert.equal(fixtureText(root, 'src/two.ts'), 'export const second = /alpha/;\n');
});
test('Tailwind canonical diagnostics support missing configuration, missing stylesheets, skipped v4 packages, fixes, and nested stylesheet loading', async () => {
	assert.equal(await runTailwindCanonical(createQualityCfg({ root: fixtureRoot('terra-quality-tailwind-none-'), sourceRoots: ['src'], extensions: ['.tsx'] })), 0);
	const missingStylesheetRoot = fixtureRoot('terra-quality-tailwind-missing-style-');
	fixtureFile(missingStylesheetRoot, 'package.json', '{}');
	await assert.rejects(
		runTailwindCanonical(createQualityCfg({ root: missingStylesheetRoot, sourceRoots: ['src'], extensions: ['.tsx'], tailwindCanonical: { stylesheet: 'missing.css' } })),
		/Tailwind stylesheet not found/,
	);
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
	assert.equal(await runTailwindCanonical(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], tailwindCanonical: { stylesheet: 'styles.css' } })), 0);
});
