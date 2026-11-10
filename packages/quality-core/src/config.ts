/**
 * packages/quality-core/src/config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { basename, dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

// TYPES
import type { QualityCfg, QualityScope } from './types.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Loads the shared quality.json file and resolves its repository source scope.
 *
 * @param file Optional path to quality.json; otherwise the working directory and its config folder are checked.
 *
 * @return Parsed configuration with absolute root and source-root paths.
 */
export function loadQualityConfig(file?: string): QualityCfg {
	const defaultConfig = resolve(process.cwd(), 'quality.json');
	const path = resolve(file ?? (existsSync(defaultConfig) ? defaultConfig : resolve(process.cwd(), 'config/quality.json')));
	const raw = JSON.parse(readFileSync(path, 'utf8')) as Omit<QualityCfg, 'root' | 'configRoot'> & { root?: string; configRoot?: string };
	const configDir = dirname(path);
	const implicitRoot = basename(configDir) === 'config' ? dirname(configDir) : configDir;
	const root = raw.root ? resolve(implicitRoot, raw.root) : implicitRoot;
	return {
		...raw,
		root,
		configRoot: raw.configRoot ? resolve(root, raw.configRoot) : configDir === implicitRoot ? resolve(root, 'config') : configDir,
		sourceRoots: (raw.sourceRoots ?? []).map((p) => resolve(root, p)),
		includeRoots: (raw.includeRoots ?? []).map((p) => resolve(root, p)),
		skippedDirectories: raw.skippedDirectories ?? [],
		skippedFiles: raw.skippedFiles ?? [],
		extensions: raw.extensions ?? [],
	};
}

/**
 * Resolves the shared scope fields accepted by every capability API.
 *
 * @param cfg Resolved configuration whose source-scope fields are shared with capability packages.
 *
 * @return The source root, include roots, skipped paths, and supported extensions.
 */
export function qualityScope(cfg: QualityCfg): QualityScope {
	return { root: cfg.root, sourceRoots: cfg.sourceRoots, includeRoots: cfg.includeRoots, skippedDirectories: cfg.skippedDirectories, skippedFiles: cfg.skippedFiles, extensions: cfg.extensions };
}

/**
 * Applies the aggregate runner's default and opt-in check semantics to a capability CLI.
 *
 * @param cfg Resolved configuration containing global and per-check enable switches.
 * @param check Quality check whose enabled state is being queried.
 *
 * @return Whether the selected capability should run under this configuration.
 */
export function capabilityCheckEnabled(
	cfg: QualityCfg,
	check:
		| 'document'
		| 'format'
		| 'import'
		| 'name'
		| 'forward'
		| 'accessibility'
		| 'display-name'
		| 'performance-patterns'
		| 'documented-commands'
		| 'lint'
		| 'knip'
		| 'dead-code'
		| 'type'
		| 'recommend'
		| 'command'
		| 'diff'
		| 'alias'
		| 'security'
		| 'repeated-classes'
		| 'tailwind-canonical'
		| 'regex-dedup'
		| 'ui-patterns'
		| 'ui-recommendations'
		| 'error-boundaries'
		| 'github',
): boolean {
	if (check === 'error-boundaries') return true;
	if (check === 'accessibility' || check === 'display-name' || check === 'documented-commands') return cfg.enabledChecks?.[check] === true;
	return cfg.enabledChecks?.[check] !== false;
}

/**
 * Applies quality.json autofix opt-outs together with the CLI's write mode.
 *
 * @param cfg Resolved configuration containing per-fixer opt-outs.
 * @param fix Autofix name whose configured state is being queried.
 * @param cliFix Whether the caller requested write mode for this invocation.
 *
 * @return Whether the selected fixer may write changes.
 */
export function capabilityAutofixEnabled(
	cfg: QualityCfg,
	fix:
		| 'document'
		| 'format'
		| 'name'
		| 'lint'
		| 'knip'
		| 'dead-code'
		| 'alias'
		| 'forward'
		| 'repeatedClasses'
		| 'tailwindCanonical'
		| 'regexDedup'
		| 'accessibility'
		| 'displayName'
		| 'documentedCommands'
		| 'errorBoundaries',
	cliFix = true,
): boolean {
	if (fix === 'errorBoundaries') return cliFix;
	return cliFix && cfg.autofix?.[fix] !== false;
}

/**
 * Checks the global command switch and per-command opt-out used by repository profiles.
 *
 * @param cfg Resolved configuration containing the global command switch and command opt-outs.
 * @param name Configured repository command being checked.
 *
 * @return Whether the selected command should run.
 */
export function capabilityCommandEnabled(cfg: QualityCfg, name: string): boolean {
	return capabilityCheckEnabled(cfg, 'command') && cfg.enabledCommands?.[name] !== false;
}
