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
		const parsed = ts.createSourceFile(i, readFileSync(i, 'utf8'), ts.ScriptTarget.Latest, true);
		ts.forEachChild(parsed, (node) => {
			const specifier =
				ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
					? node.moduleSpecifier.text
					: ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
						? node.moduleSpecifier.text
						: ts.isCallExpression(node) &&
							  node.arguments.length === 1 &&
							  ts.isStringLiteral(node.arguments[0]) &&
							  (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(parsed) === 'require')
							? node.arguments[0].text
							: undefined;
			if (specifier === undefined || cfg.externalPrefixes?.some((prefix) => specifier.startsWith(prefix))) return;
			if (!specifier.startsWith('.') && !Object.keys(cfg.aliases ?? {}).some((prefix) => specifier.startsWith(prefix))) return;
			if (specifier.startsWith('.') && extname(specifier) && !MODULE_EXTS.includes(extname(specifier))) return;
			const alias = Object.entries(cfg.aliases ?? {}).find(([prefix]) => specifier.startsWith(prefix));
			const raw = alias ? resolve(cfg.root, alias[1], specifier.slice(alias[0].length)) : specifier.startsWith('.') ? resolve(dirname(i), specifier) : null;
			if (
				!raw ||
				![...new Set([raw, /\.(?:c|m)?(?:j|t)sx?$/.test(raw) ? raw.slice(0, raw.lastIndexOf('.')) : raw])].some((base) =>
					MODULE_EXTS.some((ext) => isFile(base + ext) || isFile(join(base, `index${ext}`))),
				)
			)
				failures.push({ importer: displayPath(cfg, i), specifier });
		});
	}
	return failures;
}
