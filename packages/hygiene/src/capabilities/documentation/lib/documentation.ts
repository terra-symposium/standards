/**
 * packages/hygiene/src/capabilities/documentation/lib/documentation.ts
 * Reports source-documentation findings and checks Markdown command fences.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from '@terra-symposium/hygiene/core';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// TYPES
import type { QualityAnalysis, QualityCfg } from '@terra-symposium/hygiene/core';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const N_REGEX = /(?<=\n)/;
const R_N_END_REGEX = /\r?\n$/;

const TYPE_S_REGEX = /^type\s+/;

const R_N_REGEX = /\r?\n/;

const S_ONLY_REGEX = /^\s*$/;
// hygiene-ignore single-use -- Keep the documented S_S_G_REGEX declaration so its parameter and return contract remains attached.
/**
 * Creates a fresh matcher for complete TSDoc comment blocks.
 *
 * @return Global regular expression that matches TSDoc comment blocks.
 */
const S_S_G_REGEX = () => /\/\*\*[\s\S]*?\*\//g;

const S_REGEX = /^\s*/;
const S_CLASS_3 = /^\s*\* ?/;
const UFEFF_REGEX = /^\uFEFF/;
const C_M_JS_JSX_TS_TSX_REGEX = /(?:^|[\\/])[^\\/]+\.(?:c|m)?(?:js|jsx|ts|tsx)$/;
const S_CLASS_5 = /^\{[^}]+\}\s*/;
const SUPPORTED = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const IMPORT_SUPPORTED = new Set([...SUPPORTED, '.astro']);

/**
 * Documentation requirements that select which declarations need source comments.
 */
export type DocumentationRequirements = NonNullable<NonNullable<QualityCfg['documentation']>['required']>;

/**
 * A repeated named import reported within one source file.
 */
export type DuplicateImportFinding = { file: string; line: number; module: string };
const PNPM_FENCE = /^\s*```(?:sh|bash|zsh|shell)\s*$/i;
const FENCE_CLOSE = /^\s*```\s*$/;
const PNPM_DIR_FLAG = /^(\s*(?:\$\s*)?pnpm)\s+(?:-C|--prefix)(\s+)("[^"]+"|'[^']+'|\S+)(.*)$/;

/**
 * Finds obsolete pnpm directory flags in configured Markdown shell fences.
 *
 * @param cfg Quality configuration containing documentation command roots.
 *
 * @return Deprecated pnpm directory commands found in configured Markdown.
 */
export function documentedCommandFindings(cfg: QualityCfg): { file: string; line: number; command: string; recommendation: string }[] {
	const roots = cfg.documentation?.commandRoots?.map(p => resolve(cfg.root, p)) ?? [];
	if (!roots.length) return [];
	return srcFiles({ ...cfg, sourceRoots: roots, extensions: ['.md', '.mdx'] }).flatMap(f => {
		let inShellFence = false;
		return readFileSync(f, 'utf8')
			.split(N_REGEX)
			.flatMap((s, i) => {
				const line = s.replace(R_N_END_REGEX, '');
				if (!inShellFence) {
					if (PNPM_FENCE.test(line)) inShellFence = true;
					return [];
				}
				if (FENCE_CLOSE.test(line)) {
					inShellFence = false;
					return [];
				}
				return PNPM_DIR_FLAG.exec(line) ? [{ file: displayPath(cfg, f), line: i + 1, command: line.trim(), recommendation: 'replace the pnpm directory flag with --dir' }] : [];
			});
	});
}

/**
 * Replaces only known deprecated pnpm directory flags in configured Markdown shell fences.
 *
 * @param cfg Quality configuration containing documentation command roots.
 *
 * @return Number of deprecated commands replaced.
 */
export function fixDocumentedCommands(cfg: QualityCfg): number {
	const roots = cfg.documentation?.commandRoots?.map(p => resolve(cfg.root, p)) ?? [];
	if (!roots.length) return 0;
	let fixed = 0;
	for (const file of srcFiles({ ...cfg, sourceRoots: roots, extensions: ['.md', '.mdx'] })) {
		const src = readFileSync(file, 'utf8');
		let inShellFence = false;
		const updated = src
			.split(N_REGEX)
			.map(s => {
				const line = s.replace(R_N_END_REGEX, '');
				if (!inShellFence) {
					if (PNPM_FENCE.test(line)) inShellFence = true;
					return s;
				}
				if (FENCE_CLOSE.test(line)) {
					inShellFence = false;
					return s;
				}
				const match = PNPM_DIR_FLAG.exec(line);
				if (!match) return s;
				fixed++;
				return `${match[1]} --dir${match[2]}${match[3]}${match[4]}${s.slice(line.length)}`;
			})
			.join('');
		if (src !== updated) writeFileSync(file, updated);
	}
	return fixed;
}

/*//////////////////////////////////////////////////
DOCUMENTATION
//////////////////////////////////////////////////*/

/**
 * One missing, malformed, or detached source-documentation item.
 */
