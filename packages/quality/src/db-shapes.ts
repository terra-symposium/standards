/**
 * packages/quality/src/db-shapes.ts
 * Reports database-shaped object projections without changing source files.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { displayPath, srcFiles } from './files.js';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

export type DbShapeMapping = { output: string; source: string };
export type DbShapeFinding = { file: string; line: number; column: number; name: string; source: string; properties: string[]; mappings: DbShapeMapping[]; message: string };

type SrcAccess = { source: string; property: string };

const STATIC_OBJECTS = new Set(['Array', 'BigInt', 'Boolean', 'Date', 'Error', 'Intl', 'JSON', 'Map', 'Math', 'Object', 'Promise', 'Reflect', 'RegExp', 'Set', 'String', 'Number']);

const EXPLICIT_ADAPTER_ANNOTATION = /terra-quality(?:-db)?(?:[-:]|\s+)\s*(?:db-)?shape[-:]?adapter/i;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Selects the parser mode for a source filename.
 *
 * @param file File being parsed.
 * @return TypeScript parser mode.
 */
function scriptKind(file: string): ts.ScriptKind {
	if (/\.astro$/.test(file)) return ts.ScriptKind.TSX;
	if (/\.[cm]?tsx$/.test(file)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(file)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(file)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

/**
 * Keeps executable regions of an Astro file while preserving source offsets.
 *
 * @param src Astro source text.
 * @return Masked source suitable for TypeScript parsing.
 */
function astroParseText(src: string): string {
	const chars: string[] = [...src].map((c) => (c === '\n' || c === '\r' ? c : ' '));
	const copy = (start: number, end: number): void => {
		for (let i = start; i < end; i += 1) chars[i] = src[i]!;
	};
	const frontmatter = /^---\r?\n/.exec(src);
	if (frontmatter) {
		const close = src.indexOf('\n---', frontmatter[0].length);
		if (close >= 0) copy(frontmatter[0].length, close);
	}
	for (const match of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
		const contentStart = (match.index ?? 0) + match[0].indexOf('>') + 1;
		copy(contentStart, contentStart + match[1]!.length);
	}
	return chars.join('');
}

/**
 * Removes syntax-only wrappers around an expression.
 *
 * @param expr Expression being unwrapped.
 * @return Unwrapped expression.
 */
function unwrap(expr: ts.Expression): ts.Expression {
	let curr = expr;
	while (ts.isParenthesizedExpression(curr) || ts.isAsExpression(curr) || ts.isTypeAssertionExpression(curr) || ts.isNonNullExpression(curr)) curr = curr.expression;
	return curr;
}

/**
 * Collects direct object-property reads from a value, including simple
 * normalizers such as String(row.id), nullableString(row.value), and casts.
 *
 * @param expr Expression containing a candidate property read.
 * @return Direct property reads found in the expression.
 */
function srcAccesses(expr: ts.Expression): SrcAccess[] {
	const curr = unwrap(expr);
	if (ts.isPropertyAccessExpression(curr) && ts.isIdentifier(curr.expression)) {
		if (STATIC_OBJECTS.has(curr.expression.text)) return [];
		return [{ source: curr.expression.text, property: curr.name.text }];
	}
	if (ts.isElementAccessExpression(curr) && ts.isIdentifier(curr.expression) && curr.argumentExpression && ts.isStringLiteral(curr.argumentExpression)) {
		return [{ source: curr.expression.text, property: curr.argumentExpression.text }];
	}
	if (ts.isCallExpression(curr)) return curr.arguments.flatMap((a) => (ts.isExpression(a) ? srcAccesses(a) : []));
	const accesses: SrcAccess[] = [];
	curr.forEachChild((c) => {
		if (ts.isExpression(c)) accesses.push(...srcAccesses(c));
	});
	return accesses;
}

/**
 * Recognises the lowercase snake_case convention used by database columns.
 * Uppercase constant maps and JavaScript static properties are not row shapes.
 *
 * @param name Property name.
 * @return Whether the name looks like a DB column.
 */
function isDbFieldName(name: string): boolean {
	return name === name.toLowerCase() && /[a-z0-9]_[a-z0-9_]+/.test(name);
}

/**
 * Reads an object property's static output name.
 *
 * @param name Property name node.
 * @return Static property name, when available.
 */
function propertyName(name: ts.PropertyName): string | undefined {
	return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : undefined;
}

/**
 * Returns the nearest human-readable declaration name for an object literal.
 *
 * @param node Object literal being described.
 * @param src Parsed source file.
 * @return Owning declaration name.
 */
function ownerName(node: ts.ObjectLiteralExpression, src: ts.SourceFile): string {
	for (let curr: ts.Node | undefined = node.parent; curr; curr = curr.parent) {
		if (ts.isFunctionDeclaration(curr) && curr.name) return curr.name.text;
		if (ts.isMethodDeclaration(curr) && ts.isIdentifier(curr.name)) return curr.name.text;
		if (ts.isVariableDeclaration(curr) && ts.isIdentifier(curr.name)) return curr.name.text;
		if (ts.isCallExpression(curr) && ts.isPropertyAccessExpression(curr.expression) && curr.expression.name.text === 'map') return 'map callback';
	}
	return src.fileName;
}

/**
 * Checks whether an object belongs to an explicitly documented boundary adapter.
 *
 * @param node Object literal being inspected.
 * @return Whether the enclosing function is explicitly an adapter.
 */
function isExplicitAdapter(node: ts.ObjectLiteralExpression, src: ts.SourceFile): boolean {
	for (let curr: ts.Node | undefined = node.parent; curr; curr = curr.parent) {
		const leadingText = src.text.slice(Math.max(0, curr.getStart(src) - 800), curr.getStart(src));
		if (EXPLICIT_ADAPTER_ANNOTATION.test(leadingText)) return true;
	}
	return false;
}

/**
 * Determines whether an object literal is directly supplied to a mutation API.
 *
 * @param node Object literal being classified.
 * @return Whether the object is a deliberate insert/update payload.
 */
function isMutationPayload(node: ts.ObjectLiteralExpression): boolean {
	for (let declaration: ts.Node | undefined = node.parent; declaration; declaration = declaration.parent) {
		if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name) && /(?:payload|insert|update|patch|params|body)$/i.test(declaration.name.text)) return true;
		if (ts.isFunctionLike(declaration) || ts.isSourceFile(declaration)) break;
	}
	if (node.properties.some((p) => ts.isPropertyAssignment(p) && propertyName(p.name)?.startsWith('p_'))) return true;
	let curr: ts.Node = node;
	while (curr.parent && curr.parent !== curr.parent.parent) {
		if (ts.isCallExpression(curr.parent) && curr.parent.arguments.some((a) => a === curr)) {
			const callee = curr.parent.expression.getText();
			return /\.(?:insert|upsert|update|set|assign|push|add|append|replace)$/.test(callee);
		}
		if (ts.isFunctionLike(curr.parent) || ts.isSourceFile(curr.parent)) return false;
		curr = curr.parent;
	}
	return false;
}

