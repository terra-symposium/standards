/**
 * packages/quality/src/single-use.ts
 * AST inventory and safe autofix for single-consumer declarations (types, and helpers).
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { join, relative, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { srcFiles } from './files.js';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const C_M_JS_JSX_TS_TSX_REGEX = /\.(?:c|m)?(?:js|jsx|ts|tsx)$/;
export type SingleUseFinding = { file: string; line: number; name: string; decision: 'INLINE' | 'KEEP' | 'REVIEW'; reason: string };
export type CssSingleUseFinding = { file: string; line: number; name: string; decision: 'INLINE'; reason: string; uses: number; selector: string };
export type SingleUseReportFinding = SingleUseFinding | CssSingleUseFinding;
type Candidate = { file: string; source: ts.SourceFile; statement: ts.Statement; name: ts.Identifier; symbol: ts.Symbol; kind: 'type' | 'interface' | 'variable' | 'function' };
type Reference = { file: string; source: ts.SourceFile; node: ts.Identifier };
const canonical = (c: ts.TypeChecker, s: ts.Symbol | undefined): ts.Symbol | undefined => (s && s.flags & ts.SymbolFlags.Alias ? c.getAliasedSymbol(s) : s);
const isCandidateStatement = (s: ts.Statement): boolean =>
	ts.isTypeAliasDeclaration(s) ||
	ts.isInterfaceDeclaration(s) ||
	ts.isFunctionDeclaration(s) ||
	(ts.isVariableStatement(s) && s.declarationList.declarations.length === 1 && ts.isIdentifier(s.declarationList.declarations[0]?.name));

const unwrapInit = (expr: ts.Expression): ts.Expression => {
	let curr = expr;
	while (ts.isAsExpression(curr) || ts.isTypeAssertionExpression(curr) || ts.isParenthesizedExpression(curr) || ts.isSatisfiesExpression(curr)) curr = curr.expression;
	return curr;
};
const isImportNode = (n: ts.Node): boolean => {
	const src = n.getSourceFile();
	if (src.statements.some((s) => ts.isImportDeclaration(s) && n.getStart(src) >= s.getStart(src) && n.getEnd() <= s.getEnd())) return true;
	for (let parent: ts.Node | undefined = n.parent; parent && !ts.isSourceFile(parent); parent = parent.parent) if (ts.isImportDeclaration(parent)) return true;
	return false;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates the TypeScript program used to identify declarations and their consumers.
 *
 * @param cfg Quality configuration defining the source files to include.
 *
 * @return TypeScript program configured for repository JavaScript and TypeScript sources.
 */
function programFor(cfg: QualityCfg): ts.Program {
	return ts.createProgram({
		rootNames: srcFiles(cfg).filter((f) => C_M_JS_JSX_TS_TSX_REGEX.test(f)),
		options: {
			allowJs: true,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		},
	});
}

/**
 * Collects eligible declarations and all non-import references to their symbols.
 *
 * @param cfg Quality configuration defining which source roots are in scope.
 * @param program TypeScript program containing the source files to inspect.
 * @param checker TypeScript type checker used to canonicalize aliases and references.
 *
 * @return Candidate declarations and references grouped by canonical symbol.
 */
