/**
 * packages/quality/test/transforms/naming.test.mjs
 * Verifies the public naming and alias-analysis APIs independently from the
 * CLI dispatcher, including tokenisation, scope safety, callback initials,
 * protected framework names, and alias replacement semantics.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
// prettier-ignore
import { aliasFindings, callbackAlias, createQualityAnalysis, createQualityCfg, declarationScope, fixNaming, hasPrefixReplacement, identifierTokens, isApprovedId, isCallbackDeclaration, isProtectedFilename, isProtectedPath, isRenamableDeclaration, namingFindings, renameDeclaration, renameId } from '../../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../../support/fixtures.mjs';

// DATA
import { CALLBACK_ALIASES, IDENTIFIER_REPLACEMENTS, PREFIX_REPLACEMENTS, PROTECTED_IDENTIFIERS } from '../../dist/index.js';

test('naming checks ignore archived Markdown prose while keeping Markdown in the quality scope', () => {
	const root = fixtureRoot('terra-quality-naming-markdown-');
	const original = '# Repository\n\nThe organization publishes documentation for every contributor.\n';
	fixtureFile(root, 'docs/guide.md', original);
	assert.deepEqual(namingFindings(createQualityCfg({ root, sourceRoots: ['.'], extensions: ['.md'] })), []);
	assert.equal(fixtureText(root, 'docs/guide.md'), original);
});

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Returns every identifier in a small in-memory TypeScript source file.
 *
 * @param src Source text to parse.
 *
 * @return Parsed source file and identifier nodes in traversal order.
 */
