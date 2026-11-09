/**
 * packages/quality/src/lib/documentation.ts
 * Create comments documenting the file, grouping imports, and sectioning code.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { extname, relative, resolve, sep } from 'node:path';
import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const N_REGEX = /(?<=\n)/;
const R_N_END_REGEX = /\r?\n$/;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const TYPE_S_REGEX = /^type\s+/;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const R_N_REGEX = /\r?\n/;
/**
 *
 * @return
 */
const S_S_G_REGEX = () => /\/\*\*[\s\S]*?\*\//g;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const T_R_N_S_S_R_N_T_T_R_N_REGEX = /^\/\*\*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\*\/[ \t]*(?:\r?\n)*/;
const T_T_REGEX = /^[ \t]*\*[ \t]?/;
const S_REGEX = /^\s*/;
const S_CLASS_2 = /^\s*(?:\/\/|\/\*|\*\/|\*)/;
const S_CLASS_3 = /^\s*\* ?/;
const S_W_REGEX = /^\s*@\w+/;
const RETURNS_B_REGEX = /^@returns?\b/;
const UFEFF_REGEX = /^\uFEFF/;
const S_CLASS_4 = /\s*$/;
const C_M_JS_JSX_TS_TSX_REGEX = /(?:^|[\\/])[^\\/]+\.(?:c|m)?(?:js|jsx|ts|tsx)$/;
const OPEN = `/*${'/'.repeat(50)}`;
const CLOSE = `${'/'.repeat(50)}*/`;
const SUPPORTED = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
/** Canonical groups used to order and label source imports. */
type ImportGroup = 'API' | 'COMPONENTS' | 'DATA' | 'TYPES';
/** Source-code sections maintained by the documentation formatter. */
type SrcGroup = 'CONFIG' | 'HELPERS';
/** Declaration categories that can require meaningful TSDoc descriptions. */
export type DocumentationRequirements = { types?: boolean; functions?: boolean; exportedFunctions?: boolean; noInlineFunctions?: boolean };
/** A repeated named import reported within one source file. */
export type DuplicateImportFinding = { file: string; line: number; module: string };
const PNPM_FENCE = /^\s*```(?:sh|bash|zsh|shell)\s*$/i;
const FENCE_CLOSE = /^\s*```\s*$/;
const PNPM_DIR_FLAG = /^(\s*(?:\$\s*)?pnpm)\s+(?:-C|--prefix)(\s+)("[^"]+"|'[^']+'|\S+)(.*)$/;

/**
 * Finds obsolete pnpm directory flags in configured Markdown shell fences.
 *
 * @param cfg Quality configuration containing documentation command roots.
 * @returns Deprecated pnpm directory commands found in configured Markdown.
 */
export function documentedCommandFindings(cfg: QualityCfg): { file: string; line: number; command: string; recommendation: string }[] {
	const roots = cfg.documentation?.commandRoots?.map((path) => resolve(cfg.root, path)) ?? [];
	if (!roots.length) return [];
	return srcFiles({ ...cfg, sourceRoots: roots, extensions: ['.md', '.mdx'] }).flatMap((file) => {
		let inShellFence = false;
		return readFileSync(file, 'utf8')
			.split(N_REGEX)
			.flatMap((segment, i) => {
				const line = segment.replace(R_N_END_REGEX, '');
				if (!inShellFence) {
					if (PNPM_FENCE.test(line)) inShellFence = true;
					return [];
				}
				if (FENCE_CLOSE.test(line)) {
					inShellFence = false;
					return [];
				}
				return PNPM_DIR_FLAG.test(line) ? [{ file: displayPath(cfg, file), line: i + 1, command: line.trim(), recommendation: 'replace the pnpm directory flag with --dir' }] : [];
			});
	});
}

/**
 * Replaces only known deprecated pnpm directory flags in configured Markdown shell fences.
 *
 * @param cfg Quality configuration containing documentation command roots.
 * @returns Number of deprecated commands replaced.
 */
export function fixDocumentedCommands(cfg: QualityCfg): number {
	const roots = cfg.documentation?.commandRoots?.map((path) => resolve(cfg.root, path)) ?? [];
	if (!roots.length) return 0;
	let fixed = 0;
	for (const file of srcFiles({ ...cfg, sourceRoots: roots, extensions: ['.md', '.mdx'] })) {
		const source = readFileSync(file, 'utf8');
		let inShellFence = false;
		const updated = source
			.split(N_REGEX)
			.map((segment) => {
				const line = segment.replace(R_N_END_REGEX, '');
				if (!inShellFence) {
					if (PNPM_FENCE.test(line)) inShellFence = true;
					return segment;
				}
				if (FENCE_CLOSE.test(line)) {
					inShellFence = false;
					return segment;
				}
				const match = PNPM_DIR_FLAG.exec(line);
				if (!match) return segment;
				fixed++;
				return `${match[1]} --dir${match[2]}${match[3]}${match[4]}${segment.slice(line.length)}`;
			})
			.join('');
		if (source !== updated) writeFileSync(file, updated);
	}
	return fixed;
}

/*//////////////////////////////////////////////////
DOCUMENTATION
//////////////////////////////////////////////////*/

/** One missing, malformed, or detached source-documentation item. */
export type DocumentationFinding = {
	file: string;
	line: number;
	column: number;
	name: string;
	kind: 'file' | 'summary' | 'param' | 'return' | 'tag' | 'type' | 'function' | 'inline' | 'orphan';
	reason: string;
	severity: 'error';
};
export const DOCUMENTATION_DESCRIPTION_NOTICE = 'Ask an agent for meaningful documentation prose; this check only reports missing descriptions and never generates them in bulk.';
/** Source offsets and exact comment text for one TSDoc block. */
type TSDocBlock = { start: number; end: number; text: string };
/** Character offset and normalized text for one parsed TSDoc line. */
type TSDocLine = { offset: number; text: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Writes a generated source update through a temporary file after validating
 * that the candidate still has no TypeScript or JavaScript parse errors.
 *
 * @param fileName Source file to replace.
 * @param src Candidate source text to validate and write.
 *
 * @return Nothing; throws before replacing the source when parsing fails.
 */
function writeValidatedSrc(fileName: string, src: string): boolean {
	try {
		if (/\.d\.[cm]?ts$/.test(fileName)) {
			if ((ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName)) as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) return false;
		} else {
			if (
				ts.transpileModule(src, {
					fileName,
					reportDiagnostics: true,
					compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
				}).diagnostics?.length
			)
				return false;
		}
	} catch {
		return false;
	}
	const temp = `${fileName}.${process.pid}.quality.tmp`;
	try {
		writeFileSync(temp, src);
		renameSync(temp, fileName);
	} finally {
		try {
			unlinkSync(temp);
		} catch {
			// The temporary file was renamed successfully.
		}
	}
	return true;
}

/**
 * Selects the TypeScript parser mode for a JavaScript or TypeScript filename.
 *
 * @param fileName Source filename whose extension determines the parser mode.
 *
 * @return TypeScript compiler script kind for the filename.
 */
