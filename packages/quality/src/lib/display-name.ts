/**
 * packages/quality/src/lib/display-name.ts
 * Finds and safely adds missing React forwardRef display names.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { sourceKind } from './source-kind.js';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const S_REGEX = /^\s*$/;

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/** A forwardRef component declaration without an explicit displayName assignment. */
export type DisplayNameFinding = { file: string; line: number; column: number; component: string; recommendation: string };

/** A candidate declaration and its owning variable statement. */
type Candidate = { name: string; declaration: ts.VariableDeclaration; statement: ts.VariableStatement; scope: ts.Node; assignment: 'missing' | 'matching' | 'conflicting' };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Checks for a direct React forwardRef call without unwrapping casts or other wrappers.
 *
 * @param init Variable initializer to inspect.
 *
 * @return `true` when the initializer is `forwardRef(...)` or `React.forwardRef(...)`.
 */
function isForwardRef(init: ts.Expression | undefined): init is ts.CallExpression {
	if (!init || !ts.isCallExpression(init) || init.questionDotToken) return false;
	const callee = init.expression;
	if (ts.isIdentifier(callee)) return callee.text === 'forwardRef';
	return ts.isPropertyAccessExpression(callee) && !callee.questionDotToken && ts.isIdentifier(callee.expression) && callee.expression.text === 'React' && callee.name.text === 'forwardRef';
}

/**
 * Returns the component name targeted by a displayName assignment expression.
 *
 * @param left Assignment target to inspect.
 *
 * @return Component identifier when the target is its displayName property.
 */
function assignedComponent(left: ts.Expression): string | undefined {
	if (ts.isPropertyAccessExpression(left) && !left.questionDotToken && left.name.text === 'displayName' && ts.isIdentifier(left.expression)) return left.expression.text;
	if (
		ts.isElementAccessExpression(left) &&
		ts.isIdentifier(left.expression) &&
		left.argumentExpression &&
		ts.isStringLiteralLike(left.argumentExpression) &&
		left.argumentExpression.text === 'displayName'
	)
		return left.expression.text;
	return undefined;
}

/**
 * Returns whether a node introduces a lexical or function-scoped binding boundary.
 *
 * @param node
 *
 * @return
 */
function isBindingScope(node: ts.Node): boolean {
	return (
		ts.isSourceFile(node) ||
		ts.isBlock(node) ||
		ts.isModuleBlock(node) ||
		ts.isCaseBlock(node) ||
		ts.isForStatement(node) ||
		ts.isForInStatement(node) ||
		ts.isForOfStatement(node) ||
		ts.isCatchClause(node) ||
		ts.isFunctionLike(node)
	);
}

/**
 * Finds the scope that owns a variable declaration, accounting for `var` hoisting.
 *
 * @param declaration
 *
 * @return
 */
function declarationScope(declaration: ts.VariableDeclaration): ts.Node {
	const list = declaration.parent;
	const blockScoped = (list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
	for (let current: ts.Node | undefined = list.parent; current; current = current.parent) {
		if (!isBindingScope(current)) continue;
		if (ts.isSourceFile(current)) return current;
		if (blockScoped && !ts.isFunctionLike(current)) return current;
		if (!blockScoped && ts.isFunctionLike(current)) return current;
	}
	return declaration.getSourceFile();
}

/**
 * Resolves a component property assignment to the nearest same-named candidate binding.
 *
 * @param node
 * @param name
 * @param byName
 *
 * @return
 */
function candidatesForAssignment(node: ts.Node, name: string, byName: Map<string, Candidate[]>): Candidate[] {
	const candidates = byName.get(name);
	if (!candidates) return [];
	for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
		if (!isBindingScope(current)) continue;
		const matches = candidates.filter((candidate) => candidate.scope === current);
		if (matches.length) return matches;
	}
	return [];
}

/**
 * Collects direct forwardRef variable declarations and classifies explicit displayName writes.
 *
 * @param file Absolute source filename to inspect.
 * @param analysis Optional shared parse context that avoids repeated reads and AST construction.
 * @param cfg Quality configuration used to render diagnostic paths.
 *
 * @return Eligible named declarations, including whether an existing assignment is matching or conflicting.
 */
function candidatesForFile(file: string, analysis?: QualityAnalysis): Candidate[] {
	const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
	const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, sourceKind(file));
	if ((parsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) return [];
	const candidates: Candidate[] = [];
	const byName = new Map<string, Candidate[]>();
	/**
	 *
	 * @param node
	 */
	const collect = (node: ts.Node): void => {
		if (ts.isVariableStatement(node)) {
			for (const declaration of node.declarationList.declarations) {
				if (!ts.isIdentifier(declaration.name) || !isForwardRef(declaration.initializer)) continue;
				const candidate: Candidate = { name: declaration.name.text, declaration, statement: node, scope: declarationScope(declaration), assignment: 'missing' };
				candidates.push(candidate);
				byName.set(candidate.name, [...(byName.get(candidate.name) ?? []), candidate]);
			}
		}
		ts.forEachChild(node, collect);
	};
	collect(parsed);
	/**
	 *
	 * @param node
	 */
	const inspectAssignments = (node: ts.Node): void => {
		if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
			const name = assignedComponent(node.left);
			const targets = name ? candidatesForAssignment(node, name, byName) : undefined;
			if (targets) {
				const exact = node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isStringLiteralLike(node.right) && node.right.text === name;
				for (const target of targets) {
					if (target.assignment === 'missing' || !exact) target.assignment = exact ? 'matching' : 'conflicting';
				}
			}
		}
		ts.forEachChild(node, inspectAssignments);
	};
	inspectAssignments(parsed);
	return candidates;
}

