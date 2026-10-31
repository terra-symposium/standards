/**
 * packages/quality/src/lib/language-profiles.ts
 * Built-in language profiles that connect repository sources to native quality tools.
 * Profiles are data records so future languages can reuse the command runner without
 * adding another parser or rewriting the JavaScript and TypeScript analysis.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { srcFiles } from './files.js';

// TYPES
import type { QualityAutofixName, QualityCfg, QualityCheckName } from './runner.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/** Runner phase used to keep native checks in Terra Quality's standard order. */
export type LanguageQualityPhase = 'Format' | 'Static quality' | 'Tests' | 'Framework / type checks' | 'Build' | 'Repository health';

/** Tool executable and the minimum version a profile has been checked against. */
export type LanguageProfileTool = { command: string; versionArgs: string[]; minimumVersion: [number, number, number]; install: string };

/** One native command supplied by a language profile. */
export type LanguageProfileCheck = {
	name: string;
	phase: LanguageQualityPhase;
	command: string;
	args: string[];
	qualityChecks: QualityCheckName[];
	autofix?: { name: QualityAutofixName; command: string; args: string[] };
	tool?: LanguageProfileTool;
	fileExtensions?: string[];
	requiredFile?: string;
	requiresCompiledClasses?: boolean;
};

/** A selected profile command with its file arguments and prerequisite metadata resolved. */
export type ResolvedLanguageCheck = LanguageProfileCheck & { profileId: string; files: string[] };

/** A profile check omitted because its source or optional project configuration is absent. */
export type SkippedLanguageCheck = { name: string; profileId: string; reason: string };

/** Resolved native checks and skip explanations for the selected profiles. */
export type LanguageProfileResolution = { checks: ResolvedLanguageCheck[]; skipped: SkippedLanguageCheck[]; failed: SkippedLanguageCheck[] };

/** Built-in check names that every language must explicitly support or explain as inapplicable. */
export const QUALITY_CAPABILITY_CHECKS: readonly QualityCheckName[] = [
	'document',
	'format',
	'import',
	'name',
	'forward',
	'accessibility',
	'display-name',
	'performance-patterns',
	'documented-commands',
	'lint',
	'knip',
	'dead-code',
	'type',
	'recommend',
	'command',
	'diff',
	'alias',
	'security',
	'repeated-classes',
	'tailwind-canonical',
	'regex-dedup',
	'ui-patterns',
	'ui-recommendations',
	'github',
];

/** Built-in autofixes that every language must explicitly support or explain as inapplicable. */
export const QUALITY_CAPABILITY_AUTOFIXES: readonly QualityAutofixName[] = [
	'document',
	'format',
	'name',
	'lint',
	'knip',
	'dead-code',
	'alias',
	'forward',
	'repeatedClasses',
	'tailwindCanonical',
	'regexDedup',
	'accessibility',
	'displayName',
	'documentedCommands',
];

/**
 *
 */
export type LanguageCapability = { status: 'supported' | 'not-applicable'; provider: string; reason?: string };

/**
 * Creates a capability entry implemented by shared runner behavior.
 *
 * @param provider Runner feature that supplies the check.
 *
 * @return A supported capability record.
 */
const shared = (provider = 'Terra Quality shared runner'): LanguageCapability => ({ status: 'supported', provider });
/**
 * Creates a capability entry implemented by a language-native tool.
 *
 * @param provider Native tool or configured command that supplies the check.
 *
 * @return A supported capability record.
 */
const native = (provider: string): LanguageCapability => ({ status: 'supported', provider });
/**
 * Creates an explicit capability entry for a check outside the language's scope.
 *
 * @param reason Why the check does not apply to this language.
 *
 * @return A not-applicable capability record.
 */
