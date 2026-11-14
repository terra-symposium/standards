/**
 * packages/quality/test/checks/documentation.test.mjs
 * Exercises documentation policy reporting, human-authored description audits,
 * read-only compatibility APIs, and documented shell command checks.
 * Fixtures ensure missing prose remains an agent-authored diagnostic and that
 * mechanical import cleanup preserves comments.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
import { createQualityAnalysis, createQualityCfg, documentSrcFile, documentationFindings, documentedCommandFindings, duplicateImportFindings, fixDocumentedCommands, fixDuplicateImports, maintainSrcFile, removeNonCodeComments } from '../../dist/index.js';
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
	// terra-quality-ignore single-use -- Keep the reported findings list named while asserting its specific diagnostics.
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
	const findings = documentationFindings(
		createQualityCfg({ root, sourceRoots: ['src/c'], extensions: [], documentation: { cAuthors: { 'src/c/encryption': 'marceline', 'src/c/login': 'marceline' } } }),
	);
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
	// terra-quality-ignore single-use -- Keep the disabled-check configuration distinct from the enabled configuration asserted later.
	const disabled = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(documentedCommandFindings(disabled), []);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { commandRoots: ['docs'] } });
	assert.equal(fixDocumentedCommands(cfg), 1);
	assert.equal(fixtureText(root, 'docs/commands.md'), '```bash\r\npnpm --dir packages/app test\r\n```\r\n');
});
test('documented command autofix preserves mixed line endings', () => {
	const root = fixtureRoot('terra-quality-document-command-mixed-lines-');
	fixtureFile(root, 'docs/commands.md', '```sh\r\npnpm -C packages/app test\r\npnpm --prefix packages/docs build\n```\n');
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
	assert.deepEqual(
		documentationFindings(
			createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { types: true, functions: false, exportedFunctions: true, noInlineFunctions: true } } }),
		).map(f => [f.kind, f.name, f.severity]),
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
test('documentation policy relies on the owning algorithm for local helpers and callbacks', () => {
	const root = fixtureRoot('terra-quality-local-helper-docs-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Processes a value with one local calculation step.\n * @param value - Input value.\n * @returns Processed value.\n */
export function processValue(value: number): number {
	function calculate(): number { return value + 1; }
	const doubled = (item: number) => item * 2;
	return doubled(calculate());
}
`,
	);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(documentationFindings(cfg), []);
});
test('documentation policy skips the explicit generated regex-dedup registry marker', () => {
	const root = fixtureRoot('terra-quality-generated-regex-docs-');
	fixtureFile(root, 'src/shared/regex.mjs', '// Generated by @terra-symposium/standards-quality regex-dedup. Do not edit.\nexport const REGEX_WORD_REGEX = () => /word/;\n');
	fixtureFile(root, 'src/handwritten.mjs', 'export function handwritten() { return 1; }\n');
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.mjs'] });
	assert.deepEqual(
		documentationFindings(cfg).map(({ file, name }) => [file, name]),
		[['src/handwritten.mjs', 'handwritten']],
	);
});
test('local object methods need their own documentation despite a documented interface', () => {
	const root = fixtureRoot('terra-quality-object-contract-docs-');
	fixtureFile(
		root,
		'src/repository.ts',
		`/** Describes the repository contract used by callers. */
