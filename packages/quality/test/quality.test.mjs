/**
 * packages/quality/test/quality.test.mjs
 * Exercises consolidated quality checks, fixers, and CLI behavior.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
import { aliasFindings, checkImports, collapseInlineIfs, collapseTypesAndObjects, createQualityAnalysis, createQualityCfg, documentationFindings, maintainSrcFile, namingFindings, objectForwardingFindings, protectLongImports, regexFindings, renameId, runQualityCli, runTailwindCanonical, srcFiles } from '../dist/index.js';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// DATA
import { DOCUMENTATION_DESCRIPTION_NOTICE } from '../dist/index.js';
test('consolidated quality modules expose their behavior from the public package entrypoint', () => {
	for (const check of [aliasFindings, createQualityAnalysis, documentationFindings, regexFindings, runTailwindCanonical]) assert.equal(typeof check, 'function');
});
test('the published runtime dependency stays within the supported TypeScript API major', () => {
	const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	assert.equal(manifest.dependencies.typescript, '^5.0.0');
});
test('documentation warnings identify missing summary and tag descriptions without generating prose', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-doc-warnings-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		`/**
 * main.ts
 */
/**
 *
 * @param value
 *
 * @return
 */
function read(value: string): string { return value; }
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.ts'] });
	const findings = documentationFindings(cfg);
	assert.deepEqual(new Set(findings.map((f) => f.kind)), new Set(['summary', 'param', 'return']));
	assert.ok(findings.every((f) => f.severity === 'warning'));
	assert.match(DOCUMENTATION_DESCRIPTION_NOTICE, /Ask an agent/);
	assert.match(DOCUMENTATION_DESCRIPTION_NOTICE, /never generates them in bulk/);
});

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('resolves aliases and extensionless relative imports', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'helper.ts'), 'export const ok = true;\n');
	writeFileSync(join(root, 'src', 'main.ts'), "import { ok } from './helper';\nimport { ok as alias } from '@/helper';\nvoid ok; void alias;\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '@/': 'src/' } });
	assert.deepEqual(checkImports(cfg), []);
});
test('does not recommend shape-changing forwarding or persistence payload rewrites', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-object-forwarding-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	writeFileSync(
		file,
		'send({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });\nrepo.upsert({ organizationId: input.organizationId, userId: input.userId, opportunities: input.opportunities });\n',
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = objectForwardingFindings(cfg);
	assert.deepEqual(findings, []);
});
test('quality accepts individual changed files as scoped source roots', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-file-root-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const value = true;\n');
	const cfg = createQualityCfg({ root, sourceRoots: [file], extensions: ['.ts'] });
	assert.deepEqual(srcFiles(cfg), [file]);
});
test('reports concise-name drift without changing source', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'main.ts'), 'const organization = true;\nvoid organization;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(namingFindings(cfg)[0].suggestion, 'org');
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
		attributes: 'attrs',
		commands: 'cmds',
		directories: 'dirs',
		functions: 'fns',
		images: 'imgs',
		organisations: 'orgs',
		responses: 'res',
	};
	for (const [name, expected] of Object.entries(cases)) assert.equal(renameId(name), expected, name);
});
test('does not rename substrings, protected platform names, or underscore placeholders', () => {
	for (const name of ['terror', 'deformat', 'repositoryFactory', 'FormData', 'NextResponse', '_']) {
		const expected = name === 'repositoryFactory' ? 'repoFactory' : name;
		assert.equal(renameId(name), expected, name);
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
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { prettier: fmt } });
	runQualityCli(cfg, ['format', '--all']);
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
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { prettier } });
	runQualityCli(cfg, ['format', '--all']);
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
	assert.equal(maintainSrcFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.match(src, /^\/\*\*\n \* src\/main\.ts\n \* test\n \*\//);
	assert.ok(src.indexOf("from 'alpha'") < src.indexOf("from 'beta'"));
	assert.ok(src.indexOf('// API') < src.indexOf('// COMPONENTS'));
	assert.ok(src.indexOf('// COMPONENTS') < src.indexOf('// DATA'));
	assert.ok(src.indexOf('// DATA') < src.indexOf('// TYPES'));
	assert.equal(src.match(/IMPORTS/g)?.length, 1);
	assert.ok(src.includes(`${'/'.repeat(50)}*/\n\n// API`));
	assert.ok(src.includes('// API\nimport'));
	assert.ok(src.includes('// COMPONENTS\nimport'));
	assert.ok(src.includes('// DATA\nimport'));
	assert.ok(src.includes('// TYPES\nimport'));
	assert.ok(src.endsWith('\n') && !src.endsWith('\n\n'));
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance sorts groups, import lines, and line contents alphabetically', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-import-order-'));
	const file = join(root, 'src.tsx');
	writeFileSync(
		file,
		`import { requireDashboardCtx } from '@/lib/auth.server';
import { cn, titleCaseWords } from '@/lib/shared';
import { actions } from 'astro:actions';
import { DashboardHeader } from '@/components/navigation/DashboardHeader';
import { Link } from '@/components/runtime/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Hint } from '@/components/ui/hint';
import { Add, Building, ChartLine, ChevronRight, Flow, Idea, Link as LinkIcon, Notification, Security, Target as Tgt, UserMultiple, UserProfile } from '@carbon/icons-react';
import * as React from 'react';
import type { PortalIconName } from '@/lib/types';
`,
	);
	assert.equal(maintainSrcFile(root, file), true);
	const imports = readFileSync(file, 'utf8')
		.split('\n')
		.filter((l) => l.startsWith('import '));
	assert.deepEqual(imports, [
		"import { actions } from 'astro:actions';",
		"import { cn, titleCaseWords } from '@/lib/shared';",
		"import { requireDashboardCtx } from '@/lib/auth.server';",
		"import * as React from 'react';",
		"import { Add, Building, ChartLine, ChevronRight, Flow, Idea, Link as LinkIcon, Notification, Security, Target as Tgt, UserMultiple, UserProfile } from '@carbon/icons-react';",
		"import { Badge } from '@/components/ui/badge';",
		"import { Button } from '@/components/ui/button';",
		"import { Card } from '@/components/ui/card';",
		"import { DashboardHeader } from '@/components/navigation/DashboardHeader';",
		"import { Hint } from '@/components/ui/hint';",
		"import { Link } from '@/components/runtime/Link';",
		"import type { PortalIconName } from '@/lib/types';",
	]);
	assert.ok(readFileSync(file, 'utf8').indexOf('// API') < readFileSync(file, 'utf8').indexOf('// COMPONENTS'));
	assert.ok(readFileSync(file, 'utf8').indexOf('// COMPONENTS') < readFileSync(file, 'utf8').indexOf('// TYPES'));
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance removes duplicate file headers and preserves a blank after section fences', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-duplicate-header-'));
	const file = join(root, 'src.ts');
	writeFileSync(
		file,
		`/**
 * src.ts
 */

/**
 * src.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
import fs from 'node:fs';

/**
 *
 */
function read() { return fs.readFileSync('/dev/null'); }
`,
	);
	assert.equal(maintainSrcFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.equal(src.match(/\* src\.ts/g)?.length, 1);
	assert.match(src, /\/{10,}\*\/\n\n\/\*\*/);
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance removes unauthorized blank lines inside functions', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-whitespace-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		`import fs from 'node:fs';
function read(path: string) {
  const value = fs.readFileSync(path, 'utf8');
  return value.trim();
}
`,
	);
	maintainSrcFile(root, file);
	const src = readFileSync(file, 'utf8');
	assert.doesNotMatch(src, /readFileSync\(path, 'utf8'\);\n\n/);
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
	assert.equal(maintainSrcFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	const cfg = src.indexOf('CONFIG');
	const helpers = src.indexOf('HELPERS');
	const remaining = src.indexOf('class Service');
	assert.ok(src.indexOf('IMPORTS') < cfg);
	assert.ok(cfg < src.indexOf('interface Settings'));
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
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance does not interpret section-shaped string content as managed headers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-sections-'));
	const file = join(root, 'main.ts');
	const fence = `/*${'/'.repeat(50)}\nCONFIG\n${'/'.repeat(50)}*/`;
	writeFileSync(file, `import fs from 'node:fs';\nconst banner = \`${fence}\`;\nvoid [fs, banner];\n`);
	assert.equal(maintainSrcFile(root, file), true);
	assert.ok(readFileSync(file, 'utf8').includes(`\`${fence}\``));
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance generates a blank TSDoc block only for helpers without existing documentation', () => {
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
	assert.equal(maintainSrcFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.ok(src.includes('/**\n *\n * @param fileName\n *\n * @return\n */\nfunction specifiers'));
	assert.equal(src.match(/Existing documentation/g)?.length, 1);
	assert.match(src, /\* Existing documentation\.\n \*\n \* @param value\n \*\n \* @return/);
	assert.match(src, /\* @param enabled\n \*\//);
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance expands one-line TSDoc with parameter and return scaffolds', () => {
	const dir = mkdtempSync(join(tmpdir(), 'terra-quality-tsdoc-summary-'));
	const file = join(dir, 'src.ts');
	writeFileSync(file, "import fs from 'node:fs';\n/** Handles create client. */\nfunction createClient(path: string): boolean { return fs.existsSync(path); }\n");
	maintainSrcFile(dir, file);
	const src = readFileSync(file, 'utf8');
	assert.match(src, /\* Handles create client\.\n \*\n \* @param path\n \*\n \* @return/);
	assert.equal(maintainSrcFile(dir, file), false);
});
test('maintenance adds missing tags to existing one-line TSDoc without imports or across custom sections', () => {
	for (const [prefix, body] of [
		[
			'no-imports',
			`/** Describes the value. */
export function readValue(name: string) { return name; }
/** Renders the selected label. */
export function renderLabel({ label }: { label: string }) { return label; }
`,
		],
		[
			'custom-section',
			`import { readFileSync } from 'node:fs';
/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/
/** Describes the value. */
export function readValue(name: string) { return readFileSync(name, 'utf8'); }
`,
		],
		[
			'nested-module',
			`declare module 'astro:actions' {
	/** Provides a minimal action declaration. */
	export function defineAction(options: { handler: (input: unknown) => unknown }): unknown;
}
`,
		],
	]) {
		const root = mkdtempSync(join(tmpdir(), `terra-quality-tsdoc-${prefix}-`));
		const file = join(root, prefix === 'nested-module' ? 'main.d.ts' : 'main.ts');
		writeFileSync(file, body);
		assert.equal(maintainSrcFile(root, file), true, prefix);
		const src = readFileSync(file, 'utf8');
		if (prefix === 'nested-module') assert.match(src, /\t\/\*\*\n\t \* Provides a minimal action declaration\.\n\t \*\n\t \* @param options\n\t \*\n\t \* @return\n\t \*\//);
		else assert.match(src, /\* Describes the value\.\n \*\n \* @param name\n \*\n \* @return/);
		if (prefix === 'no-imports') assert.match(src, /\* Renders the selected label\.\n \*\n \* @param props\n \*\n \* @return/);
		assert.equal(maintainSrcFile(root, file), false, prefix);
	}
});
test('maintenance preserves existing TSDoc prose and tag descriptions while adding missing tags', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-tsdoc-'));
	const file = join(root, 'main.ts');
	writeFileSync(
		file,
		"import fs from 'node:fs';\n/**\n * Reads a file.\n *\n * @param wrongName - stale\n * @param fileName - Path to read.\n * @returns - File contents.\n * @throws When reading fails.\n */\nfunction read(fileName: string) { return fs.readFileSync(fileName); }\n",
	);
	assert.equal(maintainSrcFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.match(src, /\* @param fileName - Path to read\./);
	assert.match(src, /\* @param wrongName - stale/);
	assert.match(src, /\* @return - File contents\./);
	assert.match(src, /\* @throws When reading fails\./);
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance preserves managed-looking sections in files without imports', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-sections-'));
	const file = join(root, 'main.ts');
	const src = `/** main.ts */
const VALUE = true;
`;
	writeFileSync(file, src);
	assert.equal(maintainSrcFile(root, file), true);
	assert.match(readFileSync(file, 'utf8'), /^\/\*\*\n \* main\.ts\n \*\//);
	assert.equal(maintainSrcFile(root, file), false);
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
	assert.equal(maintainSrcFile(root, file), true);
	const src = readFileSync(file, 'utf8');
	assert.equal(src.match(/\nHELPERS\n/g)?.length ?? 0, 0);
	assert.equal(src.match(/\nCOMPONENTS\n/g)?.length, 1);
	assert.doesNotMatch(src, /HELPERS\n\/{10,}\*\/\n\n\/\*\/{10,}\nCOMPONENTS/);
	assert.match(src, /nullableText = z\.string\(\)\.nullable\(\);\n\n\/\*\/{10,}/);
	assert.match(src, /\/{10,}\*\/\n\n(?:\/\/|\S)/);
	assert.match(src, /\/\/ MUTATION\n\tmutate\(now\);/);
	assert.match(src, /mutate\(now\);\n\n\t\/\/ VALIDATION\n\tvalidate\(now\);/);
	assert.doesNotMatch(src, /\/\/ (?:API|COMPONENTS|DATA|TYPES|MUTATION|VALIDATION)\n\n/);
	assert.equal(maintainSrcFile(root, file), false);
});
test('maintenance does not normalize section-shaped text inside templates', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-comment-layout-'));
	const file = join(root, 'main.ts');
	const literal = `before\n\n/*//////////////////////////////////////////////////\nHELPERS\n//////////////////////////////////////////////////*/\n\nafter`;
	writeFileSync(file, `import fs from 'node:fs';\nconst value = \`${literal}\`;\nvoid [fs, value];\n`);
	maintainSrcFile(root, file);
	assert.ok(readFileSync(file, 'utf8').includes(`\`${literal}\``));
});
test('format applies maintenance before Prettier and is idempotent', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-format-order-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, "import { readFileSync } from 'node:fs';\n\nconst value={active:true};\n");
	const prettier = fileURLToPath(new URL('../../../node_modules/.bin/prettier', import.meta.url));
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { prettier } });
	runQualityCli(cfg, ['format', '--all']);
	const first = readFileSync(file, 'utf8');
	assert.match(first, /\/\/ API\nimport/);
	assert.match(first, /CONFIG\n\/{10,}\*\/\n\nconst value/);
	runQualityCli(cfg, ['format', '--all']);
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
	const cfg = createQualityCfg({
		root,
		sourceRoots: [],
		extensions: ['.ts'],
		qualityCommands: [{ name: 'fixture', command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ok')`] }],
	});
	runQualityCli(cfg, ['domain', 'fixture', '--all']);
	assert.equal(readFileSync(marker, 'utf8'), 'ok');
});
test('alias fixer preserves generic aliases and generic references', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-alias-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	const src = `type ArrayOf<T> = Array<T>;\ntype Alias = ArrayOf<string>;\nconst value: ArrayOf<number> = [];\nvoid value;\n`;
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(aliasFindings(cfg, true), []);
	assert.equal(readFileSync(file, 'utf8'), src);
});
test('naming supports warning-only and automatic-fix modes', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'const organization = true;\nconst generatedPattern = /ok/;\nexport const result = [organization, generatedPattern];\n';
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all', '--warn']);
	assert.equal(readFileSync(file, 'utf8'), src);
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const org = true;\nconst genPattern = /ok/;\nexport const result = [org, genPattern];\n');
});
test('naming applies whole-word image aliases and prefix-only state aliases', () => {
	assert.equal(renameId('image'), 'img');
	assert.equal(renameId('Image'), 'Img');
	assert.equal(renameId('heroImage'), 'heroImg');
	assert.equal(renameId('images'), 'imgs');
	assert.equal(renameId('activeCard'), 'aCard');
	assert.equal(renameId('ActiveCard'), 'ACard');
	assert.equal(renameId('nextCard'), 'nCard');
	assert.equal(renameId('cleanCard'), 'cCard');
	assert.equal(renameId('safeCard'), 'sCard');
	assert.equal(renameId('generatedPattern'), 'genPattern');
	assert.equal(renameId('isActive'), 'isActive');
	assert.equal(renameId('isNext'), 'isNext');
	assert.equal(renameId('isClean'), 'isClean');
	assert.equal(renameId('isSafe'), 'isSafe');
});
test('naming safely fixes Astro frontmatter while preserving markup boundaries', () => {
	const root = mkdtempSync(join(tmpdir(), 'quality-naming-astro-'));
	mkdirSync(join(root, 'src'));
	writeFileSync(join(root, 'src', 'Page.astro'), '---\nconst error = new Error("x");\nconsole.log(error);\n---\n<Component error={error} />\n<p>{error.message}</p>\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.astro'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /const err = new Error/);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /console\.log\(err\)/);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /<Component error=\{error\} \/>/);
	assert.match(readFileSync(join(root, 'src', 'Page.astro'), 'utf8'), /<p>\{error\.message\}<\/p>/);
});
test('naming preserves shorthand property keys while renaming their values', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'function result(error: Error) { return { error }; }\nvoid result;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'function result(err: Error) { return { error: err }; }\nvoid result;\n');
});
test('naming preserves call punctuation when expanding a shorthand parameter', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-shorthand-param-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'function result({ request }: { request: Request }) { return handle(request, true); }\nvoid result;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'function result({ request: req }: { request: Request }) { return handle(req, true); }\nvoid result;\n');
});
test('naming shortens map callback parameters and all symbol references', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const output = input.map((node, index) => ({ node, index }));\nvoid output;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const output = input.map((n, i) => ({ node: n, index: i }));\nvoid output;\n');
	assert.deepEqual(namingFindings(cfg), []);
});
test('naming reduces arbitrary map callback parameters to free initials', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callback-initials-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const output = content.map((line) => (line ? ` * ${line}` : " *"));\nvoid output;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const output = content.map((l) => (l ? ` * ${l}` : " *"));\nvoid output;\n');
});
test('naming shortens TypeScript traversal callbacks with conflict checks', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'ts.forEachChild(file, (node) => { if (ts.isIdentifier(node)) output.push(node.text); });\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'ts.forEachChild(file, (n) => { if (ts.isIdentifier(n)) output.push(n.text); });\n');
});
test('naming chooses a free map callback alias when preferred names conflict', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const n = 1;\nconst v = 2;\nconst output = input.map((node) => node + n + v);\nvoid output;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const n = 1;\nconst v = 2;\nconst output = input.map((r) => r + n + v);\nvoid output;\n');
});
test('naming reuses concise aliases safely across independent map scopes', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const first = input.map((node) => node.id);\nconst second = input.flatMap((node) => node.children);\nvoid [first, second];\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const first = input.map((n) => n.id);\nconst second = input.flatMap((n) => n.children);\nvoid [first, second];\n');
});
test('naming preserves object keys but not positional syntax in destructured map parameters', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const first = input.map(({ node }) => node.id);\nconst second = pairs.map(([node, index]) => node[index]);\nvoid [first, second];\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const first = input.map(({ node: n }) => n.id);\nconst second = pairs.map(([n, i]) => n[i]);\nvoid [first, second];\n');
});
test('naming allocates distinct aliases across one destructured callback parameter', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callback-collisions-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'const output = pairs.map(([record, result]) => result(record));\nvoid output;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'const output = pairs.map(([r, v]) => v(r));\nvoid output;\n');
});
test('callback renames do not alter unrelated JSDoc parameters with the same name', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, '/** @param name */\nfunction retain(name: string) { return name; }\nconst output = input.map((name) => name.id);\nvoid [retain, output];\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), '/** @param name */\nfunction retain(name: string) { return name; }\nconst output = input.map((n) => n.id);\nvoid [retain, output];\n');
});
test('naming leaves node unchanged outside configured map callbacks', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-callbacks-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	const src = 'function visit(node: unknown) { return node; }\nvoid visit;\n';
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
});
test('naming fix mode leaves protected component paths unchanged', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-protected-path-'));
	mkdirSync(join(root, 'src', 'components', 'ui'), { recursive: true });
	const file = join(root, 'src', 'components', 'ui', 'chart.tsx');
	const src = 'const output = payload.map((item, index) => item[index]);\nvoid output;\n';
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	runQualityCli(cfg, ['naming', '--all']);
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
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(
		readFileSync(file, 'utf8'),
		`class ErrBoundary {}
const articleErr = new ErrBoundary();
const { error: err, repository: repo } = { error: articleErr, repository: 'shared' };
try { throw err; } catch (fmt) { console.log(fmt, repo); }
void [articleErr, ErrBoundary];
`,
	);
	assert.deepEqual(namingFindings(cfg), []);
});
test('naming preserves exported contracts and configurable protected identifiers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-naming-protected-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	const src = 'export class ErrorBoundary {}\nconst repository = new ErrorBoundary();\nvoid repository;\n';
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], protectedIdentifiers: ['repository'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
	assert.deepEqual(namingFindings(cfg), []);
});
test('naming updates JSDoc parameter tags with parameter declarations', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, '/** @param value - Input value. */\nfunction result(value: string) { return value; }\nvoid result;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), '/** @param val - Input value. */\nfunction result(val: string) { return val; }\nvoid result;\n');
});
test('naming preserves explicitly unused underscore parameters', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'const proxy = new Proxy({}, { get(_target, key) { return key; } });\nvoid proxy;\n';
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
	assert.deepEqual(namingFindings(cfg), []);
});
test('naming refuses file-level destination collisions', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'const target = 1;\nconst tgt = 2;\nvoid [target, tgt];\n';
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
});
test('naming avoids repository helper shadowing in initializers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-shadow-'));
	const file = join(root, 'main.ts');
	writeFileSync(file, 'function repository() { return { ok: true }; }\nfunction run() { const repo = repository(); return repo.ok; }\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.ts'], tools: { prettier: 'prettier' } });
	runQualityCli(cfg, ['naming', '--all']);
	const src = readFileSync(file, 'utf8');
	assert.match(src, /function repository\(\)/);
	assert.match(src, /const repo = repository\(\)/);
});
test('naming preserves parameter properties and their constructor references', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-parameter-property-'));
	const file = join(root, 'main.ts');
	writeFileSync(file, 'class RedirectError extends Error { constructor(readonly destination: string) { super(`Redirect to ${destination}`); } }\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.ts'], tools: { prettier: 'prettier' } });
	runQualityCli(cfg, ['naming', '--all']);
	const src = readFileSync(file, 'utf8');
	assert.match(src, /readonly destination: string/);
	assert.match(src, /\$\{destination\}/);
});
test('naming keeps distinct aliases for adjacent parameters', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-parameter-collisions-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, 'function run(config: object, command: string) { return [config, command]; }\nvoid run;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), 'function run(cfg: object, cmd: string) { return [cfg, cmd]; }\nvoid run;\n');
});
test('naming reuses aliases in sibling function scopes and updates their TSDoc', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-function-scopes-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.ts');
	writeFileSync(file, '/** @param config */\nexport function first(config: object) { return config; }\n/** @param config */\nexport function second(config: object) { return config; }\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), '/** @param cfg */\nexport function first(cfg: object) { return cfg; }\n/** @param cfg */\nexport function second(cfg: object) { return cfg; }\n');
});
test('naming ignores external types, JSX attributes, properties, and exported contracts', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(
		join(root, 'src', 'main.tsx'),
		"export type ResponseRecord = Record<string, string>;\nexport const response = { value: 'ok' };\nconst view = <input aria-current defaultValue={response.value} />;\nvoid view;\n",
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(namingFindings(cfg), []);
});
test('naming preserves intrinsic JSX tags when component symbols are unresolved', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-jsx-tags-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.tsx');
	const src = "import { ButtonLink } from './button';\nconst panel = () => <article><ButtonLink>Read</ButtonLink></article>;\nvoid panel;\n";
	writeFileSync(file, src);
	writeFileSync(join(root, 'src', 'button.tsx'), 'export const ButtonLink = () => null;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
});
test('naming ignores declarations exported through an export list', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	const file = join(root, 'src', 'main.ts');
	const src = 'function previous() {}\nexport { previous };\n';
	writeFileSync(file, src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(file, 'utf8'), src);
	assert.deepEqual(namingFindings(cfg), []);
});