const notApplicable = (reason: string): LanguageCapability => ({ status: 'not-applicable', provider: 'none', reason });
const NO_NATIVE_FIX = 'No safe language-native autofix is provided for this check.';
const COMMON_SHARED_CHECKS: QualityCheckName[] = ['documented-commands', 'recommend', 'command', 'diff', 'github'];
const NOT_APPLICABLE_CHECK_REASONS: Partial<Record<QualityCheckName, string>> = {
	forward: 'Object-forwarding analysis follows JavaScript and TypeScript syntax.',
	accessibility: 'Accessible-name analysis applies to JSX/TSX and UI framework semantics.',
	'display-name': 'Display-name analysis applies to JavaScript and TypeScript UI components.',
	knip: 'Knip analyzes JavaScript and TypeScript package exports and dependency graphs.',
	alias: 'Alias simplification follows JavaScript and TypeScript syntax.',
	'repeated-classes': 'Repeated-class analysis scans JSX/TSX class attributes.',
	'tailwind-canonical': 'Canonical class checks require a Tailwind UI project and its configured stylesheets.',
	'regex-dedup': 'Regex deduplication follows JavaScript and TypeScript regular-expression syntax.',
	'ui-patterns': 'UI pattern analysis applies to JavaScript and TypeScript UI components.',
	'ui-recommendations': 'UI recommendations analyze JavaScript and TypeScript UI components.',
};
const CHECKSTYLE_CONFIG = fileURLToPath(new URL('../../quality-configs/checkstyle.xml', import.meta.url));
const PMD_CONFIG = fileURLToPath(new URL('../../quality-configs/pmd-rules.xml', import.meta.url));
const NATIVE_CHECKS: Record<LanguageProfileId, Partial<Record<QualityCheckName, string>>> = {
	c: {
		document: 'Doxygen',
		format: 'clang-format',
		import: 'clang-tidy misc-include-cleaner',
		name: 'clang-tidy readability checks',
		'performance-patterns': 'clang-tidy performance checks',
		lint: 'clang-tidy bugprone/readability checks',
		'dead-code': 'Clang Static Analyzer',
		type: 'Clang Static Analyzer and configured build',
		security: 'clang-tidy cert and analyzer checks',
	},
	java: {
		document: 'Checkstyle JavadocMethod',
		format: 'google-java-format',
		import: 'PMD import rules',
		name: 'PMD and Checkstyle',
		'performance-patterns': 'PMD performance rules',
		lint: 'PMD',
		'dead-code': 'PMD unused-code rules',
		type: 'configured Maven/Gradle build and SpotBugs',
		security: 'SpotBugs and PMD security rules',
	},
	python: {
		document: 'interrogate and pydoclint',
		format: 'Ruff formatter',
		import: 'Ruff import rules',
		name: 'Ruff naming rules',
		'performance-patterns': 'Ruff performance rules',
		lint: 'Ruff',
		'dead-code': 'Vulture',
		type: 'mypy',
		security: 'Bandit and Ruff security rules',
	},
};
const NATIVE_AUTOFIXES: Record<LanguageProfileId, Partial<Record<QualityAutofixName, string>>> = {
	c: { format: 'clang-format -i' },
	java: { format: 'google-java-format --replace' },
	python: { format: 'Ruff formatter and Ruff --fix' },
};

