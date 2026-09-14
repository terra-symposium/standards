/**
 * packages/quality/test/runner.test.mjs
 * Verifies configuration normalization, check/autofix toggles, shared
 * analysis construction, CLI dispatch, subprocess status handling, formatter
 * batching, and the explicit command boundaries.
 * Tool invocations use tiny executable fixtures that record their arguments.
 * This makes command wiring testable without installing or running a real
 * formatter, linter, compiler, or repository build.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
import { createQualityAnalysis, createQualityCfg, loadQualityCfg, qualityAutofixEnabled, qualityCheckEnabled, qualityCommandEnabled, qualityRecommendationEnabled, runFormatter, runQuality, runQualityCli, runQualityFromConfig, runTypecheck } from '../dist/index.js';
import { existsSync, readFileSync } from 'node:fs';
import { fixtureFile, fixtureRoot, fixtureText, resetExitCode } from './support.mjs';
import { join } from 'node:path';

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
test('loadQualityCfg resolves a quality file root relative to the configuration file', () => {
	const root = fixtureRoot('terra-quality-load-config-');
	const cfgDir = join(root, 'config');
	const cfgPath = fixtureFile(root, 'config/quality.json', JSON.stringify({ root: '..', sourceRoots: ['src'], extensions: ['.ts'] }));
	const cfg = loadQualityCfg(cfgPath);
	assert.equal(cfg.root, root);
	assert.deepEqual(cfg.sourceRoots, [join(root, 'src')]);
	assert.deepEqual(cfg.extensions, ['.ts']);
	assert.equal(cfgDir, join(root, 'config'));
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
	assert.equal(qualityCommandEnabled(cfg, 'build'), false);
	assert.equal(qualityCommandEnabled(cfg, 'test'), false);
	assert.equal(qualityRecommendationEnabled(cfg, 'migration'), false);
	assert.equal(qualityRecommendationEnabled(cfg, 'architecture'), false);
	const enabled = createQualityCfg({ root: cfg.root, sourceRoots: [], extensions: ['.ts'], qualityCommands: [], recommendationCommands: [] });
	assert.equal(qualityCommandEnabled(enabled, 'build'), true);
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
	const command = { command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`] };
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], typecheckCommand: command });
	runTypecheck(cfg, ['src/main.ts']);
	assert.equal(existsSync(marker), false);
	runTypecheck(cfg);
	assert.equal(readFileSync(marker, 'utf8'), 'ran');
});
test('CLI domain dispatch runs enabled commands, skips disabled commands, and rejects unknown domains', () => {
	const root = fixtureRoot('terra-quality-domain-api-');
	const marker = join(root, 'domain-ran.txt');
	const command = { name: 'fixture', command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`] };
	const cfg = createQualityCfg({ root, sourceRoots: [], extensions: ['.ts'], qualityCommands: [command] });
	runQualityCli(cfg, ['domain', 'fixture']);
	assert.equal(readFileSync(marker, 'utf8'), 'ran');
	fixtureFile(root, 'domain-ran.txt', 'reset');
	const disabled = createQualityCfg({ root, sourceRoots: [], extensions: ['.ts'], qualityCommands: [command], enabledCommands: { fixture: false } });
	runQualityCli(disabled, ['domain', 'fixture']);
	assert.equal(readFileSync(marker, 'utf8'), 'reset');
	assert.throws(() => runQualityCli(cfg, ['domain', 'missing']), /Unknown quality domain/);
});
test('runQualityFromConfig loads JSON and reaches the same explicit domain boundary as an in-memory configuration', () => {
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
	runQualityFromConfig(cfg, ['domain', 'fixture']);
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
test('CLI lint and Knip branches pass their focused flags and autofix policy to configured tools', () => {
	const root = fixtureRoot('terra-quality-tool-branches-');
	const eslint = recordingCmd(root, 'eslint-args.jsonl', 'bin/record-eslint.mjs');
	const knip = recordingCmd(root, 'knip-args.jsonl', 'bin/record-knip.mjs');
	fixtureFile(root, 'src/main.ts', 'const value = true;\nvoid value;\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], tools: { eslint, knip } });
	runQualityCli(cfg, ['lint', '--all', '--warn']);
	assert.deepEqual(recordedCmds(root, 'eslint-args.jsonl'), [
		['--cache', '--cache-strategy', 'content', '--cache-location', 'node_modules/.cache/eslint', '--no-warn-ignored', join(root, 'src/main.ts')],
	]);
	runQualityCli(cfg, ['knip', '--all']);
	assert.deepEqual(recordedCmds(root, 'knip-args.jsonl'), [
		['--fix', '--allow-remove-files', '--no-exit-code'],
		['--include', 'unresolved,nsExports,nsTypes,cycles', '--no-exit-code'],
	]);
	runQualityCli(cfg, ['knip', '--all', '--warn']);
	assert.deepEqual(recordedCmds(root, 'knip-args.jsonl').at(-1), ['--include', 'unresolved,nsExports,nsTypes,cycles', '--no-exit-code']);
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
