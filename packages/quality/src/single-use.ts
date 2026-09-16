/**
 * packages/quality/src/single-use.ts
 * AST inventory and safe autofix for single-consumer declarations (types, and helpers).
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { join, relative } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { srcFiles } from './files.js';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const C_M_JS_JSX_TS_TSX_REGEX = /\.(?:c|m)?(?:js|jsx|ts|tsx)$/;
export type SingleUseFinding = { file: string; line: number; name: string; decision: 'INLINE' | 'KEEP' | 'REVIEW'; reason: string };
type Candidate = { file: string; source: ts.SourceFile; statement: ts.Statement; name: ts.Identifier; symbol: ts.Symbol; kind: 'type' | 'interface' | 'variable' | 'function' };
type Reference = { file: string; source: ts.SourceFile; node: ts.Identifier };
const isExported = (s: ts.Statement): boolean => ts.canHaveModifiers(s) && ts.getModifiers(s)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true;
const canonical = (c: ts.TypeChecker, s: ts.Symbol | undefined): ts.Symbol | undefined => (s && s.flags & ts.SymbolFlags.Alias ? c.getAliasedSymbol(s) : s);
const isCandidateStatement = (s: ts.Statement): boolean =>
	ts.isTypeAliasDeclaration(s) ||
	ts.isInterfaceDeclaration(s) ||
	ts.isFunctionDeclaration(s) ||
	(ts.isVariableStatement(s) && s.declarationList.declarations.length === 1 && ts.isIdentifier(s.declarationList.declarations[0]?.name));

const unwrapInit = (expr: ts.Expression): ts.Expression => {
	let curr = expr;
	while (
		ts.isAsExpression(curr) ||
		ts.isTypeAssertionExpression(curr) ||
		ts.isParenthesizedExpression(curr) ||
		ts.isSatisfiesExpression(curr)
	)
		curr = curr.expression;
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
		if (!inScope(source.fileName) || !C_M_JS_JSX_TS_TSX_REGEX.test(source.fileName)) continue;
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
		if (!inScope(src.fileName) || !C_M_JS_JSX_TS_TSX_REGEX.test(src.fileName)) continue;
		const visit = (node: ts.Node): void => {
			if (ts.isIdentifier(node)) {
				let importUse = false;
				for (let parent: ts.Node | undefined = node.parent; parent && !ts.isSourceFile(parent); parent = parent.parent) {
					if (ts.isImportDeclaration(parent)) {
						importUse = true;
						break;
					}
				}
				const shorthandSymbol = ts.isShorthandPropertyAssignment(node.parent) ? checker.getShorthandAssignmentValueSymbol(node.parent) : undefined;
				const symbol = canonical(checker, shorthandSymbol ?? checker.getSymbolAtLocation(node));
				if (!importUse && symbol && candidateSymbols.has(symbol)) {
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
	if (isExported(candidate.statement)) return ['KEEP', 'exported declaration/public contract'];
	if (candidate.kind === 'function') return ['KEEP', 'callable or rendering boundary'];
	const declaration = ts.isVariableStatement(candidate.statement) ? candidate.statement.declarationList.declarations[0]! : undefined;
	if (!declaration) return ['REVIEW', 'declaration has no inlineable initializer'];
	if (!declaration.initializer) return ['REVIEW', 'declaration has no inlineable initializer'];
	const init = unwrapInit(declaration.initializer);
	if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return ['KEEP', 'callable or rendering boundary'];
	if (ts.isAwaitExpression(init) || ts.isCallExpression(init) || ts.isNewExpression(init)) return ['KEEP', 'runtime/workflow boundary'];
	if (
		ts.isObjectLiteralExpression(init) ||
		ts.isArrayLiteralExpression(init) ||
		ts.isStringLiteral(init) ||
		ts.isNumericLiteral(init) ||
		[ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(init.kind)
	)
		return ['INLINE', 'pure single-use data'];
	if (declaration.initializer.getText(candidate.source).length > 800) return ['REVIEW', 'large declaration; preserve readability'];
	return ['REVIEW', 'single-use expression requires semantic review'];
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
 * Inlines single-use type aliases, interfaces, and pure data declarations.
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
	for (const c of candidates) {
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeUses(cfg, c, program) : (refs.get(c.symbol) ?? []).filter((r) => !isImportNode(r.node));
		if (uses.length !== 1) continue;
		const canInlineData =
			c.kind === 'variable' &&
			classify(c)[0] === 'INLINE' &&
			ts.isVariableStatement(c.statement) &&
			c.statement.declarationList.flags & ts.NodeFlags.Const &&
			c.statement.declarationList.declarations[0]?.type === undefined;
		if ((c.kind !== 'type' && c.kind !== 'interface' && !canInlineData) || uses.length !== 1) continue;
		const ref = uses[0]!;
		const replacement = ts.isTypeAliasDeclaration(c.statement)
			? c.statement.type.getText(c.source)
			: ts.isInterfaceDeclaration(c.statement)
				? `{ ${c.statement.members.map((m) => m.getText(c.source)).join(' ')} }`
				: ts.isVariableStatement(c.statement)
					? c.statement.declarationList.declarations[0]!.initializer?.getText(c.source) ?? ''
					: '';
		if (!replacement) continue;
		const inlineReplacement = c.kind === 'variable' ? `(${replacement})` : replacement;
		const tgtEdits = edits.get(ref.file) ?? [];
		tgtEdits.push({ start: ref.node.getStart(ref.source), end: ref.node.getEnd(), text: inlineReplacement });
		if (c.kind === 'type' || c.kind === 'interface') {
			const removedImport = importEdit(ref, checker, c.symbol);
			if (removedImport) tgtEdits.push({ ...removedImport, text: '' });
		}
		edits.set(ref.file, tgtEdits);
		edits.set(c.file, [...(edits.get(c.file) ?? []), { start: c.statement.getStart(c.source), end: c.statement.getEnd(), text: '' }]);
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
export function writeSingleUseReport(cfg: QualityCfg): SingleUseFinding[] {
	const findings = singleUseFindings(cfg);
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