/** Full check and autofix disposition for every built-in language. */
export const LANGUAGE_CAPABILITIES: Record<'js-ts' | LanguageProfileId, { checks: Record<QualityCheckName, LanguageCapability>; autofixes: Record<QualityAutofixName, LanguageCapability> }> = {
	'js-ts': {
		checks: Object.fromEntries(QUALITY_CAPABILITY_CHECKS.map((name) => [name, shared(name === 'document' ? 'Terra Quality JS/TS documentation analyzer' : 'Terra Quality JS/TS analyzer')])) as Record<
			QualityCheckName,
			LanguageCapability
		>,
		autofixes: Object.fromEntries(QUALITY_CAPABILITY_AUTOFIXES.map((name) => [name, name === 'documentedCommands' ? shared() : shared('Terra Quality JS/TS fixer')])) as Record<
			QualityAutofixName,
			LanguageCapability
		>,
	},
	c: {
		checks: Object.fromEntries(
			QUALITY_CAPABILITY_CHECKS.map((name) => [
				name,
				COMMON_SHARED_CHECKS.includes(name)
					? shared()
					: NATIVE_CHECKS.c[name]
						? native(NATIVE_CHECKS.c[name]!)
						: notApplicable(NOT_APPLICABLE_CHECK_REASONS[name] ?? 'No C-native equivalent is supplied for this JavaScript and TypeScript source check.'),
			]),
		) as Record<QualityCheckName, LanguageCapability>,
		autofixes: Object.fromEntries(
			QUALITY_CAPABILITY_AUTOFIXES.map((name) => [name, name === 'documentedCommands' ? shared() : NATIVE_AUTOFIXES.c[name] ? native(NATIVE_AUTOFIXES.c[name]!) : notApplicable(NO_NATIVE_FIX)]),
		) as Record<QualityAutofixName, LanguageCapability>,
	},
	java: {
		checks: Object.fromEntries(
			QUALITY_CAPABILITY_CHECKS.map((name) => [
				name,
				COMMON_SHARED_CHECKS.includes(name)
					? shared()
					: NATIVE_CHECKS.java[name]
						? native(NATIVE_CHECKS.java[name]!)
						: notApplicable(NOT_APPLICABLE_CHECK_REASONS[name] ?? 'No Java-native equivalent is supplied for this JavaScript and TypeScript source check.'),
			]),
		) as Record<QualityCheckName, LanguageCapability>,
		autofixes: Object.fromEntries(
			QUALITY_CAPABILITY_AUTOFIXES.map((name) => [name, name === 'documentedCommands' ? shared() : NATIVE_AUTOFIXES.java[name] ? native(NATIVE_AUTOFIXES.java[name]!) : notApplicable(NO_NATIVE_FIX)]),
		) as Record<QualityAutofixName, LanguageCapability>,
	},
	python: {
		checks: Object.fromEntries(
			QUALITY_CAPABILITY_CHECKS.map((name) => [
				name,
				COMMON_SHARED_CHECKS.includes(name)
					? shared()
					: NATIVE_CHECKS.python[name]
						? native(NATIVE_CHECKS.python[name]!)
						: notApplicable(NOT_APPLICABLE_CHECK_REASONS[name] ?? 'No Python-native equivalent is supplied for this JavaScript and TypeScript source check.'),
			]),
		) as Record<QualityCheckName, LanguageCapability>,
		autofixes: Object.fromEntries(
			QUALITY_CAPABILITY_AUTOFIXES.map((name) => [
				name,
				name === 'documentedCommands' ? shared() : NATIVE_AUTOFIXES.python[name] ? native(NATIVE_AUTOFIXES.python[name]!) : notApplicable(NO_NATIVE_FIX),
			]),
		) as Record<QualityAutofixName, LanguageCapability>,
	},
};

/*//////////////////////////////////////////////////
DATA
//////////////////////////////////////////////////*/

/** Installed profile identifiers accepted by `quality.json`. */
export const LANGUAGE_PROFILE_IDS = ['c', 'java', 'python'] as const;
/** Union of the profile identifiers distributed by this package. */
export type LanguageProfileId = (typeof LANGUAGE_PROFILE_IDS)[number];

