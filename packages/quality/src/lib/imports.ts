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
 * Checks all configured internal imports, including assets and extensionless modules.
 *
 * @param cfg Quality configuration defining the source scope and alias rules.
 *
 * @return Internal import failures whose specifiers could not be resolved.
 */
export function checkImports(cfg: QualityCfg): ImportFailure[] {
	const failures: ImportFailure[] = [];
	for (const i of srcFiles(cfg)) {
		const file = ts.createSourceFile(i, readFileSync(i, 'utf8'), ts.ScriptTarget.Latest, true);
		const specifiers: string[] = [];
		ts.forEachChild(file, (node) => {
			if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
			if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
			if (
				ts.isCallExpression(node) &&
				node.arguments.length === 1 &&
				ts.isStringLiteral(node.arguments[0]) &&
				(node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(file) === 'require')
			)
				specifiers.push(node.arguments[0].text);
		});
		for (const s of specifiers) {
			if (cfg.externalPrefixes?.some((p) => s.startsWith(p))) continue;
			if (!s.startsWith('.') && !Object.keys(cfg.aliases ?? {}).some((p) => s.startsWith(p))) continue;
			if (s.startsWith('.') && extname(s) && !MODULE_EXTS.includes(extname(s))) continue;
			const alias = Object.entries(cfg.aliases ?? {}).find(([prefix]) => s.startsWith(prefix));
			const raw = alias ? resolve(cfg.root, alias[1], s.slice(alias[0].length)) : s.startsWith('.') ? resolve(dirname(i), s) : null;
			let resolved = false;
			if (raw) {
				resolveLoop: for (const base of [...new Set([raw, /\.(?:c|m)?(?:j|t)sx?$/.test(raw) ? raw.slice(0, raw.lastIndexOf('.')) : raw])]) {
					for (const ext of MODULE_EXTS) {
						if (isFile(base + ext)) {
							resolved = true;
							break resolveLoop;
						}
						if (isFile(join(base, `index${ext}`))) {
							resolved = true;
							break resolveLoop;
						}
					}
				}
			}
			if (!resolved) failures.push({ importer: displayPath(cfg, i), specifier: s });
		}
	}
	return failures;
}
