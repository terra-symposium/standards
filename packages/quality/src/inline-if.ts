/**
 * packages/quality/src/inline-if.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API

import { readFileSync, writeFileSync } from 'node:fs';

/** Collapses single-statement conditional blocks without changing nested blocks. */
export function collapseInlineIfs(fileName: string): boolean {
	const src = readFileSync(fileName, 'utf8');
	const next = src.replace(/(^[ \t]*)(if\s*\([^\n{}]+\))\s*\{\s*([^{}\n]+?)\s*\}(?=\s*(?:else|\n|$))/gm, (match, indent: string, condition: string, statement: string) =>
		statement.includes('/*') || statement.includes('//') ? match : `${indent}${condition} ${statement}`,
	);
	if (next === src) return false;
	writeFileSync(fileName, next);
	return true;
}
