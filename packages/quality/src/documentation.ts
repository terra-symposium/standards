/**
 * packages/quality/src/documentation.ts
 */

import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { displayPath, srcFiles } from './files.js';
import type { DocumentationRequirements, QualityCfg } from './config.js';

export type DocumentationFinding = {
	file: string;
	line: number;
	column: number;
	name: string;
	kind: 'type' | 'function' | 'inline';
	reason: string;
};

function scriptKind(fileName: string): ts.ScriptKind {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.[cm]?jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

function supported(fileName: string): boolean {
	return /\.(?:c|m)?(?:js|jsx|ts|tsx)$/.test(fileName);
}

function documented(node: ts.Node, source: string): boolean {
	return /\/\*\*[\s\S]*?\*\//.test(source.slice(node.getFullStart(), node.getStart()));
}

function exported(node: ts.Node): boolean {
	return !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function nodeName(node: ts.Node): string {
	const name = (node as unknown as { name?: ts.Node }).name;
	if (name && ts.isIdentifier(name)) return name.text;
	return '<anonymous>';
}

function report(file: string, parsed: ts.SourceFile, node: ts.Node, name: string, kind: DocumentationFinding['kind'], reason: string, cfg: QualityCfg): DocumentationFinding {
	const position = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
	return { file: displayPath(cfg, file), line: position.line + 1, column: position.character + 1, name, kind, reason };
}

function findingsForFile(cfg: QualityCfg, file: string, requirements: DocumentationRequirements): DocumentationFinding[] {
	if (!supported(file)) return [];
	const source = readFileSync(file, 'utf8');
	const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
	const findings: DocumentationFinding[] = [];
	const visit = (node: ts.Node): void => {
		const isType = ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
		if (requirements.types && isType && !documented(node, source)) findings.push(report(file, parsed, node, nodeName(node), 'type', 'add TSDoc for this type', cfg));
		if (ts.isFunctionDeclaration(node)) {
			const needsDoc = requirements.functions || (requirements.exportedFunctions && exported(node));
			if (needsDoc && !documented(node, source)) findings.push(report(file, parsed, node, nodeName(node), 'function', 'add TSDoc for this function', cfg));
		}
		if (requirements.noInlineFunctions && (ts.isArrowFunction(node) || ts.isFunctionExpression(node))) findings.push(report(file, parsed, node, nodeName(node), 'inline', 'move this function to a named declaration', cfg));
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	return findings;
}

/** Finds documentation-policy violations for the configured source scope. */
export function documentationFindings(cfg: QualityCfg): DocumentationFinding[] {
	const requirements = cfg.documentation?.required;
	if (!requirements || !Object.values(requirements).some(Boolean)) return [];
	return srcFiles(cfg).flatMap((file) => findingsForFile(cfg, file, requirements));
}

/** Adds minimal TSDoc to missing required type declarations. Function documentation is handled by document maintenance. */
export function documentSrcFile(cfg: QualityCfg, file: string): boolean {
	if (!supported(file)) return false;
	const requirements = cfg.documentation?.required;
	if (!requirements) return false;
	const source = readFileSync(file, 'utf8');
	const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
	const insertions: number[] = [];
	const visit = (node: ts.Node): void => {
		const isType = ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
		const isFunction = ts.isFunctionDeclaration(node);
		const needsFunction = isFunction && (requirements.functions || (requirements.exportedFunctions && exported(node)));
		if (((requirements.types && isType) || needsFunction) && !documented(node, source)) insertions.push(node.getStart(parsed));
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	if (!insertions.length) return false;
	const eol = source.includes('\r\n') ? '\r\n' : '\n';
	const next = insertions.sort((a, b) => b - a).reduce((text, position) => `${text.slice(0, position)}/**${eol} *${eol} */${eol}${text.slice(position)}`, source);
	writeFileSync(file, next);
	return true;
}
