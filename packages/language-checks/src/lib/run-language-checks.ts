/**
 * packages/language-checks/src/lib/run-language-checks.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityAutofixEnabled, capabilityCommandEnabled } from '@terra-symposium/standards-quality-core';
import { existsSync, statSync } from 'node:fs';
import { inspectLanguageProfileTool, isLanguageProfileId, resolveLanguageProfiles } from './language-profiles.js';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// TYPES
import type { CapabilityOptions, QualityCfg } from '@terra-symposium/standards-quality-core';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const PHASES = ['Format', 'Static quality', 'Tests', 'Framework / type checks', 'Build', 'Repository health'];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Runs selected language profiles in Terra's fixed quality phase order.
 *
 * @param cfg Resolved repository configuration that selects source profiles, commands, and their working directory.
 * @param options Whether profile-approved language formatters may write changes.
 */
export function runLanguageChecks(cfg: QualityCfg, options: Pick<CapabilityOptions, 'fix'>): void {
	const profiles = cfg.languageProfiles ?? [];
	for (const profile of profiles) if (!isLanguageProfileId(profile)) throw new Error(`Unknown language profile "${profile}". Available profiles: c, java, python.`);
	if (new Set(profiles).size !== profiles.length) throw new Error('languageProfiles must not contain duplicate profile names.');
	const resolution = resolveLanguageProfiles(cfg);
	for (const skipped of resolution.skipped) {
		if (capabilityCommandEnabled(cfg, skipped.name)) console.error(`${skipped.name} skipped: ${skipped.reason}.`);
	}
	for (const failure of resolution.failed) {
		if (!capabilityCommandEnabled(cfg, failure.name)) continue;
		process.exitCode = 1;
		console.error(`${failure.name} failed: ${failure.reason}.`);
	}
	const configured = new Map((cfg.qualityCommands ?? []).map((c) => [c.name, c]));
	const checks = resolution.checks.filter((c) => capabilityCommandEnabled(cfg, c.name));
	const toolResults = new Map<string, ReturnType<typeof inspectLanguageProfileTool>>();
	const toolErr = (tool: NonNullable<(typeof checks)[number]['tool']>): string | undefined => {
		const key = JSON.stringify([tool.command, tool.versionArgs, tool.minimumVersion]);
		let result = toolResults.get(key);
		if (!result) {
			result = inspectLanguageProfileTool(tool, cfg.root);
			toolResults.set(key, result);
		}
		return result.error;
	};
	const reportFailure = (name: string, message: string): void => {
		process.exitCode = 1;
		console.error(`${name} failed: ${message}`);
	};
	if (options.fix) {
		for (const check of checks) {
			if (!check.autofix || configured.has(check.name) || !capabilityAutofixEnabled(cfg, check.autofix.name)) continue;
			if (check.tool) {
				const error = toolErr(check.tool);
				if (error) {
					reportFailure(check.name, error);
					continue;
				}
			}
			const args = check.autofix.args.flatMap((a) => (a === '{files}' ? check.files : [a]));
			const result = spawnSync(check.autofix.command, args, { cwd: cfg.root, stdio: 'inherit' });
			if (result.error) reportFailure(check.name, result.error.message);
			else if (result.status !== 0) reportFailure(check.name, `${check.autofix.command} exited with status ${result.status ?? 1}`);
		}
	}
	for (const phase of PHASES) {
		for (const check of checks.filter((c) => c.phase === phase)) {
			const override = configured.get(check.name);
			const cmd = override?.command ?? check.command;
			const rawArgs = override?.args ?? check.args;
			if (!override && check.tool) {
				const error = toolErr(check.tool);
				if (error) {
					reportFailure(check.name, error);
					continue;
				}
			}
			const args = rawArgs.flatMap((a) => {
				if (a === '{classes}') {
					const classes = [resolve(cfg.root, 'target/classes'), resolve(cfg.root, 'build/classes/java/main')].filter((path) => existsSync(path) && statSync(path).isDirectory());
					return classes.length ? classes : ['{classes}'];
				}
				return [a];
			});
			if (args.includes('{classes}')) {
				reportFailure(check.name, 'SpotBugs requires compiled Java classes; build first or configure a replacement command.');
				continue;
			}
			console.error(`Running ${check.name} (${phase})`);
			const result = spawnSync(cmd, args, { cwd: cfg.root, stdio: 'inherit' });
			if (result.error) reportFailure(check.name, result.error.message);
			else if (result.status !== 0) reportFailure(check.name, `${cmd} exited with status ${result.status ?? 1}`);
		}
	}
}
