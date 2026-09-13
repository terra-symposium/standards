/** Symbol-aware removal of declarations that only rename another symbol. */
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { srcFiles, displayPath } from './files.js';
import type { QualityCfg } from './config.js';

export type AliasFinding = { file: string; line: number; kind: 'const' | 'type'; name: string; replacement: string };

const targetNode = (node: ts.Expression): ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression | undefined =>
	ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) ? node : undefined;

const externallyReferenced = (files: string[], source: string, name: string): boolean => {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return files.some((file) => file !== source && new RegExp(`\\b${escaped}\\b`).test(readFileSync(file, 'utf8')));
};

export function aliasFindings(cfg: QualityCfg, fix = false): AliasFinding[] {
	const files = srcFiles(cfg).filter((file) => /\.(?:c|m)?(?:js|ts)x?$/.test(file));
	const program = ts.createProgram(files, { allowJs: true, checkJs: false, jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true, target: ts.ScriptTarget.ESNext });
	const checker = program.getTypeChecker();
	const exportedSymbols = new Set<ts.Symbol>();
	for (const file of program.getSourceFiles()) {
		const module = checker.getSymbolAtLocation(file);
		if (module) for (const symbol of checker.getExportsOfModule(module)) exportedSymbols.add(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
	}
	const findings: AliasFinding[] = [];
	for (const source of program.getSourceFiles()) {
		if (!files.includes(source.fileName)) continue;
		const aliases: Array<{ statement: ts.Statement; name: ts.Identifier; target: ts.Node; symbol: ts.Symbol; replacement: string; kind: 'const' | 'type' }> = [];
		const inspect = (node: ts.Node): void => {
			if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1 && ts.isIdentifier(node.declarationList.declarations[0].name)) {
				const declaration = node.declarationList.declarations[0];
				const name = declaration.name as ts.Identifier;
				const target = declaration.initializer && targetNode(declaration.initializer);
				const symbol = target && checker.getSymbolAtLocation(name);
				const targetSymbol = target && checker.getSymbolAtLocation(target);
				if (target && symbol && targetSymbol && symbol !== targetSymbol && !exportedSymbols.has(symbol) && !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) aliases.push({ statement: node, name, target, symbol, replacement: target.getText(source), kind: 'const' });
			}
			if (ts.isTypeAliasDeclaration(node) && node.typeParameters === undefined && ts.isTypeReferenceNode(node.type) && node.type.typeArguments === undefined) {
				const symbol = checker.getSymbolAtLocation(node.name);
				const targetSymbol = checker.getSymbolAtLocation(node.type.typeName);
				if (symbol && targetSymbol && symbol !== targetSymbol && !externallyReferenced(files, source.fileName, node.name.text)) aliases.push({ statement: node, name: node.name, target: node.type, symbol, replacement: node.type.getText(source), kind: 'type' });
			}
			ts.forEachChild(node, inspect);
		};
		inspect(source);
		if (!aliases.length) continue;
		const edits: Array<{ start: number; end: number; text: string }> = [];
		const symbols = new Map(aliases.map((alias) => [alias.symbol, alias]));
		const visit = (node: ts.Node): void => {
			if (aliases.some((alias) => alias.statement === node)) return;
			if (ts.isIdentifier(node)) {
				const symbol = checker.getSymbolAtLocation(node);
				const alias = symbol && symbols.get(symbol);
				if (alias && node !== alias.name) edits.push({ start: node.getStart(source), end: node.end, text: ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node ? `${node.text}: ${alias.replacement}` : alias.replacement });
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
		for (const alias of aliases) {
			findings.push({ file: displayPath(cfg, source.fileName), line: source.getLineAndCharacterOfPosition(alias.name.getStart(source)).line + 1, kind: alias.kind, name: alias.name.text, replacement: alias.replacement });
			edits.push({ start: alias.statement.getFullStart(), end: alias.statement.end, text: '' });
		}
		if (fix) {
			const original = readFileSync(source.fileName, 'utf8');
			const updated = edits.sort((a, b) => b.start - a.start).reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, original);
			if (updated !== original) writeFileSync(source.fileName, updated);
		}
	}
	return findings;
}
