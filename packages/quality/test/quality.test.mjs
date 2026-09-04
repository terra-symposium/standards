/**
 * packages/quality/test/quality.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
// prettier-ignore
import { checkImports, collapseInlineIfs, collapseTypesAndObjects, createQualityConfig, maintainSourceFile, namingFindings, protectLongImports, renameIdentifier, runQualityCli, sourceFiles } from '../dist/index.js';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('resolves aliases and extensionless relative imports', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'helper.ts'), 'export const ok = true;\n');
	writeFileSync(join(root, 'src', 'main.ts'), "import { ok } from './helper';\nimport { ok as alias } from '@/helper';\nvoid ok; void alias;\n");
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '@/': 'src/' } });
	assert.deepEqual(checkImports(config), []);
});

test('quality accepts individual changed files as scoped source roots', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-file-root-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const value = true;\n');
	const config = createQualityConfig({ root, sourceRoots: [file], extensions: ['.ts'] });
	assert.deepEqual(sourceFiles(config), [file]);
});

test('reports concise-name drift without changing source', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'main.ts'), 'const organization = true;\nvoid organization;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(namingFindings(config)[0].suggestion, 'org');
});

test('renames requested words across casing, separators, compounds, plurals, and inflections', () => {
	const cases = {
		error: 'err',
		Error: 'Err',
		ERROR: 'ERR',
		ErrorBoundary: 'ErrBoundary',
		articleError: 'articleErr',
		article_error: 'article_err',
		Article_Error: 'Article_Err',
		ARTICLE_ERROR: 'ARTICLE_ERR',
		'ARTICLE-error': 'ARTICLE-err',
		'article-error': 'article-err',
		errors: 'errs',
		format: 'fmt',
		FormatOptions: 'FmtOpts',
		FORMAT_OPTIONS: 'FMT_OPTS',
		formattedValue: 'fmtVal',
		formatters: 'fmts',
		initialise: 'init',
		InitialiseRepository: 'InitRepo',
		initialisedRepositories: 'initRepos',
		INITIALIZATION_ERROR: 'INIT_ERR',
		initialize_format: 'init_fmt',
		repository: 'repo',
		Repositories: 'Repos',
		articleRepositoryError: 'articleRepoErr',
	};
	for (const [name, expected] of Object.entries(cases)) assert.equal(renameIdentifier(name), expected, name);
});

test('does not rename substrings, protected platform names, or underscore placeholders', () => {
	for (const name of ['terror', 'deformat', 'repositoryFactory', 'FormData', 'NextResponse', '_']) {
		const expected = name === 'repositoryFactory' ? 'repoFactory' : name;
		assert.equal(renameIdentifier(name), expected, name);
	}
});

test('does not collapse comment-only blocks before else', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	const file = join(root, 'main.ts');
	writeFileSync(file, 'if (ok) { /* keep this comment */ } else { fail(); }\n');
	assert.equal(collapseInlineIfs(file), false);
	assert.equal(readFileSync(file, 'utf8'), 'if (ok) { /* keep this comment */ } else { fail(); }\n');
});

test('collapses multiline object literals, type literals, mapped types, and interfaces', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-collapse-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		`const object = {
	name: 'example',
	nested: {
		enabled: true,
	},
};
type Shape = {
	name: string;
	count?: number;
};
type Flags<T> = {
	[K in keyof T]: boolean;
};
interface Contract {
	read(): string;
	write(value: string): void;
}
`,
	);
	assert.equal(collapseTypesAndObjects(file), true);
	assert.equal(
		readFileSync(file, 'utf8'),
		"const object = { name: 'example', nested: { enabled: true, }, };\ntype Shape = { name: string; count?: number; };\ntype Flags<T> = { [K in keyof T]: boolean; };\ninterface Contract { read(): string; write(value: string): void; }\n",
	);
	assert.equal(collapseTypesAndObjects(file), false);
});