/**
 * Finds missing or conflicting displayName assignments in one file.
 *
 * @param cfg Quality configuration used to render diagnostic paths.
 * @param file Absolute filename to inspect.
 * @param analysis Optional shared analysis context.
 *
 * @return Findings for declarations without an exact conventional displayName assignment.
 */
function findingsForFile(cfg: QualityCfg, file: string, analysis?: QualityAnalysis): DisplayNameFinding[] {
	const findings: DisplayNameFinding[] = [];
	for (const candidate of candidatesForFile(file, analysis)) {
		if (candidate.assignment === 'matching') continue;
		const source = candidate.declaration.getSourceFile();
		const pos = source.getLineAndCharacterOfPosition(candidate.declaration.name.getStart(source));
		findings.push({
			file: displayPath(cfg, file),
			line: pos.line + 1,
			column: pos.character + 1,
			component: candidate.name,
			recommendation: candidate.assignment === 'conflicting' ? `review existing ${candidate.name}.displayName assignment` : `add ${candidate.name}.displayName = '${candidate.name}'`,
		});
	}
	return findings;
}

/**
 * Finds named variable declarations assigned direct forwardRef calls without the conventional displayName.
 *
 * The check is syntactic and intentionally skips wrapped initializers, destructuring declarations, and
 * assignments that it cannot confidently classify. Existing nonstandard displayName writes are reported
 * for review but are never overwritten by the fixer.
 *
 * @param cfg Quality configuration controlling the source scope.
 * @param analysis Optional shared analysis context for avoiding repeated reads and AST construction.
 *
 * @return Missing or conflicting displayName recommendations.
 */
export function displayNameFindings(cfg: QualityCfg, analysis?: QualityAnalysis): DisplayNameFinding[] {
	return (analysis?.files ?? srcFiles(cfg)).flatMap((file) => findingsForFile(cfg, file, analysis));
}

/**
 * Adds conventional displayName assignments where the source layout is unambiguous.
 *
 * An explicit assignment is never replaced. Declarations with trailing code or comments on the same line
 * are left for manual editing so comments and statement boundaries cannot be changed accidentally.
 *
 * @param cfg Quality configuration defining the source scope.
 * @param analysis Optional shared analysis context used when available.
 *
 * @return Counts of assignments inserted and declarations skipped as conflicting or unsafe to edit.
 */
export function fixDisplayNames(cfg: QualityCfg, analysis?: QualityAnalysis): { fixed: number; skipped: number } {
	let fixed = 0;
	let skipped = 0;
	for (const file of analysis?.files ?? srcFiles(cfg)) {
		if (!/\.(?:c|m)?(?:js|jsx|ts|tsx)$/.test(file)) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, sourceKind(file));
		if ((parsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) continue;
		const edits = new Map<number, { indent: string; names: string[] }>();
		for (const candidate of candidatesForFile(file, analysis)) {
			if (candidate.assignment === 'matching') continue;
			if (candidate.assignment === 'conflicting') {
				skipped++;
				continue;
			}
			const statement = candidate.statement;
			const start = statement.getStart(parsed);
			const lineStart = src.lastIndexOf('\n', start - 1) + 1;
			const indent = src.slice(lineStart, start);
			const lineEnd = src.indexOf('\n', statement.end);
			const insertAt = lineEnd < 0 ? src.length : lineEnd > 0 && src[lineEnd - 1] === '\r' ? lineEnd - 1 : lineEnd;
			const tail = src.slice(statement.end, insertAt);
			if (!S_REGEX.test(indent) || !S_REGEX.test(tail)) {
				skipped++;
				continue;
			}
			const edit: { indent: string; names: string[] } = edits.get(insertAt) ?? { indent, names: [] };
			if (!edit.names.includes(candidate.name)) edit.names.push(candidate.name);
			edits.set(insertAt, edit);
		}
		if (!edits.size) continue;
		let updated = src;
		const lineBreak = src.includes('\r\n') ? '\r\n' : '\n';
		for (const [at, edit] of [...edits.entries()].sort((a, b) => b[0] - a[0])) {
			const lines = edit.names.map((name) => `${edit.indent}${name}.displayName = '${name}';`).join(lineBreak);
			updated = `${updated.slice(0, at)}${lineBreak}${lines}${updated.slice(at)}`;
			fixed += edit.names.length;
		}
		const valid = ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, sourceKind(file));
		if ((valid as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) {
			skipped += [...edits.values()].reduce((count, edit) => count + edit.names.length, 0);
			continue;
		}
		writeFileSync(file, updated);
	}
	return { fixed, skipped };
}