interface CourseRepository {
  /** Loads one course by its stable key.
   * @param key - Stable identifier for the requested course.
   * @returns The matching course record.
   */
  loadCourse(key: string): string;
}
const fakeRepository: CourseRepository = {
  loadCourse(key) { return key; },
};
void fakeRepository;
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		documentationFindings(cfg, createQualityAnalysis(cfg)).map(({ kind: findingKind, name }) => [findingKind, name]),
		[['function', 'loadCourse']],
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map(f => [f.kind, f.name, f.severity]),
		[
			['param', '@param initialConfigure', 'error'],
			['param', '@param allowed', 'error'],
			['return', '@return', 'error'],
		],
	);
});
test('documentation errors identify detached TSDoc without rewriting it', () => {
	const root = fixtureRoot('terra-quality-detached-tsdoc-');
	const original = `/** src/main.ts */
/** Describes a declaration that was removed. */
`;
	// terra-quality-ignore single-use -- Keep this source fixture path named so the test can identify the exact file under inspection.
	const file = fixtureFile(root, 'src/main.ts', original);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		documentationFindings(cfg).map(({ kind: k, name: n, severity: s }) => [k, n, s]),
		[['orphan', '<detached TSDoc>', 'error']],
	);
	assert.equal(removeNonCodeComments(file), false);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
});
test('documentation recognizes an inline JSDoc expression cast', () => {
	const root = fixtureRoot('terra-quality-inline-jsdoc-cast-');
	fixtureFile(root, 'src/main.mjs', '/** src/main.mjs */\nconst ids = values.map(value => /** @type {{ id: string }} */ (value).id);\n');
	assert.deepEqual(
		documentationFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.mjs'] })).filter(f => f.kind === 'orphan'),
		[],
	);
});
test('documentation recognizes standalone JSDoc typedef declarations and audits their summaries', () => {
	const root = fixtureRoot('terra-quality-jsdoc-typedef-');
	fixtureFile(
		root,
		'src/transcripts.mjs',
		`/** src/transcripts.mjs */
/** Metadata allowlist supported by one explicit transcript source mapping.
 * @typedef {Record<string, unknown> & {week?: number|string, recordingUrl?: string}} MappingRecord
 */
/** One expected transcript source used by the coverage report.
 * @typedef {{id: string, week: number|string, title?: string}} ExpectedMeeting
 */
/**
 * @typedef {{source: string, sha256: string, bytes: number}} MissingSummary
 */
`,
	);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.mjs'], documentation: { required: { types: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map(({ kind: findingKind, name }) => [findingKind, name]),
		[['summary', '<TSDoc summary>']],
	);
});
test('documentation errors identify an earlier TSDoc block left before a declaration', () => {
	const root = fixtureRoot('terra-quality-duplicate-tsdoc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** This description belongs to a removed declaration. */
/** Converts a title to its normalized form.
 * @param title Authored title text to normalize.
 * @return The normalized title.
 */
export function normalizeTitle(title: string): string { return title.trim(); }
`,
	);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map(({ kind: findingKind, name, severity }) => [findingKind, name, severity]),
		[['orphan', '<detached TSDoc>', 'error']],
	);
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map(f => [f.kind, f.name, f.reason]),
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
	const findings = documentationFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] }));
	assert.deepEqual(
		findings.map(f => [f.kind, f.name, f.reason]),
		[
			['summary', '<TSDoc summary>', 'add a meaningful description for this TSDoc block'],
			['param', '@param missing', 'add a meaningful description for @param missing'],
			['tag', '@deprecated', 'add a meaningful description for @deprecated'],
			['return', '@return', 'document the value returned by this function'],
		],
	);
	assert.ok(findings.every(f => f.severity === 'error'));
});
test('documentation diagnostics report empty parameter and return descriptions', () => {
	const root = fixtureRoot('terra-quality-empty-doc-tags-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Performs one check.\n * @param value\n * @return\n */
export function check(value: string): string { return value; }
`,
	);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(
		documentationFindings(cfg).map(({ kind: checkKind, name }) => [checkKind, name]),
		[
			['param', '@param value'],
			['return', '@return'],
		],
	);
});
test('documentation audits validate arrow-function tags and reject stale parameter names', () => {
	const root = fixtureRoot('terra-quality-arrow-function-tsdoc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Keeps the active route when the proposed path is its ancestor.
 * @param curr
 * @param n Proposed path selected by the user.
 * @param current Previous path before navigation.
 * @param next Path proposed by the navigation event.
 * @return
 */
export const keepDeepPath = (curr: string, n: string): string => n;
`,
	);
	assert.deepEqual(
		documentationFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } })).map(
			({ kind: findingKind, name, reason }) => [findingKind, name, reason],
		),
		[
			['param', '@param curr', 'add a meaningful description for @param curr'],
			['return', '@return', 'add a meaningful description for @return'],
			['param', '@param current', 'remove stale @param current'],
			['param', '@param next', 'remove stale @param next'],
		],
	);
});
test('documentation accepts tags for properties of an object parameter', () => {
	const root = fixtureRoot('terra-quality-nested-parameter-tsdoc-');
	fixtureFile(
		root,
		'src/main.ts',
		`/** Resolves a workspace using its configured project.
 * @param options Host configuration for the workspace.
 * @param options.project Project identifier used to resolve the workspace.
 * @return The resolved workspace path.
 */
export function resolveWorkspace(options: { project: string }): string { return options.project; }
`,
	);
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], documentation: { required: { exportedFunctions: true } } });
	assert.deepEqual(documentationFindings(cfg), []);
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
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.mjs'] });
	assert.deepEqual(
		documentationFindings(cfg).map(f => [f.kind, f.name]),
		[
			['summary', '<TSDoc summary>'],
			['param', '@param value'],
			['return', '@return'],
			['param', '@param input'],
			['param', '@param value'],
		],
	);
});
test('documentation audits recognize a BOM and shebang before a generated file header', () => {
	const root = fixtureRoot('terra-quality-documentation-header-');
	fixtureFile(root, 'src/script.ts', '\uFEFF#!/usr/bin/env node\n/**\n * src/script.ts\n * Runs the fixture as a script.\n */\nconst value = true;\nvoid value;\n');
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(documentationFindings(cfg), []);
});
test('documentSrcFile leaves missing documentation for an author to write', () => {
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
	// terra-quality-ignore single-use -- Capture the original fixture text before the tested transformation changes or compares it.
	const original = fixtureText(root, 'src/main.ts');
	assert.equal(documentSrcFile(cfg, file), false);
	const first = fixtureText(root, 'src/main.ts');
	assert.equal(first, original);
	assert.equal(documentSrcFile(cfg, file), false);
	assert.equal(fixtureText(root, 'src/main.ts'), first);
	assert.equal(documentSrcFile({ ...cfg, documentation: { required: { types: true } }, root }, fixtureFile(root, 'src/notes.json', '{"value": true}\n')), false);
	assert.equal(fixtureText(root, 'src/notes.json'), '{"value": true}\n');
	assert.equal(documentSrcFile(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] }), file), false);
});
test('legacy source maintenance preserves authored comments and section labels', () => {
	const root = fixtureRoot('terra-quality-documentation-maintenance-no-op-');
	const original = `/** Purpose belongs to the source author. */
/*//////////////////////////////////////////////////
CUSTOM SECTION
//////////////////////////////////////////////////*/
export const value = true;
`;
	// terra-quality-ignore single-use -- Keep this source fixture path named so the test can identify the exact file under inspection.
	const file = fixtureFile(root, 'src/main.ts', original);
	assert.equal(maintainSrcFile(root, file), false);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
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
	assert.equal(fixDuplicateImports([file]), 1);
	assert.equal(fixtureText(root, 'src/main.ts'), "import type { RecordData } from './types';\nexport type Result = RecordData;\n");
	assert.deepEqual(duplicateImportFindings([file]), []);
});
test('duplicate import autofix leaves declarations with attached comments unchanged', () => {
	const root = fixtureRoot('terra-quality-import-audit-comment-');
	const original =
		"import type { RecordData } from './types';\n// Keep this explanation beside the repeated declaration.\nimport type { RecordData } from './types';\nexport type Result = RecordData;\n";
	const file = fixtureFile(root, 'src/main.ts', original);
	assert.equal(fixDuplicateImports([file]), 0);
	assert.equal(fixtureText(root, 'src/main.ts'), original);
	assert.deepEqual(duplicateImportFindings([file]), [{ file, line: 3, module: './types' }]);
});
test('duplicate import audit and autofix inspect only Astro frontmatter', () => {
	const root = fixtureRoot('terra-quality-astro-import-audit-');
	// terra-quality-ignore single-use -- Capture the original fixture text before the tested transformation changes or compares it.
	const original = `---\nimport { pageForSlug } from '../lib/catalog.js';\nimport { pageForSlug } from '../lib/catalog.js';\nconst page = pageForSlug('');\n---\n<p>{page.title}</p>\n`;
	const file = fixtureFile(root, 'src/page.astro', original);
	assert.deepEqual(duplicateImportFindings([file]), [{ file, line: 3, module: '../lib/catalog.js' }]);
	assert.equal(fixDuplicateImports([file]), 1);
	assert.equal(fixtureText(root, 'src/page.astro'), `---\nimport { pageForSlug } from '../lib/catalog.js';\nconst page = pageForSlug('');\n---\n<p>{page.title}</p>\n`);
	assert.deepEqual(duplicateImportFindings([file]), []);
	assert.deepEqual(duplicateImportFindings([fixtureFile(root, 'src/malformed.astro', `---\nimport { pageForSlug } from '../lib/catalog.js';\n<p>frontmatter has no closing delimiter</p>\n`)]), []);
});
