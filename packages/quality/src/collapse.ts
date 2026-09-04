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
 * @returns
 */
function scriptKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

/**
 *
 * @param node
 * @param src
 * @returns
 */
function candidateSpan(node: ts.Node, src: string): { start: number; end: number } | undefined {
	if (ts.isObjectLiteralExpression(node) || ts.isTypeLiteralNode(node) || ts.isMappedTypeNode(node)) return { start: node.getStart(), end: node.end };
	if (ts.isInterfaceDeclaration(node)) {
		const start = src.indexOf('{', node.name.end);
		const end = src.lastIndexOf('}', node.end - 1);
		if (start >= 0 && end >= start) return { start, end: end + 1 };
	}
	return undefined;
}

/** Collapses whitespace inside object and type bodies so Prettier alone decides whether they exceed print width. */
export function collapseTypesAndObjects(fileName: string): boolean {
	if (!SUPPORTED.has(extname(fileName))) return false;
	const original = readFileSync(fileName, 'utf8');
	const parsed = ts.createSourceFile(fileName, original, ts.ScriptTarget.Latest, true, scriptKind(fileName));
	const languageVariant = parsed.languageVariant;
	const edits: { start: number; end: number; text: string }[] = [];

	const collapse = (node: ts.Node, start: number, text: string): string | undefined => {
		if (!/[\r\n]/.test(text)) return undefined;
		const protectedRanges: { start: number; end: number }[] = [];
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
				protectedRanges.push({ start: child.getStart(parsed) - start, end: child.end - start });
				return;
			}
			ts.forEachChild(child, protectLiterals);
		};
		protectLiterals(node);
		const isProtected = (position: number): boolean => protectedRanges.some((range) => position >= range.start && position < range.end);
		const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, languageVariant, text);
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

	const visit = (node: ts.Node): void => {
		const span = candidateSpan(node, original);
		if (span) {
			const text = collapse(node, span.start, original.slice(span.start, span.end));
			if (text !== undefined) {
				edits.push({ ...span, text });
				return;
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	if (!edits.length) return false;
	const next = edits.sort((a, b) => b.start - a.start).reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, original);
	if (next === original) return false;
	writeFileSync(fileName, next);
	return true;
}