/** Opinionated starter checks and install guidance, kept as data for easy extension. */
export const LANGUAGE_PROFILES: readonly { id: LanguageProfileId; sourceExtensions: string[]; checks: LanguageProfileCheck[] }[] = [
	{
		id: 'c',
		sourceExtensions: ['.c', '.h'],
		checks: [
			{
				name: 'c-format',
				phase: 'Format',
				command: 'clang-format',
				args: ['--dry-run', '--Werror', '{files}'],
				qualityChecks: ['format'],
				autofix: { name: 'format', command: 'clang-format', args: ['-i', '{files}'] },
				fileExtensions: ['.c', '.h'],
				tool: {
					command: 'clang-format',
					versionArgs: ['--version'],
					minimumVersion: [14, 0, 0],
					install: 'Install LLVM/Clang with your system package manager (for example, `brew install llvm` or `sudo apt-get install clang-format`).',
				},
			},
			{
				name: 'c-static-analysis',
				phase: 'Static quality',
				command: 'clang',
				args: ['--analyze', '-std=c11', '-Wall', '-Wextra', '-pedantic', '{files}'],
				qualityChecks: ['type', 'dead-code', 'security'],
				fileExtensions: ['.c'],
				tool: {
					command: 'clang',
					versionArgs: ['--version'],
					minimumVersion: [14, 0, 0],
					install: 'Install LLVM/Clang with your system package manager (for example, `brew install llvm` or `sudo apt-get install clang`).',
				},
			},
			{
				name: 'c-clang-tidy',
				phase: 'Static quality',
				command: 'clang-tidy',
				args: [
					'--checks=-*,bugprone-*,cert-*,clang-analyzer-*,misc-include-cleaner,performance-*,readability-*',
					'--warnings-as-errors=*',
					'{files}',
					'--',
					'-std=c11',
					'-Wall',
					'-Wextra',
					'-pedantic',
				],
				qualityChecks: ['import', 'name', 'performance-patterns', 'lint', 'security'],
				fileExtensions: ['.c'],
				tool: {
					command: 'clang-tidy',
					versionArgs: ['--version'],
					minimumVersion: [14, 0, 0],
					install: 'Install LLVM/Clang with your system package manager (for example, `brew install llvm` or `sudo apt-get install clang-tidy`).',
				},
			},
			{
				name: 'c-documentation',
				phase: 'Static quality',
				command: 'doxygen',
				args: ['Doxyfile'],
				qualityChecks: ['document'],
				requiredFile: 'Doxyfile',
				tool: {
					command: 'doxygen',
					versionArgs: ['--version'],
					minimumVersion: [1, 9, 0],
					install:
						'Install Doxygen with your system package manager (for example, `brew install doxygen` or `sudo apt-get install doxygen`). Set `WARN_AS_ERROR = FAIL_ON_WARNINGS` in Doxyfile to fail on documentation warnings.',
				},
			},
		],
	},
	{
		id: 'java',
		sourceExtensions: ['.java'],
		checks: [
			{
				name: 'java-format',
				phase: 'Format',
				command: 'google-java-format',
				args: ['--dry-run', '--set-exit-if-changed', '{files}'],
				qualityChecks: ['format'],
				autofix: { name: 'format', command: 'google-java-format', args: ['--replace', '{files}'] },
				tool: {
					command: 'google-java-format',
					versionArgs: ['--version'],
					minimumVersion: [1, 14, 0],
					install: 'On macOS, run `brew install google-java-format`; use a JDK at least as new as the Java source version.',
				},
			},
			{
				name: 'java-checkstyle',
				phase: 'Static quality',
				command: 'checkstyle',
				args: ['-c', CHECKSTYLE_CONFIG, '{files}'],
				qualityChecks: ['document', 'import', 'name', 'lint'],
				tool: {
					command: 'checkstyle',
					versionArgs: ['--version'],
					minimumVersion: [10, 0, 0],
					install: 'On macOS, run `brew install checkstyle`; use the repository’s Maven or Gradle integration on other platforms.',
				},
			},
			{
				name: 'java-pmd',
				phase: 'Static quality',
				command: 'pmd',
				args: ['check', '-d', '{files}', '-R', PMD_CONFIG, '-f', 'text'],
				qualityChecks: ['import', 'name', 'performance-patterns', 'lint', 'dead-code', 'security'],
				tool: { command: 'pmd', versionArgs: ['--version'], minimumVersion: [7, 0, 0], install: 'Install PMD 7 or add the PMD Maven/Gradle plugin to the repository.' },
			},
			{
				name: 'java-spotbugs',
				phase: 'Repository health',
				command: 'spotbugs',
				args: ['-textui', '-effort:max', '-low', '{classes}'],
				qualityChecks: ['type', 'security'],
				requiresCompiledClasses: true,
				tool: { command: 'spotbugs', versionArgs: ['-version'], minimumVersion: [4, 8, 0], install: 'Install SpotBugs or configure the repository SpotBugs Maven/Gradle command.' },
			},
		],
	},
	{
		id: 'python',
		sourceExtensions: ['.py', '.pyi'],
		checks: [
			{
				name: 'python-format',
				phase: 'Format',
				command: 'ruff',
				args: ['format', '--check', '{files}'],
				qualityChecks: ['format'],
				autofix: { name: 'format', command: 'ruff', args: ['format', '{files}'] },
				tool: { command: 'ruff', versionArgs: ['--version'], minimumVersion: [0, 1, 0], install: 'Add Ruff to the project with `uv add --dev ruff` or install it with `python -m pip install ruff`.' },
			},
			{
				name: 'python-lint',
				phase: 'Static quality',
				command: 'ruff',
				args: ['check', '--select=E,F,I,N,UP,B,PERF,S', '{files}'],
				qualityChecks: ['import', 'name', 'performance-patterns', 'lint', 'security'],
				autofix: { name: 'lint', command: 'ruff', args: ['check', '--fix', '--select=E,F,I,N,UP,B,PERF,S', '{files}'] },
				tool: { command: 'ruff', versionArgs: ['--version'], minimumVersion: [0, 1, 0], install: 'Add Ruff to the project with `uv add --dev ruff` or install it with `python -m pip install ruff`.' },
			},
			{
				name: 'python-mypy',
				phase: 'Framework / type checks',
				command: 'mypy',
				args: ['{files}'],
				qualityChecks: ['type'],
				tool: { command: 'mypy', versionArgs: ['--version'], minimumVersion: [1, 0, 0], install: 'Add mypy to the project with `uv add --dev mypy` or install it with `python -m pip install mypy`.' },
			},
			{
				name: 'python-bandit',
				phase: 'Static quality',
				command: 'bandit',
				args: ['-q', '{files}'],
				qualityChecks: ['security'],
				tool: {
					command: 'bandit',
					versionArgs: ['--version'],
					minimumVersion: [1, 7, 0],
					install: 'Add Bandit to the project with `uv add --dev bandit` or install it with `python -m pip install bandit`.',
				},
			},
			{
				name: 'python-vulture',
				phase: 'Static quality',
				command: 'vulture',
				args: ['--min-confidence=80', '{files}'],
				qualityChecks: ['dead-code'],
				tool: {
					command: 'vulture',
					versionArgs: ['--version'],
					minimumVersion: [2, 0, 0],
					install: 'Add Vulture to the project with `uv add --dev vulture` or install it with `python -m pip install vulture`.',
				},
			},
			{
				name: 'python-docstring-coverage',
				phase: 'Static quality',
				command: 'interrogate',
				args: ['--fail-under=100', '{files}'],
				qualityChecks: ['document'],
				fileExtensions: ['.py', '.pyi'],
				tool: {
					command: 'interrogate',
					versionArgs: ['--version'],
					minimumVersion: [1, 7, 0],
					install: 'Add interrogate to the project with `uv add --dev interrogate` or install it with `python -m pip install interrogate`.',
				},
			},
			{
				name: 'python-docstring-signatures',
				phase: 'Static quality',
				command: 'pydoclint',
				args: ['--style=google', '--skip-checking-short-docstrings=False', '{files}'],
				qualityChecks: ['document'],
				fileExtensions: ['.py', '.pyi'],
				tool: {
					command: 'pydoclint',
					versionArgs: ['--version'],
					minimumVersion: [0, 11, 0],
					install: 'Add pydoclint to the project with `uv add --dev pydoclint` or install it with `python -m pip install pydoclint`.',
				},
			},
		],
	},
];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Checks whether a string names one of the profiles shipped by this package.
 *
 * @param id Profile identifier read from configuration.
 *
 * @return `true` when the identifier is a built-in profile.
 */
