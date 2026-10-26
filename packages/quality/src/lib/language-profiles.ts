/**
 * Built-in language profiles that connect repository sources to native quality tools.
 *
 * Profiles are data records so future languages can reuse the command runner without
 * adding another parser or rewriting the JavaScript and TypeScript analysis.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// NODE
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// PROJECT
import { srcFiles } from './files.js';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/** Runner phase used to keep native checks in Terra Quality's standard order. */
export type LanguageQualityPhase = 'Format' | 'Static quality' | 'Tests' | 'Framework / type checks' | 'Build' | 'Repository health';

/** Tool executable and the minimum version a profile has been checked against. */
export type LanguageProfileTool = {
	command: string;
	versionArgs: string[];
	minimumVersion: [number, number, number];
	install: string;
};

/** One native command supplied by a language profile. */
export type LanguageProfileCheck = {
	name: string;
	phase: LanguageQualityPhase;
	command: string;
	args: string[];
	tool?: LanguageProfileTool;
	fileExtensions?: string[];
	requiredFile?: string;
};

/** Reusable source, tool, and command defaults for one language. */
export type LanguageProfile = {
	id: string;
	sourceExtensions: string[];
	checks: LanguageProfileCheck[];
};

/** A selected profile command with its file arguments and prerequisite metadata resolved. */
export type ResolvedLanguageCheck = LanguageProfileCheck & {
	profileId: string;
	files: string[];
};

/** A profile check omitted because its source or optional project configuration is absent. */
export type SkippedLanguageCheck = {
	name: string;
	profileId: string;
	reason: string;
};

/** Resolved native checks and skip explanations for the selected profiles. */
export type LanguageProfileResolution = {
	checks: ResolvedLanguageCheck[];
	skipped: SkippedLanguageCheck[];
};

/*//////////////////////////////////////////////////
DATA
//////////////////////////////////////////////////*/

/** Installed profile identifiers accepted by `quality.json`. */
export const LANGUAGE_PROFILE_IDS = ['c', 'java', 'python'] as const;
/** Union of the profile identifiers distributed by this package. */
export type LanguageProfileId = (typeof LANGUAGE_PROFILE_IDS)[number];

/** Opinionated starter checks and install guidance, kept as data for easy extension. */
export const LANGUAGE_PROFILES: readonly LanguageProfile[] = [
	{
		id: 'c',
		sourceExtensions: ['.c', '.h'],
		checks: [
			{
				name: 'c-format',
				phase: 'Format',
				command: 'clang-format',
				args: ['--dry-run', '--Werror', '{files}'],
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
				fileExtensions: ['.c'],
				tool: {
					command: 'clang',
					versionArgs: ['--version'],
					minimumVersion: [14, 0, 0],
					install: 'Install LLVM/Clang with your system package manager (for example, `brew install llvm` or `sudo apt-get install clang`).',
				},
			},
			{
				name: 'c-documentation',
				phase: 'Static quality',
				command: 'doxygen',
				args: ['Doxyfile'],
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
				args: ['-c', '/google_checks.xml', '{files}'],
				tool: {
					command: 'checkstyle',
					versionArgs: ['--version'],
					minimumVersion: [10, 0, 0],
					install: 'On macOS, run `brew install checkstyle`; use the repository’s Maven or Gradle integration on other platforms.',
				},
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
				tool: { command: 'ruff', versionArgs: ['--version'], minimumVersion: [0, 1, 0], install: 'Add Ruff to the project with `uv add --dev ruff` or install it with `python -m pip install ruff`.' },
			},
			{
				name: 'python-lint',
				phase: 'Static quality',
				command: 'ruff',
				args: ['check', '{files}'],
				tool: { command: 'ruff', versionArgs: ['--version'], minimumVersion: [0, 1, 0], install: 'Add Ruff to the project with `uv add --dev ruff` or install it with `python -m pip install ruff`.' },
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
	const result: LanguageProfileResolution = { checks: [], skipped: [] };
	for (const profileId of cfg.languageProfiles ?? []) {
		const profile = LANGUAGE_PROFILES.find((candidate) => candidate.id === profileId);
		if (!profile) continue;
		const skippedDirectories = new Set([...(cfg.skippedDirectories ?? []), '.venv', 'venv', '__pycache__', '.tox', '.ruff_cache', '.pytest_cache', '.gradle', 'target', 'vendor', 'out']);
		const sourceFiles = srcFiles({ ...cfg, extensions: profile.sourceExtensions, skippedDirectories: [...skippedDirectories] });
		if (!sourceFiles.length) {
			for (const check of profile.checks) result.skipped.push({ name: check.name, profileId, reason: `no ${profileId} source files were found` });
			continue;
		}
		for (const check of profile.checks) {
			if (check.requiredFile && !existsSync(resolve(cfg.root, check.requiredFile))) {
				result.skipped.push({ name: check.name, profileId, reason: `${check.requiredFile} is absent` });
				continue;
			}
			const files = check.fileExtensions ? sourceFiles.filter((file) => check.fileExtensions!.some((extension) => file.endsWith(extension))) : sourceFiles;
			if (check.args.includes('{files}') && !files.length) {
				result.skipped.push({ name: check.name, profileId, reason: 'no files matched this check' });
				continue;
			}
			const args = check.args.flatMap((argument) => (argument === '{files}' ? files : [argument]));
			result.checks.push({ ...check, args, profileId, files });
		}
	}
	return result;
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
	if (compareVersions(detected, tool.minimumVersion) < 0) {
		return { error: `"${tool.command}" ${detected.join('.')} is below the supported minimum ${tool.minimumVersion.join('.')}. ${tool.install}` };
	}
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
function compareVersions(detected: [number, number, number], minimum: [number, number, number]): number {
	for (let index = 0; index < detected.length; index++) {
		if (detected[index] !== minimum[index]) return detected[index]! - minimum[index]!;
	}
	return 0;
}
