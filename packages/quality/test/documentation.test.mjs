/**
 * packages/quality/test/documentation.test.mjs
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
import { createQualityCfg, documentSrcFile, documentationFindings, duplicateImportFindings, maintainSrcFile, protectLongImports, removeNonCodeComments } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

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
			['inline', '<anonymous>', 'error'],
			['inline', '<anonymous>', 'error'],
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

test('documentation findings warn for detached TSDoc and accept declaration and file-header comments', () => {
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
		documentationFindings(cfg).map(({ kind, name, severity }) => [kind, name, severity]),
		[['orphan', '<detached TSDoc>', 'warning']],
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
test('documentation findings recognize the props scaffold for destructured parameters', () => {
	const root = fixtureRoot('terra-quality-destructured-function-doc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Renders the selected label. */
export function renderLabel({ label }: { label: string }) { return label; }
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map((f) => [f.kind, f.name]),
		[
			['param', '@param props'],
			['return', '@return'],
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
		],
	);
	assert.ok(findings.every((f) => f.severity === 'warning'));
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
	assert.equal((first.match(/\/\*\*\n \*\n \*\//g) ?? []).length, 3);
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