export function isLanguageProfileId(id: string): id is LanguageProfileId {
	return LANGUAGE_PROFILE_IDS.includes(id as LanguageProfileId);
}

/**
 * Resolves selected profiles against configured source roots and per-check file scopes.
 *
 * @param cfg Normalized repository configuration.
 *
 * @return Native commands that have source files, plus explicit skip reasons.
 */
export function resolveLanguageProfiles(cfg: QualityCfg): LanguageProfileResolution {
	const result: LanguageProfileResolution = { checks: [], skipped: [], failed: [] };
	for (const profileId of cfg.languageProfiles ?? []) {
		const profile = LANGUAGE_PROFILES.find((candidate) => candidate.id === profileId);
		if (!profile) continue;
		const skippedDirs = new Set([...(cfg.skippedDirectories ?? []), '.venv', 'venv', '__pycache__', '.tox', '.ruff_cache', '.pytest_cache', '.gradle', 'target', 'vendor', 'generated', 'out']);
		const sourceFiles = srcFiles({ ...cfg, extensions: profile.sourceExtensions, skippedDirectories: [...skippedDirs] });
		if (!sourceFiles.length) {
			for (const check of profile.checks) result.skipped.push({ name: check.name, profileId, reason: `no ${profileId} source files were found` });
			continue;
		}
		for (const check of profile.checks) {
			if (check.qualityChecks.includes('document') && !profileQualityCheckEnabled(cfg, 'document')) continue;
			if (check.requiredFile && !existsSync(resolve(cfg.root, check.requiredFile))) {
				result.failed.push({ name: check.name, profileId, reason: `required configuration ${check.requiredFile} is absent` });
				continue;
			}
			const files = check.fileExtensions ? sourceFiles.filter((file) => check.fileExtensions!.some((extension) => file.endsWith(extension))) : sourceFiles;
			if (check.args.includes('{files}') && !files.length) {
				result.skipped.push({ name: check.name, profileId, reason: 'no files matched this check' });
				continue;
			}
			const args = check.args.flatMap((argument) => (argument === '{files}' ? files : argument === '{files-comma}' ? [files.join(',')] : [argument]));
			result.checks.push({ ...check, args, profileId, files });
		}
	}
	// Documentation coverage applies to every discovered supported language, even when its full profile is not selected.
	if (profileQualityCheckEnabled(cfg, 'document')) {
		for (const profile of LANGUAGE_PROFILES) {
			if (cfg.languageProfiles?.includes(profile.id)) continue;
			const files = srcFiles({ ...cfg, extensions: profile.sourceExtensions, skippedDirectories: [...(cfg.skippedDirectories ?? []), 'generated', 'vendor', 'target', 'out'] });
			if (!files.length) continue;
			for (const check of profile.checks.filter((candidate) => candidate.qualityChecks.includes('document'))) {
				if (check.requiredFile && !existsSync(resolve(cfg.root, check.requiredFile))) {
					result.failed.push({ name: check.name, profileId: profile.id, reason: `required configuration ${check.requiredFile} is absent` });
					continue;
				}
				const checkFiles = check.fileExtensions ? files.filter((file) => check.fileExtensions!.some((extension) => file.endsWith(extension))) : files;
				const args = check.args.flatMap((argument) => (argument === '{files}' ? checkFiles : argument === '{files-comma}' ? [checkFiles.join(',')] : [argument]));
				result.checks.push({ ...check, args, profileId: profile.id, files: checkFiles });
			}
		}
	}
	return result;
}