/**
 * Limits the rule to objects that actually define a returned, assigned, or
 * mapped model. Function argument objects are usually call parameters or
 * configuration and are not row contracts.
 *
 * @param node Object literal being classified.
 * @return Whether the object is a model projection candidate.
 */
function isProjectionCtx(node: ts.ObjectLiteralExpression): boolean {
	const parent = node.parent;
	if (ts.isReturnStatement(parent)) return true;
	if (ts.isVariableDeclaration(parent) && parent.initializer === node) return true;
	if (ts.isArrowFunction(parent) && parent.body === node) return true;
	if (ts.isParenthesizedExpression(parent) && ts.isArrowFunction(parent.parent) && parent.parent.body === parent) return true;
	return false;
}

/**
 * Reports one object literal when it forwards DB-style names into another shape.
 *
 * @param cfg Quality configuration used for display paths.
 * @param src Parsed source file.
 * @param node Object literal under inspection.
 * @return Finding, or undefined when the object is not a DB-shaped projection.
 */
function findingForObject(cfg: QualityCfg, src: ts.SourceFile, node: ts.ObjectLiteralExpression): DbShapeFinding | undefined {
	if (isMutationPayload(node)) return undefined;
	if (!isProjectionCtx(node)) return undefined;
	if (isExplicitAdapter(node, src)) return undefined;
	const mappings: DbShapeMapping[] = [];
	const srcs = new Set<string>();
	for (const property of node.properties) {
		if (!ts.isPropertyAssignment(property)) continue;
		const output = propertyName(property.name);
		if (!output) continue;
		const accesses = srcAccesses(property.initializer);
		const unique = [...new Map(accesses.map((a) => [`${a.source}.${a.property}`, a])).values()];
		if (unique.length !== 1) continue;
		const access = unique[0]!;
		mappings.push({ output, source: access.property });
		srcs.add(access.source);
	}
	if (srcs.size !== 1 || !mappings.length) return undefined;
	const aliases = mappings.filter((m) => m.output !== m.source && (isDbFieldName(m.output) || isDbFieldName(m.source)));
	if (!aliases.length) return undefined;
	const pos = src.getLineAndCharacterOfPosition(node.getStart(src));
	const name = ownerName(node, src);
	const srcName = [...srcs][0]!;
	return {
		file: displayPath(cfg, src.fileName),
		line: pos.line + 1,
		column: pos.character + 1,
		name,
		source: srcName,
		properties: mappings.map((m) => m.output),
		mappings,
		message: `${name} maps ${srcName} into a DB-shaped object; use the row directly or make an intentional adapter explicit (${aliases.map((m) => `${m.source} -> ${m.output}`).join(', ')})`,
	};
}

/**
 * Reports DB-shaped projections in the configured source scope.
 *
 * This check is advisory by design. It never edits files and never changes the
 * quality command's exit status; callers must review whether each projection
 * is an identity remap, a deliberate UI/provider adapter, or a stale contract.
 *
 * @param cfg Quality configuration defining the source scope.
 * @param analysis Optional shared source analysis.
 * @return Every DB-shaped object projection found in scope.
 */
export function dbShapeFindings(cfg: QualityCfg, analysis?: QualityAnalysis): DbShapeFinding[] {
	const findings: DbShapeFinding[] = [];
	for (const file of analysis?.files ?? srcFiles(cfg)) {
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		const parseText = file.endsWith('.astro') ? astroParseText(src) : src;
		const source = ts.createSourceFile(file, parseText, ts.ScriptTarget.Latest, true, scriptKind(file));
		const visit = (node: ts.Node): void => {
			if (ts.isObjectLiteralExpression(node)) {
				const finding = findingForObject(cfg, source, node);
				if (finding) findings.push(finding);
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
	}
	return findings;
}
