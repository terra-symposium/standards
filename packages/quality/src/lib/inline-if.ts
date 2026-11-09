/**
 * packages/quality/src/lib/inline-if.ts
 * Inlines single-statement conditional blocks without changing nested blocks.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Collapses single-statement conditional blocks without changing nested blocks.
 *
 * @param fileName Absolute path to the source file to rewrite.
 *
 * @return `true` when at least one eligible conditional was collapsed.
 */
export function collapseInlineIfs(fileName: string): boolean {
	const src = readFileSync(fileName, 'utf8');
	const parsed = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
	const edits: { start: number; end: number; text: string }[] = [];
	const nodes: ts.Node[] = [parsed];
	while (nodes.length) {
		const node = nodes.pop()!;
		if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement) && node.thenStatement.statements.length === 1) {
			const statement = node.thenStatement.statements[0]!;
			const body = src.slice(node.thenStatement.getStart(parsed) + 1, node.thenStatement.end - 1);
			if (
				Boolean(
					statement.kind === ts.SyntaxKind.ExpressionStatement ||
					statement.kind === ts.SyntaxKind.ReturnStatement ||
					statement.kind === ts.SyntaxKind.ThrowStatement ||
					statement.kind === ts.SyntaxKind.BreakStatement ||
					statement.kind === ts.SyntaxKind.ContinueStatement,
				) &&
				!(node.elseStatement && statement.kind === ts.SyntaxKind.IfStatement && !(statement as ts.IfStatement).elseStatement) &&
				!body.includes('//') &&
				!body.includes('/*')
			) {
				edits.push({ start: node.thenStatement.getStart(parsed), end: statement.getStart(parsed), text: '' });
				edits.push({ start: statement.end, end: node.thenStatement.end, text: '' });
			}
		}
		// Nested conditionals are deliberately retained. Removing their braces can
		// change which conditional owns a following else even when the result parses.
		if (!ts.isIfStatement(node)) ts.forEachChild(node, (child) => void nodes.push(child));
	}
	const n = edits.sort((a, b) => b.start - a.start).reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, src);
	if (n === src) return false;
	writeFileSync(fileName, n);
	return true;
}
