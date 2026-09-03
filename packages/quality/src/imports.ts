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

const MODULE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.astro', '.mdx', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];

function resolveImport(specifier: string, importer: string, cfg: QualityConfig): string | null {
	const alias = Object.entries(cfg.aliases ?? {}).find(([prefix]) => specifier.startsWith(prefix));
	const raw = alias ? resolve(cfg.root, alias[1], specifier.slice(alias[0].length)) : specifier.startsWith('.') ? resolve(dirname(importer), specifier) : null;
	if (!raw) return null;
	const stripped = /\.(?:c|m)?(?:j|t)sx?$/.test(raw) ? raw.slice(0, raw.lastIndexOf('.')) : raw;
	for (const base of [...new Set([raw, stripped])])
		for (const ext of MODULE_EXTS) {
			const candidate = base + ext;
			if (isFile(candidate)) return candidate;
			const index = join(base, `index${ext}`);
			if (isFile(index)) return index;
		}
	return null;
}

function specifiers(fileName: string): string[] {
	const src = readFileSync(fileName, 'utf8');
	const file = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true);
	const vals: string[] = [];
	ts.forEachChild(file, (node) => {
		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) vals.push(node.moduleSpecifier.text);
		if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) vals.push(node.moduleSpecifier.text);
		if (
			ts.isCallExpression(node) &&
			node.arguments.length === 1 &&
			ts.isStringLiteral(node.arguments[0]) &&
			(node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(file) === 'require')
		)
			vals.push(node.arguments[0].text);
	});
	return vals;
}

export type ImportFailure = { importer: string; specifier: string };

/** Checks all configured internal imports, including assets and extensionless modules. */
export function checkImports(config: QualityConfig): ImportFailure[] {
	const failures: ImportFailure[] = [];
	for (const importer of sourceFiles(config)) {
		for (const specifier of specifiers(importer)) {
			if (config.externalPrefixes?.some((prefix) => specifier.startsWith(prefix))) continue;
			if (!specifier.startsWith('.') && !Object.keys(config.aliases ?? {}).some((prefix) => specifier.startsWith(prefix))) continue;
			if (specifier.startsWith('.') && extname(specifier) && !MODULE_EXTS.includes(extname(specifier))) continue;
			if (!resolveImport(specifier, importer, config)) failures.push({ importer: displayPath(config, importer), specifier });
		}
	}
	return failures;
}