export type DocumentationFinding = {
	file: string;
	line: number;
	column: number;
	name: string;
	kind: 'file' | 'summary' | 'param' | 'return' | 'tag' | 'type' | 'function' | 'inline' | 'orphan' | 'section';
	reason: string;
	severity: 'error';
};
export const DOCUMENTATION_DESCRIPTION_NOTICE = 'Ask an agent for meaningful documentation prose; this check only reports missing descriptions and never generates them in bulk.';
/**
 * Source offsets and exact comment text for one TSDoc block.
 */
type TSDocBlock = { start: number; end: number; text: string };
/**
 * Character offset and normalized text for one parsed TSDoc line.
 */
type TSDocLine = { offset: number; text: string };
const DESC_OPTIONAL_TAGS = new Set(['abstract', 'const', 'default', 'event', 'hideconstructor', 'internal', 'package', 'private', 'protected', 'public', 'readonly', 'sealed', 'virtual']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

// hygiene-ignore single-use -- Keep the documented writeValidatedSrc declaration so its parameter and return contract remains attached.
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
				ts.transpileModule(src, { fileName, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } })
					.diagnostics?.length
			)
				return false;
		}
	} catch {
		return false;
	}
	const tmp = `${fileName}.${process.pid}.quality.tmp`;
	try {
		writeFileSync(tmp, src);
		renameSync(tmp, fileName);
	} finally {
		try {
			unlinkSync(tmp);
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
 * Selects import source text, extracting Astro frontmatter without parsing its template markup.
 *
 * @param fileName Source path whose extension determines whether frontmatter extraction is needed.
 * @param text Complete source text read from the file.
 *
 * @return Parseable import text, its source offset and line offset, or `undefined` for malformed Astro frontmatter.
 */
function duplicateImportSrc(fileName: string, text: string): { text: string; offset: number; lineOffset: number } | undefined {
	if (extname(fileName) !== '.astro') return { text, offset: 0, lineOffset: 0 };
	const match = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/u);
	if (!match || match.index === undefined) return undefined;
	const offset = match.index + match[0].indexOf(match[1]);
	return { text: match[1], offset, lineOffset: text.slice(0, offset).split(/\r?\n/u).length - 1 };
}

/**
 * Canonical groups used to order and label source imports.
 *
 * @param name Local import name whose casing indicates its category.
 *
 * @return Import group for API, component, or uppercase data names.
 */
function importGroup(name: string): 'API' | 'COMPONENTS' | 'DATA' | 'TYPES' {
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
		if (!IMPORT_SUPPORTED.has(extname(file))) continue;
		const src = duplicateImportSrc(file, readFileSync(file, 'utf8'));
		if (!src) continue;
		const parsed = ts.createSourceFile(file, src.text, ts.ScriptTarget.Latest, true, srcKind(file));
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
				for (const el of declaration.importClause.namedBindings.elements) {
					const typeOnly = declaration.importClause.isTypeOnly || el.isTypeOnly;
					keys.push(`${declaration.moduleSpecifier.text}|${typeOnly ? 'TYPES' : importGroup(el.name.text)}|${typeOnly ? 'type' : 'value'}|${el.getText(parsed).replace(TYPE_S_REGEX, '')}`);
				}
			}
			if (keys.some(k => seen.has(k))) {
				const { line } = parsed.getLineAndCharacterOfPosition(declaration.getStart(parsed));
				findings.push({ file, line: line + src.lineOffset + 1, module: declaration.moduleSpecifier.text });
			}
			for (const key of keys) seen.add(key);
		}
	}
	return findings;
}

/**
 * Removes repeated, identical import declarations when their standalone lines carry no comments.
 *
 * @param files Configured source files to inspect and update.
 *
 * @return Number of duplicate declarations removed.
 */
export function fixDuplicateImports(files: string[]): number {
	let removed = 0;
	for (const file of files) {
		if (!IMPORT_SUPPORTED.has(extname(file))) continue;
		const text = readFileSync(file, 'utf8');
		const src = duplicateImportSrc(file, text);
		if (!src) continue;
		const parsed = ts.createSourceFile(file, src.text, ts.ScriptTarget.Latest, true, srcKind(file));
		const seen = new Set<string>();
		const edits: { start: number; end: number }[] = [];
		for (const declaration of parsed.statements.filter(ts.isImportDeclaration)) {
			if (!declaration.importClause || !ts.isStringLiteral(declaration.moduleSpecifier) || declaration.attributes) continue;
			const signature = declaration.getText(parsed);
			if (!seen.has(signature)) {
				seen.add(signature);
				continue;
			}
			if (ts.getLeadingCommentRanges(src.text, declaration.getFullStart())?.length || ts.getTrailingCommentRanges(src.text, declaration.end)?.length) continue;
			const lineStart = src.text.lastIndexOf('\n', declaration.getStart(parsed) - 1) + 1;
			const newlineStart = src.text.indexOf('\n', declaration.end);
			if (src.text.slice(lineStart, declaration.getStart(parsed)).trim() || src.text.slice(declaration.end, newlineStart < 0 ? src.text.length : newlineStart).trim()) continue;
			edits.push({ start: src.offset + lineStart, end: src.offset + (newlineStart < 0 ? src.text.length : newlineStart + 1) });
		}
		if (!edits.length) continue;
		const updated = edits.sort((left, right) => right.start - left.start).reduce((src, edit) => `${src.slice(0, edit.start)}${src.slice(edit.end)}`, text);
		if (updated === text) continue;
		writeFileSync(file, updated);
		removed += edits.length;
	}
	return removed;
}