function identifiers(src) {
	const file = ts.createSourceFile('fixture.ts', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const nodes = [];
	/**
	 *
	 * @param node
	 */
	const visit = (node) => {
		if (ts.isIdentifier(node)) nodes.push(node);
		ts.forEachChild(node, visit);
	};
	visit(file);
	return { file, nodes };
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('naming maps are immutable and identifier tokenisation preserves separators, acronyms, and numbers', () => {
	assert.equal(Object.isFrozen(IDENTIFIER_REPLACEMENTS), true);
	assert.equal(Object.isFrozen(PREFIX_REPLACEMENTS), true);
	assert.equal(Object.isFrozen(CALLBACK_ALIASES), true);
	assert.deepEqual(identifierTokens('HTTPServer2URL'), ['HTTP', 'Server', '2', 'URL']);
	assert.deepEqual(identifierTokens('article_error-2_value'), ['article', 'error', '2', 'value']);
	assert.deepEqual(identifierTokens(''), []);
});
test('callback aliases retain descriptive names and use only the conventional numeric index', () => {
	assert.equal(callbackAlias('member'), 'member');
	assert.equal(callbackAlias('unknownValue'), 'unknownValue');
	assert.equal(callbackAlias('field'), 'field');
	assert.equal(callbackAlias('label'), 'label');
	assert.equal(callbackAlias('customer', ['c']), 'customer');
	assert.equal(callbackAlias('index'), 'i');
	assert.equal(callbackAlias('index', ['i']), 'index');
	assert.equal(callbackAlias('_unused'), '_unused');
	assert.equal(renameId('index', { numericIndex: true }), 'i');
	assert.equal(renameId('node', { callback: true }), 'node');
	assert.equal(renameId('node', { callback: true, reserved: ['n'] }), 'node');
	assert.equal(renameId('Request'), 'Request');
	assert.equal(renameId('_'), '_');
});
test('renameId shortens established terms without abbreviating domain words or touching substrings', () => {
	const cases = {
		category: 'category',
		customerCategory: 'customerCategory',
		intelligence: 'intel',
		image: 'img',
		imagePath: 'imgPath',
		images: 'imgs',
		customerIntelligence: 'customerIntel',
		categories: 'categories',
		intelligences: 'intels',
		commitment: 'commitment',
		terror: 'terror',
		isActive: 'isActive',
		normalizedResponse: 'normResponse',
	};
	for (const [name, expected] of Object.entries(cases)) assert.equal(renameId(name), expected, name);
	assert.equal(renameId('activeCard'), 'activeCard');
	assert.equal(renameId('nextCard'), 'nextCard');
	assert.equal(renameId('cleanCard'), 'cleanCard');
	assert.equal(renameId('safeCard'), 'safeCard');
	assert.equal(hasPrefixReplacement('activeCard'), false);
	assert.equal(hasPrefixReplacement('normalisedValue'), true);
	assert.equal(hasPrefixReplacement('customerCategory'), false);
	assert.equal(isApprovedId('org'), true);
	assert.equal(isApprovedId('organization'), false);
});
test('protected path and filename predicates handle generated folders, declaration files, route conventions, and Windows separators', () => {
	assert.equal(isProtectedPath('/repo/node_modules/pkg.ts'), true);
	assert.equal(isProtectedPath('C:\\repo\\src\\components\\ui\\button.tsx'), true);
	assert.equal(isProtectedPath('/repo/src/components/ui'), true);
	assert.equal(isProtectedPath('/repo/types/global.d.ts'), true);
	assert.equal(isProtectedPath('/repo/src/lib/main.ts'), false);
	assert.equal(isProtectedFilename('/repo/app/page.tsx'), true);
	assert.equal(isProtectedFilename('C:\\repo\\route.ts'), true);
	assert.equal(isProtectedFilename('/repo/page.tsx.bak'), false);
	assert.ok(PROTECTED_IDENTIFIERS.has('Request'));
});
test('generated headers stay in source scope but do not receive source naming rewrites', () => {
	const root = fixtureRoot('terra-quality-generated-source-');
	const source = '/**\n * This file has been generated by Sanity TypeGen.\n * Do not edit this file directly.\n */\nconst organization = 1;\nvoid organization;\n';
	const file = fixtureFile(root, 'src/sanity.types.ts', source);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.ok(namingFindings(cfg).some(({ file: path, name }) => path.endsWith('sanity.types.ts') && name === 'organization'));
	assert.equal(fixNaming(cfg), 0);
	assert.equal(fixtureText(root, 'src/sanity.types.ts'), source);
	assert.equal(file.endsWith('sanity.types.ts'), true);
});
test('declaration predicates distinguish repository-owned declarations, public contracts, parameter properties, and owning scopes', () => {
	const { file, nodes } = identifiers(`
const localValue = 1;
export const publicValue = 2;
function localFunction(parameter: string) { return parameter; }
export function publicFunction(parameter: string) { return parameter; }
class LocalClass {}
export class PublicClass {}
interface LocalContract {}
export interface PublicContract {}
type LocalType = string;
export type PublicType = string;
const expression = function namedExpression() { return true; };
class WithProperty { constructor(readonly destination: string) {} }
`);
	const declaration = (name) => nodes.find((n) => n.text === name && n.parent.name === n);
	for (const name of ['localValue', 'localFunction', 'LocalClass', 'LocalContract', 'LocalType', 'namedExpression']) assert.equal(isRenamableDeclaration(declaration(name)), true, name);
	for (const name of ['publicValue', 'publicFunction', 'PublicClass', 'PublicContract', 'PublicType']) assert.equal(isRenamableDeclaration(declaration(name)), false, name);
	const param = declaration('parameter');
	assert.equal(isRenamableDeclaration(param), true);
	assert.equal(isRenamableDeclaration(declaration('destination')), false);
	assert.equal(declarationScope(param).kind, ts.SyntaxKind.FunctionDeclaration);
	assert.equal(declarationScope(declaration('localValue')), file);
	assert.equal(renameDeclaration(param), 'parameter');
});
test('callback declaration APIs classify inline helper, collection, and event-handler callbacks', () => {
	const file = ts.createSourceFile(
		'fixture.tsx',
		`
const mapped = values.map((customer, index) => customer.id + index);
const rendered = problemRendererPair('hint', (block) => <_ProblemHint block={block} />);
const ordinary = (customer) => customer.id;
function handle(customer: string) { return customer; }
const view = <button onClick={(event) => handle(event.type)}>Open</button>;
const column = { render: (member) => member.signature };
void [mapped, rendered, ordinary, handle, view, column];
	`,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const callbacks = [];
	/**
	 *
	 * @param node
	 */
	const visit = (node) => {
		if (ts.isIdentifier(node) && ['block', 'customer', 'index', 'event', 'member'].includes(node.text) && ts.isParameter(node.parent)) callbacks.push(node);
		ts.forEachChild(node, visit);
	};
	visit(file);
	assert.equal(callbacks.length, 7);
	const supported = callbacks.filter((n) => isCallbackDeclaration(n));
	assert.equal(supported.length, 6);
	assert.equal(renameDeclaration(supported[0]), 'customer');
	assert.equal(renameDeclaration(supported[1]), 'i');
	assert.equal(renameDeclaration(supported[2]), 'block');
	assert.equal(renameDeclaration(supported[3]), 'customer');
	assert.equal(renameDeclaration(supported[4]), 'event');
	assert.equal(renameDeclaration(supported[5]), 'member');
});
test('naming keeps descriptive callback names assigned to object properties', () => {
	const root = fixtureRoot('terra-quality-object-callback-');
	fixtureFile(root, 'src/main.ts', 'const spec = { render: (member) => member.signature };\nvoid spec;\n');
	assert.deepEqual(namingFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] })), []);
});
test('collection callback names retain domain words and shorten only numeric indexes', () => {
	const root = fixtureRoot('terra-quality-callback-initials-');
	fixtureFile(
		root,
		'src/main.ts',
		`const mapped = members.map((member, index) => member.id + index);
const collided = values.map((member, metadata, m) => member + metadata + m);
void [mapped, collided];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		namingFindings(cfg).map(({ name: n, suggestion: s }) => [n, s]),
		[['index', 'i']],
	);
	const params = [];
	const visit = (node) => {
		if (ts.isIdentifier(node) && ['member', 'index'].includes(node.text) && ts.isParameter(node.parent)) params.push(node);
		ts.forEachChild(node, visit);
	};
	visit(ts.createSourceFile('fixture.ts', 'values.map((member, index) => member + index)', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
	assert.deepEqual(params.map(renameDeclaration), ['member', 'i']);
});
test('alias analysis keeps only stable local identifier and type aliases', () => {
	const root = fixtureRoot('terra-quality-alias-api-');
	fixtureFile(
		root,
		'src/main.ts',
		`const base = { value: true };
const localAlias = base;
const propertyAlias = base.value;
const elementAlias = base['value'];
const optionalAlias = base?.value;
let mutableAlias = base;
const first = base, second = base;
export const publicAlias = base;
interface Contract { value: boolean; }
type LocalAlias = Contract;
type InternalAlias = Contract;
export type PublicTypeAlias = Contract;
type GenericAlias<T> = Contract;
const typedValue: InternalAlias = { value: true };
void [localAlias, propertyAlias, elementAlias, optionalAlias, mutableAlias, first, second, publicAlias];
void typedValue;
`,
	);
	fixtureFile(root, 'src/consumer.ts', `import type { LocalAlias } from './main';\nconst value: LocalAlias = { value: true };\nvoid value;\n`);
	assert.deepEqual(
		aliasFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] })).map((f) => [f.kind, f.name, f.replacement]),
		[
			['const', 'localAlias', 'base'],
			['type', 'InternalAlias', 'Contract'],
		],
	);
});
test('alias autofix replaces references and shorthand properties, supports the shared analysis overload, and is idempotent', () => {
	const root = fixtureRoot('terra-quality-alias-fix-');
	const file = fixtureFile(
		root,
		'src/main.ts',
		`const base = { value: true };
const alias = base;
	let value = alias.value;
const shorthand = { alias };
	let indexed = alias['value'];
void [value, shorthand, indexed];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		aliasFindings(cfg, createQualityAnalysis(cfg), true).map((f) => f.name),
		['alias'],
	);
	const updated = fixtureText(root, 'src/main.ts');
	assert.equal(updated.includes('const alias = base;'), false);
	assert.match(updated, /let value = base\.value;/);
	assert.match(updated, /const shorthand = \{ alias: base \};/);
	assert.match(updated, /let indexed = base\['value'\];/);
	assert.deepEqual(aliasFindings(cfg), []);
	assert.equal(file.endsWith('src/main.ts'), true);
});
test('alias analysis preserves property snapshots and mutable roots', () => {
	const root = fixtureRoot('terra-quality-alias-snapshots-');
	fixtureFile(
		root,
		'src/main.ts',
		`const state = { value: 1 };
const propertySnapshot = state.value;
const elementSnapshot = state['value'];
let current = state;
const mutableRootSnapshot = current;
state.value = 2;
current = { value: 3 };
export const result = [propertySnapshot, elementSnapshot, mutableRootSnapshot, state.value, current.value];
`,
	);
	assert.deepEqual(aliasFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] }), true), []);
	assert.match(fixtureText(root, 'src/main.ts'), /const propertySnapshot = state\.value;/);
	assert.match(fixtureText(root, 'src/main.ts'), /const elementSnapshot = state\['value'\];/);
	assert.match(fixtureText(root, 'src/main.ts'), /const mutableRootSnapshot = current;/);
});
test('alias autofix skips bindings shadowed at any replacement reference', () => {
	const root = fixtureRoot('terra-quality-alias-shadow-');
	fixtureFile(
		root,
		'src/main.ts',
		`const base = { source: 'outer' };
const alias = base;
function read(base: { source: string }) {
  return alias.source + base.source;
}
void read;
`,
	);
	assert.deepEqual(aliasFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] }), true), []);
	assert.match(fixtureText(root, 'src/main.ts'), /const alias = base;/);
	assert.match(fixtureText(root, 'src/main.ts'), /return alias\.source \+ base\.source;/);
});
test('alias analysis preserves transitive value chains and still removes independent aliases', () => {
	const root = fixtureRoot('terra-quality-alias-chain-');
	fixtureFile(
		root,
		'src/main.ts',
		`const base = 7;
const first = base;
const second = first;
const third = second;
const independentBase = 11;
const independent = independentBase;
export const result = [third, independent];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(
		aliasFindings(cfg).map((f) => [f.name, f.replacement]),
		[['independent', 'independentBase']],
	);
	aliasFindings(cfg, true);
	assert.match(fixtureText(root, 'src/main.ts'), /const first = base;\nconst second = first;\nconst third = second;/);
	assert.doesNotMatch(fixtureText(root, 'src/main.ts'), /const independent =/);
	assert.deepEqual(aliasFindings(cfg), []);
});
test('alias analysis preserves chains whose target is shadowed, including type aliases', () => {
	const root = fixtureRoot('terra-quality-alias-shadow-chain-');
	fixtureFile(
		root,
		'src/main.ts',
		`const base = 7;
const first = base;
const second = first;
function read(base: number, first: number) { return { second }; }
type Base = { value: number };
type First = Base;
type Second = First;
type IsolatedBase = { value: number };
type Isolated = IsolatedBase;
function readIsolated<IsolatedBase>(value: Isolated): number { return value.value; }
export const result = [read(2, 3).second, readIsolated<string>({ value: 7 })];
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.deepEqual(aliasFindings(cfg), []);
	assert.deepEqual(aliasFindings(cfg, true), []);
	assert.match(fixtureText(root, 'src/main.ts'), /const first = base;\nconst second = first;/);
	assert.match(fixtureText(root, 'src/main.ts'), /type First = Base;\ntype Second = First;/);
});
test('naming findings use shared analysis, report severity by replacement kind, and preserve protected declarations', () => {
	const root = fixtureRoot('terra-quality-naming-');
	fixtureFile(root, 'src/main.ts', 'const category = true;\nconst activeValue = false;\nconst request = true;\nvoid [category, activeValue, request];\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], protectedIdentifiers: ['request'] });
	assert.deepEqual(
		namingFindings(cfg, createQualityAnalysis(cfg)).map((f) => [f.name, f.suggestion, f.severity]),
		[],
	);
});
test('safe naming fixes preserve serialized discriminator values and object keys', () => {
	const root = fixtureRoot('terra-quality-serialized-naming-');
	const original = `const compareBrightness = (normalizesApiPitchers) => ({
	type: "terraBlock",
	terraBlock: "terraBlock",
	compareBrightness: normalizesApiPitchers,
	label: "compareBrightness normalizesApiPitchers",
});
// compareBrightness normalizesApiPitchers
void compareBrightness;
`;
	fixtureFile(root, 'src/main.ts', original);
	assert.equal(fixNaming(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] })), 1);
	assert.equal(
		fixtureText(root, 'src/main.ts'),
		`const compBrightness = (normApiPitchers) => ({
	type: "terraBlock",
	terraBlock: "terraBlock",
	compareBrightness: normApiPitchers,
	label: "compareBrightness normalizesApiPitchers",
});
// compareBrightness normalizesApiPitchers
void compBrightness;
`,
	);
});
test('safe naming fixes preserve authored TSDoc while renaming code identifiers', () => {
	const root = fixtureRoot('terra-quality-naming-tsdoc-');
	const documentation = `/**
 * Describes the normalized pitcher selection.
 * @param normalizesApiPitchers Pitcher data used to build the selection.
 * @returns The selected pitcher value.
 */`;
	const original = `${documentation}\nconst compareBrightness = (normalizesApiPitchers) => normalizesApiPitchers;\nvoid compareBrightness;\n`;
	fixtureFile(root, 'src/main.ts', original);
	assert.equal(fixNaming(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] })), 1);
	const updated = fixtureText(root, 'src/main.ts');
	assert.ok(updated.startsWith(`${documentation}\n`));
	assert.equal(updated.slice(0, updated.indexOf('\nconst ')), documentation);
	assert.match(updated, /const compBrightness = \(normApiPitchers\) => normApiPitchers;/u);
	assert.ok(updated.endsWith('void compBrightness;\n'));
});
test('safe naming fixes rename only Astro frontmatter callbacks and preserve template bindings', () => {
	const root = fixtureRoot('terra-quality-naming-astro-callbacks-');
	const original = `---\nconst page = 'outside';\nconst groups = [{ slug: 'overview' }];\nconst entries = groups.filter((organization) => organization.slug).map((organization) => ({ slug: organization.slug }));\n---\n<p>{page}</p>\n`;
	fixtureFile(root, 'src/index.astro', original);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.astro'] });
	assert.deepEqual(
		namingFindings(cfg).map(({ name, suggestion }) => [name, suggestion]),
		[
			['organization', 'org'],
			['organization', 'org'],
		],
	);
	assert.equal(fixNaming(cfg), 1);
	assert.equal(
		fixtureText(root, 'src/index.astro'),
		`---\nconst page = 'outside';\nconst groups = [{ slug: 'overview' }];\nconst entries = groups.filter((org) => org.slug).map((org) => ({ slug: org.slug }));\n---\n<p>{page}</p>\n`,
	);
	assert.deepEqual(namingFindings(cfg), []);
});
test('Astro naming findings inspect frontmatter only and keep offsets in the source file', () => {
	const root = fixtureRoot('terra-quality-naming-astro-template-');
	const original = `---\nconst records = [{ name: 'Terra' }];\nconst entries = records.filter((organization) => organization.name);\n---\n<a href="/organization">organization</a>\n`;
	fixtureFile(root, 'src/index.astro', original);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.astro'] });
	const findings = namingFindings(cfg);
	assert.deepEqual(
		findings.map(({ name, suggestion }) => [name, suggestion]),
		[['organization', 'org']],
	);
	assert.equal(findings[0]?.start, original.indexOf('organization'));
	assert.equal(fixNaming(cfg), 1);
	assert.equal(fixtureText(root, 'src/index.astro'), `---\nconst records = [{ name: 'Terra' }];\nconst entries = records.filter((org) => org.name);\n---\n<a href="/organization">organization</a>\n`);
});
test('safe naming fixes leave Astro files with malformed frontmatter untouched', () => {
	const root = fixtureRoot('terra-quality-naming-astro-malformed-');
	const original = `---\nconst organizations = [{ slug: 'overview' }];\nconst entries = organizations.map((organization) => ({ slug: organization.slug }));\n`;
	fixtureFile(root, 'src/index.astro', original);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.astro'] });
	assert.deepEqual(namingFindings(cfg), []);
	assert.equal(fixNaming(cfg), 0);
	assert.equal(fixtureText(root, 'src/index.astro'), original);
});