function collect(cfg: QualityCfg, program: ts.Program, checker: ts.TypeChecker): { candidates: Candidate[]; references: Map<ts.Symbol, Reference[]> } {
	const candidates: Candidate[] = [];
	const declarationByLocation = new Map<string, Candidate>();
	const references = new Map<ts.Symbol, Reference[]>();
	const roots = [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])];
	const inScope = (file: string): boolean => roots.some((r) => file === r || file.startsWith(`${r}/`));
	for (const source of program.getSourceFiles()) {
		if (!inScope(source.fileName) || source.isDeclarationFile || !C_M_JS_JSX_TS_TSX_REGEX.test(source.fileName)) continue;
		const visitCandidates = (node: ts.Node): void => {
			if (!isCandidateStatement(node as ts.Statement)) {
				ts.forEachChild(node, visitCandidates);
				return;
			}
			const statement = node as ts.Statement;
			const name =
				ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isFunctionDeclaration(statement)
					? statement.name
					: ts.isVariableStatement(statement)
						? statement.declarationList.declarations[0]?.name
						: undefined;
			if (!name || !ts.isIdentifier(name)) {
				ts.forEachChild(node, visitCandidates);
				return;
			}
			const symbol = canonical(checker, checker.getSymbolAtLocation(name));
			if (!symbol) {
				ts.forEachChild(node, visitCandidates);
				return;
			}
			const kind = ts.isTypeAliasDeclaration(statement) ? 'type' : ts.isInterfaceDeclaration(statement) ? 'interface' : ts.isFunctionDeclaration(statement) ? 'function' : 'variable';
			const candidate = { file: source.fileName, source, statement, name, symbol, kind } satisfies Candidate;
			candidates.push(candidate);
			declarationByLocation.set(`${source.fileName}:${name.getStart(source)}`, candidate);
			ts.forEachChild(node, visitCandidates);
		};
		visitCandidates(source);
	}
	const candidateSymbols = new Set(candidates.map((c) => c.symbol));
	for (const src of program.getSourceFiles()) {
		if (!inScope(src.fileName) || src.isDeclarationFile || !C_M_JS_JSX_TS_TSX_REGEX.test(src.fileName)) continue;
		const visit = (node: ts.Node): void => {
			if (ts.isIdentifier(node)) {
				let importUse = false;
				const exportUse = ts.isExportSpecifier(node.parent);
				for (let parent: ts.Node | undefined = node.parent; parent && !ts.isSourceFile(parent); parent = parent.parent) {
					if (ts.isImportDeclaration(parent)) {
						importUse = true;
						break;
					}
				}
				const shorthandSymbol = ts.isShorthandPropertyAssignment(node.parent) ? checker.getShorthandAssignmentValueSymbol(node.parent) : undefined;
				const symbol = canonical(checker, shorthandSymbol ?? checker.getSymbolAtLocation(node));
				if (!importUse && !exportUse && symbol && candidateSymbols.has(symbol)) {
					const declaration = declarationByLocation.get(`${src.fileName}:${node.getStart(src)}`);
					if (!declaration) references.set(symbol, [...(references.get(symbol) ?? []), { file: src.fileName, source: src, node }]);
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(src);
	}
	return { candidates, references };
}

/**
 * Classifies a single-consumer declaration according to its safety and readability boundary.
 *
 * @param candidate Declaration candidate whose kind and initializer determine the recommendation.
 *
 * @return Decision and explanation for the candidate.
 */
function classify(candidate: Candidate): [SingleUseFinding['decision'], string] {
	if (candidate.kind === 'type' || candidate.kind === 'interface') return ['INLINE', 'single-use type can be inlined at its only consumer'];
	if (candidate.kind === 'function') return ['INLINE', 'single-use function can be inlined at its only consumer'];
	const declaration = ts.isVariableStatement(candidate.statement) ? candidate.statement.declarationList.declarations[0]! : undefined;
	if (!declaration?.initializer) return ['INLINE', 'single-use declaration must be collapsed at its only consumer'];
	const init = unwrapInit(declaration.initializer);
	if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return ['INLINE', 'single-use function can be inlined at its only consumer'];
	return ['INLINE', 'single-use declaration can be inlined at its only consumer'];
}

/**
 * Finds type-position references to a candidate declaration across the configured source scope.
 *
 * @param cfg Quality configuration defining the source roots to scan.
 * @param candidate Type alias or interface whose consumers should be located.
 * @param program TypeScript program containing the source files to inspect.
 *
 * @return Type references excluding the declaration and import syntax itself.
 */
function typeUses(cfg: QualityCfg, candidate: Candidate, program: ts.Program): Reference[] {
	const roots = [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])];
	const inScope = (file: string): boolean => roots.some((r) => file === r || file.startsWith(`${r}/`));
	const uses: Reference[] = [];
	for (const src of program.getSourceFiles()) {
		if (!inScope(src.fileName) || !C_M_JS_JSX_TS_TSX_REGEX.test(src.fileName)) continue;
		const visit = (node: ts.Node): void => {
			if (
				ts.isIdentifier(node) &&
				node.text === candidate.name.text &&
				!(src === candidate.source && node.getStart(src) === candidate.name.getStart(candidate.source)) &&
				!isImportNode(node) &&
				(ts.isTypeReferenceNode(node.parent) || ts.isExpressionWithTypeArguments(node.parent))
			)
				uses.push({ file: src.fileName, source: src, node });
			ts.forEachChild(node, visit);
		};
		visit(src);
	}
	return uses;
}

