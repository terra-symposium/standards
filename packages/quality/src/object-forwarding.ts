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
import { readFileSync } from 'node:fs';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

export type ObjectForwardingFinding = { file: string; line: number; column: number; callee: string; source: string; properties: string[]; recommendation: string };

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
				const bySrc = new Map<string, string[]>();
				for (const property of argument.properties) {
					if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
					if (!ts.isPropertyAccessExpression(property.initializer) || !ts.isIdentifier(property.initializer.expression)) continue;
					if (property.initializer.name.text !== property.name.text) continue;
					bySrc.set(property.initializer.expression.text, [...(bySrc.get(property.initializer.expression.text) ?? []), property.name.text]);
				}
				for (const [srcName, properties] of bySrc) {
					if (properties.length < 3) continue;
					const pos = parsed.getLineAndCharacterOfPosition(argument.getStart(parsed));
					const hasOnlyForwardedProperties = argument.properties.length === properties.length;
					const callee = node.expression.getText(parsed);
					findings.push({
						file: displayPath(cfg, file),
						line: pos.line + 1,
						column: pos.character + 1,
						callee,
						source: srcName,
						properties,
						recommendation: hasOnlyForwardedProperties ? `pass ${srcName} directly` : `spread ${srcName} and keep only the explicit overrides`,
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