function srcKind(fileName: string): ts.ScriptKind {
	return /\.[cm]?tsx?$/.test(fileName) && fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/**
 * Reads the module specifier text from an import declaration.
 *
 * @param n Import declaration to inspect.
 *
 * @return Module specifier text, or an empty string for a non-string specifier.
 */
/**
 * Assigns an import to the canonical group used by the source-maintenance layout.
 *
 * @param name Local import name whose casing indicates its category.
 *
 * @return Import group for API, component, or uppercase data names.
 */
function importGroup(name: string): ImportGroup {
	if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'DATA';
	if (/^[A-Z]/.test(name)) return 'COMPONENTS';
	return 'API';
}

/**
 * Finds repeated named bindings that the source maintainer can merge without
 * changing import evaluation order or side-effect-only imports.
 *
 * @param files Configured source files to inspect.
 *
 * @return One finding for each later import declaration that repeats a binding.
 */
export function duplicateImportFindings(files: string[]): DuplicateImportFinding[] {
	const findings: DuplicateImportFinding[] = [];
	for (const file of files) {
		if (!SUPPORTED.has(extname(file))) continue;
		const parsed = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, srcKind(file));
		const seen = new Set<string>();
		for (const declaration of parsed.statements.filter(ts.isImportDeclaration)) {
			if (!declaration.importClause || !ts.isStringLiteral(declaration.moduleSpecifier)) continue;
			const keys: string[] = [];
			if (declaration.importClause.name)
				keys.push(
					`${declaration.moduleSpecifier.text}|${importGroup(declaration.importClause.name.text)}|${declaration.importClause.isTypeOnly ? 'type' : 'value'}|default:${declaration.importClause.name.text}`,
				);
			if (declaration.importClause.namedBindings && ts.isNamespaceImport(declaration.importClause.namedBindings))
				keys.push(
					`${declaration.moduleSpecifier.text}|${importGroup(declaration.importClause.namedBindings.name.text)}|${declaration.importClause.isTypeOnly ? 'type' : 'value'}|namespace:${declaration.importClause.namedBindings.name.text}`,
				);
			if (declaration.importClause.namedBindings && ts.isNamedImports(declaration.importClause.namedBindings)) {
				for (const element of declaration.importClause.namedBindings.elements) {
					const typeOnly = declaration.importClause.isTypeOnly || element.isTypeOnly;
					keys.push(`${declaration.moduleSpecifier.text}|${typeOnly ? 'TYPES' : importGroup(element.name.text)}|${typeOnly ? 'type' : 'value'}|${element.getText(parsed).replace(TYPE_S_REGEX, '')}`);
				}
			}
			if (keys.some((key) => seen.has(key))) {
				const { line } = parsed.getLineAndCharacterOfPosition(declaration.getStart(parsed));
				findings.push({ file, line: line + 1, module: declaration.moduleSpecifier.text });
			}
			for (const key of keys) seen.add(key);
		}
	}
	return findings;
}

/**
 * Chooses the TSDoc parameter-tag name for a declared parameter.
 *
 * @param p Parameter declaration whose binding name should be documented.
 * @param i Zero-based parameter position used when the binding has no simple identifier.
 *
 * @return The identifier name, `props` for object bindings, or a positional fallback.
 */
function fnParamName(p: ts.ParameterDeclaration, i: number): string {
	return ts.isIdentifier(p.name) ? p.name.text : ts.isObjectBindingPattern(p.name) ? 'props' : `param${i + 1}`;
}
/**
 * Rebuilds a function's TSDoc layout while preserving existing summary and tag prose.
 *
 * @param n Function declaration whose signature controls required parameter and return tags.
 * @param parsed Source file containing the declaration.
 * @param eol Line-ending sequence to emit.
 * @param existing Existing TSDoc block, when one is present.
 *
 * @return Normalized TSDoc text; missing prose remains blank for later authoring.
 */
function genFnDoc(n: ts.SignatureDeclaration, parsed: ts.SourceFile, eol: string, existing = ''): string {
	const params = n.parameters.map(fnParamName);
	const body = existing
		.slice(3, -2)
		.split(R_N_REGEX)
		.map((l) => l.replace(S_CLASS_3, '').trim());
	while (body.length && !body.at(0)?.trim()) body.shift();
	while (body.length && !body.at(-1)?.trim()) body.pop();
	const firstTag = body.findIndex((l) => S_W_REGEX.test(l));
	const summary = (firstTag < 0 ? body : body.slice(0, firstTag)).map((l) => l.trim());
	while (summary.length && !summary.at(-1)?.trim()) summary.pop();
	const blocks: string[][] = [];
	for (const line of firstTag < 0 ? [] : body.slice(firstTag).filter((l) => l.trim())) {
		if (S_W_REGEX.test(line) || !blocks.length) blocks.push([line.trim()]);
		else blocks.at(-1)!.push(line);
	}
	const paramBlocks = new Map<string, string[]>();
	let returnBlock: string[] | undefined;
	const otherBlocks: string[][] = [];
	for (const block of blocks) {
		const param = block[0]?.match(/^@param\s+(?:\{[^}]*\}\s*)?(\S+)/);
		if (param) {
			paramBlocks.set(param[1]!.replace(/^\[|\]$/g, '').split('=')[0]!, block);
			continue;
		}
		if (RETURNS_B_REGEX.test(block[0] ?? '')) {
			returnBlock = [`${block[0]!.replace(RETURNS_B_REGEX, '@return')}`, ...block.slice(1)];
			continue;
		}
		otherBlocks.push(block);
	}
	const content = [...summary];
	if (!content.length || content.at(-1) !== '') content.push('');
	for (const name of params) content.push(...(paramBlocks.get(name) ?? [`@param ${name}`]));
	for (const [name, block] of paramBlocks) if (!params.includes(name)) content.push(...block);
	if (returnBlock || returnsVal(n)) {
		if (content.at(-1) !== '') content.push('');
		content.push(...(returnBlock ?? ['@return']));
	}
	for (const block of otherBlocks) content.push('', ...block);
	const norm = ['/**', ...content.map((l) => (l ? ` * ${l}` : ' *')), ' */'].join(eol);
	return existing === norm ? existing : norm;
}

/**
 * Adds the canonical header, grouped imports, and top-level source sections.
 *
 * @param root Repository root used to create the file header path.
 * @param fileName Absolute path to the source file to maintain.
 *
 * @return `true` when the file was rewritten; otherwise `false`.
 */