/**
 * Retains the historical API without changing source comments or section labels.
 *
 * @param root Repository root retained for compatibility with existing callers.
 * @param fileName Source file retained for compatibility with existing callers.
 *
 * @return Always `false`; source documentation remains agent-authored.
 */
export function maintainSrcFile(root: string, fileName: string): boolean {
	void root;
	void fileName;
	return false;
}

/**
 * Retains the historical cleanup API without deleting source comments or section labels.
 *
 * @param fileName Source file retained for compatibility with existing callers.
 *
 * @return Always `false`; comment cleanup requires an agent review.
 */
export function removeNonCodeComments(fileName: string): boolean {
	void fileName;
	return false;
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
	const orig = readFileSync(fileName, 'utf8');
	const eol = orig.includes('\r\n') ? '\r\n' : '\n';
	const parsed = ts.createSourceFile(fileName, orig, ts.ScriptTarget.Latest, true, srcKind(fileName));
	const lineStarts = parsed.getLineStarts();
	const insertions = new Set<number>();
	for (const n of parsed.statements.filter(ts.isImportDeclaration)) {
		const lineStart = lineStarts[parsed.getLineAndCharacterOfPosition(n.getStart(parsed)).line] ?? 0;
		const nline = orig.indexOf('\n', n.end);
		if (orig.slice(lineStart, nline < 0 ? orig.length : nline).replace(/\r$/, '').length <= printWidth || orig.slice(lineStart, n.getStart(parsed)).trim()) continue;
		const prevLineEnd = lineStart > 0 ? lineStart - 1 : -1;
		if (orig.slice(prevLineEnd >= 0 ? orig.lastIndexOf('\n', prevLineEnd - 1) + 1 : 0, prevLineEnd + 1).trim() === '// prettier-ignore') continue;
		insertions.add(lineStart);
	}
	if (!insertions.size) return false;
	let next = orig;
	for (const offset of [...insertions].sort((a, b) => b - a)) {
		const nLine = orig.indexOf('\n', offset);
		next = `${next.slice(0, offset)}${orig.slice(offset, nLine < 0 ? orig.length : nLine).match(S_REGEX)?.[0] ?? ''}// prettier-ignore${eol}${next.slice(offset)}`;
	}
	return writeValidatedSrc(fileName, next);
}

// hygiene-ignore single-use -- Keep the documented documentationScriptKind declaration so its parameter and return contract remains attached.
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
function documentationSrcIncluded(cfg: QualityCfg, file: string): boolean {
	return !relative(cfg.root, file)
		.split(sep)
		.some(d => ['generated', 'vendor', 'target', 'out'].includes(d));
}

/**
 * Audits Doxygen blocks on C prototypes and definitions using Clang's declaration AST.
 *
 * @param cfg Quality configuration used to render repository-relative diagnostics.
 * @param file C or header source path passed to Clang for declaration parsing.
 * @param src Source text whose documentation declarations are audited.
 * @param documentedSignatures Signatures already documented by matching source/header blocks.
 * @param missingTgts Map populated with missing declaration locations for duplicate suppression.
 *
 * @return Findings for missing, malformed, or misordered Doxygen documentation.
 */
