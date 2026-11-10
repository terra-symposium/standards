/**
 * packages/quality/test/checks/documentation.test.mjs
 * Exercises documentation policy reporting, human-authored description audits,
 * source maintenance, scaffold insertion, and Prettier import protection.
 * The fixtures distinguish structural automation from prose authorship: the
 * package may insert an empty scaffold, but it must never invent a description.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
import { createQualityCfg, documentSrcFile, documentationFindings, documentedCommandFindings, duplicateImportFindings, fixDocumentedCommands, maintainSrcFile, protectLongImports, removeNonCodeComments } from '../../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../../support/fixtures.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('C documentation checks static definitions and header declarations with ownership, pointer parameters, and locations', () => {
	const root = fixtureRoot('terra-quality-c-documentation-');
	fixtureFile(
		root,
		'src/c/compression/api.h',
		`/**
 * @brief Copies bytes into the output buffer.
 * @param input source bytes
 * @param output destination buffer
 * @param size number of bytes
 * @return number copied
 * @author kai
 */
size_t copy_bytes(const char *input, char *output, size_t size);
`,
	);
	fixtureFile(
		root,
		'src/c/compression/api.c',
		`#define FAKE_CALL(x) x(1)
/**
 * Copies bytes into the output buffer.
 * @param input source bytes
 * @param output destination buffer
 * @param size number of bytes
 * @return number copied
 * @author kai
 */
size_t copy_bytes(const char *input, char *output, size_t size) { return size; }
/** Clears the output buffer.
 * @author kai
 */