export function maintainSrcFile(root: string, fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const eol = original.includes('\r\n') ? '\r\n' : '\n';
	let src = original.replace(UFEFF_REGEX, '').replace(/^\s+/, '');
	const path = relative(root, fileName).split(sep).join('/');
	src = src.replace(/^\/\*\*[ \t]+([^\r\n]*?)\s*\*\/[ \t]*(?:\r?\n)*/, (_match, d: string) => `/**${eol} * ${d}${eol} */${eol}`);
	const headerFragment = src.match(T_R_N_S_S_R_N_T_T_R_N_REGEX);
	if (headerFragment) {
		const headerLines = headerFragment[1]!
			.split(R_N_REGEX)
			.map((line) => line.replace(T_T_REGEX, '').trim())
			.filter(Boolean);
		if (headerLines[0] === path || headerLines[0] === path.replace(/^.*\//, '')) {
			const descriptions = headerLines.slice(1);
			let rest = src.slice(headerFragment[0].length);
			let changed = false;
			while (true) {
				const prefix = rest.match(/^(?:\s*)/)?.[0] ?? '';
				const orphan = rest.slice(prefix.length).match(/^(?:[ \t]*\*[ \t]?[^\r\n]*\r?\n)+[ \t]*\*\/[ \t]*(?:\r?\n)*/);
				if (orphan) {
					for (const line of orphan[0]
						.split(R_N_REGEX)
						.map((line) =>
							line
								.replace(T_T_REGEX, '')
								.replace(/[ \t]*\*\/?[ \t]*$/, '')
								.trim(),
						)
						.map((line) => (line === '/' ? '' : line))
						.filter(Boolean))
						if (line !== path && !descriptions.includes(line)) descriptions.push(line);
					rest = rest.slice(prefix.length + orphan[0].length);
					changed = true;
					continue;
				}
				const doc = rest.slice(prefix.length).match(/^\/\*\*(?:[ \t]*([^\r\n]*?)[ \t]*\*\/[ \t]*(?:\r?\n)*|[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\*\/[ \t]*(?:\r?\n)*)/);
				if (!doc) break;
				for (const line of (doc[1] ?? doc[2] ?? '')
					.split(R_N_REGEX)
					.map((line) => line.replace(T_T_REGEX, '').trim())
					.filter(Boolean))
					if (line !== path && !descriptions.includes(line)) descriptions.push(line);
				rest = rest.slice(prefix.length + doc[0].length);
				changed = true;
			}
			if (changed) src = `${['/**', path, ...descriptions, ' */'].map((line, i, all) => (i === 0 || i === all.length - 1 ? line : ` * ${line}`)).join(eol)}${eol}${eol}${rest.replace(S_REGEX, '')}`;
		}
	}
	const existingHeader = src.match(T_R_N_S_S_R_N_T_T_R_N_REGEX);
	const headerLines =
		existingHeader?.[1]
			.split(R_N_REGEX)
			.map((l) => l.replace(T_T_REGEX, '').trim())
			.filter(Boolean) ?? [];
	const headerDescription = headerLines[0]?.includes('/') || /\.(?:c|m)?(?:js|ts)x?$/.test(headerLines[0] ?? '') ? headerLines.slice(1) : headerLines;
	const header = ['/**', path, ...headerDescription, ' */'].map((l, i) => (i === 0 ? l : i === headerDescription.length + 2 ? l : ` * ${l}`)).join(eol);
	if (existingHeader) {
		src = src.replace(T_R_N_S_S_R_N_T_T_R_N_REGEX, `${header}${eol}${eol}`);
		src = src.replace(new RegExp(`^(\\/\\*\\*\\r?\\n \\* ${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\n \\*\\/)(?:\\r?\\n)+\\1(?:\\r?\\n)+`), `$1${eol}${eol}`);
	} else if (!src.startsWith('#!') && !src.startsWith('/**')) src = `${header}${eol}${eol}${src}`;
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const imports = parsed.statements.filter((n): n is ts.ImportDeclaration => {
		if (!ts.isImportDeclaration(n)) return false;
		const localNames = new Set<string>();
		for (const statement of parsed.statements) {
			if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement))
				if (statement.name) localNames.add(statement.name.text);
			if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) localNames.add(declaration.name.text);
		}
		if (!n.importClause) return true;
		if (n.importClause.name && localNames.has(n.importClause.name.text)) return false;
		if (n.importClause.namedBindings && ts.isNamespaceImport(n.importClause.namedBindings) && localNames.has(n.importClause.namedBindings.name.text)) return false;
		return !(n.importClause.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some((e) => localNames.has(e.name.text)));
	});
	if (imports.length) {
		const first = imports[0];
		const groups: Record<ImportGroup, { source: string; text: string }[]> = { API: [], COMPONENTS: [], DATA: [], TYPES: [] };
		/** Import bindings accumulated under one module and import kind. */
		type MergedImport = { group: ImportGroup; source: string; module: string; typeOnly: boolean; defaultName?: string; namespace?: string; named: Set<string> };
		const merged = new Map<string, MergedImport>();
		const get = (group: ImportGroup, declaration: ts.ImportDeclaration, typeOnly: boolean) => {
			const source = ts.isStringLiteral(declaration.moduleSpecifier) ? declaration.moduleSpecifier.text : '';
			const key = `${group}|${typeOnly ? 'type|' : ''}${source}`;
			const existing = merged.get(key);
			if (existing) return existing;
			const created: MergedImport = { group, source, module: declaration.moduleSpecifier.getText(parsed), typeOnly, named: new Set<string>() };
			merged.set(key, created);
			return created;
		};
		for (const declaration of imports) {
			if (!declaration.importClause) {
				get('API', declaration, false).named.add('');
				continue;
			}
			if (declaration.importClause.name)
				get(declaration.importClause.isTypeOnly ? 'TYPES' : importGroup(declaration.importClause.name.text), declaration, declaration.importClause.isTypeOnly).defaultName =
					declaration.importClause.name.text;
			if (declaration.importClause.namedBindings && ts.isNamespaceImport(declaration.importClause.namedBindings))
				get(declaration.importClause.isTypeOnly ? 'TYPES' : importGroup(declaration.importClause.namedBindings.name.text), declaration, declaration.importClause.isTypeOnly).namespace =
					declaration.importClause.namedBindings.name.text;
			if (declaration.importClause.namedBindings && ts.isNamedImports(declaration.importClause.namedBindings)) {
				for (const element of declaration.importClause.namedBindings.elements) {
					const typeOnly = declaration.importClause.isTypeOnly || element.isTypeOnly;
					get(typeOnly ? 'TYPES' : importGroup(element.name.text), declaration, typeOnly).named.add(element.getText(parsed).replace(TYPE_S_REGEX, ''));
				}
			}
		}
		for (const value of merged.values()) {
			const prefix = value.typeOnly ? 'import type ' : 'import ';
			if (value.named.has('')) {
				groups[value.group].push({ source: value.source, text: `import ${value.module};` });
				continue;
			}
			if (value.namespace) {
				groups[value.group].push({ source: value.source, text: `${prefix}${[value.defaultName, `* as ${value.namespace}`].filter(Boolean).join(', ')} from ${value.module};` });
				if (!value.named.size) continue;
			}
			const named = value.named.size ? `{ ${[...value.named].sort().join(', ')} }` : undefined;
			const clause = value.namespace ? named : [value.defaultName, named].filter(Boolean).join(', ');
			if (value.typeOnly && value.defaultName && named) {
				groups[value.group].push({ source: value.source, text: `${prefix}${value.defaultName} from ${value.module};` });
				groups[value.group].push({ source: value.source, text: `${prefix}${named} from ${value.module};` });
			} else if (clause) groups[value.group].push({ source: value.source, text: `${prefix}${clause} from ${value.module};` });
		}
		/**
		 *
		 * @param a
		 * @param b
		 *
		 * @return
		 */
		const comp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
		/**
		 *
		 * @param label
		 *
		 * @return
		 */
		const importFence = src.slice(0, first.getStart(parsed)).match(/\/\*\/{10,}[ \t]*\r?\n[ \t]*IMPORTS[ \t]*\r?\n[ \t]*\/{10,}\*\//);
		src = `${src.slice(0, importFence ? importFence.index : first.getStart(parsed)).replace(S_CLASS_4, `${eol}${eol}`)}${OPEN}${eol}IMPORTS${eol}${CLOSE}${eol}${(Object.keys(groups) as ImportGroup[])
			.sort(comp)
			.flatMap((label) => {
				const seen = new Set<string>();
				const uniqueEntries = groups[label]
					.sort((a, b) => comp(a.text, b.text) || comp(a.source, b.source))
					.filter((e) => {
						if (seen.has(e.text)) return false;
						seen.add(e.text);
						return true;
					});
				return uniqueEntries.length ? [`// ${label}`, ...uniqueEntries.map((e) => e.text), ''] : [];
			})
			.join(eol)}${src.slice(imports.at(-1)!.end).replace(S_REGEX, eol)}`;
	}
	{
		const fnSource = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
		const updates: { start: number; end: number; text: string }[] = [];
		const fns: ts.SignatureDeclaration[] = [];
		const visitFns = (node: ts.Node): void => {
			if (isNamedDocumentationFn(node)) fns.push(node);
			ts.forEachChild(node, visitFns);
		};
		visitFns(fnSource);
		for (const node of fns) {
			const target = documentationTarget(node);
			const doc = [...src.slice(target.getFullStart(), target.getStart(fnSource)).matchAll(S_S_G_REGEX())].at(-1);
			if (!doc || doc.index === undefined) continue;
			const start = target.getFullStart() + doc.index;
			const text = genFnDoc(node, fnSource, eol, doc[0]).replace(/\r?\n/g, `${eol}${src.slice(src.lastIndexOf('\n', start - 1) + 1, start)}`);
			if (text !== doc[0]) updates.push({ start, end: start + doc[0].length, text });
		}
		src = updates.sort((a, b) => b.start - a.start).reduce((current, update) => `${current.slice(0, update.start)}${update.text}${current.slice(update.end)}`, src);
		if (![...src.matchAll(/\/\*\/{10,}\s*\n\s*([A-Z][A-Z _-]*)\s*\n\s*\/{10,}\*\//g)].some((match) => !['IMPORTS', 'CONFIG', 'HELPERS'].includes(match[1]!.trim()))) {
			const managedParsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, srcKind(fileName));
			const literals: { start: number; end: number }[] = [];
			const visitManaged = (node: ts.Node): void => {
				if (
					ts.isStringLiteral(node) ||
					ts.isRegularExpressionLiteral(node) ||
					ts.isNoSubstitutionTemplateLiteral(node) ||
					ts.isTemplateHead(node) ||
					ts.isTemplateMiddle(node) ||
					ts.isTemplateTail(node) ||
					ts.isJsxText(node)
				) {
					literals.push({ start: node.getStart(managedParsed), end: node.end });
					return;
				}
				ts.forEachChild(node, visitManaged);
			};
			visitManaged(managedParsed);
			const withoutManagedSections = [...src.matchAll(/^[ \t]*\/\*\/{10,}[ \t]*\r?\n[ \t]*(?:CONFIG|HELPERS)[ \t]*\r?\n[ \t]*\/{10,}\*\/[ \t]*(?:\r?\n)*/gm)]
				.filter((match) => !literals.some((literal) => match.index! >= literal.start && match.index! < literal.end))
				.sort((a, b) => b.index! - a.index!)
				.reduce((text, match) => `${text.slice(0, match.index!)}${text.slice(match.index! + match[0].length)}`, src);
			const sectionSource = ts.createSourceFile(fileName, withoutManagedSections, ts.ScriptTarget.Latest, true, srcKind(fileName));
			const sectionImports = sectionSource.statements.filter(ts.isImportDeclaration);
			if (sectionImports.length) {
				const lastImport = sectionImports.at(-1) as ts.ImportDeclaration;
				const statements = sectionSource.statements.filter((node) => !ts.isImportDeclaration(node) && node.getStart(sectionSource) >= lastImport.end);
				const groups: Record<SrcGroup, string[]> = { CONFIG: [], HELPERS: [] };
				const remaining: string[] = [];
				for (const node of statements) {
					const leading = withoutManagedSections.slice(node.getFullStart(), node.getStart(sectionSource)).trim();
					const statement = withoutManagedSections.slice(node.getStart(sectionSource), node.end);
					let text: string;
					if (!ts.isFunctionDeclaration(node)) text = [leading, statement].filter(Boolean).join(eol);
					else {
						const doc = [...leading.matchAll(S_S_G_REGEX())].at(-1);
						const gen = genFnDoc(node, sectionSource, eol, doc?.[0]);
						text =
							doc?.index !== undefined
								? [`${leading.slice(0, doc.index)}${gen}${leading.slice(doc.index + doc[0].length)}`.trim(), statement].filter(Boolean).join(eol)
								: [leading, gen, statement].filter(Boolean).join(eol);
					}
					if (
						ts.isTypeAliasDeclaration(node) ||
						ts.isInterfaceDeclaration(node) ||
						ts.isEnumDeclaration(node) ||
						(ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Const) !== 0)
					)
						groups.CONFIG.push(text);
					else if (ts.isFunctionDeclaration(node)) groups.HELPERS.push(text);
					else remaining.push(text);
				}
				if (!groups.CONFIG.length && !groups.HELPERS.length) src = withoutManagedSections;
				else {
					const tail = statements.length ? withoutManagedSections.slice(statements.at(-1)!.end).trim() : withoutManagedSections.slice(lastImport.end).trim();
					const sections = (['CONFIG', 'HELPERS'] as SrcGroup[]).flatMap((label) =>
						groups[label].length ? [`${OPEN}${eol}${label}${eol}${CLOSE}${eol}${groups[label].join(label === 'CONFIG' ? eol : `${eol}${eol}`)}`] : [],
					);
					if (remaining.length) sections.push(remaining.join(`${eol}${eol}`));
					if (tail) sections.push(tail);
					src = `${withoutManagedSections.slice(0, lastImport.end).trimEnd()}${eol}${eol}${sections.join(`${eol}${eol}`)}${eol}`;
				}
			}
		}
	}
	let laidOut: string;
	{
		const layoutSrc = src
			.replace(/^([ \t]*)\/\*\/{10,}[ \t]*$/gm, `$1${OPEN}`)
			.replace(/^([ \t]*)\/{10,}\*\/[ \t]*$/gm, `$1${CLOSE}`)
			.replace(S_CLASS_4, eol);
		const layoutParsed = ts.createSourceFile(fileName, layoutSrc, ts.ScriptTarget.Latest, true, srcKind(fileName));
		const spans: { start: number; end: number }[] = [];
		/**
		 * @param node Node whose source span may contain literal content.
		 */
		const visit = (node: ts.Node): void => {
			if (ts.isStringLiteral(node) || ts.isRegularExpressionLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node) || ts.isJsxText(node)) {
				spans.push({ start: node.getStart(layoutParsed), end: node.end });
				return;
			}
			ts.forEachChild(node, visit);
		};
		visit(layoutParsed);
		spans.sort((a, b) => a.start - b.start);
		const lines: { text: string; start: number }[] = [];
		for (const text of layoutSrc.split(R_N_REGEX)) lines.push({ text, start: lines.length ? lines.at(-1)!.start + lines.at(-1)!.text.length + eol.length : 0 });
		const protectedLine = (line: { start: number }): boolean => {
			let low = 0;
			let high = spans.length - 1;
			while (low <= high) {
				const mid = (low + high) >> 1;
				const span = spans[mid];
				if (line.start < span.start) high = mid - 1;
				else if (line.start >= span.end) low = mid + 1;
				else return true;
			}
			return false;
		};
		const sectionOpen = (i: number): boolean => !protectedLine(lines[i]) && /^\s*\/\*\/{10,}\s*$/.test(lines[i].text);
		const sectionClose = (i: number): boolean => !protectedLine(lines[i]) && /^\s*\/{10,}\*\/\s*$/.test(lines[i].text);
		const lineGroup = (i: number): boolean => !protectedLine(lines[i]) && /^\s*\/\/ [A-Z][A-Z0-9 _-]*\s*$/.test(lines[i].text);
		for (let i = 0; i + 5 < lines.length; i++) {
			if (!sectionOpen(i) || !sectionClose(i + 2)) continue;
			let n = i + 3;
			while (n < lines.length && !lines[n].text.trim()) n++;
			if (n < lines.length && sectionOpen(n)) {
				lines.splice(i, n - i);
				i = Math.max(-1, i - 2);
			}
		}
		const out: string[] = [];
		const pushBlank = (): void => {
			if (out.length && out.at(-1) !== '') out.push('');
		};
		for (let i = 0; i < lines.length; i++) {
			const text = lines[i].text.replace(/[ \t]+$/, '');
			const closesSect = sectionClose(i);
			if (!text && !protectedLine(lines[i])) {
				let next = i + 1;
				while (next < lines.length && !lines[next].text.trim() && !protectedLine(lines[next])) next++;
				if ((S_CLASS_2.test(out.at(-1) ?? '') || (next < lines.length && S_CLASS_2.test(lines[next].text))) && out.length && out.at(-1) !== '') out.push('');
				continue;
			}
			if (sectionOpen(i)) pushBlank();
			if (lineGroup(i)) pushBlank();
			out.push(text);
			if (closesSect || lineGroup(i)) {
				while (i + 1 < lines.length && !lines[i + 1].text.trim() && !protectedLine(lines[i + 1])) i++;
				if (closesSect && i + 1 < lines.length) pushBlank();
			}
		}
		while (out.at(-1) === '') out.pop();
		laidOut = `${out.filter((line, i) => line !== '' || S_CLASS_2.test(out[i - 1] ?? '') || S_CLASS_2.test(out[i + 1] ?? '')).join(eol)}${eol}`;
	}
	const n = original.startsWith('\uFEFF') ? `\uFEFF${laidOut}` : laidOut;
	if (n === original) return false;
	return writeValidatedSrc(fileName, n);
}

/**
 * Removes generated section scaffolding and empty or detached TSDoc after source edits.
 *
 * @param fileName Source filename whose generated or detached comments should be removed.
 *
 * @return Whether the file was changed after a validated write.
 */
export function removeNonCodeComments(fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const src = readFileSync(fileName, 'utf8');
	const original = src.replace(/(^|\n)([ \t]*(?:CONFIG|TESTS|HELPERS|IMPORTS)[ \t]*\r?\n[ \t]*\/{10,}\*\/[ \t]*(?=\r?\n|$))/g, (m, p: string, _fragment: string, o: number) => {
		const precedingLine = src
			.slice(0, o + p.length)
			.trimEnd()
			.split(R_N_REGEX)
			.at(-1)
			?.trim();
		return precedingLine && /^\/\*\/{10,}$/.test(precedingLine) ? m : p;
	});
	if (original !== src) writeValidatedSrc(fileName, original);
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const removals: { start: number; end: number }[] = [];
	const nodeStarts: number[] = [];
	const codeStarts: number[] = [];
	/**
	 *
	 * @param node
	 */
	const inspect = (node: ts.Node): void => {
		codeStarts.push(node.getStart(parsed));
		if (ts.isVariableStatement(node)) nodeStarts.push(node.getStart(parsed));
		if (
			ts.isClassLike(node) ||
			ts.isFunctionLike(node) ||
			ts.isVariableDeclaration(node) ||
			ts.isTypeAliasDeclaration(node) ||
			ts.isInterfaceDeclaration(node) ||
			ts.isEnumDeclaration(node) ||
			ts.isModuleDeclaration(node) ||
			ts.isPropertyDeclaration(node) ||
			ts.isMethodDeclaration(node) ||
			ts.isParameter(node)
		)
			nodeStarts.push(node.getStart(parsed));
		ts.forEachChild(node, inspect);
	};
	inspect(parsed);
	const comments: { start: number; end: number; text: string }[] = [];
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, parsed.languageVariant, original);
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan())
		if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia)
			comments.push({ start: scanner.getTokenPos(), end: scanner.getTextPos(), text: scanner.getTokenText() });
	for (const block of tsdocBlocks(original, parsed)) {
		const followingDeclaration = nodeStarts.filter((s) => s >= block.end).sort((a, b) => a - b)[0];
		if (
			followingDeclaration === undefined ||
			!S_REGEX.test(original.slice(block.end, followingDeclaration)) ||
			!block.text
				.replace(/^\/\*\*|\*\/$/g, '')
				.replace(/^\s*\* ?/gm, '')
				.trim()
		) {
			if (!fileHeaderBlock(original, [block])) removals.push({ start: block.start, end: block.end });
		}
	}
	const headings = comments.filter(({ text: t }) => /^\/\*\/{10,}/.test(t) || /^\/\/\s*[A-Z][A-Z _-]*\s*$/.test(t));
	for (const [idx, heading] of headings.entries()) {
		if (!codeStarts.some((s) => s >= heading.end && s < (headings.slice(idx + 1).find((c) => c.text.startsWith('/*') === heading.text.startsWith('/*'))?.start ?? original.length)))
			removals.push({ start: heading.start, end: heading.end });
	}
	if (!removals.length) return false;
	let updated = original;
	for (const { start, end } of removals.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, start)}${updated.slice(end)}`;
	updated = updated.replace(/\n{3,}/g, '\n\n');
	return updated === original ? false : writeValidatedSrc(fileName, updated);
}