/**
 * Reports declarations that have exactly one in-scope consumer.
 *
 * @param cfg Quality configuration defining the source scope.
 *
 * @return Single-use recommendations with their locations and safety decisions.
 */
export function singleUseFindings(cfg: QualityCfg): SingleUseFinding[] {
	const program = programFor(cfg);
	const checker = program.getTypeChecker();
	const { candidates, references } = collect(cfg, program, checker);
	return candidates.flatMap((c) => {
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeUses(cfg, c, program) : (references.get(c.symbol) ?? []).filter((r) => !isImportNode(r.node));
		if (uses.length !== 1) return [];
		const [decision, reason] = classify(c);
		return [{ file: relative(cfg.root, c.file), line: c.source.getLineAndCharacterOfPosition(c.name.getStart(c.source)).line + 1, name: c.name.text, decision, reason }];
	});
}

/**
 * Removes CSS comments without changing line offsets used by diagnostics.
 *
 * @param css Stylesheet source text.
 *
 * @return CSS source with comment characters replaced by spaces.
 */
function maskCssComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '));
}

/**
 * Collects source files that can contain class attributes or class-list calls.
 * CSS itself is intentionally excluded from consumer counts.
 *
 * @param cfg Quality configuration defining source roots and exclusions.
 *
 * @return Absolute source paths eligible for CSS class-use counting.
 */
