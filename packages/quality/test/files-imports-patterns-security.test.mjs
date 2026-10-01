/**
 * packages/quality/test/files-imports-patterns-security.test.mjs
 * Verifies repository discovery, import resolution, generic pattern checks,
 * Tailwind canonicalisation, and portable security guardrails.
 *
 * These tests deliberately use temporary repositories and fake tool packages.
 * They cover the package's observable contracts without depending on the
 * structure, dependencies, or secrets of the Terra Shared checkout.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
	checkImports,
	createQualityCfg,
	displayPath,
	isFile,
	regexFindings,
	repeatedClassFindings,
	runTailwindCanonical,
	securityFindings,
	srcFiles,
	uiPatternFindings,
	workingSrcFiles,
} from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from './support.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('source discovery handles nested roots, include roots, exclusions, direct files, and its cache contract', () => {
	const root = fixtureRoot('terra-quality-files-');
	const main = fixtureFile(root, 'src/main.ts', 'export const main = true;\n');
	fixtureFile(root, 'src/nested/keep.ts', 'export const keep = true;\n');
	fixtureFile(root, 'src/nested/skip.ts', 'export const skip = true;\n');
	fixtureFile(root, 'src/node_modules/dependency.ts', 'export const dependency = true;\n');
	fixtureFile(root, 'src/ignored/generated.ts', 'export const generated = true;\n');
	fixtureFile(root, 'include/index.js', 'export const included = true;\n');
	fixtureFile(root, 'include/notes.md', '# not source\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], includeRoots: ['include'], extensions: ['.ts', '.js'], skippedDirectories: ['ignored'], skippedFiles: ['src/nested/skip.ts'] });
	assert.deepEqual(srcFiles(cfg), [main, join(root, 'include/index.js'), join(root, 'src/nested/keep.ts')].sort());
	const beforeNewFile = srcFiles(cfg);
	fixtureFile(root, 'src/new.ts', 'export const newFile = true;\n');
	assert.deepEqual(srcFiles(cfg), beforeNewFile, 'the process-local discovery cache intentionally caches the file set');
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: [main], extensions: ['.ts'] })), [main]);
	assert.deepEqual(srcFiles(createQualityCfg({ root, sourceRoots: ['does-not-exist'], extensions: ['.ts'] })), []);
});

test('working-tree discovery includes modified and untracked sources but excludes ignored files', () => {
	const root = fixtureRoot('terra-quality-working-files-');
	fixtureFile(root, '.gitignore', 'src/ignored.ts\n');
	fixtureFile(root, 'src/changed.ts', 'export const changed = false;\n');
	fixtureFile(root, 'src/deleted.ts', 'export const deleted = true;\n');
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '.'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=quality-test', '-c', 'user.email=quality@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
	fixtureFile(root, 'src/changed.ts', 'export const changed = true;\n');
	fixtureFile(root, 'src/new.ts', 'export const added = true;\n');
	fixtureFile(root, 'src/ignored.ts', 'export const ignored = true;\n');
	const deleted = join(root, 'src/deleted.ts');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	execFileSync('git', ['rm', '-q', deleted], { cwd: root });
	assert.deepEqual(workingSrcFiles(cfg), [join(root, 'src/changed.ts'), join(root, 'src/new.ts')]);
});

test('path utilities distinguish files, directories, missing paths, and repository-relative display names', () => {
	const root = fixtureRoot('terra-quality-paths-');
	const file = fixtureFile(root, 'src/main.ts', 'const value = true;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(isFile(file), true);
	assert.equal(isFile(join(root, 'src')), false);
	assert.equal(isFile(join(root, 'missing.ts')), false);
	assert.equal(displayPath(cfg, file), 'src/main.ts');
	assert.equal(displayPath(cfg, root), root.split('/').at(-1));
});

test('import validation resolves relative, aliased, index, asset, export, dynamic, and require imports', () => {
	const root = fixtureRoot('terra-quality-imports-');
	fixtureFile(
		root,
		'src/main.ts',
		`
import { local } from './local';
import { alias } from '@/alias';
export { indexed } from './folder';
const lazy = import('./lazy');
const asset = require('./asset.svg');
import './missing.js';
import './unsupported.txt';
const dynamic = import(moduleName);
const twoArgRequire = require('./not-static', moduleName);
void [local, alias, indexed, lazy, asset, dynamic, twoArgRequire];
`,
	);
	fixtureFile(root, 'src/local.ts', 'export const local = true;\n');
	fixtureFile(root, 'src/alias.ts', 'export const alias = true;\n');
	fixtureFile(root, 'src/folder/index.ts', 'export const indexed = true;\n');
	fixtureFile(root, 'src/lazy.ts', 'export const lazy = true;\n');
	fixtureFile(root, 'src/asset.svg', '<svg />\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '@/': 'src/' } });
	assert.deepEqual(checkImports(cfg), [{ importer: 'src/main.ts', specifier: './missing.js' }]);
});

test('import validation respects external prefixes, explicit unsupported extensions, and missing index targets', () => {
	const root = fixtureRoot('terra-quality-import-policy-');
	fixtureFile(
		root,
		'src/main.ts',
		`
import external from '~/external';
import './missing.css';
import './missing.txt';
void external;
`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], aliases: { '~/': 'vendor/' }, externalPrefixes: ['~/'] });
	assert.deepEqual(checkImports(cfg), [{ importer: 'src/main.ts', specifier: './missing.css' }]);
});

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
	const findings = repeatedClassFindings(defaultCfg);
	assert.deepEqual(findings, [{ value: 'rounded border bg-card', count: 4, locations: ['src/one.tsx:1', 'src/one.tsx:2', 'src/two.tsx:1', 'src/two.tsx:2'] }]);
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
	const findings = regexFindings(cfg);
	assert.deepEqual(findings, [
		{ source: 'alpha', count: 3, locations: ['src/one.ts:1', 'src/three.ts:1', 'src/two.ts:1'] },
		{ source: "'constructor'", count: 2, locations: ['src/one.ts:2', 'src/two.ts:2'] },
	]);
	const stricter = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], regexDedup: { minimumCount: 5 } });
	assert.deepEqual(regexFindings(stricter), []);
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

test('security checks detect environment files, forbidden terms/imports, client secrets, dotenv, and process-boundary violations', () => {
	const root = fixtureRoot('terra-quality-security-');
	fixtureFile(root, '.env.local', 'TOKEN=visible\n');
	fixtureFile(root, 'src/client/view.ts', `import 'forbidden-package';\nconst token = import.meta.env.PUBLIC_TOKEN;\nconst password = 'not a real secret';\n`);
	fixtureFile(root, 'src/server/view.ts', `import 'safe-package';\nconst token = process.env.TOKEN;\nconst loaded = dotenv.config();\nvoid [token, loaded];\n`);
	fixtureFile(root, 'src/runtime/view.ts', 'const token = process.env.TOKEN;\nvoid token;\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		security: { forbiddenTerms: ['password'], forbiddenImports: ['forbidden-package'], clientRoots: ['src/client'], allowProcessEnvRoots: ['src/runtime'] },
	});
	const findings = securityFindings(cfg);
	assert.deepEqual(
		findings.map((f) => f.message),
		[
			'environment files must not be committed',
			'forbidden term matches /password/i',
			'forbidden import forbidden-package',
			'client source references a secret-shaped environment value',
			'environment-file loading is forbidden',
			'process.env access is outside an allowed runtime root',
		],
	);
	assert.deepEqual(
		findings.map((f) => f.file),
		['.env.local', 'src/client/view.ts', 'src/client/view.ts', 'src/client/view.ts', 'src/server/view.ts', 'src/server/view.ts'],
	);
});

test('security checks honor tracked visibility and runtime-root exceptions in a Git worktree', () => {
	const root = fixtureRoot('terra-quality-security-git-');
	fixtureFile(root, '.gitignore', '.env*\n');
	fixtureFile(root, '.env.ignored', 'TOKEN=ignored\n');
	fixtureFile(root, '.env.committed', 'TOKEN=committed\n');
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '.gitignore'], { cwd: root });
	execFileSync('git', ['add', '-f', '.env.committed'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=quality-test', '-c', 'user.email=quality@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], security: {} });
	assert.deepEqual(securityFindings(cfg), [{ file: '.env.committed', message: 'environment files must not be committed' }]);
});
