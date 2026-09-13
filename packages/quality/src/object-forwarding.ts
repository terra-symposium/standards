/**
 * packages/quality/src/object-forwarding.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';

// NODE
import { readFileSync } from 'node:fs';
import { displayPath, srcFiles } from './files.js';

// TYPES
import type { QualityCfg } from './config.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

export type ObjectForwardingFinding = {
	file: string;
	line: number;
	column: number;
	callee: string;
	source: string;
	properties: string[];
	recommendation: string;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

function scriptKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

function isIgnoredCallee(expression: ts.Expression): boolean {
	const text = expression.getText();
	return /\.(?:insert|upsert|update|set|push|add|append|assign)$/.test(text);
}

function findingsForFile(cfg: QualityCfg, file: string): ObjectForwardingFinding[] {
	const source = readFileSync(file, 'utf8');
	const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
	const findings: ObjectForwardingFinding[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node) && !isIgnoredCallee(node.expression)) {
			for (const argument of node.arguments) {
				if (!ts.isObjectLiteralExpression(argument)) continue;
				const bySource = new Map<string, string[]>();
				for (const property of argument.properties) {
					if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
					if (!ts.isPropertyAccessExpression(property.initializer) || !ts.isIdentifier(property.initializer.expression)) continue;
					if (property.initializer.name.text !== property.name.text) continue;
					const sourceName = property.initializer.expression.text;
					bySource.set(sourceName, [...(bySource.get(sourceName) ?? []), property.name.text]);
				}
				for (const [sourceName, properties] of bySource) {
					if (properties.length < 3) continue;
					const position = parsed.getLineAndCharacterOfPosition(argument.getStart(parsed));
					const hasOnlyForwardedProperties = argument.properties.length === properties.length;
					const callee = node.expression.getText(parsed);
					findings.push({
						file: displayPath(cfg, file),
						line: position.line + 1,
						column: position.character + 1,
						callee,
						source: sourceName,
						properties,
						recommendation: hasOnlyForwardedProperties
							? `pass ${sourceName} directly`
							: `spread ${sourceName} and keep only the explicit overrides`,
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
 *
 * @return Object-forwarding recommendations.
 */
export function objectForwardingFindings(cfg: QualityCfg): ObjectForwardingFinding[] {
	return srcFiles(cfg).flatMap((file) => findingsForFile(cfg, file));
}
