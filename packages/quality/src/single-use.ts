/** AST inventory for private declarations that have exactly one consumer. */
import ts from 'typescript';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { srcFiles } from './files.js';
import type { QualityCfg } from './config.js';

export type SingleUseFinding = { file: string; line: number; name: string; decision: 'INLINE' | 'KEEP' | 'REVIEW'; reason: string };

const sourceKind = (file: string): ts.ScriptKind => (file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS);

const isExported = (statement: ts.Statement): boolean => ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;

const classify = (statement: ts.Statement, declaration: ts.VariableDeclaration, sourceFile: ts.SourceFile, source: string): [SingleUseFinding['decision'], string] => {
	if (isExported(statement)) return ['KEEP', 'exported declaration/public contract'];
	const initializer = declaration.initializer;
	if (!initializer) return ['REVIEW', 'declaration has no inlineable initializer'];
	if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return ['KEEP', 'callable or rendering boundary'];
	if (initializer.getText(sourceFile).length > 800) return ['REVIEW', 'large declaration; preserve readability'];
	if (ts.isAwaitExpression(initializer) || ts.isCallExpression(initializer) || ts.isNewExpression(initializer)) return ['KEEP', 'runtime/workflow boundary'];
	if (sourceFile.fileName.endsWith('.tsx') && (source.includes(`<${declaration.name.getText(sourceFile)}`) || source.includes(`</${declaration.name.getText(sourceFile)}>`))) return ['KEEP', 'JSX/rendering boundary'];
	if (ts.isObjectLiteralExpression(initializer) || ts.isArrayLiteralExpression(initializer) || ts.isStringLiteral(initializer) || ts.isNumericLiteral(initializer) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(initializer.kind)) return ['INLINE', 'pure single-use data'];
	return ['REVIEW', 'single-use expression requires semantic review'];
};

export function singleUseFindings(cfg: QualityCfg): SingleUseFinding[] {
	const findings: SingleUseFinding[] = [];
	for (const file of srcFiles(cfg)) {
		if (!/\.(?:astro|c|m)?(?:js|jsx|ts|tsx)$/.test(file)) continue;
		const source = readFileSync(file, 'utf8');
		if (file.includes('/node_modules/') || file.includes('/dist/') || file.includes('/build/')) continue;
		const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, sourceKind(file));
		for (const statement of sourceFile.statements) {
			if (isExported(statement) || !ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) continue;
			const declaration = statement.declarationList.declarations[0];
			if (!ts.isIdentifier(declaration.name)) continue;
			const references = source.slice(declaration.end).match(new RegExp(`\\b${declaration.name.text}\\b`, 'g'))?.length ?? 0;
			if (references !== 1) continue;
			const [decision, reason] = classify(statement, declaration, sourceFile, source);
			findings.push({ file: relative(cfg.root, file), line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart(sourceFile)).line + 1, name: declaration.name.text, decision, reason });
		}
	}
	return findings;
}

export function writeSingleUseReport(cfg: QualityCfg): SingleUseFinding[] {
	const findings = singleUseFindings(cfg);
	const docs = join(cfg.root, 'docs', 'quality');
	mkdirSync(docs, { recursive: true });
	const generatedAt = new Date().toISOString();
	const report = { generatedAt, scope: cfg.sourceRoots, findings };
	writeFileSync(join(docs, 'single-use-declarations.json'), `${JSON.stringify(report, null, 2)}\n`);
	const groups = (['INLINE', 'KEEP', 'REVIEW'] as const).map((decision) => ({ decision, entries: findings.filter((finding) => finding.decision === decision) }));
	writeFileSync(join(docs, 'single-use-declarations.md'), `# Single-use declaration recommendations\n\nGenerated ${generatedAt.slice(0, 10)}.\n\n${groups.map(({ decision, entries }) => `## ${decision} (${entries.length})\n\n${entries.length ? entries.map((entry) => `- \`${entry.file}:${entry.line}\` **${entry.name}** — ${entry.reason}`).join('\n') : '_None._'}`).join('\n\n')}\n`);
	return findings;
}
