/**
 * packages/quality/src/lib/imports.ts
 * Resolves import specifiers to their corresponding files.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { dirname, extname, join, resolve } from 'node:path';
import { displayPath, isFile, srcFiles } from './files.js';
import { readFileSync } from 'node:fs';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const MODULE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.astro', '.mdx', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
/** An unresolved local import specifier and the file that contains it. */
export type ImportFailure = { importer: string; specifier: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Resolves a relative or configured alias import against the repository filesystem.
 *
 * @param specifier Module specifier written by the importing source file.
 * @param importer Absolute path of the file containing the import.
 * @param cfg Quality configuration containing aliases and the repository root.
 *
 * @return The resolved file path, or `null` when no supported target exists.
 */
function resolveImport(specifier: string, importer: string, cfg: QualityCfg): string | null {
	const alias = Object.entries(cfg.aliases ?? {}).find(([p]) => specifier.startsWith(p));
	const raw = alias ? resolve(cfg.root, alias[1], specifier.slice(alias[0].length)) : specifier.startsWith('.') ? resolve(dirname(importer), specifier) : null;
	if (!raw) return null;
	const stripped = /\.(?:c|m)?(?:j|t)sx?$/.test(raw) ? raw.slice(0, raw.lastIndexOf('.')) : raw;
	for (const b of [...new Set([raw, stripped])])
		for (const ext of MODULE_EXTS) {
			const candidate = b + ext;
			if (isFile(candidate)) return candidate;
			const idx = join(b, `index${ext}`);
			if (isFile(idx)) return idx;
		}
	return null;
}

/**
 * Extracts static import, export, dynamic-import, and CommonJS require specifiers from a source file.
 *
 * @param fileName Absolute path to the source file to parse.
 *
 * @return Module specifiers found in the file.
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
 * @param cfg Quality configuration defining the source scope and alias rules.
 *
 * @return Internal import failures whose specifiers could not be resolved.
 */
export function checkImports(cfg: QualityCfg): ImportFailure[] {
	const failures: ImportFailure[] = [];
	for (const i of srcFiles(cfg)) {
		for (const s of specifiers(i)) {
			if (cfg.externalPrefixes?.some((p) => s.startsWith(p))) continue;
			if (!s.startsWith('.') && !Object.keys(cfg.aliases ?? {}).some((p) => s.startsWith(p))) continue;
			if (s.startsWith('.') && extname(s) && !MODULE_EXTS.includes(extname(s))) continue;
			if (!resolveImport(s, i, cfg)) failures.push({ importer: displayPath(cfg, i), specifier: s });
		}
	}
	return failures;
}
