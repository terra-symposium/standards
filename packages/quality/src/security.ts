/**
 * packages/quality/src/security.ts
 * Generic security checks for environment files, imports, and runtime boundaries.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { displayPath, srcFiles } from './files.js';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const ENV_REGEX = /(^|\/)\.env(?:\.|$)/;
/** A source or repository-boundary issue found by a configured security policy. */
export type SecurityFinding = { file?: string; message: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Runs portable secret and unsafe-boundary checks configured by a repository.
 *
 * @param cfg Quality configuration defining source scope and security policy exceptions.
 *
 * @return Configured security findings for visible source files and root-level environment files.
 */
export function securityFindings(cfg: QualityCfg): SecurityFinding[] {
	// ENV
	const settings = cfg.security ?? {};
	const findings: SecurityFinding[] = [];
	const visible = (() => {
		try {
			const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: cfg.root, encoding: 'utf8' }).trim();
			if (realpathSync(repoRoot) !== realpathSync(cfg.root)) return undefined;
			return new Set(
				execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: cfg.root, encoding: 'utf8' })
					.split('\n')
					.filter(Boolean)
					.map((f) => join(cfg.root, f)),
			);
		} catch {
			return undefined;
		}
	})();
	const files = srcFiles(cfg).filter((f) => !visible || visible.has(f));
	const allNames = files.map((f) => displayPath(cfg, f));

	// WALKTHROUGH
	for (const file of allNames) if (ENV_REGEX.test(file)) findings.push({ file, message: 'environment files must not be committed' });
	for (const entry of readdirSync(cfg.root, { withFileTypes: true }))
		if (entry.isFile() && ENV_REGEX.test(entry.name) && (!visible || visible.has(join(cfg.root, entry.name)))) findings.push({ file: entry.name, message: 'environment files must not be committed' });
	const forbiddenTerms = (settings.forbiddenTerms ?? []).map((t) => new RegExp(t, 'i'));
	const forbiddenImports = settings.forbiddenImports ?? [];
	const clientRoots = (settings.clientRoots ?? []).map((r) => join(cfg.root, r));
	const envAllowedRoots = (settings.allowProcessEnvRoots ?? []).map((r) => join(cfg.root, r));
	for (const file of files) {
		const name = displayPath(cfg, file);
		const src = readFileSync(file, 'utf8');
		for (const pattern of forbiddenTerms) if (pattern.test(src)) findings.push({ file: name, message: `forbidden term matches ${pattern}` });
		for (const specifier of forbiddenImports)
			if (new RegExp(`(?:from|import)\\s*(?:\\(\\s*)?['"]${specifier.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['"]`).test(src)) findings.push({ file: name, message: `forbidden import ${specifier}` });
		if (clientRoots.some((r) => file.startsWith(`${r}/`)) && /(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL)/.test(src) && /import\.meta\.env|process\.env/.test(src))
			findings.push({ file: name, message: 'client source references a secret-shaped environment value' });
		if (/dotenv(?:\.config|\/config)/.test(src)) findings.push({ file: name, message: 'environment-file loading is forbidden' });
		if (/process\.env(?:\.|\[)/.test(src) && !envAllowedRoots.some((r) => file.startsWith(`${r}/`))) findings.push({ file: name, message: 'process.env access is outside an allowed runtime root' });
	}
	return findings;
}