function cDocumentationFindings(cfg: QualityCfg, file: string, src: string, documentedSignatures = new Set<string>(), missingTgts = new Map<string, string>()): DocumentationFinding[] {
	const parsed = spawnSync(
		cfg.tools?.clang ?? 'clang',
		['-x', 'c', '-std=c11', '-fsyntax-only', '-Wno-everything', '-Wno-unknown-pragmas', '-Wno-ignored-attributes', '-Xclang', '-ast-dump=json', file],
		{ cwd: cfg.root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
	);
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
				line: node.loc.line ?? src.slice(0, node.loc.offset).split('\n').length,
				params: children.filter(c => c.kind === 'ParmVarDecl').map(c => c.name ?? '<unnamed>'),
				returnsValue: !/^void\s*\(/.test(node.type?.qualType ?? ''),
				comment: children.find(c => c.kind === 'FullComment'),
			});
		}
		for (const child of node.inner ?? []) walk(child);
	};
	walk(JSON.parse(parsed.stdout) as CNode);
	const rel = relative(cfg.root, file).split(sep).join('/');
	const author = Object.entries(cfg.documentation?.cAuthors ?? {})
		.filter(([p]) => rel.startsWith(p.replace(/\/$/, '') + '/'))
		.sort(([l], [r]) => r.length - l.length)[0]?.[1];
	const findings: DocumentationFinding[] = [];
	const deduplicated = new Map<string, (typeof declarations)[number]>();
	for (const declaration of declarations) {
		const prev = deduplicated.get(declaration.signature);
		if (!prev || (!prev.comment && declaration.comment)) deduplicated.set(declaration.signature, declaration);
	}
	for (const declaration of deduplicated.values()) {
		const comment = declaration.comment
			? (function parseCComment(node: CNode): { summary: string; params: { name: string; description: string }[]; returns?: string; authors: string[] } {
					const result = { summary: '', params: [] as { name: string; description: string }[], authors: [] as string[], returns: undefined as string | undefined };
					const text = (current: CNode): string => (current.text ?? '') + (current.inner ?? []).map(text).join('');
					for (const child of node.inner ?? []) {
						if (child.kind === 'ParagraphComment') result.summary += text(child);
						if (child.kind === 'ParamCommandComment') result.params.push({ name: child.param ?? '', description: text(child).trim() });
						if (child.kind === 'BlockCommandComment') {
							const value = text(child).trim();
							if (/^brief$/i.test(child.name ?? '')) result.summary += value;
							if (/^returns?$/i.test(child.name ?? '')) result.returns = value;
							if (/^author$/i.test(child.name ?? '')) result.authors.push(value);
						}
					}
					return result;
				})(declaration.comment)
			: undefined;
		const report = (name: string, kind: DocumentationFinding['kind'], reason: string): void => {
			findings.push({ file: displayPath(cfg, file), line: declaration.line, column: 1, name, kind, reason, severity: 'error' });
		};
		if (!comment) {
			missingTgts.set(`${displayPath(cfg, file)}|${declaration.line}|${declaration.name}`, declaration.signature);
			report(declaration.name, 'function', `missing documentation block for ${declaration.name}`);
			continue;
		}
		documentedSignatures.add(declaration.signature);
		if (!comment.summary.trim()) report('<summary>', 'summary', 'add a meaningful documentation summary');
		const documented = comment.params.map(({ name: n }) => n);
		for (const name of declaration.params) if (!documented.includes(name)) report(`@param ${name}`, 'param', `missing @param ${name}`);
		for (const name of new Set(documented.filter(n => !declaration.params.includes(n)))) report(`@param ${name}`, 'param', `stale @param ${name}`);
		if (declaration.params.some((n, i) => documented[i] !== n)) report('@param order', 'param', `@param tags must follow signature order: ${declaration.params.join(', ')}`);
		for (const { name, description: desc } of comment.params) if (declaration.params.includes(name) && !desc.trim()) report(`@param ${name}`, 'param', `missing description for @param ${name}`);
		if (declaration.returnsValue && !comment.returns?.trim()) report('@return', 'return', 'missing @return description');
		if (author && !comment.authors.includes(author)) report(`@author ${author}`, 'tag', `missing or incorrect @author ${author}`);
	}
	return findings;
}
/**
 * Clang AST fields used to inspect C declarations and their Doxygen comments.
 */
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
	const tgt = documentationTgt(node);
	const doc = [...src.slice(tgt.getFullStart(), tgt.getStart()).matchAll(S_S_G_REGEX())].at(-1);
	if (!doc) return false;
	// The generated file header is source-level metadata, not documentation for
	// the first declaration. Only exclude it when the block is the first
	// path-bearing TSDoc in the file; a declaration's own later TSDoc remains
	// valid even when the file also has a header.
	let prefix = src.slice(0, tgt.getFullStart() + doc.index!).replace(UFEFF_REGEX, '');
	if (prefix.startsWith('#!')) prefix = prefix.slice(prefix.indexOf('\n') + 1);
	return !(
		prefix.trim() === '' &&
		doc[0]!
			.slice(3, -2)
			.split(R_N_REGEX)
			.map(l => l.replace(S_CLASS_3, '').trim())
			.some(l => C_M_JS_JSX_TS_TSX_REGEX.test(l))
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
	const tgt = documentationTgt(node);
	return !!(ts.canHaveModifiers(tgt) && ts.getModifiers(tgt)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
}

/**
 * Extracts identifiers from a parameter's object or array binding pattern.
 *
 * @param name Parameter binding to inspect.
 *
 * @return Bound identifier names in source order.
 */
function bindingParamNames(name: ts.BindingName): string[] {
	if (ts.isIdentifier(name)) return [name.text];
	return name.elements.flatMap(el => (ts.isOmittedExpression(el) ? [] : bindingParamNames(el.name)));
}

/**
 * Chooses the TSDoc parameter-tag names for a declared function parameter.
 *
 * @param param Parameter declaration whose binding names should be documented.
 * @param index Zero-based parameter position used when the binding has no identifiers.
 *
 * @return Bound identifier names, or a positional fallback for an empty pattern.
 */
function fnParamNames(param: ts.ParameterDeclaration, index: number): string[] {
	if (ts.isIdentifier(param.name)) return [param.name.text];
	const names = [...new Set(bindingParamNames(param.name))];
	return names.length ? names : [`param${index + 1}`];
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
	const tgt = documentationTgt(node);
	if (tgt !== node && ts.isVariableStatement(tgt)) {
		const declaration = tgt.declarationList.declarations.find(c => containsNode(c, node));
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
function documentationTgt(node: ts.Node): ts.Node {
	if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
		if (ts.isVariableDeclaration(node.parent) && node.parent.initializer === node) {
			let tgt: ts.Node = node.parent;
			while (tgt.parent && !ts.isVariableStatement(tgt)) tgt = tgt.parent;
			return tgt;
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
	for (let parent = node.parent; parent; parent = parent.parent) if (ts.isFunctionLike(parent)) return false;
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node) ||
		ts.isMethodSignature(node)
	)
		return true;
	if (ts.isFunctionExpression(node)) return Boolean(node.name) || documentationTgt(node) !== node;
	if (ts.isArrowFunction(node)) return documentationTgt(node) !== node;
	return false;
}

/**
 * Tests whether an AST node is nested under a declaration.
 *
 * @param parent Candidate ancestor node.
 * @param tgt Node whose ancestors should be searched.
 *
 * @return Whether target is parent or a descendant of parent.
 */
function containsNode(parent: ts.Node, tgt: ts.Node): boolean {
	for (let node: ts.Node | undefined = tgt; node; node = node.parent) if (node === parent) return true;
	return false;
}

// hygiene-ignore single-use -- Keep the documented tsdocBlocks declaration so its parameter and return contract remains attached.
/**
 * Scans source text for TSDoc blocks without treating comment-shaped text inside literals as documentation.
 *
 * @param src Source text to scan.
 * @param parsed Parsed source file whose language variant should be respected.
 *
 * @return TSDoc blocks with their source offsets and original text.
 */
function tsdocBlocks(src: string, parsed: ts.SourceFile): TSDocBlock[] {
	const blocks: TSDocBlock[] = [];
	const literals: Array<{ start: number; end: number }> = [];
	const visit = (node: ts.Node): void => {
		if (ts.isStringLiteralLike(node) || ts.isRegularExpressionLiteral(node) || ts.isJsxText(node)) literals.push({ start: node.getStart(parsed), end: node.end });
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, parsed.languageVariant, src);
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
		if (token !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
		const start = scanner.getTokenPos();
		const end = scanner.getTextPos();
		const text = src.slice(start, end);
		if (text.startsWith('/**') && !literals.some(literal => literal.start <= start && end <= literal.end)) blocks.push({ start, end, text });
	}
	return blocks;
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
	const lineSize = body.includes('\r\n') ? 2 : 1;
	let offset = block.start + 3;
	return body.split(R_N_REGEX).map(l => {
		// hygiene-ignore single-use -- Record this line's starting offset before advancing to the next line.
		const result = { offset, text: l.replace(S_CLASS_3, '').trim() };
		offset += l.length + lineSize;
		return result;
	});
}

// hygiene-ignore single-use -- Keep the documented fileHeaderBlock declaration so its parameter and return contract remains attached.
/**
 * Finds the generated path-bearing mock-TSDoc block at the top of a source file, allowing a shebang and whitespace before it.
 *
 * @param src Source text to inspect.
 * @param blocks TSDoc blocks found in the source.
 *
 * @return The top-level file-header block, or `undefined` when it is missing.
 */
function fileHeaderBlock(src: string, blocks: TSDocBlock[]): TSDocBlock | undefined {
	return blocks.find(b => {
		let prefix = src.slice(0, b.start).replace(UFEFF_REGEX, '');
		if (prefix.startsWith('#!')) prefix = prefix.slice(prefix.indexOf('\n') + 1);
		return prefix.trim() === '' && tsdocLines(b).some(l => C_M_JS_JSX_TS_TSX_REGEX.test(l.text));
	});
}

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
		const paramText = rawContent.replace(/^\{[^}]*\}\s*/, '').split(/\s+/)[0] ?? '';
		entries.push({
			tag,
			subject: tag.toLowerCase() === 'param' ? paramText.replace(/^\[/, '').replace(/\]$/, '').split('=')[0]! : tag.toLowerCase() === 'typeparam' ? paramText : '',
			description: (function tagDesc(tag: string, content: string): string {
				let desc = content.trim().replace(S_CLASS_5, '');
				if (tag.toLowerCase() === 'param' || tag.toLowerCase() === 'typeparam') desc = desc.replace(/^\[[^\]]+\]\s*/, '').replace(/^\S+\s*/, '');
				return desc.replace(/^[-:]\s*/, '').trim();
			})(tag, rawContent),
			offset: lines[idx]!.offset,
		});
		idx = n - 1;
	}
	return entries;
}

