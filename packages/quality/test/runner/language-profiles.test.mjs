/**
 * packages/quality/test/runner/language-profiles.test.mjs
 * Verifies profile selection, source-scoped command expansion, tool requirements, and command overrides.
 * Native tools are replaced with small executable fixtures so the suite runs on Node-only machines.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createQualityCfg,
	inspectLanguageProfileTool,
	LANGUAGE_CAPABILITIES,
	QUALITY_CAPABILITY_AUTOFIXES,
	QUALITY_CAPABILITY_CHECKS,
	resolveLanguageProfiles,
	runQualityCli,
} from '../../dist/index.js';

// NODE
import { delimiter, dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

// TEST SUPPORT
import { fixtureFile, fixtureRoot, fixtureText, resetExitCode } from '../../support/fixtures.mjs';

/*//////////////////////////////////////////////////
DATA
//////////////////////////////////////////////////*/

const DISABLED_SOURCE_CHECKS = {
	document: false,
	format: false,
	import: false,
	name: false,
	forward: false,
	accessibility: false,
	'display-name': false,
	'performance-patterns': false,
	'documented-commands': false,
	lint: false,
	knip: false,
	'dead-code': false,
	type: false,
	alias: false,
	security: false,
	'repeated-classes': false,
	'tailwind-canonical': false,
	'regex-dedup': false,
	'ui-patterns': false,
	'ui-recommendations': false,
	diff: false,
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates a native-tool fixture that reports a supported version and records actual check arguments.
 *
 * @param root Fixture repository where the executable is installed.
 * @param name Executable name resolved through the fixture PATH.
 * @param version Version printed by the fixture's `--version` probe.
 *
 * @return Absolute executable path usable by a profile command.
 */
function fakeProfileTool(root, name, version) {
	return fixtureFile(
		root,
		`bin/${name}`,
		`#!/usr/bin/env node\nimport { appendFileSync } from 'node:fs';\nif (process.argv[2] === '--version' || process.argv[2] === '-version') console.log(${JSON.stringify(`${name} ${version}`)});\nelse appendFileSync(process.env.TERRA_QUALITY_PROFILE_MARKER, JSON.stringify({ name: ${JSON.stringify(name)}, args: process.argv.slice(2) }) + '\\n');\n`,
		0o755,
	);
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('language profiles resolve only matching source files and optional project checks', () => {
	const root = fixtureRoot('terra-quality-language-profiles-');
	fixtureFile(root, 'src/image.c', 'int main(void) { return 0; }\n');
	fixtureFile(root, 'src/image.h', '#pragma once\n');
	fixtureFile(root, 'src/App.java', 'class App {}\n');
	fixtureFile(root, 'src/Second.java', 'class Second {}\n');
	fixtureFile(root, 'src/worker.py', 'pass\n');
	fixtureFile(root, 'src/types.pyi', 'def work() -> None: ...\n');
	fixtureFile(root, 'Doxyfile', 'INPUT = src\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], languageProfiles: ['c', 'java', 'python'] });
	const resolved = resolveLanguageProfiles(cfg);
	assert.deepEqual(
		resolved.checks.map(({ name }) => name),
		[
			'c-format',
			'c-static-analysis',
			'c-clang-tidy',
			'c-documentation',
			'java-format',
			'java-checkstyle',
			'java-pmd',
			'java-spotbugs',
			'python-format',
			'python-lint',
			'python-mypy',
			'python-bandit',
			'python-vulture',
			'python-docstring-coverage',
			'python-docstring-signatures',
		],
	);
	assert.deepEqual(
		resolved.checks.find(({ name }) => name === 'c-format')?.files.map((path) => path.slice(root.length + 1)),
		['src/image.c', 'src/image.h'],
	);
	assert.deepEqual(
		resolved.checks.find(({ name }) => name === 'c-static-analysis')?.files.map((path) => path.slice(root.length + 1)),
		['src/image.c'],
	);
	assert.deepEqual(
		resolved.checks.find(({ name }) => name === 'python-lint')?.files.map((path) => path.slice(root.length + 1)),
		['src/types.pyi', 'src/worker.py'],
	);
	const pmdArgs = resolved.checks.find(({ name }) => name === 'java-pmd')?.args ?? [];
	assert.equal(pmdArgs[0], 'check');
	assert.equal(pmdArgs[1], '-d');
	assert.deepEqual(
		pmdArgs.slice(2, 4).map((path) => path.slice(root.length + 1)),
		['src/App.java', 'src/Second.java'],
	);
	assert.deepEqual(resolved.skipped, []);
	assert.deepEqual(resolved.failed, []);
	assert.equal(cfg.extensions.includes('.java'), false);
});

test('selected profiles with no matching sources are reported as skipped', () => {
	const root = fixtureRoot('terra-quality-language-profile-empty-');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: [], languageProfiles: ['java'], enabledChecks: DISABLED_SOURCE_CHECKS });
	const resolved = resolveLanguageProfiles(cfg);
	assert.deepEqual(resolved.checks, []);
	assert.deepEqual(
		resolved.skipped.map(({ name }) => name),
		['java-format', 'java-checkstyle', 'java-pmd', 'java-spotbugs'],
	);
	assert.ok(resolved.skipped.every(({ reason }) => reason === 'no java source files were found'));
	runQualityCli(cfg, ['quality', '--all', '--report-json', 'profile-report.json']);
	const report = JSON.parse(fixtureText(root, 'profile-report.json'));
	assert.equal(report.checks.find(({ name }) => name === 'command:java-format')?.status, 'skipped');
	assert.equal(report.checks.find(({ name }) => name === 'command:java-checkstyle')?.status, 'skipped');
});

test('configuration rejects duplicate and unknown language profile identifiers', () => {
	const root = fixtureRoot('terra-quality-language-profile-validation-');
	const base = { root, sourceRoots: [], extensions: [] };
	assert.throws(() => createQualityCfg({ ...base, languageProfiles: ['c', 'c'] }), /must not contain duplicate/);
	assert.throws(() => createQualityCfg({ ...base, languageProfiles: ['rust'] }), /Unknown language profile/);
});

test('every built-in check and autofix has an explicit per-language capability disposition', () => {
	for (const language of ['js-ts', 'c', 'java', 'python']) {
		const capability = LANGUAGE_CAPABILITIES[language];
		assert.deepEqual(Object.keys(capability.checks).sort(), [...QUALITY_CAPABILITY_CHECKS].sort());
		assert.deepEqual(Object.keys(capability.autofixes).sort(), [...QUALITY_CAPABILITY_AUTOFIXES].sort());
		for (const item of [...Object.values(capability.checks), ...Object.values(capability.autofixes)]) {
			assert.ok(item.provider);
			if (item.status === 'not-applicable') assert.ok(item.reason);
		}
	}
});

test('documentation commands resolve automatically for detected source even when a full profile is not selected', () => {
	const root = fixtureRoot('terra-quality-auto-documentation-profile-');
	fixtureFile(root, 'src/private.py', 'def helper(value): return value\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: [] });
	const resolved = resolveLanguageProfiles(cfg);
	assert.deepEqual(
		resolved.checks.map(({ name }) => name),
		['python-docstring-coverage', 'python-docstring-signatures'],
	);
});

test('missing required documentation configuration fails and JSON reports explicit N/A capabilities', () => {
	const root = fixtureRoot('terra-quality-documentation-prerequisite-');
	fixtureFile(root, 'src/main.c', 'static int helper(void) { return 1; }\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: [], enabledChecks: { ...DISABLED_SOURCE_CHECKS, document: true } });
	const resolved = resolveLanguageProfiles(cfg);
	assert.deepEqual(resolved.failed, [{ name: 'c-documentation', profileId: 'c', reason: 'required configuration Doxyfile is absent' }]);
	const previousError = console.error;
	console.error = () => {};
	try {
		runQualityCli(cfg, ['quality', '--all', '--warn', '--report-json', 'report.json']);
		const report = JSON.parse(fixtureText(root, 'report.json'));
		assert.equal(report.checks.find(({ name }) => name === 'command:c-documentation')?.status, 'failed');
		assert.match(report.checks.find(({ name }) => name === 'command:c-documentation')?.reason ?? '', /Doxyfile is absent/);
		const inaccessible = report.checks.find(({ name }) => name === 'c:accessibility');
		assert.equal(inaccessible?.status, 'not-applicable');
		assert.match(inaccessible?.reason ?? '', /JSX\/TSX/);
	} finally {
		console.error = previousError;
		resetExitCode();
	}
});

test('profile tool checks enforce their minimum version and include installation guidance', () => {
	const root = fixtureRoot('terra-quality-language-tool-version-');
	const toolPath = fixtureFile(root, 'bin/fixture-tool', '#!/bin/sh\nprintf "fixture-tool 1.2.3\\n"\n', 0o755);
	assert.deepEqual(inspectLanguageProfileTool({ command: toolPath, versionArgs: ['--version'], minimumVersion: [1, 2, 0], install: 'Install fixture-tool.' }, root), { version: '1.2.3' });
	const oldVersion = inspectLanguageProfileTool({ command: toolPath, versionArgs: ['--version'], minimumVersion: [1, 3, 0], install: 'Install fixture-tool.' }, root);
	assert.match(oldVersion.error ?? '', /below the supported minimum 1\.3\.0/);
	assert.match(oldVersion.error ?? '', /Install fixture-tool/);
	const missing = inspectLanguageProfileTool({ command: 'terra-quality-no-such-tool', versionArgs: ['--version'], minimumVersion: [1, 0, 0], install: 'Install the missing tool.' }, root);
	assert.match(missing.error ?? '', /unavailable/);
	assert.match(missing.error ?? '', /Install the missing tool/);
});

test('selected profiles fail clearly when a required tool is missing', () => {
	const root = fixtureRoot('terra-quality-language-profile-missing-tool-');
	fixtureFile(root, 'src/app.py', 'print("ready")\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: [], languageProfiles: ['python'], enabledChecks: DISABLED_SOURCE_CHECKS });
	const previousPath = process.env.PATH;
	const previousError = console.error;
	const errors = [];
	process.env.PATH = join(root, 'empty-bin');
	console.error = (...values) => errors.push(values.join(' '));
	try {
		runQualityCli(cfg, ['quality', '--all']);
		assert.equal(process.exitCode, 1);
		assert.ok(errors.some((line) => line.includes('Required tool "ruff" is unavailable')));
		assert.ok(errors.some((line) => line.includes('uv add --dev ruff')));
	} finally {
		if (previousPath === undefined) delete process.env.PATH;
		else process.env.PATH = previousPath;
		console.error = previousError;
		resetExitCode();
	}
});

test('C, Java, and Python profiles invoke their native checks in phase order', () => {
	const root = fixtureRoot('terra-quality-language-profile-tools-');
	fixtureFile(root, 'src/image.c', 'int main(void) { return 0; }\n');
	fixtureFile(root, 'src/image.h', '#pragma once\n');
	fixtureFile(root, 'src/App.java', 'class App {}\n');
	fixtureFile(root, 'src/worker.py', 'pass\n');
	fixtureFile(root, 'src/types.pyi', 'def work() -> None: ...\n');
	fixtureFile(root, 'Doxyfile', 'INPUT = src\n');
	for (const [name, version] of [
		['clang-format', '18.0.0'],
		['clang', '18.0.0'],
		['clang-tidy', '18.0.0'],
		['doxygen', '1.9.8'],
		['google-java-format', '1.36.0'],
		['checkstyle', '14.0.0'],
		['pmd', '7.13.0'],
		['spotbugs', '4.9.0'],
		['ruff', '0.15.0'],
		['mypy', '1.18.0'],
		['bandit', '1.8.0'],
		['vulture', '2.14.0'],
		['interrogate', '1.7.0'],
		['pydoclint', '0.11.1'],
	])
		fakeProfileTool(root, name, version);
	fixtureFile(root, 'target/classes/Example.class', 'fixture');
	const previousPath = process.env.PATH;
	const previousMarker = process.env.TERRA_QUALITY_PROFILE_MARKER;
	const marker = join(root, 'native-calls.jsonl');
	process.env.PATH = [join(root, 'bin'), dirname(process.execPath), previousPath].filter(Boolean).join(delimiter);
	process.env.TERRA_QUALITY_PROFILE_MARKER = marker;
	try {
		const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: [], languageProfiles: ['c', 'java', 'python'], enabledChecks: { ...DISABLED_SOURCE_CHECKS, document: true } });
		runQualityCli(cfg, ['quality', '--all', '--warn']);
		const calls = readFileSync(marker, 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		assert.deepEqual(
			calls.map(({ name }) => name),
			['clang-format', 'google-java-format', 'ruff', 'clang', 'clang-tidy', 'doxygen', 'checkstyle', 'pmd', 'ruff', 'bandit', 'vulture', 'interrogate', 'pydoclint', 'mypy', 'spotbugs'],
		);
		resetExitCode();
	} finally {
		if (previousPath === undefined) delete process.env.PATH;
		else process.env.PATH = previousPath;
		if (previousMarker === undefined) delete process.env.TERRA_QUALITY_PROFILE_MARKER;
		else process.env.TERRA_QUALITY_PROFILE_MARKER = previousMarker;
	}
});

test('profile defaults can be overridden while arbitrary language commands remain available', () => {
	const root = fixtureRoot('terra-quality-language-command-overrides-');
	fixtureFile(root, 'src/app.py', 'print("ready")\n');
	const marker = join(root, 'commands.txt');
	const append = (phase) => ['-e', `require('node:fs').appendFileSync(${JSON.stringify(marker)}, ${JSON.stringify(`${phase}\n`)})`];
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: [],
		languageProfiles: ['python'],
		enabledChecks: DISABLED_SOURCE_CHECKS,
		enabledCommands: { 'python-mypy': false, 'python-bandit': false, 'python-vulture': false },
		qualityCommands: [
			{ name: 'python-format', command: process.execPath, args: append('format') },
			{ name: 'python-lint', command: process.execPath, args: append('lint') },
			{ name: 'rust-tests', command: process.execPath, args: append('custom') },
		],
	});
	runQualityCli(cfg, ['quality', '--all']);
	assert.equal(fixtureText(root, 'commands.txt'), 'format\nlint\ncustom\n');
	resetExitCode();
});

test('profile safe fixes run only in fix mode and use their native formatter/linter commands', () => {
	const root = fixtureRoot('terra-quality-language-profile-fixes-');
	fixtureFile(root, 'src/app.py', 'def greet(name): return name\n');
	fakeProfileTool(root, 'ruff', '0.15.0');
	const marker = join(root, 'native-fixes.jsonl');
	const previousPath = process.env.PATH;
	const previousMarker = process.env.TERRA_QUALITY_PROFILE_MARKER;
	process.env.PATH = [join(root, 'bin'), dirname(process.execPath), previousPath].filter(Boolean).join(delimiter);
	process.env.TERRA_QUALITY_PROFILE_MARKER = marker;
	try {
		const enabledCommands = { 'python-mypy': false, 'python-bandit': false, 'python-vulture': false };
		const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: [], languageProfiles: ['python'], enabledChecks: DISABLED_SOURCE_CHECKS, enabledCommands });
		runQualityCli(cfg, ['quality', '--all']);
		const calls = readFileSync(marker, 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		assert.equal(calls[0]?.args[0], 'format');
		assert.ok(calls[0]?.args[1]?.endsWith('/src/app.py'));
		assert.deepEqual(
			calls.slice(1).map(({ args }) => args.slice(0, 2)),
			[
				['check', '--fix'],
				['format', '--check'],
				['check', '--select=E,F,I,N,UP,B,PERF,S'],
			],
		);
		fixtureFile(root, 'native-fixes.jsonl', '');
		resetExitCode();
		runQualityCli(cfg, ['quality', '--all', '--warn']);
		assert.deepEqual(
			readFileSync(marker, 'utf8')
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line))
				.map(({ args }) => args[0]),
			['format', 'check'],
		);
		resetExitCode();
	} finally {
		if (previousPath === undefined) delete process.env.PATH;
		else process.env.PATH = previousPath;
		if (previousMarker === undefined) delete process.env.TERRA_QUALITY_PROFILE_MARKER;
		else process.env.TERRA_QUALITY_PROFILE_MARKER = previousMarker;
	}
});