/**
 * Adds Prettier protection to one-line imports that exceed the configured print width.
 *
 * @param fileName Absolute path to the source file whose imports are inspected.
 * @param printWidth Maximum line width before a Prettier ignore marker is inserted.
 *
 * @return `true` when one or more ignore markers were inserted.
 */
export function protectLongImports(fileName: string, printWidth = 200): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const insertions = new Set<number>();
	for (const n of parsed.statements.filter(ts.isImportDeclaration)) {
		const lineStart = parsed.getLineStarts()[parsed.getLineAndCharacterOfPosition(n.getStart(parsed)).line] ?? 0;
		const nline = original.indexOf('\n', n.end);
		if (original.slice(lineStart, nline < 0 ? original.length : nline).replace(/\r$/, '').length <= printWidth || original.slice(lineStart, n.getStart(parsed)).trim()) continue;
		const prevLineEnd = lineStart > 0 ? lineStart - 1 : -1;
		if (original.slice(prevLineEnd >= 0 ? original.lastIndexOf('\n', prevLineEnd - 1) + 1 : 0, prevLineEnd + 1).trim() === '// prettier-ignore') continue;
		insertions.add(lineStart);
	}
	if (!insertions.size) return false;
	let next = original;
	for (const offset of [...insertions].sort((a, b) => b - a)) {
		const nLine = original.indexOf('\n', offset);
		next = `${next.slice(0, offset)}${original.slice(offset, nLine < 0 ? original.length : nLine).match(S_REGEX)?.[0] ?? ''}// prettier-ignore${original.includes('\r\n') ? '\r\n' : '\n'}${next.slice(offset)}`;
	}
	return writeValidatedSrc(fileName, next);
}