/**
 * Checks the order and blank-line boundaries of parameter and return tags.
 *
 * @param cfg Quality configuration used to render repository-relative paths.
 * @param file Source file containing the documentation block.
 * @param parsed Parsed source file used for diagnostic locations.
 * @param lines Normalized lines in one TSDoc block.
 *
 * @return Findings for misplaced tags or missing group separators.
 */
function tsdocLayoutFindings(cfg: QualityCfg, file: string, parsed: ts.SourceFile, lines: TSDocLine[]): DocumentationFinding[] {
	const findings: DocumentationFinding[] = [];
	const params = lines.flatMap((line, idx) => (/^@param\b/iu.test(line.text) ? [idx] : []));
	const report = (idx: number, reason: string): void => {
		findings.push(documentationCommentReport(file, parsed, lines[idx]!.offset, '<TSDoc layout>', 'tag', reason, cfg));
	};
	const firstParam = params[0];
	const firstReturn = lines.flatMap((line, idx) => (/^@returns?\b/iu.test(line.text) ? [idx] : []))[0];
	if (firstParam !== undefined && (firstReturn === undefined || firstParam < firstReturn) && firstParam > 0 && lines[firstParam - 1]!.text !== '')
		report(firstParam, 'separate the description and @param group with a blank * line');
	for (const idx of params.slice(1)) if (idx > 0 && lines[idx - 1]!.text === '') report(idx, 'keep @param tags together without blank lines');
	if (firstReturn !== undefined) {
		for (const idx of params.filter(idx => idx > firstReturn)) report(idx, 'put every @param tag before @return');
		if (firstReturn > 0 && lines[firstReturn - 1]!.text !== '')
			report(firstReturn, firstParam === undefined ? 'separate the description and @return with a blank * line' : 'separate the @param group and @return with a blank * line');
	}
	return findings;
}