test('collapse preserves comments and whitespace inside strings, templates, and regex literals', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-collapse-'));
	const file = join(root, 'main.ts');
	const src = `const commented = {
	// The comment makes the surrounding object ineligible.
	url: 'https://example.com/a  b',
};
type Commented = {
	/* retain type documentation */ value: string;
};
const literals = {
	pattern: /a  b/,
	message: \`first  second
third  fourth\`,
	url: 'https://example.com/a  b',
};
`;
	writeFileSync(file, src);
	assert.equal(collapseTypesAndObjects(file), true);
	assert.equal(
		readFileSync(file, 'utf8'),
		`const commented = {
	// The comment makes the surrounding object ineligible.
	url: 'https://example.com/a  b',
};
type Commented = {
	/* retain type documentation */ value: string;
};
const literals = { pattern: /a  b/, message: \`first  second
third  fourth\`, url: 'https://example.com/a  b', };
`,
	);
});

test('collapse handles CRLF and ignores unsupported files and already-inline constructs', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-collapse-'));
	const tsFile = join(root, 'main.ts');
	const jsonFile = join(root, 'main.json');
	writeFileSync(tsFile, 'const inline = { ok: true };\r\nconst wrapped = {\r\n value: 1,\r\n};\r\n');
	writeFileSync(jsonFile, '{\n  "value": 1\n}\n');
	assert.equal(collapseTypesAndObjects(tsFile), true);
	assert.equal(readFileSync(tsFile, 'utf8'), 'const inline = { ok: true };\r\nconst wrapped = { value: 1, };\r\n');
	assert.equal(collapseTypesAndObjects(jsonFile), false);
});

test('format collapses objects before invoking Prettier', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-format-order-'));
	const srcRoot = join(root, 'src');
	mkdirSync(srcRoot);
	const file = join(srcRoot, 'main.ts');
	const marker = join(root, 'formatter-ran.txt');
	const fmt = join(root, 'formatter.mjs');
	writeFileSync(file, 'const object = {\n value: true,\n};\n');
	writeFileSync(
		fmt,
		`#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.argv.find((arg) => arg.endsWith('main.ts'));
if (!file || readFileSync(file, 'utf8').includes('{\\n')) process.exit(7);
writeFileSync(${JSON.stringify(marker)}, 'ok');
`,
	);
	chmodSync(fmt, 0o755);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { prettier: fmt } });
	runQualityCli(config, ['format', '--all']);
	assert.equal(readFileSync(marker, 'utf8'), 'ok');
});

test('Prettier keeps short objects and types inline while wrapping constructs over print width', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-prettier-wrap-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(join(root, '.prettierrc.json'), '{ "printWidth": 60, "singleQuote": true }\n');
	writeFileSync(
		file,
		`const short = {
	alpha: true,
	beta: false,
};
type Short = {
	alpha: boolean;
	beta: boolean;
};
const long = {
	alphaPropertyWithLongName: 'a long value that must wrap',
	betaPropertyWithLongName: 'another long value that must wrap',
};
void [short, long];
`,
	);
	const prettier = fileURLToPath(new URL('../../../node_modules/.bin/prettier', import.meta.url));
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { prettier } });
	runQualityCli(config, ['format', '--all']);
	const result = readFileSync(file, 'utf8');
	assert.match(result, /const short = \{ alpha: true, beta: false \};/);
	assert.match(result, /type Short = \{ alpha: boolean; beta: boolean \};/);
	assert.match(result, /const long = \{\n/);
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
	assert.ok(src.includes(`${'/'.repeat(50)}*/\n// API`));
	assert.ok(src.includes('// API\nimport'));
	assert.ok(src.includes('// COMPONENTS\nimport'));
	assert.ok(src.includes('// DATA\nimport'));
	assert.ok(src.includes('// TYPES\nimport'));
	assert.ok(src.endsWith('\n') && !src.endsWith('\n\n'));
	assert.equal(maintainSourceFile(root, file), false);
});