/**
 * Selects the TypeScript parser mode used by documentation checks.
 *
 * @param fileName Filename whose extension determines the parser mode.
 *
 * @return TypeScript compiler script kind for the filename.
 */
function documentationScriptKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

/**
 * Checks whether a filename is supported by the documentation policy.
 *
 * @param fileName Source filename to test.
 *
 * @return `true` for supported JavaScript and TypeScript extensions.
 */
function documentationSupported(fileName: string): boolean {
	return /\.(?:c|m)?(?:js|jsx|ts|tsx)$/.test(fileName);
}

/**
 * Excludes generated and vendored sources from documentation policy checks.
 *
 * @param cfg Quality configuration defining the repository root.
 * @param file Absolute source path to classify.
 *
 * @return Whether the file is outside generated and vendor directories.
 */
function documentationSourceIncluded(cfg: QualityCfg, file: string): boolean {
	return !relative(cfg.root, file)
		.split(sep)
		.some((dir) => ['generated', 'vendor', 'target', 'out'].includes(dir));
}

/** Minimal Clang AST node shape used to inspect C declarations and comments. */
type CNode = {
	kind?: string;
	name?: string;
	text?: string;
	param?: string;
	loc?: { offset?: number; line?: number; file?: string; includedFrom?: { file?: string } };
	type?: { qualType?: string };
	inner?: CNode[];
};

/**
 * Checks whether a node has a JSDoc or TSDoc block in its leading trivia.
 *
 * @param node Declaration node to inspect.
 * @param src Source text containing the node.
 *
 * @return `true` when a documentation comment directly precedes the node.
 */
