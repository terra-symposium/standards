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
import { sourceKind } from './source-kind.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

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
	if (!new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']).has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, sourceKind(fileName));
	const edits: { start: number; end: number; text: string }[] = [];

	// ANALYSE
	/**
	 *
	 * @param n
	 */
	const visit = (n: ts.Node): void => {
		let span: { start: number; end: number } | undefined;
		if (ts.isObjectLiteralExpression(n)) {
			let containsJsx = false;
			/**
			 *
			 * @param child
			 */
			const findJsx = (child: ts.Node): void => {
				if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
					containsJsx = true;
					return;
				}
				ts.forEachChild(child, findJsx);
			};
			ts.forEachChild(n, findJsx);
			if (!containsJsx) span = { start: n.getStart(), end: n.end };
		} else if (ts.isTypeLiteralNode(n) || ts.isMappedTypeNode(n)) span = { start: n.getStart(), end: n.end };
		else if (ts.isInterfaceDeclaration(n)) {
			const start = original.indexOf('{', n.name.end);
			const end = original.lastIndexOf('}', n.end - 1);
			if (start >= 0 && end >= start) span = { start, end: end + 1 };
		}
		if (span) {
			const text = original.slice(span.start, span.end);
			if (/[\r\n]/.test(text)) {
				const protectedRanges: { start: number; end: number }[] = [];
				/**
				 *
				 * @param child
				 */
				const protectLiterals = (child: ts.Node): void => {
					if (
						ts.isStringLiteral(child) ||
						ts.isRegularExpressionLiteral(child) ||
						ts.isNoSubstitutionTemplateLiteral(child) ||
						ts.isTemplateHead(child) ||
						ts.isTemplateMiddle(child) ||
						ts.isTemplateTail(child) ||
						ts.isJsxText(child)
					) {
						protectedRanges.push({ start: child.getStart(parsed) - span.start, end: child.end - span.start });
						return;
					}
					ts.forEachChild(child, protectLiterals);
				};
				protectLiterals(n);
				const isProtected = (position: number): boolean => protectedRanges.some((range) => position >= range.start && position < range.end);
				const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, parsed.languageVariant, text);
				let collapsedText = '';
				let whitespace = false;
				let containsComment = false;
				for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
					const tokenStart = scanner.getTokenPos();
					if ((token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) && !isProtected(tokenStart)) {
						containsComment = true;
						break;
					}
					if (token === ts.SyntaxKind.WhitespaceTrivia || token === ts.SyntaxKind.NewLineTrivia) {
						if (isProtected(tokenStart)) {
							if (whitespace && collapsedText && !collapsedText.endsWith(' ')) collapsedText += ' ';
							collapsedText += scanner.getTokenText();
							whitespace = false;
							continue;
						}
						whitespace = true;
						continue;
					}
					if (whitespace && collapsedText && !collapsedText.endsWith(' ')) collapsedText += ' ';
					collapsedText += scanner.getTokenText();
					whitespace = false;
				}
				if (!containsComment) {
					edits.push({ ...span, text: collapsedText });
					return;
				}
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
