/**
 * packages/quality/src/collapse.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import ts from 'typescript';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const SUPPORTED = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param fileName
 *
 * @return
 */
function scriptKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

/**
 *
 * @param n
 * @param src
 *
 * @return
 */
function candidateSpan(n: ts.Node, src: string): { start: number; end: number } | undefined {
	if (ts.isObjectLiteralExpression(n) || ts.isTypeLiteralNode(n) || ts.isMappedTypeNode(n)) return { start: n.getStart(), end: n.end };
	if (ts.isInterfaceDeclaration(n)) {
		const start = src.indexOf('{', n.name.end);
		const end = src.lastIndexOf('}', n.end - 1);
		if (start >= 0 && end >= start) return { start, end: end + 1 };
	}
	return undefined;
}

/**
 * Collapses whitespace inside object and type bodies so Prettier alone decides whether they exceed print width.
 *
 * @param fileName
 *
 * @return
 */
export function collapseTypesAndObjects(fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, scriptKind(fileName));
	const langVariant = parsed.languageVariant;
	const edits: { start: number; end: number; text: string }[] = [];

	const collapse = (node: ts.Node, start: number, text: string): string | undefined => {
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
		protectLiterals(node);
		const isProtected = (position: number): boolean => protectedRanges.some((range) => position >= range.start && position < range.end);
		const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, langVariant, text);
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
	const n = edits.sort((a, b) => b.start - a.start).reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, original);
	if (n === original) return false;
	writeFileSync(fileName, n);
	return true;
}
