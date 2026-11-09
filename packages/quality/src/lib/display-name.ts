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
 * Selects the TypeScript parser mode that matches a source filename.
 *
 * @param fileName Source filename whose extension determines the parser mode.
 *
 * @return TypeScript compiler script kind for the filename.
 */
function scriptKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
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
	const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, analysis?.texts.get(file) ?? readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, scriptKind(file));
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
				const init = declaration.initializer;
				if (!ts.isIdentifier(declaration.name) || !init || !ts.isCallExpression(init) || init.questionDotToken) continue;
				const callee = init.expression;
				if (
					!(ts.isIdentifier(callee)
						? callee.text === 'forwardRef'
						: ts.isPropertyAccessExpression(callee) && !callee.questionDotToken && ts.isIdentifier(callee.expression) && callee.expression.text === 'React' && callee.name.text === 'forwardRef')
				)
					continue;
				const list = declaration.parent;
				const blockScoped = (list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
				const candidate: Candidate = { name: declaration.name.text, declaration, statement: node, scope: declaration.getSourceFile(), assignment: 'missing' };
				for (let current: ts.Node | undefined = list.parent; current; current = current.parent) {
					if (!(
						ts.isSourceFile(current) ||
						ts.isBlock(current) ||
						ts.isModuleBlock(current) ||
						ts.isCaseBlock(current) ||
						ts.isForStatement(current) ||
						ts.isForInStatement(current) ||
						ts.isForOfStatement(current) ||
						ts.isCatchClause(current) ||
						ts.isFunctionLike(current)
					))
						continue;
					if (ts.isSourceFile(current) || (blockScoped && !ts.isFunctionLike(current)) || (!blockScoped && ts.isFunctionLike(current))) {
						candidate.scope = current;
						break;
					}
				}
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
			const name =
				ts.isPropertyAccessExpression(node.left) && !node.left.questionDotToken && node.left.name.text === 'displayName' && ts.isIdentifier(node.left.expression)
					? node.left.expression.text
					: ts.isElementAccessExpression(node.left) &&
						  ts.isIdentifier(node.left.expression) &&
						  node.left.argumentExpression &&
						  ts.isStringLiteralLike(node.left.argumentExpression) &&
						  node.left.argumentExpression.text === 'displayName'
						? node.left.expression.text
						: undefined;
			const candidates = name ? byName.get(name) : undefined;
			if (name && candidates) {
				for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
					if (!(
						ts.isSourceFile(current) ||
						ts.isBlock(current) ||
						ts.isModuleBlock(current) ||
						ts.isCaseBlock(current) ||
						ts.isForStatement(current) ||
						ts.isForInStatement(current) ||
						ts.isForOfStatement(current) ||
						ts.isCatchClause(current) ||
						ts.isFunctionLike(current)
					))
						continue;
					const targets = candidates.filter((candidate) => candidate.scope === current);
					if (!targets.length) continue;
					const exact = node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isStringLiteralLike(node.right) && node.right.text === name;
					for (const target of targets) {
						if (target.assignment === 'missing' || !exact) target.assignment = exact ? 'matching' : 'conflicting';
					}
					break;
				}
			}
		}
		ts.forEachChild(node, inspectAssignments);
	};
	inspectAssignments(parsed);
	return candidates;
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
	return (analysis?.files ?? srcFiles(cfg)).flatMap((file) =>
		candidatesForFile(file, analysis).flatMap((candidate) => {
			if (candidate.assignment === 'matching') return [];
			const source = candidate.declaration.getSourceFile();
			const pos = source.getLineAndCharacterOfPosition(candidate.declaration.name.getStart(source));
			return [
				{
					file: displayPath(cfg, file),
					line: pos.line + 1,
					column: pos.character + 1,
					component: candidate.name,
					recommendation: candidate.assignment === 'conflicting' ? `review existing ${candidate.name}.displayName assignment` : `add ${candidate.name}.displayName = '${candidate.name}'`,
				},
			];
		}),
	);
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
		const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, scriptKind(file));
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
			const indent = src.slice(src.lastIndexOf('\n', start - 1) + 1, start);
			const lineEnd = src.indexOf('\n', statement.end);
			const insertAt = lineEnd < 0 ? src.length : lineEnd > 0 && src[lineEnd - 1] === '\r' ? lineEnd - 1 : lineEnd;
			if (!S_REGEX.test(indent) || !S_REGEX.test(src.slice(statement.end, insertAt))) {
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
			updated = `${updated.slice(0, at)}${lineBreak}${edit.names.map((name) => `${edit.indent}${name}.displayName = '${name}';`).join(lineBreak)}${updated.slice(at)}`;
			fixed += edit.names.length;
		}
		if ((ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, scriptKind(file)) as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) {
			skipped += [...edits.values()].reduce((count, edit) => count + edit.names.length, 0);
			continue;
		}
		writeFileSync(file, updated);
	}
	return { fixed, skipped };
}