/**
 * Applies the runner's opt-in defaults without importing its runtime module.
 *
 * @param cfg Normalized project quality configuration.
 * @param check Quality check whose enablement should be evaluated.
 *
 * @return Whether the profile check should run under the configured toggle.
 */
function profileQualityCheckEnabled(cfg: QualityCfg, check: QualityCheckName): boolean {
	if (check === 'accessibility' || check === 'display-name' || check === 'documented-commands') return cfg.enabledChecks?.[check] === true;
	return cfg.enabledChecks?.[check] !== false;
}

/**
 * Confirms a profile tool exists and meets its declared minimum version.
 *
 * @param tool Tool requirement declared by a profile.
 * @param cwd Repository root used to run the version probe.
 *
 * @return Detected version on success, or an actionable prerequisite failure.
 */
export function inspectLanguageProfileTool(tool: LanguageProfileTool, cwd: string): { version?: string; error?: string } {
	const result = spawnSync(tool.command, tool.versionArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	if (result.error) return { error: `Required tool "${tool.command}" is unavailable. ${tool.install}` };
	if (result.status !== 0) return { error: `Could not read the version of "${tool.command}". ${tool.install}` };
	const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
	const detected = parseVersion(output);
	if (!detected) return { error: `Could not parse the version reported by "${tool.command}". ${tool.install}` };
	if (compVersions(detected, tool.minimumVersion) < 0) return { error: `"${tool.command}" ${detected.join('.')} is below the supported minimum ${tool.minimumVersion.join('.')}. ${tool.install}` };
	return { version: detected.join('.') };
}

/**
 * Extracts a three-part version from native tool output.
 *
 * @param output Combined version command output.
 *
 * @return Parsed numeric version, or `undefined` when output has no semantic version.
 */
function parseVersion(output: string): [number, number, number] | undefined {
	const match = output.match(/(?:^|\D)(\d+)\.(\d+)(?:\.(\d+))?/u);
	if (!match) return undefined;
	return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

/**
 * Compares a detected semantic version against a profile's minimum version.
 *
 * @param detected Version returned by a tool.
 * @param minimum Minimum supported profile version.
 *
 * @return Negative, zero, or positive according to version ordering.
 */
function compVersions(detected: [number, number, number], minimum: [number, number, number]): number {
	for (let index = 0; index < detected.length; index++) {
		if (detected[index] !== minimum[index]) return detected[index]! - minimum[index]!;
	}
	return 0;
}