// hygiene-ignore single-use -- Keep the documented returnsVal declaration so its parameter and return contract remains attached.
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

	const visit = (child: ts.Node): void => {
		if (valReturn) return;
		if (ts.isReturnStatement(child) && child.expression) valReturn = true;
		ts.forEachChild(child, visit);
	};
	if ('body' in node && node.body) visit(node.body);
	return valReturn;
}

// hygiene-ignore single-use -- Keep the documented documentationBlockFor declaration so its parameter and return contract remains attached.
/**
 * Finds the TSDoc block directly attached to a declaration.
 *
 * @param src Source text containing the declaration and its comments.
 * @param node Declaration whose leading documentation is required.
 *
 * @return The attached TSDoc block, or `undefined` when the declaration is undocumented.
 */
function documentationBlockFor(src: string, node: ts.Node): TSDocBlock | undefined {
	const range = (ts.getLeadingCommentRanges(src, documentationTgt(node).getFullStart()) ?? []).at(-1);
	if (!range || range.kind !== ts.SyntaxKind.MultiLineCommentTrivia || !src.slice(range.pos, range.end).startsWith('/**')) return undefined;
	return { start: range.pos, end: range.end, text: src.slice(range.pos, range.end) };
}

// hygiene-ignore single-use -- Keep the documented descriptionFindingsForFile declaration so its parameter and return contract remains attached.
/**
 * Audits existing TSDoc prose without inventing replacement text. Generated file
 * path headers are source metadata and are intentionally excluded from this audit.
 *
 * @param cfg Quality configuration used to render repository-relative paths.
 * @param file Absolute source path being inspected.
 * @param src Source text containing the documentation blocks.
 * @param parsed Parsed source file used for locations and comment scanning.
 *
 * @return Warning findings for missing file, summary, or tag descriptions.
 */