test('maintenance groups top-level consts and types as config and functions as helpers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-sections-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		`import { readFileSync } from 'node:fs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Reads one value. */
function readValue() {
	const nested = 1;
	return nested;
}

class Service {}

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export interface Settings { enabled: boolean }
const OPEN = 'open';
export type Mode = 'read' | 'write';
export const SUPPORTED = new Set(['.ts']);
let runtime = 0;

export default function run() { return readValue(); }
void [Service, runtime, OPEN];
`,
	);
	assert.equal(maintainSourceFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	const config = src.indexOf('CONFIG');
	const helpers = src.indexOf('HELPERS');
	const remaining = src.indexOf('class Service');
	assert.ok(src.indexOf('IMPORTS') < config);
	assert.ok(config < src.indexOf('interface Settings'));
	assert.ok(src.indexOf('interface Settings') < src.indexOf("const OPEN = 'open'"));
	assert.ok(src.indexOf("const OPEN = 'open'") < src.indexOf("type Mode = 'read' | 'write'"));
	assert.ok(src.indexOf("type Mode = 'read' | 'write'") < src.indexOf('const SUPPORTED'));
	assert.ok(src.indexOf('const SUPPORTED') < helpers);
	assert.match(src, /const OPEN = 'open';\nexport type Mode/);
	assert.ok(helpers < src.indexOf('function readValue'));
	assert.ok(src.indexOf('function readValue') < src.indexOf('function run'));
	assert.ok(src.indexOf('function run') < remaining);
	assert.ok(remaining < src.indexOf('let runtime'));
	assert.match(src, /function readValue\(\) \{\n\tconst nested = 1;/);
	assert.equal(src.match(/\nCONFIG\n/g)?.length, 1);
	assert.equal(src.match(/\nHELPERS\n/g)?.length, 1);
	assert.equal(src.match(/\nCOMPONENTS\n/g)?.length ?? 0, 0);
	assert.equal(maintainSourceFile(root, file), false);
});

test('maintenance does not interpret section-shaped string content as managed headers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-sections-'));
	const file = join(root, 'main.ts');
	const fence = `/*${'/'.repeat(50)}\nCONFIG\n${'/'.repeat(50)}*/`;
	writeFileSync(file, `import fs from 'node:fs';\nconst banner = \`${fence}\`;\nvoid [fs, banner];\n`);
	assert.equal(maintainSourceFile(root, file), true);
	assert.ok(readFileSync(file, 'utf8').includes(`\`${fence}\``));
	assert.equal(maintainSourceFile(root, file), false);
});

test('maintenance generates blank TSDoc parameter and return tags for undocumented helpers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-tsdoc-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		`import { readFileSync } from 'node:fs';
function specifiers(fileName: string): string[] {
	return [readFileSync(fileName, 'utf8')];
}
/** Existing documentation. */
function documented(value: string): string { return value; }
/** */
function empty(enabled: boolean): void { void enabled; }
`,
	);
	assert.equal(maintainSourceFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.ok(src.includes('/**\n *\n * @param fileName\n *\n * @return\n */\nfunction specifiers'));
	assert.equal(src.match(/Existing documentation/g)?.length, 1);
	assert.match(src, /\* Existing documentation\.\n \*\n \* @param value\n \*\n \* @return/);
	assert.match(src, /\/\*\*\n \*\n \* @param enabled\n \*\n \* @return\n \*\//);
	assert.equal(maintainSourceFile(root, file), false);
});

test('maintenance repairs TSDoc tags from the current function signature and preserves descriptions', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-tsdoc-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		"import fs from 'node:fs';\n/**\n * Reads a file.\n *\n * @param wrongName - stale\n * @param fileName - Path to read.\n * @returns - File contents.\n * @throws When reading fails.\n */\nfunction read(fileName: string) { return fs.readFileSync(fileName); }\n",
	);
	assert.equal(maintainSourceFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.match(src, /\* @param fileName - Path to read\.\n \*\n \* @return - File contents\./);
	assert.match(src, /\* @throws When reading fails\./);
	assert.doesNotMatch(src, /wrongName/);
	assert.equal(maintainSourceFile(root, file), false);
});

test('maintenance preserves managed-looking sections in files without imports', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-sections-'));
	const file = join(root, 'main.ts');
	const src = `/** main.ts */

const VALUE = true;
`;
	writeFileSync(file, src);
	assert.equal(maintainSourceFile(root, file), false);
	assert.equal(readFileSync(file, 'utf8'), src);
});

test('maintenance normalizes section, group, and line-comment whitespace without duplicate empty sections', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-comment-layout-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		`import { z } from 'zod';
const nullableText = z.string().nullable();
/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/
/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/
function component() {
	const now = new Date();
	// MUTATION

	mutate(now);


	// VALIDATION

	validate(now);
}
void component;
`,
	);
	assert.equal(maintainSourceFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.equal(src.match(/\nHELPERS\n/g)?.length ?? 0, 0);
	assert.equal(src.match(/\nCOMPONENTS\n/g)?.length, 1);
	assert.doesNotMatch(src, /HELPERS\n\/{10,}\*\/\n\n\/\*\/{10,}\nCOMPONENTS/);
	assert.match(src, /nullableText = z\.string\(\)\.nullable\(\);\n\n\/\*\/{10,}/);
	assert.doesNotMatch(src, /\/{10,}\*\/\n\n(?:\/\/|\S)/);
	assert.match(src, /\/\/ MUTATION\n\tmutate\(now\);/);
	assert.match(src, /mutate\(now\);\n\n\t\/\/ VALIDATION\n\tvalidate\(now\);/);
	assert.doesNotMatch(src, /\/\/ (?:API|COMPONENTS|DATA|TYPES|MUTATION|VALIDATION)\n\n/);
	assert.equal(maintainSourceFile(root, file), false);
});

test('maintenance does not normalize section-shaped text inside templates', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-comment-layout-'));
	const file = join(root, 'main.ts');
	const literal = `before\n\n/*//////////////////////////////////////////////////\nHELPERS\n//////////////////////////////////////////////////*/\n\nafter`;
	writeFileSync(file, `import fs from 'node:fs';\nconst value = \`${literal}\`;\nvoid [fs, value];\n`);
	maintainSourceFile(root, file);
	assert.ok(readFileSync(file, 'utf8').includes(`\`${literal}\``));
});

