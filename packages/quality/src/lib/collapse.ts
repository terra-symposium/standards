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
	if (!/^\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/.test(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const parsed = ts.createSourceFile(
		fileName,
		original,
		ts.ScriptTarget.Latest,
		true,
		/\.[cm]?tsx$/.test(fileName) ? ts.ScriptKind.TSX : /\.[cm]?jsx$/.test(fileName) ? ts.ScriptKind.JSX : /\.[cm]?js$/.test(fileName) ? ts.ScriptKind.JS : ts.ScriptKind.TS,
	);
	const edits: { start: number; end: number; text: string }[] = [];

	// ANALYSE
	const pending: ts.Node[] = [parsed];
	while (pending.length) {
		const n = pending.pop()!;
		let span: { start: number; end: number } | undefined;
		if (ts.isObjectLiteralExpression(n)) {
			let containsJsx = false;
			const search: ts.Node[] = [n];
			while (search.length && !containsJsx) {
				const child = search.pop()!;
				if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
					containsJsx = true;
					break;
				}
				ts.forEachChild(child, (descendant) => void search.push(descendant));
			}
			if (!containsJsx) span = { start: n.getStart(), end: n.end };
		} else if (ts.isTypeLiteralNode(n) || ts.isMappedTypeNode(n)) span = { start: n.getStart(), end: n.end };
		else if (ts.isInterfaceDeclaration(n)) {
			const openBrace = original.indexOf('{', n.name.end);
			const closeBrace = original.lastIndexOf('}', n.end - 1);
			if (openBrace >= 0 && closeBrace >= openBrace) span = { start: openBrace, end: closeBrace + 1 };
		}
		if (span) {
			const text = original.slice(span.start, span.end);
			if (/[\r\n]/.test(text)) {
				const protectedRanges: { start: number; end: number }[] = [];
				const literals: ts.Node[] = [n];
				while (literals.length) {
					const child = literals.pop()!;
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
						continue;
					}
					ts.forEachChild(child, (descendant) => void literals.push(descendant));
				}
				const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, parsed.languageVariant, text);
				let result = '';
				let whitespace = false;
				let valid = true;
				for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
					const tokenStart = scanner.getTokenPos();
					const protectedToken = protectedRanges.some((range) => tokenStart >= range.start && tokenStart < range.end);
					if ((token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) && !protectedToken) {
						valid = false;
						break;
					}
					if (token === ts.SyntaxKind.WhitespaceTrivia || token === ts.SyntaxKind.NewLineTrivia) {
						if (protectedToken) {
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
				if (valid) {
					edits.push({ ...span, text: result });
					continue;
				}
			}
		}
		ts.forEachChild(n, (child) => void pending.push(child));
	}
	if (!edits.length) return false;
	const n = edits.sort((a, b) => b.start - a.start).reduce((t, e) => `${t.slice(0, e.start)}${e.text}${t.slice(e.end)}`, original);
	if (n === original) return false;
	writeFileSync(fileName, n);
	return true;
}
