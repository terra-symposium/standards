/**
 * packages/quality/test/runner.test.mjs
 * Verifies configuration normalization, check/autofix toggles, shared analysis construction,
 * CLI dispatch, subprocess status handling, formatter batching, and the explicit command boundaries.
 * Tool invocations use tiny executable fixtures that record their arguments.
 * This makes command wiring testable without installing or running a real formatter, linter, compiler, or repository build.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
import { createQualityAnalysis, createQualityCfg, loadQualityCfg, qualityAutofixEnabled, qualityCheckEnabled, qualityCmdEnabled, qualityRecommendationEnabled, runFormatter, runQuality, runQualityCli, runQualityFromCfg, runTypecheck } from '../dist/index.js';
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureFile, fixtureRoot, fixtureText, resetExitCode } from './support.mjs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates an executable fixture command that appends each invocation's
 * argument vector as one JSON line to a marker file.
 *
 * @param root Fixture root that owns the marker.
 * @param markerRelativePath Marker path relative to the fixture root.
 * @param cmdRelativePath Command path relative to the fixture root.
 *
 * @return Absolute path to the executable command.
 */
function recordingCmd(root, markerRelativePath = 'command-args.jsonl', cmdRelativePath = 'bin/record-command.mjs') {
	const marker = join(root, markerRelativePath);
	return fixtureFile(
		root,
		cmdRelativePath,
		`#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(marker)}, JSON.stringify(process.argv.slice(2)) + '\\n');
`,
		0o755,
	);
}

/**
 * Reads recorded command invocations from a fixture marker.
 *
 * @param root Fixture root containing the marker.
 * @param markerRelativePath Marker path relative to the fixture root.
 *
 * @return Invocation argument arrays in execution order.
 */
