/**
 * packages/quality/src/lib/source-kind.ts
 * Selects TypeScript parser modes for JavaScript and TypeScript files.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Selects the TypeScript parser mode matching a source filename.
 *
 * @param fileName Source filename whose extension determines the parser mode.
 *
 * @return TypeScript compiler script kind for the filename.
 */
export function sourceKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}
