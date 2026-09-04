/**
 * packages/quality/src/inline-if.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { readFileSync, writeFileSync } from 'node:fs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Collapses single-statement conditional blocks without changing nested blocks.
 *
 * @param fileName
 *
 * @return
 */
export function collapseInlineIfs(fileName: string): boolean {
	const src = readFileSync(fileName, 'utf8');
	const n = src.replace(/(^[ \t]*)(if\s*\([^\n{}]+\))\s*\{\s*([^{}\n]+?)\s*\}(?=\s*(?:else|\n|$))/gm, (match, indent: string, condition: string, statement: string) =>
		statement.includes('/*') || statement.includes('//') ? match : `${indent}${condition} ${statement}`,
	);
	if (n === src) return false;
	writeFileSync(fileName, n);
	return true;
}