static void clear_buffer(void) { const char *text = "fake_call()"; (void)text; }
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src/c'], extensions: [], documentation: { cAuthors: { 'src/c': 'haadi', 'src/c/compression': 'kai' } } });
	assert.deepEqual(
		documentationFindings(cfg).map(({ name: n, file: f, line: l }) => [n, f, l]),
		[],
	);
});
test('C documentation treats matching header prototypes and source definitions as one documentation contract', () => {
	const root = fixtureRoot('terra-quality-c-documentation-dedup-');
	fixtureFile(root, 'src/c/module/api.h', 'int transform(int value);\n');
	fixtureFile(root, 'src/c/module/impl.c', 'int transform(int value) { return value; }\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src/c'], extensions: [] });
	const findings = documentationFindings(cfg).filter(({ kind: k, name: n }) => k === 'function' && n === 'transform');
	assert.equal(findings.length, 1);
	fixtureFile(root, 'src/c/other/api.h', `/** Transforms a value.\n * @param value input value\n * @return transformed value\n * @author haadi\n */\nint transform_value(int value);\n`);
	fixtureFile(root, 'src/c/other/impl.c', 'int transform_value(int value) { return value; }\n');
	assert.deepEqual(
		documentationFindings(cfg).filter(({ kind: k, name: n }) => k === 'function' && n === 'transform_value'),
		[],
	);
});
test('C documentation reports missing, stale, ordered, undescribed, return, summary, and author fields', () => {
	const root = fixtureRoot('terra-quality-c-documentation-errors-');
	fixtureFile(
		root,
		'src/c/encryption/crypto.c',
		`/**
 *
 * @param extra unused
 * @param output
 * @param input source
 * @author kai
 */
int transform(const char *input, char *output) { return 1; }
int undocumented(void);
/** Returns an empty result.
 * @return
 * @author marceline
 */
int empty_result(void);
`,
	);
	fixtureFile(root, 'src/c/login/session.c', `/** Starts a login session.\n * @author kai\n */\nvoid login_session(void);\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src/c'], extensions: [], documentation: { cAuthors: { 'src/c/encryption': 'marceline', 'src/c/login': 'marceline' } } });
	const findings = documentationFindings(cfg);
	assert.ok(findings.some(({ name: n, reason: r }) => n === '<summary>' && r.includes('summary')));
	assert.ok(findings.some(({ name: n, reason: r }) => n === '@param order' && r.includes('order')));
	assert.ok(findings.some(({ name: n, reason: r }) => n === '@param output' && r.includes('description')));
	assert.ok(findings.some(({ name: n, reason: r }) => n === '@param extra' && r.includes('stale')));
	assert.ok(findings.some(({ name: n }) => n === '@return'));
	assert.ok(findings.some(({ name: n }) => n === '@author marceline'));
	assert.ok(findings.some(({ file: f, name: n }) => f.endsWith('session.c') && n === '@author marceline'));
	assert.ok(findings.some(({ name: n, reason: r }) => n === '@return' && r.includes('description')));
	assert.ok(findings.some(({ file: f, line: l, name: n }) => f.endsWith('crypto.c') && l === 9 && n === 'undocumented'));
});
test('C documentation ignores comments, literals, macro bodies, controls, and pointer declarations', () => {
	const root = fixtureRoot('terra-quality-c-documentation-mask-');
	fixtureFile(
		root,
		'src/c/main.c',
		`#define HIDDEN() fake(1)
const char *text = "fake_call()";
/* fake_comment() */
void (*callback)(int value);
/** Runs the callback.
 * @param callback callback function
 * @param value callback argument
 * @author haadi
 */
void invoke(void (*callback)(int), int value) { if (value) callback(value); }
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src/c'], extensions: [], documentation: { cAuthors: { 'src/c': 'haadi' } } });
	assert.deepEqual(
		documentationFindings(cfg).map(({ name: n }) => n),
		[],
	);
});
test('documentation policy excludes generated and vendor source trees', () => {
	const root = fixtureRoot('terra-quality-documentation-pruned-');
	fixtureFile(root, 'src/main.ts', 'function documentedScope() { return true; }\n');
	fixtureFile(root, 'src/generated/generated.ts', 'function generatedHelper() { return true; }\n');
	fixtureFile(root, 'src/vendor/vendor.ts', 'function vendorHelper() { return true; }\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		documentationFindings(cfg).map(({ name: n }) => n),
		['documentedScope'],
	);
});
test('documented commands diagnose and fix only deprecated pnpm directory flags in configured shell fences', () => {
	const root = fixtureRoot('terra-quality-documented-commands-');
	fixtureFile(
		root,
		'docs/commands.md',
		[
			'Historical note: `pnpm -C old-tool test` is preserved as prose.',
			'```sh',
			'pnpm -C packages/app test',
			'  pnpm --prefix "packages/docs" build -- --watch',
			'npm --prefix packages/legacy test',
			'```',
			'```text',
			'pnpm -C examples test',
			'```',
		].join('\n'),
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { commandRoots: ['docs'] } });
	assert.deepEqual(
		documentedCommandFindings(cfg).map(({ line: l, command: c }) => [l, c]),
		[
			[3, 'pnpm -C packages/app test'],
			[4, 'pnpm --prefix "packages/docs" build -- --watch'],
		],
	);
	assert.equal(fixDocumentedCommands(cfg), 2);
	assert.equal(
		fixtureText(root, 'docs/commands.md'),
		[
			'Historical note: `pnpm -C old-tool test` is preserved as prose.',
			'```sh',
			'pnpm --dir packages/app test',
			'  pnpm --dir "packages/docs" build -- --watch',
			'npm --prefix packages/legacy test',
			'```',
			'```text',
			'pnpm -C examples test',
			'```',
		].join('\n'),
	);
	assert.equal(fixDocumentedCommands(cfg), 0, 'the transformation is idempotent');
	assert.deepEqual(documentedCommandFindings(cfg), []);
});
test('documented command check is disabled without explicit roots and preserves CRLF', () => {
	const root = fixtureRoot('terra-quality-document-command-disabled-');
	fixtureFile(root, 'docs/commands.md', '```bash\r\npnpm -C packages/app test\r\n```\r\n');
	const disabled = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(documentedCommandFindings(disabled), []);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { commandRoots: ['docs'] } });
	assert.equal(fixDocumentedCommands(cfg), 1);
	assert.equal(fixtureText(root, 'docs/commands.md'), '```bash\r\npnpm --dir packages/app test\r\n```\r\n');
});
test('documented command autofix preserves mixed line endings', () => {
	const root = fixtureRoot('terra-quality-document-command-mixed-lines-');
	fixtureFile(root, 'docs/commands.md', '```sh\r\npnpm -C packages/app test\r\npnpm --prefix packages/docs build\n```\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { commandRoots: ['docs'] } });
	assert.equal(fixDocumentedCommands(cfg), 2);
	assert.equal(fixtureText(root, 'docs/commands.md'), '```sh\r\npnpm --dir packages/app test\r\npnpm --dir packages/docs build\n```\n');
});
test('documentation policy independently reports types, exported functions, and inline functions', () => {
	const root = fixtureRoot('terra-quality-documentation-policy-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** src/main.ts */
type MissingAlias = string;
interface MissingContract { read(): string; }
class MissingClass {}
enum MissingStatus { Ready }
function privateHelper() { return true; }
export function publicHelper() { return true; }
const arrowHelper = () => true;
const expressionHelper = function () { return true; };
/**
 * Returns a value for callers.
 * @param value - Input value.
 * @returns The same value.
 */
function documented(value: string) { return value; }
void [privateHelper, publicHelper, arrowHelper, expressionHelper, documented];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { types: true, functions: false, exportedFunctions: true, noInlineFunctions: true } } });
	const findings = documentationFindings(cfg);
	assert.deepEqual(
		findings.map((f) => [f.kind, f.name, f.severity]),
		[
			['type', 'MissingAlias', 'error'],
			['type', 'MissingContract', 'error'],
			['type', 'MissingClass', 'error'],
			['type', 'MissingStatus', 'error'],
			['function', 'publicHelper', 'error'],
			['inline', 'arrowHelper', 'error'],
			['inline', 'expressionHelper', 'error'],
		],
	);
});
test('default function policy requires docs for private methods, constructors, and named function values but ignores callbacks', () => {
	const root = fixtureRoot('terra-quality-document-all-named-functions-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** src/main.ts */
class Box {
  /** Describes a value lookup. */
  private lookup(key: string): string { return key; }
  constructor(seed: string) { void seed; }
  close(): void {}
}
function helper(value: number): number { return value; }
const namedArrow = (flag: boolean) => flag;
[1].forEach((item) => void item);
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		documentationFindings(cfg).map(({ kind: k, name: n }) => [k, n]),
		[
			['param', '@param key'],
			['return', '@return'],
			['function', 'constructor'],
			['function', 'close'],
			['function', 'helper'],
			['function', 'namedArrow'],
		],
	);
});
test('description audits respect the configured function and exported-function documentation scope', () => {
	const root = fixtureRoot('terra-quality-documentation-description-scope-');
	fixtureFile(
		root,
		'src/main.ts',
		`/**
 * @param value
 */
function privateHelper(value: string) { return value; }
/**
 * @param value
 */
export function publicHelper(value: string) { return value; }
void [privateHelper, publicHelper];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { types: true, functions: false, exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map(({ kind: k, name: n }) => [k, n]),
		[
			['summary', '<TSDoc summary>'],
			['param', '@param value'],
			['return', '@return'],
		],
	);
});
test('documentation findings detect missing tags on one-line TSDoc attached to an exported function', () => {
	const root = fixtureRoot('terra-quality-one-line-function-doc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Keeps Dialog state local while accepting legacy dashboard URLs as one-time open requests. */
export function useDashboardConfigurationDialog(initialConfigure: string | undefined, allowed: readonly string[]) {
	return { configure: initialConfigure, allowed };
}
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map((f) => [f.kind, f.name, f.severity]),
		[
			['param', '@param initialConfigure', 'error'],
			['param', '@param allowed', 'error'],
			['return', '@return', 'error'],
		],
	);
});
test('documentation errors identify detached TSDoc and accept declaration and file-header comments', () => {
	const root = fixtureRoot('terra-quality-detached-tsdoc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** src/main.ts */
/** Describes a declaration that was removed. */
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		documentationFindings(cfg).map(({ kind: k, name: n, severity: s }) => [k, n, s]),
		[['orphan', '<detached TSDoc>', 'error']],
	);
	assert.equal(removeNonCodeComments(`${root}/src/main.ts`), true);
	assert.doesNotMatch(fixtureText(root, 'src/main.ts'), /Describes a declaration that was removed/);
});
test('documentation description audit accepts TSDoc attached to a type member', () => {
	const root = fixtureRoot('terra-quality-property-tsdoc-');
	fixtureFile(
		root,
		'src/main.ts',
		`type CompatibilityInput = {
	/** Keeps legacy action policy out of the canonical builder during migration. */
	proposedActions?: never[];
};
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(documentationFindings(cfg), []);
});
test('documentation findings reject props aggregates and require individual destructured parameter tags', () => {
	const root = fixtureRoot('terra-quality-destructured-function-doc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/**
 * Renders the selected label.
 * @param props - The aggregate display options.
 */
export function renderLabel({ label }: { label: string }) { return label; }
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map((f) => [f.kind, f.name, f.reason]),
		[
			['param', '@param props', 'replace the aggregate props tag with an individual @param tag for each binding'],
			['param', '@param label', 'document the label parameter'],
			['return', '@return', 'document the value returned by this function'],
		],
	);
});
test('documentation description audits report missing prose while accepting documented tags and optional tags', () => {
	const root = fixtureRoot('terra-quality-documentation-descriptions-');
	fixtureFile(
		root,
		'src/main.ts',
		`/**
 * src/main.ts
 * This file has a meaningful purpose.
 */
/**
 * Reads one value from the source.
 * @param {string} [value=default] - The value to read.
 * @typeParam T The value type.
 * @returns The selected value.
 * @internal
 */
function read<T>(value: string): string { return value; }
/**
 * @param missing
 * @deprecated
 */
function incomplete(missing: string): string { return missing; }
const commentText = '/** @param fake */';
void [read, incomplete, commentText];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = documentationFindings(cfg);
	assert.deepEqual(
		findings.map((f) => [f.kind, f.name, f.reason]),
		[
			['summary', '<TSDoc summary>', 'add a meaningful description for this TSDoc block'],
			['param', '@param missing', 'add a meaningful description for @param missing'],
			['tag', '@deprecated', 'add a meaningful description for @deprecated'],
			['return', '@return', 'document the value returned by this function'],
		],
	);
	assert.ok(findings.every((f) => f.severity === 'error'));
});
test('documentation description audit continues after nested template expressions and ignores comment-shaped string content', () => {
	const root = fixtureRoot('terra-quality-documentation-after-template-');
	fixtureFile(
		root,
		'src/main.mjs',
		[
			"const selectedGroup = 'suite';",
			"const value = `before ${selectedGroup.replace(/[.*]/g, '\\\\$&')} after`;",
			"const nested = `outer ${selectedGroup ? `inner ${selectedGroup}` : 'none'}`;",
			"const example = '/** @param hidden */';",
			'void [value, nested, example];',
			'/**',
			' *',
			' * @param value',
			' *',
			' * @return',
			' */',
			'function read(input) { return `${value}${input}`; }',
		].join('\n'),
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.mjs'] });
	assert.deepEqual(
		documentationFindings(cfg).map((f) => [f.kind, f.name]),
		[
			['summary', '<TSDoc summary>'],
			['param', '@param value'],
			['return', '@return'],
			['param', '@param input'],
		],
	);
});
test('documentation audits recognize a BOM and shebang before a generated file header', () => {
	const root = fixtureRoot('terra-quality-documentation-header-');
	fixtureFile(root, 'src/script.ts', '\uFEFF#!/usr/bin/env node\n/**\n * src/script.ts\n * Runs the fixture as a script.\n */\nconst value = true;\nvoid value;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(documentationFindings(cfg), []);
});
test('documentSrcFile inserts empty scaffolds only for missing required declarations and is idempotent', () => {
	const root = fixtureRoot('terra-quality-document-scaffold-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`/** Existing description. */
type Existing = string;
type Missing = number;
/** Existing helper. */
function existing() { return true; }
function missing() { return false; }
export function publicMissing() { return true; }
const inline = () => true;
void [existing, missing, publicMissing, inline];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { types: true, functions: true, exportedFunctions: true, noInlineFunctions: true } } });
	assert.equal(documentSrcFile(cfg, file), true);
	const first = fixtureText(root, 'src/main.ts');
	assert.equal((first.match(/\/\*\*\n \*\n \*\//g) ?? []).length, 4);
	assert.equal(first.includes('Existing description.'), true);
	assert.equal(first.includes('function missing'), true);
	assert.equal(first.includes('export function publicMissing'), true);
	assert.equal(documentSrcFile(cfg, file), false);
	assert.equal(fixtureText(root, 'src/main.ts'), first);
	const unsupported = fixtureFile(root, 'src/notes.json', '{"value": true}\n');
	assert.equal(documentSrcFile({ ...cfg, documentation: { required: { types: true } }, root }, unsupported), false);
	assert.equal(fixtureText(root, 'src/notes.json'), '{"value": true}\n');
	assert.equal(documentSrcFile(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] }), file), false);
});
test('maintainSrcFile leaves unsupported files untouched and protectLongImports is selective and idempotent', () => {
	const root = fixtureRoot('terra-quality-document-maintenance-');
	const unsupported = fixtureFile(root, 'README.md', 'plain text\n');
	assert.equal(maintainSrcFile(root, unsupported), false);
	assert.equal(fixtureText(root, 'README.md'), 'plain text\n');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`// prettier-ignore
import { ${'LongName, '.repeat(20)} result } from 'ignored';
import { ${'LongName, '.repeat(20)} result } from 'protected';
import { short } from 'short';
`,
	);
	assert.equal(protectLongImports(file, 80), true);
	const protectedSrc = fixtureText(root, 'src/main.ts');
	assert.equal((protectedSrc.match(/prettier-ignore/g) ?? []).length, 2);
	assert.equal(protectLongImports(file, 80), false);
	assert.equal(fixtureText(root, 'src/main.ts'), protectedSrc);
});
test('maintainSrcFile keeps the path and human description in one valid header block', () => {
	const root = fixtureRoot('terra-quality-document-header-description-');
	const file = fixtureFile(root, 'src/main.ts', `/**\n * src/main.ts\n * Reads the configured value for the calling workflow.\n */\nconst value = true;\nvoid value;\n`);
	assert.equal(maintainSrcFile(root, file), true);
	assert.equal(fixtureText(root, 'src/main.ts'), `/**\n * src/main.ts\n * Reads the configured value for the calling workflow.\n */\n\nconst value = true;\nvoid value;\n`);
});
test('maintainSrcFile prefixes a prose-only leading header with the canonical path', () => {
	const root = fixtureRoot('terra-quality-document-header-prose-only-');
	const file = fixtureFile(root, 'src/main.ts', `/** Dashboard surface loaders and primary intelligence refresh workflows. */\nconst value = true;\nvoid value;\n`);
	assert.equal(maintainSrcFile(root, file), true);
	assert.equal(fixtureText(root, 'src/main.ts'), `/**\n * src/main.ts\n * Dashboard surface loaders and primary intelligence refresh workflows.\n */\n\nconst value = true;\nvoid value;\n`);
});
test('final comment cleanup removes detached TSDoc and generated grouping comments only', () => {
	const root = fixtureRoot('terra-quality-non-code-comments-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`/** src/main.ts */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
/${'** */'}
import { readFileSync } from 'node:fs';
/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/
/** Reads the configured file from disk. */
export function readConfig(path: string): string {
	return readFileSync(path, 'utf8');
}
// preserves the caller's original destination
const destination = '/home';
void [readConfig, destination];
// EMPTY GROUP
`,
	);
	assert.equal(removeNonCodeComments(file), true);
	const c = fixtureText(root, 'src/main.ts');
	assert.match(c, /IMPORTS|CONFIG|\/\/ API/);
	assert.doesNotMatch(c, /\/\*\* \*\/|EMPTY GROUP/);
	assert.match(c, /Reads the configured file from disk/);
	assert.match(c, /preserves the caller's original destination/);
});
test('maintenance preserves custom populated sections and cleanup removes only empty headings', () => {
	const root = fixtureRoot('terra-quality-custom-sections-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`/** src/main.ts */
import { readFileSync } from 'node:fs';
/*//////////////////////////////////////////////////
REGRESSIONS CONTRACTS
//////////////////////////////////////////////////*/
// TESTS
export const contract = readFileSync('fixture', 'utf8');
// EMPTY GROUP
`,
	);
	maintainSrcFile(root, file);
	assert.match(fixtureText(root, 'src/main.ts'), /REGRESSIONS CONTRACTS/);
	assert.equal(removeNonCodeComments(file), true);
	const result = fixtureText(root, 'src/main.ts');
	assert.match(result, /REGRESSIONS CONTRACTS|\/\/ TESTS/);
	assert.doesNotMatch(result, /EMPTY GROUP/);
});
test('maintainSrcFile deduplicates repeated type imports across maintenance runs', () => {
	const root = fixtureRoot('terra-quality-import-deduplication-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`import { createAdminClient } from '@/lib/auth.server';
import type { createAdminClient } from '../../lib/auth.server';
import type { createAdminClient } from '../../lib/auth.server';
import type { createAdminClient } from '../../lib/auth.server';
const admin = createAdminClient();
void admin;
`,
	);
	assert.equal(maintainSrcFile(root, file), true);
	const first = fixtureText(root, 'src/main.ts');
	assert.equal((first.match(/import type \{ createAdminClient \}/g) ?? []).length, 1);
	assert.equal(maintainSrcFile(root, file), false);
	assert.equal(fixtureText(root, 'src/main.ts'), first);
});
test('duplicate import audit reports repeated type bindings with their later source location', () => {
	const root = fixtureRoot('terra-quality-import-audit-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`import type { RecordData } from './types';
import type { RecordData } from './types';
export type Result = RecordData;
`,
	);
	assert.deepEqual(duplicateImportFindings([file]), [{ file, line: 2, module: './types' }]);
});
test('maintainSrcFile heals orphaned duplicate header fragments and merges adjacent descriptions', () => {
	const root = fixtureRoot('terra-quality-document-header-healing-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`/**\n * src/main.ts\n */\n\n* src/main.ts\n*/\n/** Meaningful coverage description. */\n\n/**\n * Explains the current architecture under test.\n */\n\nconst value = true;\nvoid value;\n`,
	);
	assert.equal(maintainSrcFile(root, file), true);
	assert.equal(
		fixtureText(root, 'src/main.ts'),
		`/**\n * src/main.ts\n * Meaningful coverage description.\n * Explains the current architecture under test.\n */\n\nconst value = true;\nvoid value;\n`,
	);
	assert.equal(maintainSrcFile(root, file), false);
});