function descFindingsForFile(cfg: QualityCfg, file: string, src: string, parsed: ts.SourceFile): DocumentationFinding[] {
	const blocks = tsdocBlocks(src, parsed);
	const findings: DocumentationFinding[] = [];
	const header = fileHeaderBlock(src, blocks);
	if (cfg.documentation?.required?.fileHeader) {
		const expected = displayPath(cfg, file).replaceAll('\\', '/');
		let repoRoot = resolve(cfg.root);
		while (!existsSync(resolve(repoRoot, '.git'))) {
			const parent = dirname(repoRoot);
			if (parent === repoRoot) break;
			repoRoot = parent;
		}
		if (!header || ![expected, existsSync(resolve(repoRoot, '.git')) ? relative(repoRoot, file).replaceAll('\\', '/') : expected].includes(tsdocLines(header).find(line => line.text)?.text ?? ''))
			findings.push(documentationCommentReport(file, parsed, header?.start ?? 0, expected, 'file', `start the file with a TSDoc header whose first content line is ${expected}`, cfg));
	}
	if (cfg.documentation?.required?.multilineTsdoc)
		for (const block of blocks)
			if (!/^\/\*\*\r?\n/u.test(block.text) && !/^\/\*\*\s*@(?:type|satisfies)\b/u.test(block.text))
				findings.push(documentationCommentReport(file, parsed, block.start, '<TSDoc opening>', 'summary', 'put the TSDoc description on the line after /**', cfg));
	const attached = new Set<number>();
	const requiredAttached = new Set<number>();
	const inlineContainers: ts.Node[] = [];
	const requirements = { functions: true, ...cfg.documentation?.required };

	const markAttached = (node: ts.Node): void => {
		if (ts.isTypeNode(node) || ts.isObjectLiteralExpression(node)) inlineContainers.push(node);
		const tgt = documentationTgt(node);
		const requiresDocumentation =
			((ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && requirements.types) ||
			(isNamedDocumentationFn(node) && (requirements.functions || (requirements.exportedFunctions && exported(node)))) ||
			((ts.isPropertySignature(node) || ts.isMethodSignature(node) || ts.isCallSignatureDeclaration(node) || ts.isConstructSignatureDeclaration(node) || ts.isIndexSignatureDeclaration(node)) &&
				requirements.types);
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
			ts.isTypeNode(node) ||
			ts.isVariableStatement(node)
		)
			for (const range of ts.getLeadingCommentRanges(src, tgt.getFullStart()) ?? [])
				if (src.slice(range.pos, range.end).startsWith('/**') && S_ONLY_REGEX.test(src.slice(range.end, tgt.getStart(parsed)))) {
					attached.add(range.pos);
					if (requiresDocumentation) requiredAttached.add(range.pos);
				}
		ts.forEachChild(node, markAttached);
	};
	markAttached(parsed);
	for (const block of blocks) if (inlineContainers.some(node => node.pos <= block.start && block.end <= node.end)) attached.add(block.start);
	for (const block of blocks) {
		if (!tsdocTagEntries(tsdocLines(block)).some(entry => entry.tag.toLowerCase() === 'typedef')) continue;
		attached.add(block.start);
		if (requirements.types) requiredAttached.add(block.start);
	}
	for (const block of blocks) {
		if (block === header) continue;
		// JSDoc type casts and parameter annotations document expressions rather than declarations.
		if (/@type\s*\{/u.test(block.text)) continue;
		if (!attached.has(block.start)) {
			findings.push(documentationCommentReport(file, parsed, block.start, '<detached TSDoc>', 'orphan', 'remove or attach this TSDoc to a declaration', cfg));
			continue;
		}
		if (cfg.documentation?.required?.multilineTsdoc) findings.push(...tsdocLayoutFindings(cfg, file, parsed, tsdocLines(block)));
		if (!requiredAttached.has(block.start)) continue;
		const lines = tsdocLines(block);
		const firstTag = lines.findIndex(l => l.text.startsWith('@'));
		if (
			!lines
				.slice(0, firstTag < 0 ? lines.length : firstTag)
				.map(l => l.text)
				.filter(Boolean).length
		)
			findings.push(documentationCommentReport(file, parsed, block.start, '<TSDoc summary>', 'summary', 'add a meaningful description for this TSDoc block', cfg));
		for (const entry of tsdocTagEntries(lines)) {
			if (DESC_OPTIONAL_TAGS.has(entry.tag.toLowerCase()) || entry.description) continue;
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
	return findings;
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
 * Checks authored section fences and the position of static imports without
 * treating section-like text inside strings or comments as source structure.
 *
 * @param cfg Quality configuration used for repository-relative locations.
 * @param file Absolute path of the source file.
 * @param src JavaScript, TypeScript, or Astro frontmatter source.
 * @param parsed Parsed source used to identify static import declarations.
 * @param lineOffset Number of lines before extracted Astro frontmatter.
 *
 * @return Missing, misplaced, duplicate, and empty section findings.
 */
function sectionFindings(cfg: QualityCfg, file: string, src: string, parsed: ts.SourceFile, lineOffset = 0): DocumentationFinding[] {
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, src);
	const sections: { start: number; end: number; label: string }[] = [];
	const code: number[] = [];
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
		if (token === ts.SyntaxKind.MultiLineCommentTrivia) {
			const match = /^\/\*\/{3,}[ \t]*\r?\n[ \t]*([A-Z][A-Z0-9 &/_-]*)[ \t]*\r?\n\/{3,}\*\/$/u.exec(scanner.getTokenText());
			if (match) sections.push({ start: scanner.getTokenPos(), end: scanner.getTextPos(), label: match[1]!.trim() });
		} else if (token > ts.SyntaxKind.LastTriviaToken) code.push(scanner.getTokenPos());
	}
	const findings: DocumentationFinding[] = [];
	const report = (offset: number, label: string, reason: string): void => {
		const pos = parsed.getLineAndCharacterOfPosition(offset);
		findings.push({ file: displayPath(cfg, file), line: pos.line + lineOffset + 1, column: pos.character + 1, name: label, kind: 'section', reason, severity: 'error' });
	};
	const seen = new Set<string>();
	for (const [index, section] of sections.entries()) {
		if (seen.has(section.label)) report(section.start, section.label, 'merge duplicate section headings');
		seen.add(section.label);
		if (!code.some(offset => offset >= section.end && offset < (sections[index + 1]?.start ?? src.length)))
			report(section.start, section.label, 'remove the empty section heading or add its source content');
	}
	const imports = parsed.statements.filter((statement): statement is ts.ImportDeclaration | ts.ImportEqualsDeclaration => ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement));
	const importSection = sections.find(section => section.label === 'IMPORTS');
	const directives: { start: number; end: number }[] = [];
	for (const statement of parsed.statements) {
		if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression) || !new Set(['use client', 'use server', 'use strict']).has(statement.expression.text)) break;
		directives.push({ start: statement.getStart(parsed), end: statement.getEnd() });
	}
	if (imports.length && !importSection) report(imports[0]!.getStart(parsed), 'IMPORTS', 'add an IMPORTS section heading before static imports');
	if (!imports.length && importSection) report(importSection.start, 'IMPORTS', 'remove the IMPORTS heading from a file without static imports');
	if (importSection) {
		if (code.some(offset => offset < importSection.start && !directives.some(directive => offset >= directive.start && offset < directive.end)))
			report(importSection.start, 'IMPORTS', 'move the IMPORTS section before source code');
		for (const declaration of imports) {
			const offset = declaration.getStart(parsed);
			if (offset < importSection.end || offset >= (sections.find(section => section.start > importSection.start)?.start ?? src.length))
				report(offset, 'IMPORTS', 'move this static import inside the IMPORTS section');
		}
	}
	return findings;
}