function documented(node: ts.Node, src: string): boolean {
	const target = documentationTarget(node);
	const doc = [...src.slice(target.getFullStart(), target.getStart()).matchAll(S_S_G_REGEX())].at(-1);
	if (!doc) return false;
	// The generated file header is source-level metadata, not documentation for
	// the first declaration. Only exclude it when the block is the first
	// path-bearing TSDoc in the file; a declaration's own later TSDoc remains
	// valid even when the file also has a header.
	let prefix = src.slice(0, target.getFullStart() + doc.index!).replace(UFEFF_REGEX, '');
	if (prefix.startsWith('#!')) prefix = prefix.slice(prefix.indexOf('\n') + 1);
	return !(
		prefix.trim() === '' &&
		doc[0]!
			.slice(3, -2)
			.split(R_N_REGEX)
			.some((line) => C_M_JS_JSX_TS_TSX_REGEX.test(line.replace(S_CLASS_3, '').trim()))
	);
}

/**
 * Checks whether a declaration carries an export modifier.
 *
 * @param node Declaration node to inspect.
 *
 * @return `true` when the node is explicitly exported.
 */
function exported(node: ts.Node): boolean {
	const target = documentationTarget(node);
	return !!(ts.canHaveModifiers(target) && ts.getModifiers(target)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

/**
 * Gets the declared identifier used in a documentation diagnostic.
 *
 * @param node Declaration node whose name should be reported.
 *
 * @return Identifier text, or `<anonymous>` when the declaration has no identifier.
 */
function documentationNodeName(node: ts.Node): string {
	if (ts.isConstructorDeclaration(node)) return 'constructor';
	const target = documentationTarget(node);
	if (target !== node && ts.isVariableStatement(target)) {
		const declaration = target.declarationList.declarations.find((candidate) => {
			for (let ancestor: ts.Node | undefined = node; ancestor; ancestor = ancestor.parent) if (ancestor === candidate) return true;
			return false;
		});
		if (declaration) return declaration.name.getText();
	}
	const candidate = (node as unknown as { name?: ts.Node }).name ?? node;
	return ts.isIdentifier(candidate) ? candidate.text : ts.isStringLiteral(candidate) || ts.isNumericLiteral(candidate) ? candidate.text : candidate === node ? '<anonymous>' : candidate.getText();
}

/**
 * Finds the declaration that owns documentation for a named function value.
 *
 * @param node Function-like declaration or expression to resolve.
 *
 * @return Variable statement for a named function value, otherwise node itself.
 */
function documentationTarget(node: ts.Node): ts.Node {
	if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
		if (ts.isVariableDeclaration(node.parent) && node.parent.initializer === node) {
			let target: ts.Node = node.parent;
			while (target.parent && !ts.isVariableStatement(target)) target = target.parent;
			return target;
		}
	}
	return node;
}

/**
 * Checks whether a function-like declaration has a stable name and needs its own documentation.
 *
 * @param node Syntax node to inspect.
 *
 * @return Whether node is a named function, method, constructor, or named function value.
 */
function isNamedDocumentationFn(node: ts.Node): node is ts.SignatureDeclaration {
	if (!ts.isFunctionLike(node)) return false;
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node) ||
		ts.isMethodSignature(node)
	)
		return true;
	if (ts.isFunctionExpression(node)) return Boolean(node.name) || documentationTarget(node) !== node;
	if (ts.isArrowFunction(node)) return documentationTarget(node) !== node;
	return false;
}

/**
 * Scans source text for TSDoc blocks without treating comment-shaped text inside literals as documentation.
 *
 * @param src Source text to scan.
 * @param parsed Parsed source file whose language variant should be respected.
 *
 * @return TSDoc blocks with their source offsets and original text.
 */
function tsdocBlocks(src: string, parsed: ts.SourceFile): TSDocBlock[] {
	const blocks = new Map<number, TSDocBlock>();
	/**
	 *
	 * @param ranges
	 */
	const add = (ranges: ts.CommentRange[] | undefined): void => {
		for (const range of ranges ?? []) {
			const text = src.slice(range.pos, range.end);
			if (text.startsWith('/**')) blocks.set(range.pos, { start: range.pos, end: range.end, text });
		}
	};
	/**
	 *
	 * @param node
	 */
	const visit = (node: ts.Node): void => {
		add(ts.getLeadingCommentRanges(src, node.getFullStart()));
		add(ts.getTrailingCommentRanges(src, node.end));
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	return [...blocks.values()].sort((l, r) => l.start - r.start);
}

/**
 * Converts a TSDoc block into normalized content lines while retaining each line's source offset.
 *
 * @param block TSDoc block to split.
 *
 * @return TSDoc content lines with comment markers removed.
 */
function tsdocLines(block: TSDocBlock): TSDocLine[] {
	const body = block.text.slice(3, -2);
	let offset = block.start + 3;
	const lines: TSDocLine[] = [];
	for (const line of body.split(R_N_REGEX)) {
		lines.push({ offset, text: line.replace(S_CLASS_3, '').trim() });
		offset += line.length + (body.includes('\r\n') ? 2 : 1);
	}
	return lines;
}

/**
 * Finds the generated path-bearing mock-TSDoc block at the top of a source file, allowing a shebang and whitespace before it.
 *
 * @param src Source text to inspect.
 * @param blocks TSDoc blocks found in the source.
 *
 * @return The top-level file-header block, or `undefined` when it is missing.
 */
function fileHeaderBlock(src: string, blocks: TSDocBlock[]): TSDocBlock | undefined {
	return blocks.find((b) => {
		let prefix = src.slice(0, b.start).replace(UFEFF_REGEX, '');
		if (prefix.startsWith('#!')) prefix = prefix.slice(prefix.indexOf('\n') + 1);
		return prefix.trim() === '' && tsdocLines(b).some((l) => C_M_JS_JSX_TS_TSX_REGEX.test(l.text));
	});
}

/**
 * Extracts a tag's human-written description after removing its optional type and parameter name.
 *
 * @param tag TSDoc tag name without the leading `@`.
 * @param content Text following the tag name, including any continuation lines.
 *
 * @return Tag description, or an empty string when only syntax is present.
 */
/**
 * Parses TSDoc tags and joins continuation lines with their leading tag line.
 *
 * @param lines Normalized TSDoc content lines.
 *
 * @return Parsed tag names, subjects, descriptions, and source offsets.
 */
function tsdocTagEntries(lines: TSDocLine[]): { tag: string; subject: string; description: string; offset: number }[] {
	const entries: { tag: string; subject: string; description: string; offset: number }[] = [];
	for (let idx = 0; idx < lines.length; idx += 1) {
		const match = lines[idx]!.text.match(/^@(\S+)(?:\s+(.*))?$/);
		if (!match) continue;
		const tag = match[1]!;
		const content = [match[2] ?? ''];
		let n = idx + 1;
		while (n < lines.length && !lines[n]!.text.startsWith('@')) {
			if (lines[n]!.text) content.push(lines[n]!.text);
			n += 1;
		}
		const rawContent = content.join(' ').trim();
		entries.push({
			tag,
			subject:
				tag.toLowerCase() === 'param'
					? (rawContent.replace(/^\{[^}]*\}\s*/, '').split(/\s+/)[0] ?? '').replace(/^\[/, '').replace(/\]$/, '').split('=')[0]!
					: tag.toLowerCase() === 'typeparam'
						? (rawContent.replace(/^\{[^}]*\}\s*/, '').split(/\s+/)[0] ?? '')
						: '',
			description: (tag.toLowerCase() === 'param' || tag.toLowerCase() === 'typeparam'
				? rawContent
						.trim()
						.replace(/^\{[^}]+\}\s*/, '')
						.replace(/^\[[^\]]+\]\s*/, '')
						.replace(/^\S+\s*/, '')
				: rawContent.trim().replace(/^\{[^}]+\}\s*/, '')
			)
				.replace(/^[-:]\s*/, '')
				.trim(),
			offset: lines[idx]!.offset,
		});
		idx = n - 1;
	}
	return entries;
}