function recordedCmds(root, markerRelativePath = 'command-args.jsonl') {
	return fixtureText(root, markerRelativePath)
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l));
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('createQualityCfg applies defaults and resolves every repository-relative path exactly once', () => {
	const root = fixtureRoot('terra-quality-runner-config-');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		includeRoots: ['generated'],
		extensions: ['.ts'],
		skippedDirectories: ['generated-cache', 'node_modules'],
		skippedFiles: ['src/ignored.ts'],
		protectedIdentifiers: ['domainName'],
		lintRoots: ['src'],
		typecheckRoots: ['types'],
	});
	assert.equal(cfg.root, root);
	assert.deepEqual(cfg.sourceRoots, [join(root, 'src')]);
	assert.deepEqual(cfg.includeRoots, [join(root, 'generated')]);
	assert.deepEqual(cfg.skippedFiles, [join(root, 'src/ignored.ts')]);
	assert.deepEqual(cfg.lintRoots, [join(root, 'src')]);
	assert.deepEqual(cfg.typecheckRoots, [join(root, 'types')]);
	assert.equal(cfg.renameExports, false);
	assert.deepEqual(cfg.aliases, {});
	assert.deepEqual(cfg.protectedIdentifiers, ['domainName']);
	for (const dir of [
		'.git',
		'node_modules',
		'dist',
		'build',
		'coverage',
		'test-results',
		'.next',
		'.astro',
		'.sanity',
		'.netlify',
		'.cache',
		'.output',
		'.vercel',
		'.nuxt',
		'.husky',
		'generated-cache',
	])
		assert.ok(cfg.skippedDirectories.includes(dir), dir);
});
test('CLI help exits before default quality dispatch or any configured autofix can run', () => {
	const root = fixtureRoot('terra-quality-cli-help-');
	const src = 'const value = true;\nvoid value;\n';
	fixtureFile(root, 'src/main.ts', src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	resetExitCode();
	runQualityCli(cfg, ['--help']);
	assert.equal(fixtureText(root, 'src/main.ts'), src);
	runQualityCli(cfg, ['quality', '--help']);
	assert.equal(fixtureText(root, 'src/main.ts'), src);
	assert.equal(process.exitCode, 0);
	resetExitCode();
});
test('CLI version and invalid arguments never dispatch quality work', () => {
	const root = fixtureRoot('terra-quality-cli-boundary-');
	const src = 'const value = true;\nvoid value;\n';
	fixtureFile(root, 'src/main.ts', src);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	runQualityCli(cfg, ['--version']);
	assert.equal(fixtureText(root, 'src/main.ts'), src);
	assert.throws(() => runQualityCli(cfg, ['unknown-command']), /Unknown quality CLI argument/);
	assert.throws(() => runQualityCli(cfg, ['quality', '--unknown']), /Unknown quality CLI argument/);
	assert.equal(fixtureText(root, 'src/main.ts'), src);
	const result = spawnSync(process.execPath, [fileURLToPath(new URL('../dist/runner.js', import.meta.url)), '--version'], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 0);
	const { version } = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
	assert.equal(result.stdout.trim(), version);
	assert.equal(result.stderr, '');
});
test('CLI writes a versioned report with check statuses and finding counts', () => {
	const root = fixtureRoot('terra-quality-json-report-');
	fixtureFile(root, 'src/main.ts', 'export const value = 1;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	resetExitCode();
	runQualityCli(cfg, ['imports', '--all', '--warn', '--report-json', 'terra-quality.json']);
	const report = JSON.parse(fixtureText(root, 'terra-quality.json'));
	assert.equal(report.schemaVersion, 1);
	assert.equal(report.command, 'imports');
	assert.equal(report.scope, 'all');
	assert.ok(Array.isArray(report.checks));
	assert.ok(report.checks.some((check) => check.name === 'imports' && check.status === 'passed' && check.findings === 0));
	resetExitCode();
});
test('repeated naming repair never appends a second import for an already-bound local name', () => {
	const root = fixtureRoot('terra-quality-naming-import-idempotence-');
	const src = fixtureFile(
		root,
		'src/main.ts',
		`import type { RecordData } from './types';
const organization = true;
export const record: RecordData = { id: organization ? 'one' : 'two' };
`,
	);
	fixtureFile(root, 'src/types.ts', 'export type RecordData = { id: string };\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		enabledChecks: { import: false, document: false, format: false, lint: false, knip: false, type: false, command: false, recommend: false, diff: false },
	});
	runQualityCli(cfg, ['naming', '--all']);
	const first = readFileSync(src, 'utf8');
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(src, 'utf8'), first);
	assert.equal((first.match(/import type \{ RecordData \} from '\.\/types';/g) ?? []).length, 1);
	assert.match(first, /const org = true/);
});
test('naming autofix never text-rewrites Astro properties or string literals', () => {
	const root = fixtureRoot('terra-quality-naming-astro-safe-');
	const src = fixtureFile(root, 'src/index.astro', `---\nconst error = Astro.locals.user;\nconst message = 'Salesphere user';\n---\n<p>{message}</p>\n`);
	const original = readFileSync(src, 'utf8');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.astro'],
		enabledChecks: {
			import: false,
			document: false,
			format: false,
			lint: false,
			knip: false,
			'dead-code': false,
			type: false,
			command: false,
			recommend: false,
			diff: false,
			alias: false,
			forward: false,
			security: false,
			'repeated-classes': false,
			'regex-dedup': false,
			'ui-patterns': false,
		},
	});
	runQualityCli(cfg, ['naming', '--all']);
	assert.equal(readFileSync(src, 'utf8'), original);
});
test('the executable handles help without a config and rejects unknown commands before config loading', () => {
	const root = fixtureRoot('terra-quality-cli-early-dispatch-');
	fixtureFile(root, 'quality.json', '{ invalid config');
	const runner = fileURLToPath(new URL('../dist/runner.js', import.meta.url));
	const help = spawnSync(process.execPath, [runner, '--help'], { cwd: root, encoding: 'utf8' });
	assert.equal(help.status, 0);
	assert.match(help.stdout, /Usage: terra-quality/);
	assert.equal(help.stderr, '');
	const version = spawnSync(process.execPath, [runner, '--version'], { cwd: root, encoding: 'utf8' });
	assert.equal(version.status, 0);
	assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
	assert.equal(version.stderr, '');
	const unknown = spawnSync(process.execPath, [runner, 'unknown-command'], { cwd: root, encoding: 'utf8' });
	assert.notEqual(unknown.status, 0);
	assert.match(unknown.stderr, /Unknown quality CLI arguments: unknown-command/);
	assert.doesNotMatch(unknown.stderr, /invalid config|Unexpected token/);
});
test('the executable rejects linting without an ESLint flat config before running quality', () => {
	const root = fixtureRoot('terra-quality-eslint-config-required-');
	fixtureFile(root, 'quality.json', JSON.stringify({ sourceRoots: ['src'], extensions: ['.ts'] }));
	fixtureFile(root, 'src/main.ts', 'const value = true;\n');
	const runner = fileURLToPath(new URL('../dist/runner.js', import.meta.url));
	const result = spawnSync(process.execPath, [runner, 'quality', '--all'], { cwd: root, encoding: 'utf8' });
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /ESLint flat config is required for quality/);
	assert.doesNotMatch(result.stderr, /couldn't find an eslint\.config/);
});
test('loadQualityCfg resolves a quality file root relative to the configuration file', () => {
	const root = fixtureRoot('terra-quality-load-config-');
	const cfgDir = join(root, 'config');
	const cfgPath = fixtureFile(
		root,
		'config/quality.json',
		JSON.stringify({ root: '..', sourceRoots: ['src'], extensions: ['.ts'], loadTesting: { enabled: false, defaultBudget: { warnMs: 3000, failMs: 7000 } } }),
	);
	const cfg = loadQualityCfg(cfgPath);
	assert.equal(cfg.root, root);
	assert.deepEqual(cfg.sourceRoots, [join(root, 'src')]);
	assert.deepEqual(cfg.extensions, ['.ts']);
	assert.deepEqual(cfg.loadTesting, { enabled: false, defaultBudget: { warnMs: 3000, failMs: 7000 } });
	assert.equal(cfgDir, join(root, 'config'));
	const schema = JSON.parse(readFileSync(join(process.cwd(), 'quality.schema.json'), 'utf8'));
	assert.ok(schema.properties.loadTesting);
	assert.ok(schema.$defs.loadBudget);
});
test('configuration toggles default to enabled and honor explicit category, item, CLI, and recommendation disables', () => {
	const cfg = createQualityCfg({
		root: fixtureRoot('terra-quality-toggle-'),
		sourceRoots: [],
		extensions: ['.ts'],
		enabledChecks: { import: false, command: false, recommend: false },
		autofix: { name: false },
		enabledCommands: { build: false },
		enabledRecommendations: { migration: false },
	});
	assert.equal(qualityCheckEnabled(cfg, 'import'), false);
	assert.equal(qualityCheckEnabled(cfg, 'name'), true);
	assert.equal(qualityAutofixEnabled(cfg, 'name'), false);
	assert.equal(qualityAutofixEnabled(cfg, 'format', false), false);
	assert.equal(qualityAutofixEnabled(cfg, 'format'), true);
	assert.equal(qualityCmdEnabled(cfg, 'build'), false);
	assert.equal(qualityCmdEnabled(cfg, 'test'), false);
	assert.equal(qualityRecommendationEnabled(cfg, 'migration'), false);
	assert.equal(qualityRecommendationEnabled(cfg, 'architecture'), false);
	const enabled = createQualityCfg({ root: cfg.root, sourceRoots: [], extensions: ['.ts'], qualityCommands: [], recommendationCommands: [] });
	assert.equal(qualityCmdEnabled(enabled, 'build'), true);
	assert.equal(qualityRecommendationEnabled(enabled, 'architecture'), true);
});
test('createQualityAnalysis caches all selected source text and only creates AST entries for JavaScript/TypeScript files', () => {
	const root = fixtureRoot('terra-quality-analysis-');
	fixtureFile(root, 'src/main.ts', 'export const value = true;\n');
	fixtureFile(root, 'src/view.astro', '<div>view</div>\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.astro'] });
	const analysis = createQualityAnalysis(cfg);
	assert.deepEqual(analysis.files, [join(root, 'src/main.ts'), join(root, 'src/view.astro')].sort());
	assert.equal(analysis.texts.get(join(root, 'src/view.astro')), '<div>view</div>\n');
	assert.equal(analysis.sources.has(join(root, 'src/main.ts')), true);
	assert.equal(analysis.sources.has(join(root, 'src/view.astro')), false);
	assert.equal(typeof analysis.checker.getTypeAtLocation(analysis.sources.get(join(root, 'src/main.ts')).statements[0]), 'object');
});
test('runFormatter supports legacy and typed invocation forms, ignores Astro targets, and batches large scopes', () => {
	const root = fixtureRoot('terra-quality-formatter-api-');
	const cmd = recordingCmd(root);
	fixtureFile(root, 'src/main.ts', 'const value = true;\n');
	fixtureFile(root, 'src/view.astro', '<div />\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.astro'], tools: { prettier: cmd } });
	runFormatter(cfg, ['--check', 'src/main.ts']);
	let invocations = recordedCmds(root);
	assert.deepEqual(invocations, [['--ignore-unknown', '--check', 'src/main.ts']]);
	runFormatter(cfg, ['--write', 'src/main.ts']);
	invocations = recordedCmds(root);
	assert.deepEqual(invocations[1], ['--ignore-unknown', '--log-level=warn', '--write', 'src/main.ts']);
	runFormatter(cfg, { fix: false, all: true, strict: false });
	invocations = recordedCmds(root);
	assert.deepEqual(invocations[2], ['--check', '--ignore-unknown', join(root, 'src/main.ts')]);
	assert.equal(invocations.length, 3);
});
test('runFormatter divides large source arguments into bounded subprocess batches', () => {
	const root = fixtureRoot('terra-quality-formatter-batches-');
	const cmd = recordingCmd(root);
	for (let idx = 0; idx < 201; idx += 1) fixtureFile(root, `src/file-${String(idx).padStart(3, '0')}.ts`, `const value${idx} = true;\n`);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { prettier: cmd } });
	runFormatter(cfg, { fix: false, all: true, strict: false });
	const invocations = recordedCmds(root);
	assert.equal(invocations.length, 3);
	assert.equal(invocations[0].filter((a) => !a.startsWith('-')).length, 100);
	assert.equal(invocations[1].filter((a) => !a.startsWith('-')).length, 100);
	assert.equal(invocations[2].filter((a) => !a.startsWith('-')).length, 1);
});
test('runTypecheck honors custom command ownership and does not invoke it for a scoped file-only request', () => {
	const root = fixtureRoot('terra-quality-typecheck-');
	const marker = join(root, 'typecheck-ran.txt');
	const cmd = { command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`] };
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], typecheckCommand: cmd });
	runTypecheck(cfg, ['src/main.ts']);
	assert.equal(existsSync(marker), false);
	runTypecheck(cfg);
	assert.equal(readFileSync(marker, 'utf8'), 'ran');
});
test('CLI domain dispatch runs enabled commands, skips disabled commands, and rejects unknown domains', () => {
	const root = fixtureRoot('terra-quality-domain-api-');
	const marker = join(root, 'domain-ran.txt');
	const cmd = { name: 'fixture', command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`] };
	const cfg = createQualityCfg({ root, sourceRoots: [], extensions: ['.ts'], qualityCommands: [cmd] });
	runQualityCli(cfg, ['domain', 'fixture']);
	assert.equal(readFileSync(marker, 'utf8'), 'ran');
	fixtureFile(root, 'domain-ran.txt', 'reset');
	const disabled = createQualityCfg({ root, sourceRoots: [], extensions: ['.ts'], qualityCommands: [cmd], enabledCommands: { fixture: false } });
	runQualityCli(disabled, ['domain', 'fixture']);
	assert.equal(readFileSync(marker, 'utf8'), 'reset');
	assert.throws(() => runQualityCli(cfg, ['domain', 'missing']), /Unknown quality domain/);
});
test('runQualityFromCfg loads JSON and reaches the same explicit domain boundary as an in-memory configuration', () => {
	const root = fixtureRoot('terra-quality-from-config-');
	const marker = join(root, 'from-config.txt');
	const cfg = fixtureFile(
		root,
		'quality.json',
		JSON.stringify({
			sourceRoots: [],
			extensions: ['.ts'],
			qualityCommands: [{ name: 'fixture', command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`] }],
		}),
	);
	runQualityFromCfg(cfg, ['domain', 'fixture']);
	assert.equal(readFileSync(marker, 'utf8'), 'ran');
});
test('runQuality honors disabled findings categories without leaking a failure status', () => {
	const root = fixtureRoot('terra-quality-run-quality-');
	fixtureFile(root, 'src/main.ts', "import './missing';\nconst organization = true;\nvoid organization;\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], enabledChecks: { document: false, import: false, name: false, alias: false, forward: false } });
	resetExitCode();
	const result = runQuality(cfg);
	assert.deepEqual(result.imports, []);
	assert.deepEqual(result.naming, []);
	assert.deepEqual(result.aliases, []);
	assert.deepEqual(result.forwarding, []);
	assert.deepEqual(result.documentation, []);
	assert.equal(process.exitCode, 0);
});
test('quality autofix fills missing TSDoc tags then reports blank prose for agent assistance', () => {
	const root = fixtureRoot('terra-quality-tsdoc-quality-run-');
	fixtureFile(
		root,
		'src/main.ts',
		`import type { DashboardConfigure } from './types.js';
/** Keeps Dialog state local while accepting legacy dashboard URLs as one-time open requests. */
export function useDashboardConfigurationDialog(initialConfigure: DashboardConfigure | undefined, allowed: readonly DashboardConfigure[]) {
	return { configure: initialConfigure, allowed };
}
`,
	);
	fixtureFile(root, 'src/unrelated.ts', 'function privateHelper() { return true; }\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		documentation: { required: { exportedFunctions: true } },
		enabledChecks: {
			import: false,
			name: false,
			alias: false,
			forward: false,
			lint: false,
			knip: false,
			format: false,
			type: false,
			command: false,
			recommend: false,
			diff: false,
			security: false,
			'repeated-classes': false,
			'regex-dedup': false,
			'ui-patterns': false,
		},
	});
	resetExitCode();
	runQualityCli(cfg, ['quality', '--all', '--skip-commands', '--skip-recommendations']);
	const src = fixtureText(root, 'src/main.ts');
	assert.match(src, /@param initialConfigure\n \* @param allowed\n \*\n \* @return/);
	assert.equal(fixtureText(root, 'src/unrelated.ts'), 'function privateHelper() { return true; }\n');
	assert.deepEqual(
		runQuality(cfg).documentation.map((f) => [f.kind, f.name, f.severity]),
		[
			['param', '@param initialConfigure', 'warning'],
			['param', '@param allowed', 'warning'],
			['return', '@return', 'warning'],
			['param', '@param initialConfigure', 'error'],
			['param', '@param allowed', 'error'],
		],
	);
	assert.equal(process.exitCode, 1);
	resetExitCode();
});
test('CLI lint applies its autofix policy while the Knip audit remains read-only', () => {
	const root = fixtureRoot('terra-quality-tool-branches-');
	const eslint = recordingCmd(root, 'eslint-args.jsonl', 'bin/record-eslint.mjs');
	const knipMarker = join(root, 'knip-args.jsonl');
	const knip = fixtureFile(
		root,
		'bin/record-knip.mjs',
		`#!/usr/bin/env node\nimport { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(knipMarker)}, JSON.stringify(process.argv.slice(2)) + '\\n');\nprocess.stdout.write(JSON.stringify({ issues: [] }));\n`,
		0o755,
	);
	fixtureFile(root, 'src/main.ts', 'const value = true;\nvoid value;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint, knip } });
	runQualityCli(cfg, ['lint', '--all', '--warn']);
	assert.deepEqual(recordedCmds(root, 'eslint-args.jsonl'), [
		['--cache', '--cache-strategy', 'content', '--cache-location', 'node_modules/.cache/eslint', '--no-warn-ignored', join(root, 'src/main.ts')],
	]);
	cfg.enabledChecks = { lint: false };
	runQualityCli(cfg, ['knip', '--all']);
	assert.deepEqual(recordedCmds(root, 'knip-args.jsonl'), [
		['--reporter', 'json', '--no-config-hints'],
		['--reporter', 'json', '--no-config-hints'],
	]);
	runQualityCli(cfg, ['knip', '--all', '--warn']);
	assert.deepEqual(recordedCmds(root, 'knip-args.jsonl').at(-1), ['--reporter', 'json', '--no-config-hints']);
});
test('CLI lint updates progress after each ten-file ESLint batch', () => {
	const root = fixtureRoot('terra-quality-lint-batches-');
	const eslint = recordingCmd(root, 'eslint-args.jsonl', 'bin/record-eslint.mjs');
	for (let idx = 0; idx < 11; idx += 1) fixtureFile(root, `src/file-${String(idx).padStart(2, '0')}.ts`, 'export {}\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint } });
	runQualityCli(cfg, ['lint', '--all', '--warn']);
	const invocations = recordedCmds(root, 'eslint-args.jsonl');
	assert.equal(invocations.length, 2);
	assert.equal(invocations[0].filter((arg) => arg.endsWith('.ts')).length, 10);
	assert.equal(invocations[1].filter((arg) => arg.endsWith('.ts')).length, 1);
	resetExitCode();
});
test('quality:all reports duplicate imports read-only and consolidates them idempotently in autofix mode', () => {
	const root = fixtureRoot('terra-quality-import-dedup-cli-');
	const src = fixtureFile(
		root,
		'src/main.ts',
		`import type { RecordData } from './types';
import type { RecordData } from './types';
export type Result = RecordData;
`,
	);
	fixtureFile(root, 'src/types.ts', 'export type RecordData = { id: string };\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		enabledChecks: {
			import: true,
			name: false,
			alias: false,
			forward: false,
			lint: false,
			knip: false,
			format: false,
			type: false,
			command: false,
			recommend: false,
			diff: false,
			security: false,
			'repeated-classes': false,
			'regex-dedup': false,
			'ui-patterns': false,
		},
	});
	const original = readFileSync(src, 'utf8');
	resetExitCode();
	runQualityCli(cfg, ['quality:all', '--all', '--warn', '--skip-commands', '--skip-recommendations']);
	assert.equal(process.exitCode, 1);
	assert.equal(readFileSync(src, 'utf8'), original);
	resetExitCode();
	runQualityCli(cfg, ['quality:all', '--all', '--skip-commands', '--skip-recommendations']);
	assert.equal(process.exitCode, 0);
	const fixed = readFileSync(src, 'utf8');
	assert.equal((fixed.match(/import type \{ RecordData \} from '\.\/types';/g) ?? []).length, 1);
	resetExitCode();
	runQualityCli(cfg, ['quality:all', '--all', '--skip-commands', '--skip-recommendations']);
	assert.equal(readFileSync(src, 'utf8'), fixed);
	assert.equal(process.exitCode, 0);
	resetExitCode();
});
test('full quality routes unused-variable findings through dead-code once and keeps manual-only lint cases non-blocking', () => {
	const root = fixtureRoot('terra-quality-full-dead-code-coordination-');
	const src = fixtureFile(root, 'src/main.ts', 'const value = create();\n');
	const marker = join(root, 'eslint-args.jsonl');
	const eslint = fixtureFile(
		root,
		'bin/eslint.mjs',
		`#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(marker)}, JSON.stringify(args) + '\\n');
if (args.includes('--format') && args.includes('json'))
  process.stdout.write(JSON.stringify([{ filePath: ${JSON.stringify(src)}, messages: [{ ruleId: 'unused-imports/no-unused-vars', line: 1, column: 7, message: "'value' is assigned a value but never used." }] }]));
`,
		0o755,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		tools: { eslint },
		enabledChecks: {
			document: false,
			format: false,
			import: false,
			name: false,
			forward: false,
			lint: true,
			knip: false,
			'dead-code': true,
			type: false,
			recommend: false,
			command: false,
			diff: false,
			alias: false,
			security: false,
			'repeated-classes': false,
			'regex-dedup': false,
			'ui-patterns': false,
		},
	});
	resetExitCode();
	runQualityCli(cfg, ['quality', '--all', '--warn', '--skip-commands', '--skip-recommendations']);
	const invocations = recordedCmds(root, 'eslint-args.jsonl');
	assert.equal(invocations.filter((args) => args.includes('--format') && args.includes('json')).length, 1);
	assert.ok(invocations.some((args) => args.includes('--rule') && args.includes('unused-imports/no-unused-vars: off')));
	assert.equal(fixtureText(root, 'src/main.ts'), 'const value = create();\n');
	assert.equal(process.exitCode, 0);
	resetExitCode();
});
test('the fixing quality command inlines safe values without broad comment cleanup', () => {
	const root = fixtureRoot('terra-quality-one-pass-');
	fixtureFile(
		root,
		'src/view.ts',
		`/** src/view.ts */
const value = 'ready';
void value;
CONFIG
//////////////////////////////////////////////////*/
`,
	);
	fixtureFile(root, 'src/untouched.ts', `/** src/untouched.ts */\nCONFIG\n//////////////////////////////////////////////////*/\n`);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		enabledChecks: {
			document: false,
			format: false,
			import: false,
			name: false,
			forward: false,
			lint: false,
			knip: false,
			type: false,
			recommend: false,
			command: false,
			diff: false,
			alias: false,
			security: false,
			'repeated-classes': false,
			'regex-dedup': false,
			'ui-patterns': false,
		},
	});
	resetExitCode();
	runQualityCli(cfg, ['quality', '--all', '--skip-commands', '--skip-recommendations']);
	assert.match(fixtureText(root, 'src/view.ts'), /void \('ready'\)/);
	assert.match(fixtureText(root, 'src/view.ts'), /CONFIG|\/{10,}/);
	assert.match(fixtureText(root, 'src/untouched.ts'), /CONFIG|\/{10,}/);
	assert.match(fixtureText(root, 'src/untouched.ts'), /\*\* src\/untouched\.ts \*\//);
});
test('dead-code reports private unused functions and removes only the proven declaration', () => {
	const root = fixtureRoot('terra-quality-dead-code-');
	const src = fixtureFile(root, 'src/main.ts', 'function unused() { return 1; }\nfunction used() { return 2; }\nconsole.log(used(), used());\n');
	const eslint = fixtureFile(
		root,
		'bin/eslint-dead-code.mjs',
		`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const file = ${JSON.stringify(src)};
const text = readFileSync(file, 'utf8');
process.stdout.write(JSON.stringify([{ filePath: file, messages: text.includes('function unused') ? [{ ruleId: 'unused-imports/no-unused-vars', line: 1, column: 10 }] : [] }]));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all', '--warn']);
	assert.equal(process.exitCode, 1);
	assert.match(readFileSync(src, 'utf8'), /function unused/);
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0);
	assert.doesNotMatch(readFileSync(src, 'utf8'), /function unused/);
	assert.match(readFileSync(src, 'utf8'), /function used/);
});
test('dead-code scans the full scope once and applies same-file fixes before rescanning only changed files', () => {
	const root = fixtureRoot('terra-quality-dead-code-sweep-');
	const src = fixtureFile(
		root,
		'src/main.ts',
		`function outer() {
  return nested();
}
function nested() { return 1; }
function spare() { return 2; }
`,
	);
	for (let idx = 0; idx < 10; idx += 1) fixtureFile(root, `src/other-${idx}.ts`, 'export {};\n');
	const marker = join(root, 'eslint-files.jsonl');
	const eslint = fixtureFile(
		root,
		'bin/eslint-dead-code-sweep.mjs',
		`#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
const files = process.argv.slice(2).filter((arg) => arg.endsWith('.ts'));
appendFileSync(${JSON.stringify(marker)}, JSON.stringify(files) + '\\n');
process.stdout.write(JSON.stringify(files.map((filePath) => {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split('\\n');
  const names = text.includes('function outer')
    ? ['outer', 'spare']
    : text.includes('function nested') ? ['nested'] : [];
  return { filePath, messages: names.map((name) => ({
    ruleId: 'unused-imports/no-unused-vars',
    line: lines.findIndex((line) => line.includes('function ' + name)) + 1,
    column: 10,
  })) };
})));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0);
	assert.doesNotMatch(fixtureText(root, 'src/main.ts'), /function (?:outer|nested|spare)/);
	const scans = fixtureText(root, 'eslint-files.jsonl')
		.trim()
		.split('\n')
		.map((line) => JSON.parse(line));
	assert.equal(scans.length, 3, 'initial full scan plus two changed-file cascade scans');
	assert.equal(scans[0].length, 11, 'all configured files share one initial ESLint process');
	assert.deepEqual(scans[1], [src]);
	assert.deepEqual(scans[2], [src]);
	resetExitCode();
});
test('dead-code runs only the configured unused-variable rule through the local flat-config API', (t) => {
	const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
	const workspaceModules = resolve(workspaceRoot, 'node_modules');
	if (!existsSync(resolve(workspaceModules, 'eslint', 'package.json'))) {
		t.skip('workspace ESLint is unavailable');
		return;
	}
	const root = fixtureRoot('terra-quality-dead-code-focused-eslint-');
	fixtureFile(root, 'src/[main].js', 'const unused = 1;\n');
	fixtureFile(root, 'package.json', '{}\n');
	const marker = join(root, 'slow-rule-ran.txt');
	fixtureFile(
		root,
		'eslint.config.mjs',
		`import { appendFileSync } from 'node:fs';
const unusedRule = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    return { VariableDeclarator(node) { context.report({ node: node.id, message: 'fixture unused variable' }); } };
  },
};
const slowRule = {
  meta: { type: 'problem', schema: [] },
  create() {
    appendFileSync(${JSON.stringify(marker)}, 'ran\\n');
    return {};
  },
};
export default [{
  plugins: {
    'unused-imports': { rules: { 'no-unused-vars': unusedRule } },
    fixture: { rules: { slow: slowRule } },
  },
  rules: { 'unused-imports/no-unused-vars': 'error', 'fixture/slow': 'error' },
}];
`,
	);
	symlinkSync(workspaceModules, join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.js'], enabledChecks: { knip: false } });
	const msgs = [];
	t.mock.method(console, 'error', (...parts) => msgs.push(parts.join(' ')));
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all', '--warn']);
	assert.equal(process.exitCode, 1);
	assert.match(msgs.join('\n'), /eslint\/unused-private-declaration/);
	assert.equal(existsSync(marker), false, 'the unrelated expensive ESLint rule must not run');
	assert.equal(fixtureText(root, 'src/[main].js'), 'const unused = 1;\n');
	resetExitCode();
});
test('dead-code CLI fails read-only for safe single-use fixes, then inlines the primitive value', () => {
	const root = fixtureRoot('terra-quality-dead-code-single-use-cli-');
	const src = fixtureFile(root, 'src/main.ts', "const label = 'ready';\nexport const result = label;\n");
	const alias = join(root, 'src/alias.ts');
	if (process.platform !== 'win32') symlinkSync('main.ts', alias);
	const originalStats = lstatSync(src);
	const originalInventory = readdirSync(join(root, 'src')).sort();
	const originalLink = process.platform === 'win32' ? undefined : readlinkSync(alias);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], enabledChecks: { lint: false, knip: false } });
	const originalErr = [console.error][0];
	const output = [];
	console.error = (...parts) => output.push(parts.join(' '));
	try {
		resetExitCode();
		runQualityCli(cfg, ['dead-code', '--all', '--warn']);
		assert.equal(process.exitCode, 1);
		assert.equal(readFileSync(src, 'utf8'), "const label = 'ready';\nexport const result = label;\n");
		const currStats = lstatSync(src);
		assert.equal(currStats.mode, originalStats.mode, 'read-only mode preserves source permissions');
		assert.equal(currStats.mtimeMs, originalStats.mtimeMs, 'read-only mode does not write and restore source files');
		assert.deepEqual(readdirSync(join(root, 'src')).sort(), originalInventory, 'read-only mode preserves the source path inventory');
		if (originalLink !== undefined) assert.equal(readlinkSync(alias), originalLink, 'read-only mode preserves symlink targets');
		assert.match(output.join('\n'), /\[ERROR\] typescript\/single-use: src\/main\.ts:1 label/);
		assert.match(output.join('\n'), /Agent action: Run the canonical dead-code autofix/);
		output.length = 0;
		resetExitCode();
		runQualityCli(cfg, ['dead-code', '--all']);
		assert.equal(process.exitCode, 0);
	} finally {
		console.error = originalErr;
	}
	assert.doesNotMatch(readFileSync(src, 'utf8'), /const label/);
	assert.match(readFileSync(src, 'utf8'), /export const result = \('ready'\)/);
	resetExitCode();
});
test('dead-code warn preview copies formatter and browser-test configs before comparing Knip findings', () => {
	const root = fixtureRoot('terra-quality-dead-code-preview-config-');
	fixtureFile(root, 'src/main.ts', 'export const value = 1;\n');
	fixtureFile(root, 'tests/dashboard.spec.ts', "import './utils/reporter';\n");
	const reporter = fixtureFile(root, 'tests/utils/reporter.ts', 'export const reporter = true;\n');
	const packageJson = fixtureFile(root, 'package.json', JSON.stringify({ devDependencies: { 'prettier-plugin-astro': '1.0.0' } }));
	const prettierCfg = fixtureFile(root, '.prettierrc.mjs', "import 'prettier-plugin-astro';\nexport default {};\n");
	const playwrightCfg = fixtureFile(root, 'playwright.config.ts', "import './tests/utils/reporter';\nexport default {};\n");
	const knip = fixtureFile(
		root,
		'bin/knip',
		`#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const issues = [];
if (!existsSync(join(process.cwd(), '.prettierrc.mjs'))) issues.push({ file: 'package.json', devDependencies: [{ name: 'prettier-plugin-astro' }] });
if (!existsSync(join(process.cwd(), 'playwright.config.ts'))) issues.push({ file: 'tests/utils/reporter.ts', files: [{ name: 'tests/utils/reporter.ts' }] });
process.stdout.write(JSON.stringify({ issues }));
if (issues.length) process.exitCode = 1;
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src', 'tests'], extensions: ['.ts'], tools: { knip: 'knip' }, enabledChecks: { lint: false } });
	const originalPath = process.env.PATH;
	const originalErr = [console.error][0];
	const output = [];
	process.env.PATH = `${join(root, 'bin')}${process.platform === 'win32' ? ';' : ':'}${originalPath ?? ''}`;
	console.error = (...parts) => output.push(parts.join(' '));
	try {
		resetExitCode();
		runQualityCli(cfg, ['dead-code', '--all', '--warn']);
		assert.equal(process.exitCode, 0, `a complete read-only preview should have no findings:\n${output.join('\n')}`);
		assert.match(output.join('\n'), /no autofixable findings or manual warnings remain/);
		assert.doesNotMatch(output.join('\n'), /knip\/(?:files|devDependencies)/);
		assert.deepEqual(
			[readFileSync(packageJson, 'utf8'), readFileSync(prettierCfg, 'utf8'), readFileSync(playwrightCfg, 'utf8'), readFileSync(reporter, 'utf8')],
			[
				JSON.stringify({ devDependencies: { 'prettier-plugin-astro': '1.0.0' } }),
				"import 'prettier-plugin-astro';\nexport default {};\n",
				"import './tests/utils/reporter';\nexport default {};\n",
				'export const reporter = true;\n',
			],
		);
	} finally {
		console.error = originalErr;
		if (originalPath === undefined) delete process.env.PATH;
		else process.env.PATH = originalPath;
		resetExitCode();
	}
	assert.ok(existsSync(knip));
});
test('dead-code CLI reports detached TSDoc as a read-only, actionable warning', () => {
	const root = fixtureRoot('terra-quality-dead-code-tsdoc-cli-');
	const src = fixtureFile(root, 'src/main.ts', '/** Documentation for a removed helper. */\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], enabledChecks: { lint: false, knip: false } });
	const original = readFileSync(src, 'utf8');
	const originalErr = [console.error][0];
	const output = [];
	console.error = (...parts) => output.push(parts.join(' '));
	try {
		resetExitCode();
		runQualityCli(cfg, ['dead-code', '--all', '--warn']);
	} finally {
		console.error = originalErr;
	}
	assert.equal(process.exitCode, 0, 'manual-only detached documentation remains non-blocking');
	assert.equal(readFileSync(src, 'utf8'), original, '--warn must not edit the source');
	assert.match(output.join('\n'), /\[WARNING\] tsdoc\/detached: src\/main\.ts:1/);
	assert.match(output.join('\n'), /Autofix: not safe or not supported/);
	assert.match(output.join('\n'), /Agent action: Attach this TSDoc to the declaration it describes/);
	resetExitCode();
});
test('dead-code removes unused private type declarations with their attached TSDoc', () => {
	const root = fixtureRoot('terra-quality-dead-code-types-');
	const src = fixtureFile(
		root,
		'src/main.ts',
		`/** Obsolete private shape. */\ntype UnusedShape = { ok: boolean };\ninterface AlsoUnused { id: string; }\nexport type PublicShape = string;\nconst first: PublicShape = 'one';\nconst second: PublicShape = 'two';\nvoid [first, second];\n`,
	);
	const eslint = fixtureFile(
		root,
		'bin/eslint-dead-code-types.mjs',
		`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const file = ${JSON.stringify(src)};
const text = readFileSync(file, 'utf8');
const locate = name => { const offset = text.indexOf(name); const before = text.slice(0, offset).split('\\n'); return { line: before.length, column: before.at(-1).length + 1 }; };
const messages = ['UnusedShape', 'AlsoUnused'].flatMap(name => text.includes(name) ? [{ ruleId: 'unused-imports/no-unused-vars', ...locate(name), message: name + ' is never used' }] : []);
process.stdout.write(JSON.stringify([{ filePath: file, messages }]));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0);
	const updated = fixtureText(root, 'src/main.ts');
	assert.doesNotMatch(updated, /UnusedShape|AlsoUnused|Obsolete private shape/);
	assert.match(updated, /export type PublicShape/);
	assert.match(updated, /void \[/);
});
test('dead-code removes inert unused values and reports effectful initializers as non-blocking agent warnings', () => {
	const root = fixtureRoot('terra-quality-dead-code-variables-');
	const src = fixtureFile(root, 'src/main.ts', 'const unusedArrow = () => 1;\nconst unusedData = { count: 1 };\nconst keep = sideEffect();\n');
	const eslint = fixtureFile(
		root,
		'bin/eslint-dead-code-variables.mjs',
		`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const file = ${JSON.stringify(src)};
const source = readFileSync(file, 'utf8');
const names = ['unusedArrow', 'unusedData', 'keep'];
const messages = names.flatMap(name => {
	const offset = source.indexOf(name);
	if (offset < 0) return [];
	const prefix = source.slice(0, offset).split('\\n');
	return [{ ruleId: 'unused-imports/no-unused-vars', line: prefix.length, column: prefix.at(-1).length + 1, message: "'" + name + "' is defined but never used" }];
});
process.stdout.write(JSON.stringify([{ filePath: file, messages }]));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	const output = [];
	const originalErr = [console.error][0];
	console.error = (...parts) => output.push(parts.join(' '));
	try {
		runQualityCli(cfg, ['dead-code', '--all']);
	} finally {
		console.error = originalErr;
	}
	assert.equal(process.exitCode, 0, 'manual-only warnings are non-blocking');
	assert.doesNotMatch(fixtureText(root, 'src/main.ts'), /unusedArrow|unusedData/);
	assert.match(fixtureText(root, 'src/main.ts'), /const keep = sideEffect\(\)/);
	assert.match(output.join('\n'), /Agent action: Inspect the declaration and its initializer/);
	assert.match(output.join('\n'), /preserve observable effects/);
});
test('dead-code never removes an exported function because one nested callback parameter is unused', () => {
	const root = fixtureRoot('terra-quality-dead-code-nested-unused-');
	const src = fixtureFile(root, 'src/main.ts', `export function keepRoute() {\n\treturn [1].map((unused) => 'kept');\n}\n`);
	const eslint = fixtureFile(
		root,
		'bin/eslint-nested-unused.mjs',
		`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const file = ${JSON.stringify(src)};
const text = readFileSync(file, 'utf8');
const offset = text.indexOf('unused');
const before = text.slice(0, offset).split('\\n');
process.stdout.write(JSON.stringify([{ filePath: file, messages: offset < 0 ? [] : [{ ruleId: 'unused-imports/no-unused-vars', line: before.length, column: before.at(-1).length + 1, message: "'unused' is defined but never used" }] }]));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	const output = [];
	const originalErr = [console.error][0];
	console.error = (...parts) => output.push(parts.join(' '));
	try {
		runQualityCli(cfg, ['dead-code', '--all']);
	} finally {
		console.error = originalErr;
	}
	assert.equal(process.exitCode, 0, 'a nested binding is a manual-only warning');
	assert.match(readFileSync(src, 'utf8'), /export function keepRoute/);
	assert.match(readFileSync(src, 'utf8'), /\.map\(\(unused\)/);
	assert.match(output.join('\\n'), /preserve its enclosing function/);
	resetExitCode();
});
test('dead-code fails closed when ESLint returns malformed detector output', () => {
	const root = fixtureRoot('terra-quality-dead-code-malformed-');
	const src = fixtureFile(root, 'src/main.ts', 'const unused = 1;\n');
	const eslint = fixtureFile(root, 'bin/eslint-malformed.mjs', `#!/usr/bin/env node\nprocess.stdout.write('{');\n`, 0o755);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	assert.throws(() => runQualityCli(cfg, ['dead-code', '--all', '--warn']), /invalid JSON/);
	assert.equal(readFileSync(src, 'utf8'), 'const unused = 1;\n');
});
test('dead-code accepts complete ESLint reports larger than the default subprocess buffer', () => {
	const root = fixtureRoot('terra-quality-dead-code-large-report-');
	fixtureFile(root, 'src/main.ts', 'export {};\n');
	const eslint = fixtureFile(
		root,
		'bin/eslint-large-report.mjs',
		`#!/usr/bin/env node
const messages = Array.from({ length: 24000 }, () => ({ ruleId: 'other', line: 1, column: 1, message: 'x'.repeat(64) }));
process.stdout.write(JSON.stringify([{ filePath: ${JSON.stringify(`${root}/src/main.ts`)}, messages }]));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all', '--warn']);
	assert.equal(process.exitCode, 0);
	assert.equal(fixtureText(root, 'src/main.ts'), 'export {};\n');
});
test('dead-code retains private Knip exports beside named framework entry exports', () => {
	const root = fixtureRoot('terra-quality-knip-framework-');
	fixtureFile(root, 'src/pages/api/report.ts', 'export const GET = () => 1;\nexport const extra = 2;\n');
	const knip = fixtureFile(
		root,
		'bin/knip.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [{ file: 'src/pages/api/report.ts', exports: [{ name: 'GET', line: 1 }, { name: 'extra', line: 2 }] }] }));\nprocess.exitCode = 1;\n`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip }, enabledChecks: { lint: false }, frameworkEntryExports: { 'src/pages/**/*.ts': ['GET'] } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--warn']);
	assert.equal(process.exitCode, 1);
	assert.match(fixtureText(root, 'src/pages/api/report.ts'), /export const extra/);
	fixtureFile(root, 'src/pages/api/report.ts', 'export const GET = () => 1;\n');
	fixtureFile(
		root,
		'bin/knip.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [{ file: 'src/pages/api/report.ts', exports: [{ name: 'GET', line: 1 }] }] }));\nprocess.exitCode = 1;\n`,
		0o755,
	);
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--warn']);
	assert.equal(process.exitCode, 0);
});
test('dead-code reports a contradictory Knip result as a non-blocking actionable warning', () => {
	const root = fixtureRoot('terra-quality-knip-import-consumer-');
	const owner = fixtureFile(root, 'src/auth.ts', `export function createClient() { return 'ready'; }\n`);
	const consumer = fixtureFile(root, 'src/consumer.ts', `import { createClient as makeClient } from './auth';\nexport const result = makeClient();\n`);
	const namespaceConsumer = fixtureFile(root, 'src/namespace-consumer.ts', `import * as Auth from './auth';\nexport const namespaceResult = Auth.createClient();\n`);
	const knip = fixtureFile(
		root,
		'bin/knip-used-export.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [{ file: 'src/auth.ts', exports: [{ name: 'createClient', line: 1 }] }] }));\nprocess.exitCode = 1;\n`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip }, enabledChecks: { lint: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0, 'a manual-only detector disagreement is a warning');
	assert.match(fixtureText(root, 'src/auth.ts'), /export function createClient/);
	assert.match(fixtureText(root, 'src/consumer.ts'), /makeClient\(\)/);
	assert.match(fixtureText(root, 'src/namespace-consumer.ts'), /Auth\.createClient\(\)/);
	assert.equal(readFileSync(owner, 'utf8'), `export function createClient() { return 'ready'; }\n`);
	assert.equal(readFileSync(consumer, 'utf8'), `import { createClient as makeClient } from './auth';\nexport const result = makeClient();\n`);
	assert.equal(readFileSync(namespaceConsumer, 'utf8'), `import * as Auth from './auth';\nexport const namespaceResult = Auth.createClient();\n`);
	resetExitCode();
});
test('dead-code warn reports manual findings with explicit autofix status and makes no source edits', () => {
	const root = fixtureRoot('terra-quality-dead-code-warn-manual-');
	const src = fixtureFile(root, 'src/main.ts', 'export const Client = 1;\n');
	const consumer = fixtureFile(root, 'src/use.ts', "import { Client } from './main';\nvoid [Client, Client];\n");
	const knip = fixtureFile(
		root,
		'bin/knip.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [{ file: 'src/main.ts', exports: [{ name: 'Client', line: 1 }] }] }));\nprocess.exitCode = 1;\n`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip }, enabledChecks: { lint: false } });
	const original = [readFileSync(src, 'utf8'), readFileSync(consumer, 'utf8')];
	const output = [];
	const originalErr = [console.error][0];
	console.error = (...parts) => output.push(parts.join(' '));
	try {
		resetExitCode();
		runQualityCli(cfg, ['dead-code', '--all', '--warn']);
	} finally {
		console.error = originalErr;
	}
	assert.equal(process.exitCode, 0, `manual-only warnings are visible without failing --warn:\n${output.join('\n')}`);
	assert.deepEqual([readFileSync(src, 'utf8'), readFileSync(consumer, 'utf8')], original);
	assert.match(output.join('\n'), /\[WARNING\] knip\/exports: src\/main\.ts:1 Client/);
	assert.match(output.join('\n'), /Autofix: not safe or not supported/);
	assert.match(output.join('\n'), /Agent action: Reconcile the reported consumer/);
	resetExitCode();
});
test('dead-code reports Astro-consumed exports when Knip disagrees without modifying them', () => {
	const root = fixtureRoot('terra-quality-knip-astro-consumer-');
	const owner = fixtureFile(root, 'src/widget.tsx', `export function Widget() { return null; }\n`);
	const astroPage = fixtureFile(root, 'src/page.astro', `---\nimport { Widget as PageWidget } from './widget';\n---\n<PageWidget />\n`);
	const knip = fixtureFile(
		root,
		'bin/knip-astro-used-export.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [{ file: 'src/widget.tsx', exports: [{ name: 'Widget', line: 1 }] }] }));\nprocess.exitCode = 1;\n`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx', '.astro'], tools: { knip }, enabledChecks: { lint: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0, 'a manual-only detector disagreement is a warning');
	assert.equal(readFileSync(owner, 'utf8'), `export function Widget() { return null; }\n`);
	assert.equal(readFileSync(astroPage, 'utf8'), `---\nimport { Widget as PageWidget } from './widget';\n---\n<PageWidget />\n`);
	resetExitCode();
});
test('read-only dead-code preview copies shared support modules outside configured source roots', () => {
	const root = fixtureRoot('terra-quality-preview-shared-support-');
	fixtureFile(root, 'src/main.ts', `import '../shared/regex.mjs';\nexport const value = 1;\n`);
	fixtureFile(root, 'shared/regex.mjs', 'export const pattern = /value/;\n');
	fixtureFile(
		root,
		'node_modules/.bin/eslint',
		`#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
if (!existsSync(join(process.cwd(), 'shared/regex.mjs'))) {
  process.stderr.write('preview omitted shared/regex.mjs');
  process.exit(2);
}
const files = process.argv.slice(2).filter((arg) => arg.endsWith('.ts'));
process.stdout.write(JSON.stringify(files.map((filePath) => ({ filePath, messages: [] }))));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.mjs'], tools: { eslint: 'eslint' }, enabledChecks: { knip: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all', '--warn']);
	assert.equal(process.exitCode, 0);
	resetExitCode();
});
test('dead-code reports an exported ESLint location as manual after Knip rewrites its sibling export', () => {
	const root = fixtureRoot('terra-quality-knip-eslint-file-boundary-');
	const src = fixtureFile(root, 'src/auth.ts', `export function createClient() { return 'ready'; }\nexport const extra = 1;\n`);
	const knip = fixtureFile(
		root,
		'bin/knip-file-boundary.mjs',
		`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const src = readFileSync(${JSON.stringify(src)}, 'utf8');
const issues = src.includes('export const extra') ? [{ file: 'src/auth.ts', exports: [{ name: 'extra', line: 2 }] }] : [];
process.stdout.write(JSON.stringify({ issues }));
if (issues.length) process.exitCode = 1;
`,
		0o755,
	);
	const eslint = fixtureFile(
		root,
		'bin/eslint-file-boundary.mjs',
		`#!/usr/bin/env node
process.stdout.write(JSON.stringify([{ filePath: ${JSON.stringify(src)}, messages: [{ ruleId: 'unused-imports/no-unused-vars', line: 1, column: 17, message: 'unused declaration' }] }]));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip, eslint } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0, 'the unsupported ESLint location is a manual warning');
	assert.match(fixtureText(root, 'src/auth.ts'), /export function createClient/);
	assert.match(fixtureText(root, 'src/auth.ts'), /const extra = 1/);
	assert.doesNotMatch(fixtureText(root, 'src/auth.ts'), /export const extra/);
	resetExitCode();
});
test('dead-code passes a discovered TypeScript flat ESLint config explicitly', () => {
	const root = fixtureRoot('terra-quality-eslint-flat-config-');
	const src = fixtureFile(root, 'src/main.ts', 'export const value = 1;\n');
	const config = fixtureFile(root, 'eslint.config.ts', 'export default [];\n');
	const eslint = fixtureFile(
		root,
		'bin/eslint-config-recorder.mjs',
		`#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(join(root, 'eslint-args.jsonl'))}, JSON.stringify(process.argv.slice(2)) + '\\n');
const files = process.argv.slice(2).filter((arg) => arg.endsWith('.ts') && !arg.includes('eslint.config.ts'));
process.stdout.write(JSON.stringify(files.map((filePath) => ({ filePath, messages: [] }))));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all', '--warn']);
	assert.equal(process.exitCode, 0);
	const args = JSON.parse(fixtureText(root, 'eslint-args.jsonl').trim());
	assert.deepEqual(args.slice(0, 4), ['--format', 'json', '--no-ignore', '--config']);
	assert.equal(args[4], config);
	assert.ok(args.includes(src));
	resetExitCode();
});
test('dead-code preserves Astro frontmatter consumers resolved through configured TypeScript aliases', () => {
	const root = fixtureRoot('terra-quality-knip-astro-alias-consumer-');
	const owner = fixtureFile(root, 'astro/src/lib/auth.server.ts', `export function createClient() { return 'ready'; }\n`);
	const astroPage = fixtureFile(root, 'astro/src/pages/index.astro', `---\nimport { createClient } from '@/lib/auth.server';\nconst client = createClient();\n---\n<p>{client}</p>\n`);
	const knip = fixtureFile(
		root,
		'bin/knip-astro-alias-used-export.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [{ file: 'astro/src/lib/auth.server.ts', exports: [{ name: 'createClient', line: 1 }] }] }));\nprocess.exitCode = 1;\n`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['astro/src'], extensions: ['.ts', '.astro'], aliases: { '@/': 'astro/src/' }, tools: { knip }, enabledChecks: { lint: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0, 'a manual-only detector disagreement is a warning');
	assert.equal(readFileSync(owner, 'utf8'), `export function createClient() { return 'ready'; }\n`);
	assert.equal(readFileSync(astroPage, 'utf8'), `---\nimport { createClient } from '@/lib/auth.server';\nconst client = createClient();\n---\n<p>{client}</p>\n`);
	resetExitCode();
});
test('dead-code removes only proven unused export modifiers and preserves framework contracts', () => {
	const root = fixtureRoot('terra-quality-knip-fix-');
	const src = fixtureFile(root, 'src/pages/api/report.ts', 'export const GET = () => 1;\nexport const extra = 2;\nexport const following = 3;\n');
	const privateSrc = fixtureFile(root, 'src/pages/api/_private.ts', 'export const GET = () => 3;\n');
	const reexports = fixtureFile(root, 'src/reexports.ts', "export { obsoleteStart, used, obsoleteTail, obsoleteTail2 } from './service';\nexport { extra } from './other';\n");
	const knip = fixtureFile(
		root,
		'bin/knip.mjs',
		`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const src = readFileSync(${JSON.stringify(src)}, 'utf8');
const privateSrc = readFileSync(${JSON.stringify(privateSrc)}, 'utf8');
const reexports = readFileSync(${JSON.stringify(reexports)}, 'utf8');
const issues = [
	...(src.includes('export const extra') ? [{ file: 'src/pages/api/report.ts', exports: [{ name: 'GET', line: 1 }, { name: 'extra', line: 2 }] }] : []),
	...(privateSrc.includes('export const GET') ? [{ file: 'src/pages/api/_private.ts', exports: [{ name: 'GET', line: 1 }] }] : []),
	...(reexports.includes('obsolete') || reexports.includes("export { extra }") ? [{ file: 'src/reexports.ts', exports: [...(reexports.includes('obsoleteStart') ? [{ name: 'obsoleteStart', line: 1 }] : []), ...(reexports.includes('obsoleteTail,') ? [{ name: 'obsoleteTail', line: 1 }] : []), ...(reexports.includes('obsoleteTail2') ? [{ name: 'obsoleteTail2', line: 1 }] : []), ...(reexports.includes("export { extra }") ? [{ name: 'extra', line: 2 }] : [])] }] : []),
];
process.stdout.write(JSON.stringify({ issues }));
if (issues.length) process.exitCode = 1;
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip }, enabledChecks: { lint: false }, frameworkEntryExports: { 'src/pages/**/*.ts': ['GET'] } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0);
	assert.match(fixtureText(root, 'src/pages/api/report.ts'), /export const GET/);
	assert.match(fixtureText(root, 'src/pages/api/report.ts'), /const extra/);
	assert.doesNotMatch(fixtureText(root, 'src/pages/api/report.ts'), /export const extra/);
	assert.match(fixtureText(root, 'src/pages/api/report.ts'), /\nexport const following/);
	assert.doesNotMatch(fixtureText(root, 'src/pages/api/_private.ts'), /export const GET/);
	assert.match(fixtureText(root, 'src/reexports.ts'), /export \{ used \} from '\.\/service'/);
	assert.doesNotMatch(fixtureText(root, 'src/reexports.ts'), /obsolete|export \{ extra/);
	assert.match(fixtureText(root, 'src/reexports.ts'), /import '\.\/other';/);
});
test('dead-code keeps an unreachable source file for explicit agent review', () => {
	const root = fixtureRoot('terra-quality-knip-unused-file-');
	const unused = fixtureFile(root, 'src/orphan.ts', 'export const orphan = true;\n');
	const knip = fixtureFile(
		root,
		'bin/knip-unused-file.mjs',
		`#!/usr/bin/env node
import { existsSync } from 'node:fs';
const issues = existsSync(${JSON.stringify(unused)}) ? [{ file: 'src/orphan.ts', files: [{ name: 'src/orphan.ts' }] }] : [];
process.stdout.write(JSON.stringify({ issues }));
if (issues.length) process.exitCode = 1;
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip }, enabledChecks: { lint: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0);
	assert.equal(existsSync(unused), true);
});
test('dead-code preserves safe file-local fixes when TypeScript rejects another source file', () => {
	const root = fixtureRoot('terra-quality-dead-code-type-rollback-');
	const src = fixtureFile(root, 'src/used.ts', `function keep(): number { return 1; }\nexport const result = keep();\n`);
	const s = fixtureFile(root, 'src/unused.ts', `function removeMe(): number { return 2; }\n`);
	const eslint = fixtureFile(
		root,
		'bin/eslint-type-rollback.mjs',
		`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const files = [${JSON.stringify(src)}, ${JSON.stringify(s)}];
const reports = files.map(file => {
	const text = readFileSync(file, 'utf8');
	const name = file === ${JSON.stringify(src)} ? 'keep' : 'removeMe';
	const start = text.indexOf(name);
	const before = text.slice(0, start).split('\\n');
	return { filePath: file, messages: start < 0 ? [] : [{ ruleId: 'unused-imports/no-unused-vars', line: before.length, column: before.at(-1).length + 1, message: name + ' is unused' }] };
});
process.stdout.write(JSON.stringify(reports));
`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	resetExitCode();
	runQualityCli(cfg, ['dead-code', '--all']);
	assert.equal(process.exitCode, 0, 'the type-rejected file is an actionable warning');
	assert.match(readFileSync(src, 'utf8'), /function keep/);
	assert.doesNotMatch(fixtureText(root, 'src/unused.ts'), /removeMe/);
	resetExitCode();
});
test('dead-code fails closed when Knip exits unsuccessfully with an empty inventory', () => {
	const root = fixtureRoot('terra-quality-knip-malformed-');
	fixtureFile(root, 'src/main.ts', 'export const value = 1;\n');
	const knip = fixtureFile(root, 'bin/knip.mjs', `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [] }));\nprocess.exitCode = 1;\n`, 0o755);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip }, enabledChecks: { lint: false } });
	assert.throws(() => runQualityCli(cfg, ['dead-code', '--warn']), /failure without findings/);
	assert.equal(fixtureText(root, 'src/main.ts'), 'export const value = 1;\n');
});
test('dead-code validates the full Knip inventory before changing any export', () => {
	const root = fixtureRoot('terra-quality-knip-incomplete-inventory-');
	const src = fixtureFile(root, 'src/main.ts', 'export const unused = 1;\n');
	const knip = fixtureFile(
		root,
		'bin/knip-inventory.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ issues: [{ file: 'src/main.ts', exports: [{ name: 'unused', line: 1 }] }, { file: '../outside.ts', exports: [{ name: 'external', line: 1 }] }] }));\nprocess.exitCode = 1;\n`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { knip }, enabledChecks: { lint: false } });
	assert.throws(() => runQualityCli(cfg, ['dead-code', '--all']), /outside the repository/);
	assert.equal(readFileSync(src, 'utf8'), 'export const unused = 1;\n', 'malformed inventory is rejected before a partial fix');
});
test('dead-code fails closed when ESLint omits a configured source file', () => {
	const root = fixtureRoot('terra-quality-eslint-incomplete-inventory-');
	fixtureFile(root, 'src/one.ts', 'export const one = 1;\n');
	fixtureFile(root, 'src/two.ts', 'export const two = 2;\n');
	const eslint = fixtureFile(
		root,
		'bin/eslint-inventory.mjs',
		`#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify([{ filePath: ${JSON.stringify(join(root, 'src/one.ts'))}, messages: [] }]));\n`,
		0o755,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint }, enabledChecks: { knip: false } });
	assert.throws(() => runQualityCli(cfg, ['dead-code', '--all', '--warn']), /missing reports/);
	assert.equal(fixtureText(root, 'src/one.ts'), 'export const one = 1;\n');
	assert.equal(fixtureText(root, 'src/two.ts'), 'export const two = 2;\n');
});
test('CLI recommendation execution is opt-in per invocation and recommendation failures remain non-blocking', () => {
	const root = fixtureRoot('terra-quality-recommendations-');
	const cmd = recordingCmd(root, 'recommendations.jsonl');
	const cfg = createQualityCfg({
		root,
		sourceRoots: [],
		extensions: ['.ts'],
		enabledChecks: { document: false, format: false, import: false, name: false, alias: false, forward: false, lint: false, knip: false, type: false, command: false, diff: false },
		recommendationCommands: [{ name: 'fixture', command: cmd, args: ['--advice'] }],
	});
	resetExitCode();
	runQualityCli(cfg, ['quality', '--all']);
	assert.deepEqual(recordedCmds(root, 'recommendations.jsonl'), [['--advice']]);
	assert.equal(process.exitCode, 0);
	fixtureFile(root, 'recommendations.jsonl', '');
	runQualityCli(cfg, ['quality', '--all', '--skip-recommendations']);
	assert.equal(readFileSync(join(root, 'recommendations.jsonl'), 'utf8'), '');
});
test('CLI UI-pattern dispatch reports findings through the process exit status', () => {
	const root = fixtureRoot('terra-quality-pattern-dispatch-');
	fixtureFile(root, 'src/view.tsx', '<button>Legacy</button>\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], uiPatterns: { forbidden: ['<button'] } });
	resetExitCode();
	runQualityCli(cfg, ['ui-patterns', '--all']);
	assert.equal(process.exitCode, 1);
	resetExitCode();
});
test('quality CLI checks and autofixes Tailwind canonical-class suggestions', async () => {
	const root = fixtureRoot('terra-quality-tailwind-cli-');
	fixtureFile(root, 'package.json', '{"type":"module"}\n');
	fixtureFile(root, 'styles/tailwind.css', '@import "tailwindcss";\n');
	fixtureFile(root, 'node_modules/tailwindcss/package.json', JSON.stringify({ name: 'tailwindcss', type: 'module', main: 'index.mjs' }));
	fixtureFile(
		root,
		'node_modules/tailwindcss/index.mjs',
		`export async function __unstable__loadDesignSystem() {
	return { canonicalizeCandidates(candidates) { return candidates.map((candidate) => candidate === 'border-[var(--sl-color-gray-5)]' ? 'border-(--sl-color-gray-5)' : candidate); } };
}\n`,
	);
	fixtureFile(root, 'src/view.tsx', '<div className="border-[var(--sl-color-gray-5)]" />\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.tsx'],
		tailwindCanonical: { stylesheet: 'styles/tailwind.css' },
		enabledChecks: {
			document: false,
			format: false,
			import: false,
			name: false,
			forward: false,
			lint: false,
			knip: false,
			'dead-code': false,
			type: false,
			recommend: false,
			command: false,
			diff: false,
			alias: false,
			security: false,
			'repeated-classes': false,
			'regex-dedup': false,
			'ui-patterns': false,
			github: false,
		},
	});
	resetExitCode();
	await runQualityCli({ ...cfg, enabledChecks: { ...cfg.enabledChecks, 'tailwind-canonical': false } }, ['tailwind-canonical']);
	await assert.rejects(runQualityCli({ ...cfg, autofix: { tailwindCanonical: false } }, ['tailwind-canonical']), /failed with 1 suggestion/);
	await assert.rejects(runQualityCli(cfg, ['quality', '--all', '--warn', '--skip-commands', '--skip-recommendations', '--report-json', 'quality.json']), /failed with 1 suggestion/);
	assert.deepEqual(
		JSON.parse(fixtureText(root, 'quality.json')).checks.find((check) => check.name === 'tailwind-canonical'),
		{ name: 'tailwind-canonical', status: 'failed', findings: 1 },
	);
	assert.equal(fixtureText(root, 'src/view.tsx'), '<div className="border-[var(--sl-color-gray-5)]" />\n');
	resetExitCode();
	await runQualityCli(cfg, ['quality', '--all', '--skip-commands', '--skip-recommendations']);
	assert.equal(fixtureText(root, 'src/view.tsx'), '<div className="border-(--sl-color-gray-5)" />\n');
	await runQualityCli(cfg, ['tailwind-canonical', '--warn', '--report-json', 'quality.json']);
	assert.deepEqual(
		JSON.parse(fixtureText(root, 'quality.json')).checks.find((check) => check.name === 'tailwind-canonical'),
		{ name: 'tailwind-canonical', status: 'passed', findings: 0 },
	);
	resetExitCode();
});
