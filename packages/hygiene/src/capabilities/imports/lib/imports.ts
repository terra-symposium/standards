/**
 * packages/hygiene/src/capabilities/imports/lib/imports.ts
 * Resolves import specifiers to their corresponding files.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { createRequire, isBuiltin } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { displayPath, isFile, srcFiles } from '@terra-symposium/hygiene/core';
import { readFileSync } from 'node:fs';

// TYPES
import type { QualityCfg } from '@terra-symposium/hygiene/core';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const MODULE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.astro', '.mdx', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
/**
 * An unresolved local import specifier and the file that contains it.
 */
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
	for (const b of [...new Set([raw, /\.(?:c|m)?(?:j|t)sx?$/.test(raw) ? raw.slice(0, raw.lastIndexOf('.')) : raw])])
		for (const ext of MODULE_EXTS) {
			const candidate = b + ext;
			if (isFile(candidate)) return candidate;
			const idx = join(b, `index${ext}`);
			if (isFile(idx)) return idx;
		}
	return null;
}

/**
 * Resolves bare package imports with TypeScript's configured module resolver.
 *
 * @param specifier Bare module specifier written by the importing source file.
 * @param importer Absolute path of the file containing the import.
 * @param options Compiler options for this repository.
 *
 * @return The resolved module path, or `null` when no installed module exists.
 */
function resolvePackageImport(specifier: string, importer: string, options: ts.CompilerOptions): string | null {
	if (isBuiltin(specifier) || /^[a-z][\w+.-]*:/i.test(specifier)) return specifier;
	const resolved = ts.resolveModuleName(specifier, importer, options, ts.sys).resolvedModule?.resolvedFileName;
	if (resolved) return resolved;
	try {
		return createRequire(importer).resolve(specifier);
	} catch {
		// Stylesheet entrypoints may export only the bundler's `style` condition.
		if (!['.css', '.scss', '.sass', '.less'].includes(extname(importer))) return null;
		const parts = specifier.split('/');
		const packageName = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
		const subpath = `.${specifier.slice(packageName.length)}`;
		for (let dir = dirname(importer); ; dir = dirname(dir)) {
			const packageRoot = join(dir, 'node_modules', packageName);
			const manifest = join(packageRoot, 'package.json');
			if (isFile(manifest)) {
				try {
					const exports = JSON.parse(readFileSync(manifest, 'utf8')).exports;
					const tgt = (subpath === '.' ? (exports?.['.'] ?? exports) : exports?.[subpath])?.style;
					if (typeof tgt !== 'string' || !tgt.startsWith('./')) return null;
					const asset = resolve(packageRoot, tgt);
					return asset.startsWith(`${packageRoot}${sep}`) && isFile(asset) ? asset : null;
				} catch {
					return null;
				}
			}
			if (dirname(dir) === dir) return null;
		}
	}
}

/**
 * Extracts static import, export, dynamic-import, and CommonJS require specifiers from a source file.
 *
 * @param fileName Absolute path to the source file to parse.
 *
 * @return Module specifiers found in the file.
 */
function specifiers(fileName: string): string[] {
	const file = ts.createSourceFile(fileName, readFileSync(fileName, 'utf8'), ts.ScriptTarget.Latest, true);
	const vals: string[] = [];
	ts.forEachChild(file, n => {
		if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) vals.push(n.moduleSpecifier.text);
		if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) vals.push(n.moduleSpecifier.text);
		if (ts.isCallExpression(n) && n.arguments.length === 1 && ts.isStringLiteral(n.arguments[0]) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || n.expression.getText(file) === 'require'))
			vals.push(n.arguments[0].text);
	});
	return vals;
}

/**
 * Checks configured local imports and installed bare modules, including assets and extensionless modules.
 *
 * @param cfg Quality configuration defining the source scope and alias rules.
 *
 * @return Internal import failures whose specifiers could not be resolved.
 */
export function checkImports(cfg: QualityCfg): ImportFailure[] {
	const failures: ImportFailure[] = [];
	const options: ts.CompilerOptions = { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler };
	if (cfg.tsconfig) {
		const tsconfigPath = resolve(cfg.root, cfg.tsconfig);
		if (isFile(tsconfigPath)) {
			const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
			if (!config.error) Object.assign(options, ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(tsconfigPath)).options);
		}
	}
	for (const i of srcFiles(cfg)) {
		const importer = resolve(cfg.root, i);
		for (const s of specifiers(importer)) {
			if (cfg.externalPrefixes?.some(p => s.startsWith(p))) continue;
			if (s.startsWith('.') && extname(s) && !MODULE_EXTS.includes(extname(s))) continue;
			if (!(s.startsWith('.') || Object.keys(cfg.aliases ?? {}).some(p => s.startsWith(p)) ? resolveImport(s, importer, cfg) : resolvePackageImport(s, importer, options)))
				failures.push({ importer: displayPath(cfg, importer), specifier: s });
		}
	}
	return failures;
}
