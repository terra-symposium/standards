/**
 * packages/security/src/lib/security.ts
 * Generic security checks for environment files, imports, and runtime boundaries.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { displayPath, srcFiles } from '@terra-symposium/standards-quality-core';
import { execFileSync } from 'node:child_process';
import { join, resolve, sep } from 'node:path';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import * as ts from 'typescript';

// TYPES
import type { QualityCfg } from '@terra-symposium/standards-quality-core';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const ENV_REGEX = /(^|\/)\.env(?:\.|$)/;
const PROCESS_ENV_SOURCE_REGEX = /\.(?:astro|cjs|cts|js|jsx|mjs|mts|ts|tsx)$/iu;
/** A source or repository-boundary issue found by a configured security policy. */
export type SecurityFinding = { file?: string; message: string };

/** Source-level environment behavior found outside comments and literal text. */
type EnvironmentAccess = { readsProcessEnv: boolean; loadsEnvFile: boolean };

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
			if (realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: cfg.root, encoding: 'utf8' }).trim()) !== realpathSync(cfg.root)) return undefined;
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
	const clientRoots = (settings.clientRoots ?? []).map((r) => resolve(cfg.root, r));
	const runtimeRoots = [...(settings.runtimeRoots ?? []), ...(settings.allowProcessEnvRoots ?? [])].map((r) => resolve(cfg.root, r));
	for (const file of files) {
		const name = displayPath(cfg, file);
		const src = readFileSync(file, 'utf8');
		for (const pattern of forbiddenTerms) if (pattern.test(src)) findings.push({ file: name, message: `forbidden term matches ${pattern}` });
		for (const specifier of forbiddenImports)
			if (new RegExp(`(?:from|import)\\s*(?:\\(\\s*)?['"]${specifier.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['"]`).test(src)) findings.push({ file: name, message: `forbidden import ${specifier}` });
		if (clientRoots.some((r) => file === r || file.startsWith(`${r}${sep}`)) && /(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL)/.test(src) && /import\.meta\.env|process\.env/.test(src))
			findings.push({ file: name, message: 'client source references a secret-shaped environment value' });
		if (PROCESS_ENV_SOURCE_REGEX.test(file)) {
			const access = environmentAccess(file, src);
			if (access.loadsEnvFile) findings.push({ file: name, message: 'environment-file loading is forbidden' });
			if (access.readsProcessEnv && !runtimeRoots.some((r) => file === r || file.startsWith(`${r}${sep}`)))
				findings.push({ file: name, message: 'process.env access is outside a configured runtime root' });
		}
	}
	return findings;
}

/**
 * Finds executable environment access while ignoring examples inside comments and literals.
 *
 * @param file Source path used to select the parser mode and extract Astro frontmatter.
 * @param text File contents to inspect.
 *
 * @return Whether code reads `process.env` or loads dotenv configuration.
 */
function environmentAccess(file: string, text: string): EnvironmentAccess {
	const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
	const astroFrontmatter = ext === '.astro' ? (text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? '') : text;
	const kind = ['.tsx', '.jsx', '.astro'].includes(ext) ? ts.ScriptKind.TSX : ['.ts', '.mts', '.cts'].includes(ext) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
	const source = ts.createSourceFile(file, astroFrontmatter, ts.ScriptTarget.Latest, true, kind);
	let readsProcessEnv = false;
	let loadsEnvFile = false;
	const stringValue = (node: ts.Expression | undefined): string | undefined => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined);
	const visit = (node: ts.Node): void => {
		if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'process' && node.name.text === 'env') readsProcessEnv = true;
		if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'process' && stringValue(node.argumentExpression) === 'env') readsProcessEnv = true;
		if (ts.isImportDeclaration(node) && stringValue(node.moduleSpecifier) === 'dotenv/config') loadsEnvFile = true;
		if (ts.isCallExpression(node)) {
			if (node.expression.kind === ts.SyntaxKind.ImportKeyword && stringValue(node.arguments[0]) === 'dotenv/config') loadsEnvFile = true;
			if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'config') {
				const receiver = node.expression.expression;
				const directDotenv = ts.isIdentifier(receiver) && receiver.text === 'dotenv';
				const requiredDotenv = ts.isCallExpression(receiver) && ts.isIdentifier(receiver.expression) && receiver.expression.text === 'require' && stringValue(receiver.arguments[0]) === 'dotenv';
				if (directDotenv || requiredDotenv) loadsEnvFile = true;
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return { readsProcessEnv, loadsEnvFile };
}
