/**
 * packages/quality/src/patterns.ts
 * Generic source-pattern checks: repeated static classes and forbidden UI patterns.
 * Kept together because both are repository-wide text inventories.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { displayPath, srcFiles } from './files.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';
/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/
const A_ZA_Z0_9_G_REGEX = () => /[^A-Za-z0-9]+/g;
const G_REGEX = () => /^_+|_+$/g;
const G_CLASS_2 = () => /\\/g;
const EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX = () => /^export const ([A-Za-z_$][\w$]*)\b/gm;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/
const S_G_REGEX = () => /\s+/g;

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const TEST_TESTS_NODE_MODULES_DIST_BUILD_COVERAGE_REGEX = /(?:^|\/)(?:test|tests|node_modules|dist|build|coverage)(?:\/|$)/;
export type RepeatedClassFinding = { value: string; count: number; locations: string[] };
export type UiPatternFinding = { file: string; pattern: string };
export type PatternFixResult = { fixed: number; skipped: number };

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

export type RegexFinding = { source: string; count: number; locations: string[] };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reports repeated static class strings without assuming a framework.
 *
 * @param cfg Quality configuration defining the source roots and repeated-class policy.
 *
 * @return Repeated static class strings that meet the configured minimum count.
 */
export function repeatedClassFindings(cfg: QualityCfg, analysis?: QualityAnalysis): RepeatedClassFinding[] {
	const settings = cfg.repeatedClasses ?? {};
	const minimum = settings.minimumCount ?? 3;
	const exts = new Set(settings.extensions ?? ['.astro', '.html', '.js', '.jsx', '.ts', '.tsx']);
	const ignored = new Set(['test', 'tests', 'generated', 'node_modules', 'dist', 'build', 'coverage', ...(settings.ignoredDirectories ?? [])]);
	const vals = new Map<string, string[]>();
	for (const file of (analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })).filter((f) => exts.has(f.slice(f.lastIndexOf('.'))))) {
		if ([...ignored].some((d) => file.split('/').includes(d))) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		// Markup embedded in a template literal is generated data, not a live
		// attribute. The text-only inventory cannot safely rewrite it.
		if (src.includes('`')) continue;
		for (const match of src.matchAll(/\b(?:class|className)\s*=\s*(['"])([^'"\n]+)\1/g)) {
			const val = match[2].replace(S_G_REGEX(), ' ').trim();
			if (val.includes('{') || val.split(' ').length < 2) continue;
			const location = `${displayPath(cfg, file)}:${src.slice(0, match.index ?? 0).split('\n').length}`;
			vals.set(val, [...(vals.get(val) ?? []), location]);
		}
	}
	return [...vals.entries()].filter(([, l]) => l.length >= minimum).map(([v, l]) => ({ value: v, count: l.length, locations: l.sort((l, r) => l.localeCompare(r, undefined, { numeric: true })) }));
}

/**
 * Converts a static class string into a stable, collision-resistant constant identifier.
 *
 * @param val Normalized class string being named.
 * @param used Identifiers already present in the file.
 *
 * @return Upper-case identifier suitable for a generated class constant.
 */
function classConstName(val: string, used: Set<string>): string {
	const words = val
		.split(/\s+/)
		.map((t) => t.replace(A_ZA_Z0_9_G_REGEX(), '_').replace(G_REGEX(), ''))
		.filter(Boolean);
	let name = `${words.join('_') || 'SHARED'}_CLASS`.toUpperCase();
	if (/^\d/.test(name)) name = `CLASS_${name}`;
	if (name.length > 80)
		name = `${name.slice(0, 70)}_${Math.abs([...val].reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 0))
			.toString(36)
			.toUpperCase()}`;
	let suffix = 2;
	while (used.has(name)) name = `${name}_${suffix++}`;
	used.add(name);
	return name;
}

/**
 * Determines whether a source offset is inside a JavaScript template literal.
 * Template-generated markup is data, so replacing its class text with a source
 * identifier would change the generated markup rather than reference a value.
 *
 * @param src Source text containing the candidate match.
 * @param offset Candidate offset in the source text.
 *
 * @return Whether the offset is enclosed by an unescaped backtick.
 */
function isInsideTemplateLiteral(src: string, offset: number): boolean {
	let open = false;
	for (let i = 0; i < offset; i++) {
		if (src[i] !== '`' || (i > 0 && src[i - 1] === '\\')) continue;
		open = !open;
	}
	return open;
}

/**
 * Adds generated declarations to the existing CONFIG boundary without changing imports or prose.
 *
 * @param src Source text to update.
 * @param label Generated subgroup label.
 * @param declarations Constant declarations to insert.
 *
 * @return Source text containing the generated subgroup, or the original source when no CONFIG group exists.
 */
function insertCfgGroup(src: string, label: string, declarations: string[], file?: string): string {
	if (!declarations.length) return src;
	const cfg = /\/\*\/{10,}\r?\n[ \t]*CONFIG[ \t]*\r?\n[ \t]*\/{10,}\*\//.exec(src);
	const eol = src.includes('\r\n') ? '\r\n' : '\n';
	const group = [`/*${'/'.repeat(50)}`, label, `${'/'.repeat(50)}*/`, ...declarations].join(eol);
	if (cfg) {
		const at = cfg.index + cfg[0].length;
		return `${src.slice(0, at)}${eol}${group}${eol}${src.slice(at)}`;
	}
	// Add generated constants only to JavaScript-family sources, after imports
	// and directive prologues so module and directive semantics remain unchanged.
	if (!file || file.endsWith('.html')) return src;
	if (file.endsWith('.astro')) {
		const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
		if (frontmatter) {
			const at = frontmatter[0].lastIndexOf('---');
			return `${src.slice(0, at)}${group}${eol}${src.slice(at)}`;
		}
		return `---${eol}${group}${eol}---${eol}${src}`;
	}
	const ast = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	let at = 0;
	for (const statement of ast.statements) {
		if (ts.isImportDeclaration(statement) || (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression))) at = statement.end;
		else break;
	}
	return `${src.slice(0, at)}${at ? eol : ''}${group}${eol}${src.slice(at)}`;
}

/**
 * Writes a generated JavaScript-family update only after TypeScript accepts its syntax.
 * Astro files are validated structurally by the narrowly scoped attribute edits instead.
 *
 * @param file Source file to update.
 * @param src Candidate source text.
 *
 * @return `true` when the candidate was written.
 */
function writePatternSrc(file: string, src: string): boolean {
	if (!file.endsWith('.astro')) {
		if (ts.transpileModule(src, { fileName: file, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext } }).diagnostics?.length)
			return false;
	}
	writeFileSync(file, src);
	return true;
}