/**
 * Determines whether a function exposes a value through its return type or body.
 *
 * @param node Function declaration whose return contract is being checked.
 *
 * @return `true` when callers can receive a value rather than only completion.
 */
function returnsVal(node: ts.SignatureDeclaration): boolean {
	if (ts.isConstructorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return false;
	if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) return true;
	const returnType = node.type?.getText().replace(/\s+/g, '') ?? '';
	if (returnType === 'void' || returnType === 'Promise<void>') return false;
	if (node.type) return true;
	let valReturn = false;
	/**
	 *
	 * @param child
	 */
	const visit = (child: ts.Node): void => {
		if (valReturn) return;
		if (ts.isReturnStatement(child) && child.expression) valReturn = true;
		ts.forEachChild(child, visit);
	};
	if ('body' in node && node.body) visit(node.body);
	return valReturn;
}

/**
 * Creates an error finding anchored to a TSDoc comment offset.
 *
 * @param file Absolute source path containing the comment.
 * @param parsed Parsed source file used to calculate the location.
 * @param offset Zero-based source offset for the comment or tag.
 * @param name Display name for the missing documentation.
 * @param kind Documentation audit category.
 * @param reason Human-readable remediation reason.
 * @param cfg Quality configuration defining the repository root.
 *
 * @return Documentation error.
 */
function documentationCommentReport(file: string, parsed: ts.SourceFile, offset: number, name: string, kind: DocumentationFinding['kind'], reason: string, cfg: QualityCfg): DocumentationFinding {
	const pos = parsed.getLineAndCharacterOfPosition(offset);
	return { file: displayPath(cfg, file), line: pos.line + 1, column: pos.character + 1, name, kind, reason, severity: 'error' };
}

/**
 * Creates a documentation finding with a repository-relative source location.
 *
 * @param file Absolute path to the source file.
 * @param parsed Parsed source file used to calculate the location.
 * @param node Undocumented node that triggered the finding.
 * @param name Display name for the node.
 * @param kind Documentation category for the finding.
 * @param reason Human-readable remediation reason.
 * @param cfg Quality configuration defining the repository root.
 *
 * @return Structured documentation finding.
 */
function documentationReport(file: string, parsed: ts.SourceFile, node: ts.Node, name: string, kind: DocumentationFinding['kind'], reason: string, cfg: QualityCfg): DocumentationFinding {
	const pos = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
	return { file: displayPath(cfg, file), line: pos.line + 1, column: pos.character + 1, name, kind, reason, severity: 'error' };
}

/**
 * Finds documentation-policy violations for the configured source scope.
 *
 * @param cfg Quality configuration containing required documentation policies.
 * @param analysis Optional shared program and source cache for the current run.
 *
 * @return Documentation findings across the configured source scope.
 */
