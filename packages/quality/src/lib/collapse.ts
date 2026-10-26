/**
 * packages/quality/src/lib/collapse.ts
 * Collapses multi-line string literals into single-line ones.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { extname } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const SUPPORTED = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Selects the TypeScript parser mode matching a JavaScript or TypeScript filename.
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
 * Finds the body span of an object, type literal, mapped type, or interface that can be collapsed safely.
 *
 * @param n AST node being considered for whitespace collapsing.
 * @param src Original source text used to locate interface braces.
 *
 * @return Collapsible source span, or `undefined` when the node is unsupported or contains JSX.
 */
function candidateSpan(n: ts.Node, src: string): { start: number; end: number } | undefined {
	if (ts.isObjectLiteralExpression(n)) {
		let containsJsx = false;
		const findJsx = (c: ts.Node): void => {
			if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c) || ts.isJsxFragment(c)) {
				containsJsx = true;
				return;
			}
			ts.forEachChild(c, findJsx);
		};
		ts.forEachChild(n, findJsx);
		if (containsJsx) return undefined;
		return { start: n.getStart(), end: n.end };
	}
	if (ts.isTypeLiteralNode(n) || ts.isMappedTypeNode(n)) return { start: n.getStart(), end: n.end };
	if (ts.isInterfaceDeclaration(n)) {
		const start = src.indexOf('{', n.name.end);
		const end = src.lastIndexOf('}', n.end - 1);
		if (start >= 0 && end >= start) return { start, end: end + 1 };
	}
	return undefined;
}

/*//////////////////////////////////////////////////
EXPORTS
//////////////////////////////////////////////////*/

/**
 * Collapses whitespace inside object and type bodies so Prettier alone decides whether they exceed print width.
 *
 * @param fileName Absolute path to the source file to rewrite.
 *
 * @return `true` when an eligible object or type body was collapsed; otherwise `false`.
 */
export function collapseTypesAndObjects(fileName: string): boolean {
	// ENVIRONMENT
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, scriptKind(fileName));
	const edits: { start: number; end: number; text: string }[] = [];

	// HELPERS
	const collapse = (n: ts.Node, start: number, text: string): string | undefined => {
		if (!/[\r\n]/.test(text)) return undefined;
		const protectedRanges: { start: number; end: number }[] = [];
		const protectLiterals = (c: ts.Node): void => {
			if (
				ts.isStringLiteral(c) ||
				ts.isRegularExpressionLiteral(c) ||
				ts.isNoSubstitutionTemplateLiteral(c) ||
				ts.isTemplateHead(c) ||
				ts.isTemplateMiddle(c) ||
				ts.isTemplateTail(c) ||
				ts.isJsxText(c)
			) {
				protectedRanges.push({ start: c.getStart(parsed) - start, end: c.end - start });
				return;
			}
			ts.forEachChild(c, protectLiterals);
		};
		protectLiterals(n);
		const isProtected = (pos: number): boolean => protectedRanges.some((r) => pos >= r.start && pos < r.end);
		const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, parsed.languageVariant, text);
		let result = '';
		let whitespace = false;
		for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
			const tokenStart = scanner.getTokenPos();
			if ((token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) && !isProtected(tokenStart)) return undefined;
			if (token === ts.SyntaxKind.WhitespaceTrivia || token === ts.SyntaxKind.NewLineTrivia) {
				if (isProtected(tokenStart)) {
					if (whitespace && result && !result.endsWith(' ')) result += ' ';
					result += scanner.getTokenText();
					whitespace = false;
					continue;
				}
				whitespace = true;
				continue;
			}
			if (whitespace && result && !result.endsWith(' ')) result += ' ';
			result += scanner.getTokenText();
			whitespace = false;
		}
		return result;
	};

	// ANALYSE
	const visit = (n: ts.Node): void => {
		const span = candidateSpan(n, original);
		if (span) {
			const text = collapse(n, span.start, original.slice(span.start, span.end));
			if (text !== undefined) {
				edits.push({ ...span, text });
				return;
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(parsed);
	if (!edits.length) return false;
	const n = edits.sort((a, b) => b.start - a.start).reduce((t, e) => `${t.slice(0, e.start)}${e.text}${t.slice(e.end)}`, original);
	if (n === original) return false;
	writeFileSync(fileName, n);
	return true;
}