function cssConsumerFiles(cfg: QualityCfg): string[] {
	const exts = new Set([...cfg.extensions, '.astro', '.html', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
	return srcFiles({ ...cfg, extensions: [...exts] }).filter((f) => !f.endsWith('.css'));
}

/**
 * Counts literal class-name consumers while avoiding ordinary prose and
 * identifiers that happen to share a CSS class name. The matcher covers HTML/
 * Astro attributes, JSX className expressions, class-list mutations, and the
 * common `cn`/`clsx` helper boundary.
 *
 * @param cfg Quality configuration defining source roots and exclusions.
 * @param name CSS class name to find.
 *
 * @return Number of source-level consumers of the class.
 */
function cssClassUseCount(cfg: QualityCfg, name: string): number {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const token = new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, 'g');
	let count = 0;
	for (const file of cssConsumerFiles(cfg)) {
		const src = readFileSync(file, 'utf8');
		for (const match of src.matchAll(token)) {
			const offset = match.index ?? 0;
			const ctx = src.slice(Math.max(0, offset - 180), offset + name.length);
			if (/\b(?:class|className|bodyClass)\s*=|\bclassList\.(?:add|remove|toggle)\s*\(|\b(?:cn|clsx)\s*\(/.test(ctx)) count += 1;
		}
	}
	return count;
}

/**
 * Resolves CSS files inside configured roots plus the configured canonical
 * stylesheet. The canonical stylesheet is included even when repositories use
 * a TypeScript-only `extensions` list.
 *
 * @param cfg Quality configuration defining source roots and exclusions.
 *
 * @return Sorted absolute CSS paths in scope.
 */
function cssFiles(cfg: QualityCfg): string[] {
	const roots = [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])];
	const discovered = srcFiles({ ...cfg, extensions: ['.css'] });
	const cfgd = cfg.tailwindCanonical?.stylesheet ? [resolve(cfg.root, cfg.tailwindCanonical.stylesheet)] : [];
	return [...new Set([...discovered, ...cfgd].filter((f) => existsSync(f)))].filter((f) => {
		return roots.some((r) => f === r || f.startsWith(`${r}/`)) || cfgd.includes(f);
	});
}

/**
 * Walks stylesheet blocks while preserving whether a selector is nested inside
 * a responsive or conditional at-rule. A class used in those contexts cannot
 * be faithfully represented by one inline style declaration.
 *
 * @param css Comment-masked stylesheet source.
 *
 * @return Selectors and their source offsets, including non-inline contexts.
 */
function cssBlocks(css: string): Array<{ selector: string; offset: number; nonInlineContext: boolean }> {
	const blocks: Array<{ selector: string; offset: number; nonInlineContext: boolean }> = [];
	const ctx: boolean[] = [];
	let segmentStart = 0;
	let quote: string | undefined;
	for (let i = 0; i < css.length; i += 1) {
		const char = css[i];
		if (quote) {
			if (char === '\\') i += 1;
			else if (char === quote) quote = undefined;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}
		if (char === '{') {
			const rawSelector = css.slice(segmentStart, i).trim();
			const selectorOffset = segmentStart + css.slice(segmentStart, i).search(/\S/);
			const parentNonInline = ctx.some(Boolean);
			const atRule = rawSelector.startsWith('@');
			const nonInlineAtRule = /^@(media|supports|container|document|starting-style)\b/i.test(rawSelector);
			if (rawSelector && !atRule && selectorOffset >= segmentStart) blocks.push({ selector: rawSelector, offset: selectorOffset, nonInlineContext: parentNonInline });
			ctx.push(parentNonInline || nonInlineAtRule);
			segmentStart = i + 1;
			continue;
		}
		if (char === '}') {
			ctx.pop();
			segmentStart = i + 1;
			continue;
		}
		if (char === ';' && ctx.length === 0) segmentStart = i + 1;
	}
	return blocks;
}

/**
 * Reports CSS class selectors that have exactly one source-level consumer.
 * These are advisory findings because CSS selectors can include responsive,
 * pseudo-class, descendant, and stateful behavior that should be reviewed
 * before moving declarations to an element's style attribute.
 *
 * @param cfg Quality configuration defining the source roots and stylesheet.
 *
 * @return CSS single-use recommendations with stylesheet locations.
 */
export function cssSingleUseFindings(cfg: QualityCfg): CssSingleUseFinding[] {
	const findings: CssSingleUseFinding[] = [];
	const ignored = new Set(['dark', 'light', 'is-active']);
	for (const file of cssFiles(cfg)) {
		const css = readFileSync(file, 'utf8');
		const masked = maskCssComments(css);
		const seen = new Map<string, { line: number; selectors: Set<string>; unsafe: boolean }>();
		for (const block of cssBlocks(masked)) {
			const { selector, offset: selectorOffset } = block;
			for (const classMatch of selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
				const name = classMatch[1];
				if (!name || ignored.has(name)) continue;
				const existing = seen.get(name);
				if (existing) {
					existing.selectors.add(selector);
					existing.unsafe ||= block.nonInlineContext;
					continue;
				}
				seen.set(name, { line: masked.slice(0, selectorOffset + (classMatch.index ?? 0)).split('\n').length, selectors: new Set([selector]), unsafe: block.nonInlineContext });
			}
		}
		for (const [name, location] of seen) {
			const uses = cssClassUseCount(cfg, name);
			const selector = `.${name}`;
			if (uses !== 1 || location.unsafe || location.selectors.size !== 1 || !location.selectors.has(selector)) continue;
			findings.push({ file: relative(cfg.root, file), line: location.line, name, decision: 'INLINE', reason: 'single-use direct CSS class should be inlined at its consumer', uses, selector });
		}
	}
	return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.name.localeCompare(b.name));
}

/**
 * Finds the source span of an imported named binding that refers to a target symbol.
 *
 * @param reference Consumer reference whose import statement may be edited.
 * @param checker TypeScript type checker used to compare canonical symbols.
 * @param tgt Canonical declaration symbol being inlined.
 *
 * @return Import-binding span to remove, or `null` when the reference is not a named import.
 */
function importEdit(reference: Reference, checker: ts.TypeChecker, tgt: ts.Symbol): { start: number; end: number } | null {
	for (const statement of reference.source.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		const bindings = statement.importClause?.namedBindings;
		if (!bindings || !ts.isNamedImports(bindings)) continue;
		const specifier = bindings.elements.find((e) => canonical(checker, checker.getSymbolAtLocation(e.name)) === tgt);
		if (!specifier) continue;
		if (bindings.elements.length === 1) return { start: statement.getStart(reference.source), end: statement.getEnd() };
		const idx = bindings.elements.indexOf(specifier);
		return idx === 0
			? { start: specifier.getStart(reference.source), end: bindings.elements[1]!.getStart(reference.source) }
			: { start: bindings.elements[idx - 1]!.getEnd(), end: specifier.getEnd() };
	}
	return null;
}

