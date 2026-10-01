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
	const n = src.replace(/(^[ \t]*)(if\s*\([^\n{}]+\))\s*\{\s*([^{}\n]+?)\s*\}(?=\s*(?:else|\n|$))/gm, (m, i: string, c: string, s: string) => {
		if (s.includes('/*') || s.includes('//')) return m;
		const parsed = ts.createSourceFile(`${fileName}.inline.ts`, `${c} ${s}`, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
		const candidate = parsed.statements[0];
		return parsed.statements.length !== 1 || !candidate || !ts.isIfStatement(candidate) || ts.isBlock(candidate.thenStatement) ? m : `${i}${c} ${s}`;
	});
	if (n === src) return false;
	writeFileSync(fileName, n);
	return true;
}