/**
 * Evaluates documentation requirements for one source file.
 *
 * @param cfg Quality configuration used to render diagnostic paths.
 * @param file Absolute source path to inspect.
 * @param requirements Enabled documentation policies.
 * @param analysis Optional shared program and source cache for the current run.
 *
 * @return Documentation findings for the file.
 */
function documentationFindingsForFile(
	cfg: QualityCfg,
	file: string,
	requirements: { types?: boolean; functions?: boolean; exportedFunctions?: boolean; noInlineFunctions?: boolean; importSection?: boolean; fileHeader?: boolean; multilineTsdoc?: boolean },
	analysis?: QualityAnalysis,
): DocumentationFinding[] {
	if (!documentationSupported(file) && extname(file) !== '.astro') return [];
	const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
	// Regex-dedup registries are generated API plumbing marked as non-editable;
	// their exported factories inherit documentation from the authored source use sites.
	if (/^\uFEFF?(?:\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*)?\/\/ Generated by @terra-symposium\/(?:hygiene|quality) regex-dedup\. Do not edit\.(?:\r?\n|$)/u.test(src)) return [];
	if (extname(file) === '.astro') {
		const frontmatter = duplicateImportSrc(file, src);
		if (!frontmatter || !requirements.importSection) return [];
		return sectionFindings(cfg, file, frontmatter.text, ts.createSourceFile(file, frontmatter.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), frontmatter.lineOffset);
	}
	const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, documentationScriptKind(file));
	const findings = descFindingsForFile(cfg, file, src, parsed);
	if (requirements.importSection) findings.push(...sectionFindings(cfg, file, src, parsed));

	const visit = (node: ts.Node): void => {
		if (requirements.types && (ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && !documented(node, src))
			findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'type', 'add TSDoc for this type', cfg));
		if (isNamedDocumentationFn(node)) {
			if (requirements.functions || (requirements.exportedFunctions && exported(node))) {
				if (!documented(node, src)) {
					findings.push(documentationReport(file, parsed, node, documentationNodeName(node), 'function', 'add TSDoc for this function', cfg));
				} else {
					const block = documentationBlockFor(src, node);
					if (block) {
						const entries = tsdocTagEntries(tsdocLines(block));
						const documentedParams = new Set(entries.filter(e => e.tag.toLowerCase() === 'param').map(e => e.subject));
						const declaredParams = new Set(node.parameters.flatMap((param, i) => fnParamNames(param, i)));
						for (const [idx, param] of node.parameters.entries()) {
							for (const name of fnParamNames(param, idx))
								if (!documentedParams.has(name)) findings.push(documentationReport(file, parsed, node, `@param ${name}`, 'param', `document the ${name} parameter`, cfg));
						}
						for (const entry of entries.filter(item => {
							if (item.tag.toLowerCase() !== 'param' || !item.subject || declaredParams.has(item.subject)) return false;
							return !declaredParams.has(item.subject.split('.')[0]!);
						})) {
							findings.push(documentationCommentReport(file, parsed, entry.offset, `@param ${entry.subject}`, 'param', `remove stale @param ${entry.subject}`, cfg));
						}
						if (returnsVal(node) && !entries.some(e => ['return', 'returns'].includes(e.tag.toLowerCase())))
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
	const sharedAnalysis = analysis;
	const documentedSignatures = new Set<string>();
	const missingTgts = new Map<string, string>();
	// hygiene-ignore single-use -- Analyze C files first to populate documented signatures and missing targets before other findings.
	const cFindings = srcFiles({ ...cfg, extensions: ['.c', '.h'] })
		.filter(f => documentationSrcIncluded(cfg, f))
		.flatMap(f => cDocumentationFindings(cfg, f, readFileSync(f, 'utf8'), documentedSignatures, missingTgts));
	// hygiene-ignore single-use -- Complete the other source scan before selecting primary C declarations below.
	const otherFindings = (
		sharedAnalysis?.files
			? sharedAnalysis.files.filter(f => documentationSrcIncluded(cfg, f) && (documentationSupported(f) || (requirements.importSection && extname(f) === '.astro')))
			: srcFiles(cfg).filter(f => documentationSrcIncluded(cfg, f) && (documentationSupported(f) || (requirements.importSection && extname(f) === '.astro')))
	).flatMap(f => documentationFindingsForFile(cfg, f, requirements, sharedAnalysis));
	const primaryMissing = new Map<string, string>();
	for (const [tgt, signature] of missingTgts) if (!primaryMissing.has(signature)) primaryMissing.set(signature, tgt);
	return [...cFindings, ...otherFindings].filter(f => {
		if (f.kind !== 'function' || !f.reason.startsWith('missing documentation block')) return true;
		const tgt = `${f.file}|${f.line}|${f.name}`;
		const signature = missingTgts.get(tgt);
		return !signature || (!documentedSignatures.has(signature) && primaryMissing.get(signature) === tgt);
	});
}

/**
 * Retains the historical API without generating placeholder documentation.
 * Missing prose is reported for an author to write after reviewing the source.
 *
 * @param cfg Quality configuration containing documentation requirements.
 * @param file Absolute source path to inspect.
 *
 * @return Always `false`; the documentation workflow is read-only.
 */
export function documentSrcFile(cfg: QualityCfg, file: string): boolean {
	void cfg;
	void file;
	return false;
}
