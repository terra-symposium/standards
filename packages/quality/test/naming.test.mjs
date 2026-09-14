/**
 * packages/quality/test/naming.test.mjs
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
import { aliasFindings, callbackAlias, createQualityAnalysis, createQualityCfg, declarationScope, hasPrefixReplacement, identifierTokens, isApprovedId, isCallbackDeclaration, isProtectedFilename, isProtectedPath, isRenamableDeclaration, namingFindings, renameDeclaration, renameId } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

// DATA
import { CALLBACK_ALIASES, IDENTIFIER_REPLACEMENTS, PREFIX_REPLACEMENTS, PROTECTED_IDENTIFIERS } from '../dist/index.js';

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
test('callback aliases select semantic initials, deterministic fallbacks, and the documented exhausted-reservation behavior', () => {
	assert.equal(callbackAlias('customer'), 'c');
	assert.equal(callbackAlias('unknownValue'), 'u');
	assert.equal(callbackAlias('customer', ['c']), 'v');
	assert.equal(callbackAlias('customer', ['c', 'v', 'r', 'x', 'd', 'e', 'n', 's']), 'c');
	assert.equal(renameId('index', { numericIndex: true }), 'i');
	assert.equal(renameId('node', { callback: true }), 'n');
	assert.equal(renameId('node', { callback: true, reserved: ['n'] }), 'v');
	assert.equal(renameId('Request'), 'Request');
	assert.equal(renameId('_'), '_');
});
test('renameId shortens category, intelligence, and other configured words without touching substrings', () => {
	const cases = {
		category: 'cat',
		customerCategory: 'customerCat',
		intelligence: 'intel',
		customerIntelligence: 'customerIntel',
		categories: 'cats',
		intelligences: 'intels',
		commitment: 'commitment',
		terror: 'terror',
		isActive: 'isActive',
		normalizedResponse: 'normRes',
	};
	for (const [name, expected] of Object.entries(cases)) assert.equal(renameId(name), expected, name);
	assert.equal(hasPrefixReplacement('activeCard'), true);
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
test('declaration predicates distinguish repository-owned declarations, public contracts, parameter properties, and owning scopes', () => {
	const src = `
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
`;
	const { file, nodes } = identifiers(src);
	const declaration = (name) => nodes.find((n) => n.text === name && n.parent.name === n);
	for (const name of ['localValue', 'localFunction', 'LocalClass', 'LocalContract', 'LocalType', 'namedExpression']) assert.equal(isRenamableDeclaration(declaration(name)), true, name);
	for (const name of ['publicValue', 'publicFunction', 'PublicClass', 'PublicContract', 'PublicType']) assert.equal(isRenamableDeclaration(declaration(name)), false, name);
	const param = declaration('parameter');
	assert.equal(isRenamableDeclaration(param), true);
	const dest = declaration('destination');
	assert.equal(isRenamableDeclaration(dest), false);
	assert.equal(declarationScope(param).kind, ts.SyntaxKind.FunctionDeclaration);
	assert.equal(declarationScope(declaration('localValue')), file);
	assert.equal(renameDeclaration(param), 'param');
});
test('callback declaration APIs classify only supported collection and event-handler callbacks', () => {
	const src = `
const mapped = values.map((customer, index) => customer.id + index);
const ordinary = (customer) => customer.id;
function handle(customer: string) { return customer; }
const view = <button onClick={(event) => handle(event.type)}>Open</button>;
void [mapped, ordinary, handle, view];
`;
	const file = ts.createSourceFile('fixture.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	const callbacks = [];
	const visit = (node) => {
		if (ts.isIdentifier(node) && ['customer', 'index', 'event'].includes(node.text) && ts.isParameter(node.parent)) callbacks.push(node);
		ts.forEachChild(node, visit);
	};
	visit(file);
	assert.equal(callbacks.length, 5);
	const supported = callbacks.filter((n) => isCallbackDeclaration(n));
	assert.equal(supported.length, 4);
	assert.equal(renameDeclaration(supported[0]), 'c');
	assert.equal(renameDeclaration(supported[1]), 'i');
	assert.equal(renameDeclaration(supported[2]), 'c');
	assert.equal(renameDeclaration(supported[3]), 'e');
});
test('alias analysis finds local const/property/element and type aliases while preserving public, optional, mutable, multi-declaration, generic, and externally referenced aliases', () => {
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
export type PublicTypeAlias = Contract;
type GenericAlias<T> = Contract;
void [localAlias, propertyAlias, elementAlias, optionalAlias, mutableAlias, first, second, publicAlias];
`,
	);
	fixtureFile(root, 'src/consumer.ts', `import type { LocalAlias } from './main';\nconst value: LocalAlias = { value: true };\nvoid value;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	const findings = aliasFindings(cfg);
	assert.deepEqual(
		findings.map((f) => [f.kind, f.name, f.replacement]),
		[
			['const', 'localAlias', 'base'],
			['const', 'propertyAlias', 'base.value'],
			['const', 'elementAlias', "base['value']"],
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
	const analysis = createQualityAnalysis(cfg);
	assert.deepEqual(
		aliasFindings(cfg, analysis, true).map((f) => f.name),
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
test('naming findings use shared analysis, report severity by replacement kind, and preserve protected declarations', () => {
	const root = fixtureRoot('terra-quality-naming-');
	fixtureFile(root, 'src/main.ts', 'const category = true;\nconst activeValue = false;\nconst request = true;\nvoid [category, activeValue, request];\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], protectedIdentifiers: ['request'] });
	const analysis = createQualityAnalysis(cfg);
	assert.deepEqual(
		namingFindings(cfg, analysis).map((f) => [f.name, f.suggestion, f.severity]),
		[
			['category', 'cat', 'error'],
			['activeValue', 'aVal', 'warning'],
		],
	);
});
