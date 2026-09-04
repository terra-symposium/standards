/**
 * packages/quality/src/imports.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { displayPath, isFile, sourceFiles } from './files.js';
import { readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import ts from 'typescript';

// TYPES
import type { QualityConfig } from './config.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const MODULE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.astro', '.mdx', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
export type ImportFailure = { importer: string; specifier: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param specifier
 * @param importer
 * @param cfg
 *
 * @return
 */
function resolveImport(specifier: string, importer: string, cfg: QualityConfig): string | null {
	const alias = Object.entries(cfg.aliases ?? {}).find(([prefix]) => specifier.startsWith(prefix));
	const raw = alias ? resolve(cfg.root, alias[1], specifier.slice(alias[0].length)) : specifier.startsWith('.') ? resolve(dirname(importer), specifier) : null;
	if (!raw) return null;
	const stripped = /\.(?:c|m)?(?:j|t)sx?$/.test(raw) ? raw.slice(0, raw.lastIndexOf('.')) : raw;
	for (const base of [...new Set([raw, stripped])])
		for (const ext of MODULE_EXTS) {
			const candidate = base + ext;
			if (isFile(candidate)) return candidate;
			const idx = join(base, `index${ext}`);
			if (isFile(idx)) return idx;
		}
	return null;
}

/**
 *
 * @param fileName
 *
 * @return
 */
function specifiers(fileName: string): string[] {
	const src = readFileSync(fileName, 'utf8');
	const file = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true);
	const vals: string[] = [];
	ts.forEachChild(file, (n) => {
		if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) vals.push(n.moduleSpecifier.text);
		if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) vals.push(n.moduleSpecifier.text);
		if (ts.isCallExpression(n) && n.arguments.length === 1 && ts.isStringLiteral(n.arguments[0]) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || n.expression.getText(file) === 'require'))
			vals.push(n.arguments[0].text);
	});
	return vals;
}

/**
 * Checks all configured internal imports, including assets and extensionless modules.
 *
 * @param cfg
 *
 * @return
 */
export function checkImports(cfg: QualityConfig): ImportFailure[] {
	const failures: ImportFailure[] = [];
	for (const importer of sourceFiles(cfg)) {
		for (const specifier of specifiers(importer)) {
			if (cfg.externalPrefixes?.some((prefix) => specifier.startsWith(prefix))) continue;
			if (!specifier.startsWith('.') && !Object.keys(cfg.aliases ?? {}).some((p) => specifier.startsWith(p))) continue;
			if (specifier.startsWith('.') && extname(specifier) && !MODULE_EXTS.includes(extname(specifier))) continue;
			if (!resolveImport(specifier, importer, cfg)) failures.push({ importer: displayPath(cfg, importer), specifier });
		}
	}
	return failures;
}
