/**
 * packages/quality/src/inline-if.ts
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
	const visit = (node: ts.Node): void => {
		if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement) && node.thenStatement.statements.length === 1) {
			const statement = node.thenStatement.statements[0]!;
			const safeStatement = ts.isExpressionStatement(statement) || ts.isReturnStatement(statement) || ts.isThrowStatement(statement) || ts.isBreakStatement(statement) || ts.isContinueStatement(statement);
			const danglingElse = Boolean(node.elseStatement && ts.isIfStatement(statement) && !statement.elseStatement);
			const body = src.slice(node.thenStatement.getStart(parsed) + 1, node.thenStatement.end - 1);
			if (safeStatement && !danglingElse && !body.includes('//') && !body.includes('/*')) {
				edits.push({ start: node.thenStatement.getStart(parsed), end: statement.getStart(parsed), text: '' });
				edits.push({ start: statement.end, end: node.thenStatement.end, text: '' });
			}
		}
		// Nested conditionals are deliberately retained. Removing their braces can
		// change which conditional owns a following else even when the result parses.
		if (!ts.isIfStatement(node)) ts.forEachChild(node, visit);
	};
	visit(parsed);
	const n = edits.sort((a, b) => b.start - a.start).reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, src);
	if (n === src) return false;
	writeFileSync(fileName, n);
	return true;
}