/**
 * Builds the expression that replaces a single-use declaration at its consumer.
 * Function declarations become named function expressions so their parameters,
 * closures, async/generator modifiers, and return behavior remain intact.
 *
 * @param candidate Single-use declaration selected for inlining.
 *
 * @return Source text for the consumer expression, or `null` when the declaration cannot be collapsed.
 */
function inlineReplacement(candidate: Candidate): string | null {
	if (ts.isTypeAliasDeclaration(candidate.statement)) return `(${candidate.statement.type.getText(candidate.source)})`;
	if (ts.isInterfaceDeclaration(candidate.statement)) return `({ ${candidate.statement.members.map((m) => m.getText(candidate.source)).join(' ')} })`;
	if (ts.isFunctionDeclaration(candidate.statement)) {
		if (!candidate.statement.body) return null;
		const src = candidate.statement
			.getText(candidate.source)
			.replace(/^export\s+default\s+/, '')
			.replace(/^export\s+/, '')
			.replace(/^declare\s+/, '');
		return `(${src})`;
	}
	if (ts.isVariableStatement(candidate.statement)) {
		const init = candidate.statement.declarationList.declarations[0]?.initializer;
		return init ? `(${init.getText(candidate.source)})` : null;
	}
	return null;
}

/**
 * Returns the edit span for a reference, expanding shorthand object properties
 * so that an inlined expression remains valid JavaScript/TypeScript syntax.
 *
 * @param reference Single consumer reference.
 * @param replacement Replacement expression.
 *
 * @return Source edit for the consumer reference.
 */
function jsxInlineCall(reference: Reference, replacement: string): { start: number; end: number; text: string } | null {
	const opening = reference.node.parent;
	if (!ts.isJsxOpeningElement(opening) && !ts.isJsxSelfClosingElement(opening)) return null;
	if (opening.tagName !== reference.node) return null;
	const selfClosing = ts.isJsxSelfClosingElement(opening);
	const element = selfClosing ? opening : ts.isJsxElement(opening.parent) ? opening.parent : null;
	if (!element) return null;
	const propertyName = (attr: ts.JsxAttribute): string => JSON.stringify(attr.name.getText(reference.source));
	const attrs = opening.attributes.properties.map((a) => {
		if (ts.isJsxSpreadAttribute(a)) return `...${a.expression.getText(reference.source)}`;
		if (!a.initializer) return `${propertyName(a)}: true`;
		if (ts.isStringLiteral(a.initializer)) return `${propertyName(a)}: ${JSON.stringify(a.initializer.text)}`;
		if (ts.isJsxExpression(a.initializer)) return `${propertyName(a)}: ${a.initializer.expression?.getText(reference.source) ?? 'undefined'}`;
		return `${propertyName(a)}: ${a.initializer.getText(reference.source)}`;
	});
	if (!selfClosing && ts.isJsxElement(element) && element.children.length) {
		attrs.push(`children: <>${element.children.map((c) => c.getText(reference.source)).join('')}</>`);
	}
	const call = `React.createElement(${replacement} as React.ElementType, { ${attrs.join(', ')} } as Record<string, unknown>)`;
	const text = ts.isJsxElement(element.parent) || ts.isJsxFragment(element.parent) ? `{${call}}` : call;
	return { start: element.getStart(reference.source), end: element.getEnd(), text };
}

function referenceEdit(reference: Reference, replacement: string): { start: number; end: number; text: string } {
	const jsxEdit = jsxInlineCall(reference, replacement);
	if (jsxEdit) return jsxEdit;
	const parent = reference.node.parent;
	if (ts.isShorthandPropertyAssignment(parent)) {
		return { start: parent.getStart(reference.source), end: parent.getEnd(), text: `${reference.node.getText(reference.source)}: ${replacement}` };
	}
	return { start: reference.node.getStart(reference.source), end: reference.node.getEnd(), text: replacement };
}