test('format applies maintenance before Prettier and is idempotent', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-format-order-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, "import { readFileSync } from 'node:fs';\n\nconst value={active:true};\n");
	const prettier = fileURLToPath(new URL('../../../node_modules/.bin/prettier', import.meta.url));
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { prettier } });
	runQualityCli(config, ['format', '--all']);
	const first = readFileSync(file, 'utf8');
	assert.match(first, /\/\/ API\nimport/);
	assert.match(first, /CONFIG\n\/{10,}\*\/\nconst value/);
	runQualityCli(config, ['format', '--all']);
	assert.equal(readFileSync(file, 'utf8'), first);
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
		qualityCommands: [{ name: 'fixture', command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ok')`] }],
	});
	runQualityCli(config, ['domain', 'fixture', '--all']);
	assert.equal(readFileSync(marker, 'utf8'), 'ok');
});

test('naming supports warning-only and automatic-fix modes', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'const organization = true;\nconst generatedPattern = /ok/;\nexport const result = [organization, generatedPattern];\n';
	writeFileSync(file, src);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all', '--warn']);
	assert.equal(readFileSync(file, 'utf8'), src);
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const org = true;\nconst genPattern = /ok/;\nexport const result = [org, genPattern];\n');
});

test('naming applies whole-word image aliases and prefix-only state aliases', () => {
	assert.equal(renameIdentifier('image'), 'img');
	assert.equal(renameIdentifier('Image'), 'Img');
	assert.equal(renameIdentifier('heroImage'), 'heroImg');
	assert.equal(renameIdentifier('images'), 'imgs');
	assert.equal(renameIdentifier('activeCard'), 'aCard');
	assert.equal(renameIdentifier('ActiveCard'), 'ACard');
	assert.equal(renameIdentifier('nextCard'), 'nCard');
	assert.equal(renameIdentifier('cleanCard'), 'cCard');
	assert.equal(renameIdentifier('safeCard'), 'sCard');
	assert.equal(renameIdentifier('generatedPattern'), 'genPattern');
	assert.equal(renameIdentifier('isActive'), 'isActive');
	assert.equal(renameIdentifier('isNext'), 'isNext');
	assert.equal(renameIdentifier('isClean'), 'isClean');
	assert.equal(renameIdentifier('isSafe'), 'isSafe');
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

test('naming preserves call punctuation when expanding a shorthand parameter', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-shorthand-param-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'function result({ request }: { request: Request }) { return handle(request, true); }\nvoid result;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'function result({ request: req }: { request: Request }) { return handle(req, true); }\nvoid result;\n');
});

test('naming shortens map callback parameters and all symbol references', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const output = input.map((node, index) => ({ node, index }));\nvoid output;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const output = input.map((n, i) => ({ node: n, index: i }));\nvoid output;\n');
	assert.deepEqual(namingFindings(config), []);
});

