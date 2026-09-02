import { readFileSync, writeFileSync } from 'node:fs';

/** Collapses single-statement conditional blocks without changing nested blocks. */
export function collapseInlineIfs(fileName: string): boolean {
	const source = readFileSync(fileName, 'utf8');
	const next = source.replace(/(^[ \t]*)(if\s*\([^\n{}]+\))\s*\{\s*([^{}\n]+?)\s*\}(?=\s*(?:else|\n|$))/gm, '$1$2 $3');
	if (next === source) return false;
	writeFileSync(fileName, next);
	return true;
}