/**
 * Replaces repeated static class attributes with file-local constants in the CONFIG/CLASSES group.
 * Dynamic expressions, HTML files, and files without an existing CONFIG boundary are left unchanged.
 *
 * @param cfg Quality configuration defining the class threshold and source scope.
 * @param analysis Optional shared analysis context used for discovery.
 *
 * @return Counts of replacements made and candidates deliberately left advisory.
 */
export function fixRepeatedClasses(cfg: QualityCfg, analysis?: QualityAnalysis): PatternFixResult {
	const settings = cfg.repeatedClasses ?? {};
	const minimum = settings.minimumCount ?? 3;
	const exts = new Set(settings.extensions ?? ['.astro', '.html', '.js', '.jsx', '.ts', '.tsx']);
	let fixed = 0;
	let skipped = 0;
	for (const file of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		if (!exts.has(file.slice(file.lastIndexOf('.'))) || TEST_TESTS_NODE_MODULES_DIST_BUILD_COVERAGE_REGEX.test(file)) continue;
		if (file.endsWith('.html')) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		// A text matcher cannot safely distinguish live JSX/HTML attributes from
		// markup nested in template literals (including nested interpolations).
		// Leave those files advisory rather than risking a literal `{CONST}` being
		// written into generated output.
		if (src.includes('`')) {
			skipped += 1;
			continue;
		}
		const matches = [...src.matchAll(/\b(class|className)(\s*=\s*)(['"])([^'"\n]+)\3/g)]
			.filter((m) => !isInsideTemplateLiteral(src, m.index ?? 0))
			.map((m) => ({ match: m, value: m[4]!.replace(S_G_REGEX(), ' ').trim() }));
		const groups = new Map<string, typeof matches>();
		for (const entry of matches) if (!entry.value.includes('{') && entry.value.split(' ').length >= 2) groups.set(entry.value, [...(groups.get(entry.value) ?? []), entry]);
		const candidates = [...groups.entries()].filter(([, e]) => e.length >= minimum);
		if (!candidates.length) continue;
		const used = new Set<string>();
		const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
		parsed.forEachChild((n) => {
			if (!ts.isVariableStatement(n)) return;
			for (const declaration of n.declarationList.declarations) if (ts.isIdentifier(declaration.name)) used.add(declaration.name.text);
		});
		const declarations: string[] = [];
		const edits: Array<{ start: number; end: number; replacement: string }> = [];
		for (const [val, entries] of candidates) {
			const name = classConstName(val, used);
			declarations.push(`const ${name} = '${val.replace(G_CLASS_2(), '\\\\').replace(/'/g, "\\'")}';`);
			for (const { match } of entries) edits.push({ start: match.index!, end: match.index! + match[0].length, replacement: `${match[1]}${match[2]}{${name}}` });
			fixed += entries.length;
		}
		let updated = src;
		for (const edit of edits.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		const withGroup = insertCfgGroup(updated, 'CLASSES', declarations, file);
		const candidateCount = candidates.reduce((n, [, e]) => n + e.length, 0);
		if (withGroup === updated) {
			fixed -= candidateCount;
			skipped += candidateCount;
		} else if (!writePatternSrc(file, withGroup)) {
			fixed -= candidateCount;
			skipped += candidateCount;
		}
	}
	return { fixed, skipped };
}

/**
 * Reports configured UI patterns that should use a shared primitive.
 *
 * @param cfg Quality configuration defining forbidden UI patterns and source scope.
 *
 * @return Matching file/pattern pairs that should use shared UI primitives.
 */
export function uiPatternFindings(cfg: QualityCfg, analysis?: QualityAnalysis): UiPatternFinding[] {
	const settings = cfg.uiPatterns ?? {};
	const patterns = (settings.forbidden ?? []).map((p) => [p, new RegExp(p, 'm')] as const);
	const exts = settings.extensions ?? ['.astro', '.html', '.jsx', '.tsx'];
	const ignored = new Set(settings.ignoredFiles ?? []);
	return (analysis?.files ?? srcFiles({ ...cfg, extensions: exts }))
		.filter((f) => exts.includes(f.slice(f.lastIndexOf('.'))))
		.flatMap((f) => {
			const name = displayPath(cfg, f);
			if (ignored.has(name)) return [];
			const src = analysis?.texts.get(f) ?? readFileSync(f, 'utf8');
			return patterns.filter(([, p]) => p.test(src)).map(([p]) => ({ file: name, pattern: p }));
		});
}

/*//////////////////////////////////////////////////
TAILWIND
//////////////////////////////////////////////////*/

/**
 * Resolves a stylesheet identifier using known package locations and Node's module resolver.
 *
 * @param root Repository root from which package resolution should begin.
 * @param id Stylesheet package identifier or path.
 * @param base Directory used for relative fallback resolution.
 *
 * @return Absolute path to the stylesheet candidate.
 */
function resolveStylesheet(root: string, id: string, base: string): string {
	const require = createRequire(resolve(root, 'package.json'));
	const known = { tailwindcss: 'tailwindcss/index.css', 'tw-animate-css': 'tw-animate-css/dist/tw-animate.css', 'shadcn/tailwind.css': 'shadcn/dist/tailwind.css' } as Record<string, string>;
	const candidates = [known[id], id].filter((c): c is string => Boolean(c));
	for (const candidate of candidates) {
		for (const packageRoot of [resolve(root, 'node_modules'), resolve(root, 'astro/node_modules')]) {
			const directPath = resolve(packageRoot, candidate);
			if (existsSync(directPath)) return directPath;
		}
		try {
			return require.resolve(candidate, { paths: [base, root, resolve(root, 'astro')] });
		} catch {
			// Try the next package-resolution strategy.
		}
	}
	return resolve(base, id);
}

/**
 * Loads a stylesheet and records the directory used to resolve its nested imports.
 *
 * @param root Repository root used for package resolution.
 * @param id Stylesheet package identifier or path.
 * @param base Base directory for fallback resolution.
 *
 * @return Loaded stylesheet path, resolution base, and source content.
 */
async function loadStylesheet(root: string, id: string, base: string): Promise<{ path: string; base: string; content: string }> {
	const path = resolveStylesheet(root, id, base);
	return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
}

/**
 * Resolves the consumer repository's Tailwind package entry from its package manifest.
 *
 * @param consumerRequire CommonJS resolver rooted at the consumer package.
 * @param root Repository root whose dependency tree should be searched.
 *
 * @return Absolute path to the Tailwind import entry.
 */
function resolveConsumerImport(consumerRequire: NodeRequire, root: string): string {
	const paths = [root, resolve(root, 'astro')];
	const manifestPath = consumerRequire.resolve('tailwindcss/package.json', { paths });
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { exports?: { '.': { import?: string } }; module?: string; main?: string };
	const entry = manifest.exports?.['.']?.import ?? manifest.module ?? manifest.main;
	if (!entry) throw new Error('Tailwind package does not expose an import entry.');
	return resolve(dirname(manifestPath), entry);
}

/**
 * Extracts static class-string segments from class attributes and common class-composition calls.
 *
 * @param src Source text to scan.
 *
 * @return Class segments and their offsets in the source text.
 */
function classVals(src: string): Array<{ start: number; value: string }> {
	const vals: Array<{ start: number; value: string }> = [];
	const attrPattern = /\b(?:class|className)\s*=\s*(?:(['"])([\s\S]*?)\1|\{\s*`([\s\S]*?)`\s*\})/g;
	for (const match of src.matchAll(attrPattern)) {
		const value = match[2] ?? match[3] ?? '';
		const valStart = match.index! + match[0].indexOf(value);
		let segmentStart = 0;
		for (const interpolation of value.matchAll(/\$\{[\s\S]*?\}/g)) {
			if (interpolation.index! > segmentStart) vals.push({ start: valStart + segmentStart, value: value.slice(segmentStart, interpolation.index) });
			segmentStart = interpolation.index! + interpolation[0].length;
		}
		if (segmentStart < value.length) vals.push({ start: valStart + segmentStart, value: value.slice(segmentStart) });
	}
	const callPattern = /\b(?:cn|clsx|classnames|cva)\s*\(/g;
	for (const call of src.matchAll(callPattern)) {
		let depth = 1;
		let cursor = call.index! + call[0].length;
		while (cursor < src.length && depth > 0) {
			if (src[cursor] === '(') depth += 1;
			if (src[cursor] === ')') depth -= 1;
			cursor += 1;
		}
		const bodyStart = call.index! + call[0].length;
		const body = src.slice(bodyStart, cursor - 1);
		for (const value of body.matchAll(/(['"`])([\s\S]*?)\1/g)) if (!value[2]!.includes('${')) vals.push({ start: bodyStart + value.index! + 1, value: value[2]! });
	}
	return vals;
}

/**
 * Converts a source offset into the one-based line and column used by diagnostics.
 *
 * @param src Source text containing the offset.
 * @param offset Zero-based character offset in the source.
 *
 * @return One-based source location.
 */
function locationAt(src: string, offset: number): { line: number; column: number } {
	const before = src.slice(0, offset);
	return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}

/**
 * Runs the Tailwind v4 canonical-class diagnostic used by the quality CLI.
 *
 * @param cfg Quality configuration containing the Tailwind stylesheet and source roots.
 * @param fix Whether canonical replacements should be written to source files.
 *
 * @return Promise resolving to zero after diagnostics or fixes complete.
 */
export async function runTailwindCanonical(cfg: QualityCfg, fix = false): Promise<number> {
	if (!cfg.tailwindCanonical) return 0;
	const stylesheetPath = resolve(cfg.root, cfg.tailwindCanonical.stylesheet);
	if (!existsSync(stylesheetPath)) throw new Error(`Tailwind stylesheet not found: ${stylesheetPath}`);
	const consumerRequire = createRequire(resolve(cfg.root, 'package.json'));
	let tailwind: {
		__unstable__loadDesignSystem?: (
			css: string,
			opts: { from: string; loadStylesheet: (id: string, base: string) => Promise<{ path: string; base: string; content: string }> },
		) => Promise<{ canonicalizeCandidates: (candidates: string[]) => string[] }>;
	};
	try {
		const packagePath = resolveConsumerImport(consumerRequire, cfg.root);
		tailwind = (await import(pathToFileURL(packagePath).href)) as typeof tailwind;
	} catch {
		throw new Error('Tailwind canonical check could not load the consumer repository Tailwind package.');
	}
	if (!tailwind.__unstable__loadDesignSystem) {
		console.info('Tailwind canonical check skipped: installed Tailwind does not expose v4 canonical-class diagnostics.');
		return 0;
	}
	const stylesheet = readFileSync(stylesheetPath, 'utf8');
	const designSystem = await tailwind.__unstable__loadDesignSystem(stylesheet, { from: stylesheetPath, loadStylesheet: (id, base) => loadStylesheet(cfg.root, id, base) });
	const scanCfg = cfg.tailwindCanonical.sourceRoots ? { ...cfg, sourceRoots: cfg.tailwindCanonical.sourceRoots.map((r) => resolve(cfg.root, r)) } : cfg;
	const files = srcFiles(scanCfg).filter((f) => /\.(?:astro|cjs|js|jsx|mjs|ts|tsx)$/.test(f));
	const findings: { file: string; start: number; end: number; original: string; replacement: string; line: number; column: number }[] = [];
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		for (const val of classVals(source)) {
			for (const token of val.value.matchAll(/\S+/g)) {
				const original = token[0]!;
				const replacement = designSystem.canonicalizeCandidates([original])[0];
				if (!replacement || replacement === original || replacement.includes(' ')) continue;
				const start = val.start + token.index!;
				findings.push({ file, start, end: start + original.length, original, replacement, ...locationAt(source, start) });
			}
		}
	}
	const uniqueFindings = findings.filter((f, i, a) => a.findIndex((c) => c.file === f.file && c.start === f.start && c.original === f.original) === i);
	if (fix) {
		for (const file of new Set(uniqueFindings.map((f) => f.file))) {
			let source = readFileSync(file, 'utf8');
			for (const finding of uniqueFindings.filter((c) => c.file === file).sort((l, r) => r.start - l.start))
				source = `${source.slice(0, finding.start)}${finding.replacement}${source.slice(finding.end)}`;
			writeFileSync(file, source);
		}
		console.info(`Tailwind canonical classes fixed: ${uniqueFindings.length}`);
		return 0;
	}
	for (const finding of uniqueFindings) console.error(`${relative(cfg.root, finding.file)}:${finding.line}:${finding.column} ${finding.original} -> ${finding.replacement}`);
	if (uniqueFindings.length) throw new Error(`Tailwind canonical class check failed with ${uniqueFindings.length} suggestion${uniqueFindings.length === 1 ? '' : 's'}.`);
	console.info(`Tailwind canonical class check passed: ${files.length} source files scanned.`);
	return 0;
}

const REGEX_REGISTRY_MARKER = '// Generated by @terra-symposium/quality regex-dedup. Do not edit.';
const REGEX_DECLARATION_MARKER = '// Generated by @terra-symposium/quality regex-dedup. Do not edit.';
type RegexCandidate = { file: string; source: string; expression: string; node: ts.Node; ast: ts.SourceFile; rewritable: boolean };
type RegexRegistry = { module: string; declaration: string; names: Set<string>; keys: Map<string, string>; owned: boolean };

function regexScriptKind(file: string): ts.ScriptKind {
	if (/\.tsx$/.test(file)) return ts.ScriptKind.TSX;
	if (/\.jsx$/.test(file)) return ts.ScriptKind.JSX;
	return /\.(?:mjs|cjs|js)$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}

/**
 * Collects the supported literal and static-constructor candidates used by both reporting and fixing.
 *
 * @param cfg Quality configuration defining the regex source scope.
 * @param analysis Optional shared analysis context for reusing source text and ASTs.
 *
 * @return Regex candidates with exact source keys and source locations.
 */
function regexCandidates(cfg: QualityCfg, analysis?: QualityAnalysis): RegexCandidate[] {
	const settings = cfg.regexDedup ?? {};
	const exts = new Set(settings.extensions ?? ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.mts', '.cts']);
	const ignored = new Set(settings.ignoredFiles ?? []);
	const registryPath = settings.sharedModule ? resolve(cfg.root, settings.sharedModule) : '';
	const candidates: RegexCandidate[] = [];
	for (const file of analysis?.files ?? srcFiles({ ...cfg, extensions: [...exts] })) {
		if (!exts.has(file.slice(file.lastIndexOf('.'))) || file.endsWith('.d.mts') || TEST_TESTS_NODE_MODULES_DIST_BUILD_COVERAGE_REGEX.test(file) || (registryPath && resolve(file) === registryPath))
			continue;
		if (ignored.has(displayPath(cfg, file))) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		const ast = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, regexScriptKind(file));
		const shadowedRegExp = hasRegExpBinding(ast);
		const visit = (node: ts.Node): void => {
			if (ts.isRegularExpressionLiteral(node) && !isGenLocalRegex(node, ast)) {
				const literal = node.getText(ast);
				const end = literal.lastIndexOf('/');
				const pattern = literal.slice(1, end);
				const flags = literal.slice(end + 1);
				candidates.push({ file, source: flags ? `${pattern}/${flags}` : pattern, expression: literal, node, ast, rewritable: true });
			} else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'RegExp' && !node.typeArguments?.length) {
				const [pattern, flags, ...rest] = node.arguments ?? [];
				if (!rest.length && (ts.isStringLiteral(pattern) || ts.isNoSubstitutionTemplateLiteral(pattern)) && (!flags || ts.isStringLiteral(flags))) {
					candidates.push({ file, source: flags ? `${pattern.getText(ast)}, ${flags.getText(ast)}` : pattern.getText(ast), expression: node.getText(ast), node, ast, rewritable: !shadowedRegExp });
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(ast);
	}
	return candidates;
}

function isGenLocalRegex(node: ts.RegularExpressionLiteral, ast: ts.SourceFile): boolean {
	let declaration: ts.VariableDeclaration | undefined;
	for (let curr: ts.Node | undefined = node; curr && !ts.isSourceFile(curr); curr = curr.parent) {
		if (ts.isVariableDeclaration(curr)) {
			declaration = curr;
			break;
		}
	}
	if (!declaration || !ts.isIdentifier(declaration.name) || !declaration.name.text.endsWith('_REGEX')) return false;
	const before = ast.text.slice(0, declaration.getStart(ast));
	const sections = [...before.matchAll(/\/\*\/{10,}\r?\n[ \t]*([A-Z][A-Z _-]*)[ \t]*\r?\n[ \t]*\/{10,}\*\//g)];
	return sections.at(-1)?.[1] === 'REGEX';
}

function hasRegExpBinding(ast: ts.SourceFile): boolean {
	const bindingHasRegExp = (name: ts.BindingName): boolean => {
		if (ts.isIdentifier(name)) return name.text === 'RegExp';
		return name.elements.some((e) => ts.isBindingElement(e) && bindingHasRegExp(e.name));
	};
	let found = false;
	const visit = (node: ts.Node): void => {
		if (found) return;
		if (
			(ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) &&
			node.name &&
			bindingHasRegExp(node.name as ts.BindingName)
		) {
			found = true;
			return;
		}
		if (ts.isImportClause(node) && node.name?.text === 'RegExp') found = true;
		if (ts.isImportSpecifier(node) && node.name.text === 'RegExp') found = true;
		if (ts.isCatchClause(node) && node.variableDeclaration && bindingHasRegExp(node.variableDeclaration.name)) found = true;
		ts.forEachChild(node, visit);
	};
	visit(ast);
	return found;
}

function regexGroups(cfg: QualityCfg, analysis?: QualityAnalysis): Map<string, RegexCandidate[]> {
	const groups = new Map<string, RegexCandidate[]>();
	for (const candidate of regexCandidates(cfg, analysis)) groups.set(candidate.source, [...(groups.get(candidate.source) ?? []), candidate]);
	return groups;
}

/**
 * Reports exact duplicate regular-expression sources across source files.
 *
 * @param cfg Quality configuration defining regex extensions, exclusions, and threshold.
 * @param analysis Optional shared analysis context for reusing source text and ASTs.
 *
 * @return Duplicate regular-expression sources and their source locations.
 */
export function regexFindings(cfg: QualityCfg, analysis?: QualityAnalysis): RegexFinding[] {
	const minimum = cfg.regexDedup?.minimumCount ?? 2;
	return [...regexGroups(cfg, analysis)]
		.filter(([, c]) => c.length >= minimum)
		.map(([s, c]) => ({
			source: s,
			count: c.length,
			locations: c
				.map(({ file: f, ast: a, node: n }) => `${displayPath(cfg, f)}:${a.getLineAndCharacterOfPosition(n.getStart(a)).line + 1}`)
				.sort((l, r) => l.localeCompare(r, undefined, { numeric: true })),
		}));
}

function isEsmConsumer(cfg: QualityCfg, file: string): boolean {
	if (/\.(?:mjs|mts)$/.test(file)) return true;
	if (/\.(?:cjs|cts)$/.test(file)) return false;
	for (let dir = dirname(file); dir.startsWith(cfg.root); dir = dirname(dir)) {
		const packageFile = resolve(dir, 'package.json');
		if (existsSync(packageFile)) {
			try {
				return JSON.parse(readFileSync(packageFile, 'utf8')).type === 'module';
			} catch {
				return false;
			}
		}
		if (dir === cfg.root) break;
	}
	return false;
}

function regexExportName(src: string, used: Set<string>): string {
	const slug = src.replace(A_ZA_Z0_9_G_REGEX(), '_').replace(G_REGEX(), '').slice(0, 60).toUpperCase() || 'PATTERN';
	const base = `REGEX_${slug}_REGEX`;
	let name = base;
	let suffix = 2;
	while (used.has(name)) name = `${base}_${suffix++}`;
	used.add(name);
	return name;
}

function readRegexRegistry(modulePath: string, declarationPath: string): RegexRegistry | null {
	const moduleExists = existsSync(modulePath);
	const declarationExists = existsSync(declarationPath);
	const module = moduleExists ? readFileSync(modulePath, 'utf8') : `${REGEX_REGISTRY_MARKER}\n`;
	const declaration = declarationExists ? readFileSync(declarationPath, 'utf8') : `${REGEX_DECLARATION_MARKER}\n`;
	const owned = module.startsWith(REGEX_REGISTRY_MARKER) && declaration.startsWith(REGEX_DECLARATION_MARKER);
	if ((moduleExists || declarationExists) && !owned) return null;
	const names = new Set([...module.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map((m) => m[1]!));
	const keys = new Map<string, string>();
	for (const match of module.matchAll(/^\/\/ @terra-quality-regex-key (.+)\r?\nexport const ([A-Za-z_$][\w$]*)\b/gm)) {
		try {
			keys.set(JSON.parse(match[1]!) as string, match[2]!);
		} catch {
			// An invalid generated annotation is not used as a key; the export remains collision-protected.
		}
	}
	return { module, declaration, names, keys, owned };
}

function declarationFor(module: string): string {
	const names = [...new Set([...module.matchAll(EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX())].map((m) => m[1]!))].sort();
	return `${REGEX_DECLARATION_MARKER}\n${names.map((n) => `export declare const ${n}: () => RegExp;`).join('\n')}${names.length ? '\n' : ''}`;
}

function moduleSpecifier(file: string, modulePath: string): string {
	let specifier = relative(dirname(file), modulePath).replace(G_CLASS_2(), '/');
	if (!specifier.startsWith('.')) specifier = `./${specifier}`;
	return specifier;
}

function namespaceImport(ast: ts.SourceFile, file: string, modulePath: string): string | undefined {
	for (const statement of ast.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
		if (resolve(dirname(file), statement.moduleSpecifier.text) !== modulePath) continue;
		if (!statement.importClause || statement.importClause.isTypeOnly || !statement.importClause.namedBindings || !ts.isNamespaceImport(statement.importClause.namedBindings)) continue;
		return statement.importClause.namedBindings.name.text;
	}
}

function insertNamespaceImport(src: string, ast: ts.SourceFile, alias: string, specifier: string): string {
	const line = `import * as ${alias} from '${specifier}';`;
	const eol = src.includes('\r\n') ? '\r\n' : '\n';
	let at = 0;
	for (const statement of ast.statements) {
		const directive = ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
		if (ts.isImportDeclaration(statement) || directive) at = statement.end;
		else break;
	}
	if (!at && ast.statements.length) {
		const first = ast.statements[0]!;
		at = first.getStart(ast);
		const leading = src.slice(first.getFullStart(), first.getStart(ast));
		const directive = [...leading.matchAll(/^[ \t]*\/\/[^\r\n]*(?:eslint-disable-next-line|@ts-ignore|@ts-expect-error)[^\r\n]*/gm)].at(-1);
		if (directive?.index !== undefined) at = first.getFullStart() + directive.index;
	}
	if (!at && src.startsWith('#!')) {
		const shebangEnd = src.indexOf('\n');
		at = shebangEnd < 0 ? src.length : shebangEnd + 1;
	}
	const before = src.slice(0, at);
	const after = src.slice(at);
	return `${before}${at && !before.endsWith('\n') ? eol : ''}${line}${after.startsWith('\n') || after.startsWith('\r\n') ? '' : eol}${after}`;
}

function identifierNames(ast: ts.SourceFile): Set<string> {
	const names = new Set<string>();
	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node)) names.add(node.text);
		ts.forEachChild(node, visit);
	};
	visit(ast);
	return names;
}

function validRegexOutput(file: string, src: string): boolean {
	if (file.endsWith('.d.mts')) {
		const parsed = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] };
		return parsed.parseDiagnostics.length === 0;
	}
	if (
		ts.transpileModule(src, { fileName: file, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } })
			.diagnostics?.length
	)
		return false;
	return true;
}

/**
 * Replaces duplicate regex candidates with file-local constants or a configured shared ESM registry.
 * Shared factories preserve a fresh RegExp instance at every original evaluation site.
 *
 * @param cfg Quality configuration defining the regex threshold, source scope, and optional registry.
 * @param analysis Optional shared analysis context used for discovery.
 *
 * @return Counts of regex expressions replaced and candidates left advisory.
 */
export function fixRegexDedup(cfg: QualityCfg, analysis?: QualityAnalysis): PatternFixResult {
	if (cfg.regexDedup?.sharedModule) return fixRegexDedupShared(cfg, analysis);
	const settings = cfg.regexDedup ?? {};
	const minimum = settings.minimumCount ?? 2;
	const groups = regexGroups(cfg, analysis);
	let fixed = 0;
	let skipped = 0;
	const files = new Map<string, RegexCandidate[]>();
	for (const candidate of [...groups.values()].flat()) {
		if (!ts.isRegularExpressionLiteral(candidate.node)) continue;
		files.set(candidate.file, [...(files.get(candidate.file) ?? []), candidate]);
	}
	for (const [file, candidates] of files) {
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		const localGroups = new Map<string, RegexCandidate[]>();
		for (const candidate of candidates) localGroups.set(candidate.source, [...(localGroups.get(candidate.source) ?? []), candidate]);
		const matches = [...localGroups].filter(([, n]) => n.length >= minimum);
		const used = identifierNames(candidates[0]!.ast);
		const declarations: string[] = [];
		const edits: Array<{ start: number; end: number; replacement: string }> = [];
		for (const [, nodes] of matches) {
			const name = classConstName(nodes[0]!.expression.replace(/\W+/g, '_'), used).replace(/_CLASS$/, '_REGEX');
			const flags = nodes[0]!.expression.slice(nodes[0]!.expression.lastIndexOf('/') + 1);
			const stateful = flags.includes('g') || flags.includes('y');
			declarations.push(`const ${name} = ${stateful ? `() => ${nodes[0]!.expression}` : nodes[0]!.expression};`);
			for (const candidate of nodes) edits.push({ start: candidate.node.getStart(candidate.ast), end: candidate.node.end, replacement: stateful ? `${name}()` : name });
			fixed += nodes.length;
		}
		const matchingCount = matches.reduce((c, [, n]) => c + n.length, 0);
		if (!edits.length) continue;
		let updated = src;
		for (const edit of edits.sort((l, r) => r.start - l.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		const withGroup = insertCfgGroup(updated, 'REGEX', declarations, file);
		if (withGroup === updated || !writePatternSrc(file, withGroup)) {
			fixed -= matchingCount;
			skipped += matchingCount;
		}
	}
	return { fixed, skipped };
}

function fixRegexDedupShared(cfg: QualityCfg, analysis?: QualityAnalysis): PatternFixResult {
	const sharedModule = cfg.regexDedup!.sharedModule!;
	if (!sharedModule.endsWith('.mjs')) throw new Error('regexDedup.sharedModule must name an ESM .mjs file.');
	const modulePath = resolve(cfg.root, sharedModule);
	const moduleRelative = relative(cfg.root, modulePath);
	if (moduleRelative === '..' || moduleRelative.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('regexDedup.sharedModule must stay inside the repository root.');
	const declarationPath = modulePath.replace(/\.mjs$/, '.d.mts');
	const minimum = cfg.regexDedup?.minimumCount ?? 2;
	const groups = [...regexGroups(cfg, analysis)].filter(([, c]) => c.length >= minimum);
	if (!groups.length) return { fixed: 0, skipped: 0 };
	const registry = readRegexRegistry(modulePath, declarationPath);
	if (!registry) return { fixed: 0, skipped: groups.reduce((c, [, v]) => c + v.length, 0) };
	const rewritable = groups.filter(([, c]) => c.every((c) => c.rewritable && isEsmConsumer(cfg, c.file)));
	let skipped = groups.filter(([, c]) => !c.every((c) => c.rewritable && isEsmConsumer(cfg, c.file))).reduce((c, [, v]) => c + v.length, 0);
	if (!rewritable.length) return { fixed: 0, skipped };

	const usedExports = new Set(registry.names);
	const namesByKey = new Map(registry.keys);
	const newEntries: Array<{ key: string; name: string; expression: string }> = [];
	const groupNames = new Map<string, string>();
	for (const [key, candidates] of rewritable.sort(([l], [r]) => l.localeCompare(r))) {
		let name = namesByKey.get(key);
		if (!name) {
			name = regexExportName(key, usedExports);
			namesByKey.set(key, name);
			newEntries.push({ key, name, expression: candidates[0]!.expression });
		}
		groupNames.set(key, name);
	}

	const eol = '\n';
	const moduleAdditions = newEntries
		.map(
			({ key: k, name: n, expression: e }) =>
				`// @terra-quality-regex-key ${JSON.stringify(k)}\nexport const ${n} = () => (\n${e
					.split('\n')
					.map((l) => `\t${l}`)
					.join('\n')}\n);`,
		)
		.join(`${eol}${eol}`);
	const moduleSrc = `${registry.module.replace(/\s*$/, '')}${moduleAdditions ? `${eol}${eol}${moduleAdditions}${eol}` : `${eol}`}`;
	const declarationSrc = declarationFor(moduleSrc);
	const srcEdits = new Map<string, { source: string; ast: ts.SourceFile; edits: Array<{ start: number; end: number; replacement: string }>; alias: string; specifier: string }>();
	let fixed = 0;
	for (const [key, candidates] of rewritable) {
		const name = groupNames.get(key)!;
		for (const candidate of candidates) {
			let fileEdits = srcEdits.get(candidate.file);
			if (!fileEdits) {
				const source = analysis?.texts.get(candidate.file) ?? readFileSync(candidate.file, 'utf8');
				const existingAlias = namespaceImport(candidate.ast, candidate.file, modulePath);
				const names = identifierNames(candidate.ast);
				let alias = existingAlias ?? 'TerraQualityRegex';
				let suffix = 2;
				while (!existingAlias && names.has(alias)) alias = `TerraQualityRegex${suffix++}`;
				fileEdits = { source, ast: candidate.ast, edits: [], alias, specifier: moduleSpecifier(candidate.file, modulePath) };
				srcEdits.set(candidate.file, fileEdits);
			}
			fileEdits.edits.push({ start: candidate.node.getStart(candidate.ast), end: candidate.node.end, replacement: `${fileEdits.alias}.${name}()` });
			fixed++;
		}
	}

	const updatedSrcs = new Map<string, string>();
	for (const [file, fileEdits] of srcEdits) {
		let updated = fileEdits.source;
		for (const edit of fileEdits.edits.sort((l, r) => r.start - l.start)) updated = `${updated.slice(0, edit.start)}${edit.replacement}${updated.slice(edit.end)}`;
		if (!namespaceImport(fileEdits.ast, file, modulePath)) {
			const updatedAst = ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, regexScriptKind(file));
			updated = insertNamespaceImport(updated, updatedAst, fileEdits.alias, fileEdits.specifier);
		}
		if (!validRegexOutput(file, updated)) {
			skipped += fileEdits.edits.length;
			fixed -= fileEdits.edits.length;
			continue;
		}
		updatedSrcs.set(file, updated);
	}
	if ([...updatedSrcs].length !== srcEdits.size || !validRegexOutput(modulePath, moduleSrc) || !validRegexOutput(declarationPath, declarationSrc)) {
		return { fixed: 0, skipped: groups.filter(([, c]) => c.every((c) => c.rewritable && isEsmConsumer(cfg, c.file))).reduce((c, [, v]) => c + v.length, 0) + skipped };
	}

	mkdirSync(dirname(modulePath), { recursive: true });
	writeFileSync(modulePath, moduleSrc);
	writeFileSync(declarationPath, declarationSrc);
	for (const [file, source] of updatedSrcs) writeFileSync(file, source);
	return { fixed, skipped };
}