test('naming shortens TypeScript traversal callbacks with conflict checks', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'ts.forEachChild(file, (node) => { if (ts.isIdentifier(node)) output.push(node.text); });\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'ts.forEachChild(file, (n) => { if (ts.isIdentifier(n)) output.push(n.text); });\n');
});

test('naming chooses a free map callback alias when preferred names conflict', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const n = 1;\nconst v = 2;\nconst output = input.map((node) => node + n + v);\nvoid output;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const n = 1;\nconst v = 2;\nconst output = input.map((r) => r + n + v);\nvoid output;\n');
});

test('naming reuses concise aliases safely across independent map scopes', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const first = input.map((node) => node.id);\nconst second = input.flatMap((node) => node.children);\nvoid [first, second];\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const first = input.map((n) => n.id);\nconst second = input.flatMap((n) => n.children);\nvoid [first, second];\n');
});

test('naming preserves object keys but not positional syntax in destructured map parameters', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const first = input.map(({ node }) => node.id);\nconst second = pairs.map(([node, index]) => node[index]);\nvoid [first, second];\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const first = input.map(({ node: n }) => n.id);\nconst second = pairs.map(([n, i]) => n[i]);\nvoid [first, second];\n');
});

test('naming allocates distinct aliases across one destructured callback parameter', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callback-collisions-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const output = pairs.map(([record, result]) => result(record));\nvoid output;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const output = pairs.map(([r, v]) => v(r));\nvoid output;\n');
});

test('callback renames do not alter unrelated JSDoc parameters with the same name', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, '/** @param name */\nfunction retain(name: string) { return name; }\nconst output = input.map((name) => name.id);\nvoid [retain, output];\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), '/** @param name */\nfunction retain(name: string) { return name; }\nconst output = input.map((n) => n.id);\nvoid [retain, output];\n');
});

test('naming leaves node unchanged outside configured map callbacks', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	const src = 'function visit(node: unknown) { return node; }\nvoid visit;\n';
	writeFileSync(file, src);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
});

test('naming fix mode leaves protected component paths unchanged', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-protected-path-'));
	mkdirSync(join(root, 'src', 'components', 'ui'), { recursive: true });
	const file = join(root, 'src', 'components', 'ui', 'chart.tsx');
	const src = 'const output = payload.map((item, index) => item[index]);\nvoid output;\n';
	writeFileSync(file, src);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
});

test('naming fixes PascalCase declarations, catch variables, and destructuring without changing property keys', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-naming-cases-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(
		file,
		`class ErrorBoundary {}
const articleError = new ErrorBoundary();
const { error, repository } = { error: articleError, repository: 'shared' };
try { throw error; } catch (format) { console.log(format, repository); }
void [articleError, ErrorBoundary];
`,
	);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(
		readFileSync(file, 'utf8'),
		`class ErrBoundary {}
const articleErr = new ErrBoundary();
const { error: err, repository: repo } = { error: articleErr, repository: 'shared' };
try { throw err; } catch (fmt) { console.log(fmt, repo); }
void [articleErr, ErrBoundary];
`,
	);
	assert.deepEqual(namingFindings(config), []);
});

test('naming preserves exported contracts and configurable protected identifiers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-naming-protected-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	const src = 'export class ErrorBoundary {}\nconst repository = new ErrorBoundary();\nvoid repository;\n';
	writeFileSync(file, src);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'], protectedIdentifiers: ['repository'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
	assert.deepEqual(namingFindings(config), []);
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

test('naming keeps distinct aliases for adjacent parameters', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-parameter-collisions-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'function run(config: object, command: string) { return [config, command]; }\nvoid run;\n');
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'function run(cfg: object, cmd: string) { return [cfg, cmd]; }\nvoid run;\n');
});

test('naming ignores external types, JSX attributes, properties, and exported contracts', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(
		join(root, 'src', 'main.tsx'),
		"export type ResponseRecord = Record<string, string>;\nexport const response = { value: 'ok' };\nconst view = <input aria-current defaultValue={response.value} />;\nvoid view;\n",
	);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(namingFindings(config), []);
});

test('naming ignores declarations exported through an export list', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'function previous() {}\nexport { previous };\n';
	writeFileSync(file, src);
	const config = createQualityConfig({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(config, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
	assert.deepEqual(namingFindings(config), []);
});
