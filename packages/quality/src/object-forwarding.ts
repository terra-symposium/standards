/**
 * packages/quality/src/object-forwarding.ts
 * Finds object forwarding usages in the codebase.
 * Suggests auto-destructuring or passing whole when manually destructuring the whole or near-whole object.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { readFileSync, writeFileSync } from 'node:fs';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

export type ObjectForwardingFinding = { file: string; line: number; column: number; callee: string; source: string; properties: string[]; recommendation: string };
export type ObjectForwardingFixResult = { fixed: number; skipped: number };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Selects the TypeScript parser mode that matches a source filename.
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
 * Identifies mutating or collection-building calls where an object literal is a deliberate payload.
 *
 * @param expr Call expression to classify.
 *
 * @return `true` when the callee name indicates a payload boundary that should be ignored.
 */
function isIgnoredCallee(expr: ts.Expression): boolean {
	const text = expr.getText();
	return /\.(?:insert|upsert|update|set|push|add|append|assign)$/.test(text);
}

/**
 * Finds repeated property forwarding in call-site object literals within one source file.
 *
 * @param cfg Quality configuration used to render diagnostic paths.
 * @param file Absolute path to the source file being inspected.
 * @param analysis Optional shared parse context for avoiding repeated reads and AST construction.
 *
 * @return Object-forwarding findings discovered in the file.
 */
function findingsForFile(cfg: QualityCfg, file: string, analysis?: QualityAnalysis): ObjectForwardingFinding[] {
	const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
	const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, scriptKind(file));
	const findings: ObjectForwardingFinding[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node) && !isIgnoredCallee(node.expression)) {
			for (const argument of node.arguments) {
				if (!ts.isObjectLiteralExpression(argument)) continue;
				const spreads = new Map<string, number>();
				for (let idx = 0; idx < argument.properties.length; idx++) {
					const property = argument.properties[idx]!;
					if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression)) spreads.set(property.expression.text, idx);
				}
				const bySrc = new Map<string, string[]>();
				for (let idx = 0; idx < argument.properties.length; idx++) {
					const property = argument.properties[idx]!;
					if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
					if (!ts.isPropertyAccessExpression(property.initializer) || !ts.isIdentifier(property.initializer.expression)) continue;
					if (property.initializer.name.text !== property.name.text) continue;
					if ((spreads.get(property.initializer.expression.text) ?? idx) >= idx) continue;
					bySrc.set(property.initializer.expression.text, [...(bySrc.get(property.initializer.expression.text) ?? []), property.name.text]);
				}
				for (const [srcName, properties] of bySrc) {
					if (!properties.length) continue;
					const pos = parsed.getLineAndCharacterOfPosition(argument.getStart(parsed));
					const callee = node.expression.getText(parsed);
					findings.push({
						file: displayPath(cfg, file),
						line: pos.line + 1,
						column: pos.character + 1,
						callee,
						source: srcName,
						properties,
						recommendation: `remove exact properties already supplied by ...${srcName}`,
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	return findings;
}

/**
 * Finds call-site object literals that repeat several properties directly from one source object.
 *
 * This is intentionally advisory: narrowing projections, persistence payloads, and security
 * boundaries can be valid even when they look like forwarding. Callers should review each finding.
 *
 * @param cfg Quality configuration controlling the source scope.
 * @param analysis Optional shared parse context for the current quality run.
 *
 * @return Object-forwarding recommendations.
 */
export function objectForwardingFindings(cfg: QualityCfg, analysis?: QualityAnalysis): ObjectForwardingFinding[] {
	return (analysis?.files ?? srcFiles(cfg)).flatMap((f) => findingsForFile(cfg, f, analysis));
}

/**
 * Removes only redundant explicit properties from object literals that already spread the same source.
 * Whole-object replacement and narrowing projections remain advisory because they can change object shape.
 *
 * @param cfg Quality configuration defining the source scope.
 * @param analysis Optional shared analysis context used when available.
 *
 * @return Counts of exact duplicate properties removed and conservative cases left untouched.
 */
export function fixObjectForwarding(cfg: QualityCfg, analysis?: QualityAnalysis): ObjectForwardingFixResult {
	let fixed = 0;
	let skipped = 0;
	for (const file of analysis?.files ?? srcFiles(cfg)) {
		if (!/\.[cm]?(?:js|jsx|ts|tsx)$/.test(file)) continue;
		const src = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
		const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, scriptKind(file));
		const edits: Array<{ start: number; end: number }> = [];
		const visit = (node: ts.Node): void => {
			if (ts.isCallExpression(node) && !isIgnoredCallee(node.expression)) {
				for (const argument of node.arguments) {
					if (!ts.isObjectLiteralExpression(argument)) continue;
					const spreads = new Map<string, number>();
					for (let i = 0; i < argument.properties.length; i++) {
						const property = argument.properties[i];
						if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression)) spreads.set(property.expression.text, i);
					}
					for (let i = 0; i < argument.properties.length; i++) {
						const property = argument.properties[i];
						if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
						if (!ts.isPropertyAccessExpression(property.initializer) || !ts.isIdentifier(property.initializer.expression)) continue;
						if (property.initializer.name.text !== property.name.text || !spreads.has(property.initializer.expression.text)) continue;
						if ((spreads.get(property.initializer.expression.text) ?? i) >= i) continue;
						let start = property.getFullStart();
						while (/\s/.test(src[start - 1] ?? '')) start--;
						if (src[start - 1] === ',') start--;
						edits.push({ start, end: property.end });
						fixed++;
					}
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(parsed);
		if (!edits.length) continue;
		let updated = src;
		for (const edit of edits.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, edit.start)}${updated.slice(edit.end)}`;
		if (ts.transpileModule(updated, { fileName: file, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext } }).diagnostics?.length) {
			fixed -= edits.length;
			skipped += edits.length;
			continue;
		}
		writeFileSync(file, updated);
	}
	return { fixed, skipped };
}