export function documentationFindings(cfg: QualityCfg, analysis?: QualityAnalysis): DocumentationFinding[] {
	const requirements = { functions: true, ...cfg.documentation?.required };
	const documentedSignatures = new Set<string>();
	const missingTargets = new Map<string, string>();
	return [
		...srcFiles({ ...cfg, extensions: ['.c', '.h'] })
			.filter((file) => documentationSourceIncluded(cfg, file))
			.flatMap((file) =>
				((source): DocumentationFinding[] => {
					const parsed = spawnSync('clang', ['-x', 'c', '-std=c11', '-fsyntax-only', '-Wno-everything', '-Wno-unknown-pragmas', '-Wno-ignored-attributes', '-Xclang', '-ast-dump=json', file], {
						cwd: cfg.root,
						encoding: 'utf8',
						maxBuffer: 32 * 1024 * 1024,
					});
					if (parsed.error || !parsed.stdout)
						return [
							{
								file: displayPath(cfg, file),
								line: 1,
								column: 1,
								name: 'clang',
								kind: 'function',
								reason: `Clang is required to inspect C documentation: ${parsed.error?.message ?? (parsed.stderr.trim() || 'no AST output')}`,
								severity: 'error',
							},
						];
					const declarations: { name: string; signature: string; line: number; params: string[]; returnsValue: boolean; comment?: CNode }[] = [];
					const walk = (node: CNode): void => {
						if (node.kind === 'FunctionDecl' && node.name && node.loc?.offset !== undefined && !node.loc.includedFrom && (!node.loc.file || resolve(node.loc.file) === resolve(file))) {
							const children = node.inner ?? [];
							declarations.push({
								name: node.name,
								signature: `${node.name}|${node.type?.qualType ?? ''}`,
								line: node.loc.line ?? source.slice(0, node.loc.offset).split('\n').length,
								params: children.filter((child) => child.kind === 'ParmVarDecl').map((child) => child.name ?? '<unnamed>'),
								returnsValue: !/^void\s*\(/.test(node.type?.qualType ?? ''),
								comment: children.find((child) => child.kind === 'FullComment'),
							});
						}
						for (const child of node.inner ?? []) walk(child);
					};
					walk(JSON.parse(parsed.stdout) as CNode);
					const author = Object.entries(cfg.documentation?.cAuthors ?? {})
						.filter(([prefix]) =>
							relative(cfg.root, file)
								.split(sep)
								.join('/')
								.startsWith(prefix.replace(/\/$/, '') + '/'),
						)
						.sort(([left], [right]) => right.length - left.length)[0]?.[1];
					const findings: DocumentationFinding[] = [];
					const deduplicated = new Map<string, (typeof declarations)[number]>();
					for (const declaration of declarations) {
						const previous = deduplicated.get(declaration.signature);
						if (!previous || (!previous.comment && declaration.comment)) deduplicated.set(declaration.signature, declaration);
					}
					for (const declaration of deduplicated.values()) {
						const comment = declaration.comment ? { summary: '', params: [] as { name: string; description: string }[], authors: [] as string[], returns: undefined as string | undefined } : undefined;
						if (comment && declaration.comment) {
							const text = (current: CNode): string => (current.text ?? '') + (current.inner ?? []).map(text).join('');
							for (const child of declaration.comment.inner ?? []) {
								if (child.kind === 'ParagraphComment') comment.summary += text(child);
								if (child.kind === 'ParamCommandComment') comment.params.push({ name: child.param ?? '', description: text(child).trim() });
								if (child.kind === 'BlockCommandComment') {
									const value = text(child).trim();
									if (/^brief$/i.test(child.name ?? '')) comment.summary += value;
									if (/^returns?$/i.test(child.name ?? '')) comment.returns = value;
									if (/^author$/i.test(child.name ?? '')) comment.authors.push(value);
								}
							}
						}
						const report = (name: string, kind: DocumentationFinding['kind'], reason: string): void => {
							findings.push({ file: displayPath(cfg, file), line: declaration.line, column: 1, name, kind, reason, severity: 'error' });
						};
						if (!comment) {
							missingTargets.set(`${displayPath(cfg, file)}|${declaration.line}|${declaration.name}`, declaration.signature);
							report(declaration.name, 'function', `missing documentation block for ${declaration.name}`);
							continue;
						}
						documentedSignatures.add(declaration.signature);
						if (!comment.summary.trim()) report('<summary>', 'summary', 'add a meaningful documentation summary');
						const documented = comment.params.map(({ name }) => name);
						for (const name of declaration.params) if (!documented.includes(name)) report(`@param ${name}`, 'param', `missing @param ${name}`);
						for (const name of new Set(documented.filter((name) => !declaration.params.includes(name)))) report(`@param ${name}`, 'param', `stale @param ${name}`);
						if (declaration.params.some((name, i) => documented[i] !== name)) report('@param order', 'param', `@param tags must follow signature order: ${declaration.params.join(', ')}`);
						for (const { name, description } of comment.params)
							if (declaration.params.includes(name) && !description.trim()) report(`@param ${name}`, 'param', `missing description for @param ${name}`);
						if (declaration.returnsValue && !comment.returns?.trim()) report('@return', 'return', 'missing @return description');
						if (author && !comment.authors.includes(author)) report(`@author ${author}`, 'tag', `missing or incorrect @author ${author}`);
					}
					return findings;
				})(readFileSync(file, 'utf8')),
			),
		...(analysis?.files
			? analysis.files.filter((file) => documentationSourceIncluded(cfg, file) && documentationSupported(file))
			: srcFiles(cfg).filter((file) => documentationSourceIncluded(cfg, file) && documentationSupported(file))
		).flatMap((file) => {
			const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
			const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, documentationScriptKind(file));
			const findings: DocumentationFinding[] = [];
			const blocks = tsdocBlocks(src, parsed);
			const attached = new Set<number>();
			const requiredAttached = new Set<number>();
			const markAttached = (node: ts.Node): void => {
				if (
					ts.isDeclarationStatement(node) ||
					ts.isFunctionLike(node) ||
					ts.isClassLike(node) ||
					ts.isEnumMember(node) ||
					ts.isPropertySignature(node) ||
					ts.isMethodSignature(node) ||
					ts.isCallSignatureDeclaration(node) ||
					ts.isConstructSignatureDeclaration(node) ||
					ts.isIndexSignatureDeclaration(node) ||
					ts.isTypeParameterDeclaration(node) ||
					ts.isVariableStatement(node)
				)
					for (const range of ts.getLeadingCommentRanges(src, node.getFullStart()) ?? [])
						if (src.slice(range.pos, range.end).startsWith('/**') && S_REGEX.test(src.slice(range.end, node.getStart(parsed)))) {
							attached.add(range.pos);
							if (
								((ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && requirements.types) ||
								(isNamedDocumentationFn(node) && (requirements.functions || (requirements.exportedFunctions && exported(node)))) ||
								((ts.isPropertySignature(node) ||
									ts.isMethodSignature(node) ||
									ts.isCallSignatureDeclaration(node) ||
									ts.isConstructSignatureDeclaration(node) ||
									ts.isIndexSignatureDeclaration(node)) &&
									requirements.types)
							)
								requiredAttached.add(range.pos);
						}
				ts.forEachChild(node, markAttached);
			};
			markAttached(parsed);
			for (const block of blocks) {
				if (block === fileHeaderBlock(src, blocks)) continue;
				if (!attached.has(block.start)) {
					findings.push(documentationCommentReport(file, parsed, block.start, '<detached TSDoc>', 'orphan', 'remove or attach this TSDoc to a declaration', cfg));
					continue;
				}
				if (!requiredAttached.has(block.start)) continue;
				const lines = tsdocLines(block);
				const firstTag = lines.findIndex((line) => line.text.startsWith('@'));
				if (
					!lines
						.slice(0, firstTag < 0 ? lines.length : firstTag)
						.map((line) => line.text)
						.filter(Boolean).length
				)
					findings.push(documentationCommentReport(file, parsed, block.start, '<TSDoc summary>', 'summary', 'add a meaningful description for this TSDoc block', cfg));
				for (const entry of tsdocTagEntries(lines)) {
					if (
						['abstract', 'const', 'default', 'event', 'hideconstructor', 'internal', 'package', 'private', 'protected', 'public', 'readonly', 'sealed', 'virtual'].includes(entry.tag.toLowerCase()) ||
						entry.description
					)
						continue;
					const name = `@${entry.tag}${entry.subject ? ` ${entry.subject}` : ''}`;
					findings.push(
						documentationCommentReport(
							file,
							parsed,
							entry.offset,
							name,
							entry.tag.toLowerCase() === 'param' ? 'param' : entry.tag.toLowerCase() === 'return' || entry.tag.toLowerCase() === 'returns' ? 'return' : 'tag',
							`add a meaningful description for ${name}`,
							cfg,
						),
					);
				}
			}
			const visit = (node: ts.Node): void => {
				if (requirements.types && (ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && !documented(node, src))
					findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'type', 'add TSDoc for this type', cfg));
				if (isNamedDocumentationFn(node)) {
					if (requirements.functions || (requirements.exportedFunctions && exported(node))) {
						if (!documented(node, src)) {
							findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'function', 'add TSDoc for this function', cfg));
						} else {
							const commentRange = ts.getLeadingCommentRanges(src, documentationTarget(node).getFullStart())?.at(-1);
							if (commentRange?.kind === ts.SyntaxKind.MultiLineCommentTrivia && src.slice(commentRange.pos, commentRange.end).startsWith('/**')) {
								const entries = tsdocTagEntries(tsdocLines({ start: commentRange.pos, end: commentRange.end, text: src.slice(commentRange.pos, commentRange.end) }));
								for (const [idx, param] of node.parameters.entries()) {
									const name = fnParamName(param, idx);
									if (!new Set(entries.filter((entry) => entry.tag.toLowerCase() === 'param').map((entry) => entry.subject)).has(name))
										findings.push(documentationReport(file, parsed, node, `@param ${name}`, 'param', `document the ${name} parameter`, cfg));
								}
								if (returnsVal(node) && !entries.some((entry) => ['return', 'returns'].includes(entry.tag.toLowerCase())))
									findings.push(documentationReport(file, parsed, node, '@return', 'return', 'document the value returned by this function', cfg));
							}
						}
					}
				}
				if (requirements.noInlineFunctions && (ts.isArrowFunction(node) || ts.isFunctionExpression(node)))
					findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'inline', 'move this function to a named declaration', cfg));
				ts.forEachChild(node, visit);
			};
			visit(parsed);
			return findings;
		}),
	].filter((finding) => {
		if (finding.kind !== 'function' || !finding.reason.startsWith('missing documentation block')) return true;
		const target = `${finding.file}|${finding.line}|${finding.name}`;
		const signature = missingTargets.get(target);
		return !signature || (!documentedSignatures.has(signature) && [...missingTargets].find(([, candidate]) => candidate === signature)?.[0] === target);
	});
}

/**
 * Inserts an empty TSDoc scaffold before declarations required to be documented.
 * The scaffold never invents a description; prose must be authored after understanding the declaration.
 *
 * @param cfg Quality configuration containing documentation requirements.
 * @param file Absolute source path to update.
 *
 * @return `true` when one or more scaffolds were inserted.
 */
export function documentSrcFile(cfg: QualityCfg, file: string): boolean {
	if (!documentationSupported(file) || !documentationSourceIncluded(cfg, file)) return false;
	const requirements = { functions: true, ...cfg.documentation?.required };
	const src = readFileSync(file, 'utf8');
	const parsed = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, documentationScriptKind(file));
	const insertions: number[] = [];
	/**
	 *
	 * @param node
	 */
	const visit = (node: ts.Node): void => {
		if (
			((requirements.types && (ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))) ||
				(isNamedDocumentationFn(node) && (requirements.functions || (requirements.exportedFunctions && exported(node))))) &&
			!documented(node, src)
		)
			insertions.push(documentationTarget(node).getStart(parsed));
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	if (!insertions.length) return false;
	const eol = src.includes('\r\n') ? '\r\n' : '\n';
	return writeValidatedSrc(
		file,
		insertions.sort((a, b) => b - a).reduce((text, position) => `${text.slice(0, position)}/**${eol} *${eol} */${eol}${text.slice(position)}`, src),
	);
}