/**
 * Inlines every single-use declaration that has an expression or function body.
 *
 * @param cfg Quality configuration defining the source scope and files to rewrite.
 *
 * @return Number of files containing edits, including declaration and consumer files.
 */
export function fixSingleUseDeclarations(cfg: QualityCfg): number {
	const program = programFor(cfg);
	const checker = program.getTypeChecker();
	const { candidates, references: refs } = collect(cfg, program, checker);
	const edits = new Map<string, { start: number; end: number; text: string }[]>();
	const pending: Array<{ refFile: string; reference: { start: number; end: number; text: string }; edits: { file: string; start: number; end: number; text: string }[] }> = [];
	for (const c of candidates) {
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeUses(cfg, c, program) : (refs.get(c.symbol) ?? []).filter((r) => !isImportNode(r.node));
		if (uses.length !== 1) continue;
		const ref = uses[0]!;
		const replacement = inlineReplacement(c);
		if (!replacement) continue;
		const reference = referenceEdit(ref, replacement);
		const candidateEdits = [{ file: ref.file, ...reference }];
		const removedImport = importEdit(ref, checker, c.symbol);
		if (removedImport) candidateEdits.push({ file: ref.file, ...removedImport, text: '' });
		candidateEdits.push({ file: c.file, start: c.statement.getFullStart(), end: c.statement.getEnd(), text: '' });
		pending.push({ refFile: ref.file, reference, edits: candidateEdits });
	}
	const selected: typeof pending = [];
	for (const candidate of [...pending].sort((l, r) => {
		const leftSize = l.reference.end - l.reference.start;
		const rightSize = r.reference.end - r.reference.start;
		return leftSize - rightSize || l.reference.start - r.reference.start;
	})) {
		const overlaps = selected.some((e) => candidate.edits.some((c) => e.edits.some((e) => e.file === c.file && c.start < e.end && e.start < c.end)));
		if (!overlaps) selected.push(candidate);
	}
	for (const candidate of selected) {
		for (const edit of candidate.edits) edits.set(edit.file, [...(edits.get(edit.file) ?? []), { start: edit.start, end: edit.end, text: edit.text }]);
	}
	for (const [file, fileEdits] of edits) {
		const src = readFileSync(file, 'utf8');
		const ascending = [...fileEdits].sort((a, b) => a.start - b.start);
		if (ascending.some((e, i) => i > 0 && e.start < ascending[i - 1]!.end)) continue;
		const updated = ascending.reverse().reduce((t, e) => t.slice(0, e.start) + e.text + t.slice(e.end), src);
		if (updated !== src) writeFileSync(file, updated);
	}
	return edits.size;
}

/**
 * Backwards-compatible name for callers that previously fixed only type declarations.
 *
 * @param cfg Quality configuration defining the source scope and files to rewrite.
 *
 * @return Number of files containing edits.
 */

/**
 * Writes JSON and Markdown inventories of current single-use recommendations.
 *
 * @param cfg Quality configuration whose root receives the generated quality reports.
 *
 * @return The findings written to both report formats.
 */
export function writeSingleUseReport(cfg: QualityCfg): SingleUseReportFinding[] {
	const findings: SingleUseReportFinding[] = [...singleUseFindings(cfg), ...cssSingleUseFindings(cfg)];
	const docs = join(cfg.root, 'docs', 'quality');
	mkdirSync(docs, { recursive: true });
	const genAt = new Date().toISOString();
	writeFileSync(join(docs, 'single-use-declarations.json'), `${JSON.stringify({ generatedAt: genAt, scope: cfg.sourceRoots, findings }, null, 2)}\n`);
	const groups = (['INLINE', 'KEEP', 'REVIEW'] as const).map((d) => ({ decision: d, entries: findings.filter((f) => f.decision === d) }));
	writeFileSync(
		join(docs, 'single-use-declarations.md'),
		`# Single-use declaration recommendations\n\nGenerated ${genAt.slice(0, 10)}.\n\n${groups.map(({ decision: d, entries: e }) => `## ${d} (${e.length})\n\n${e.length ? e.map((e) => `- \`${e.file}:${e.line}\` **${e.name}** — ${e.reason}`).join('\n') : '_None._'}`).join('\n\n')}\n`,
	);
	return findings;
}
