/**
 * packages/quality/src/single-use.ts
 * AST inventory and safe autofix for single-consumer declarations (types, and helpers).
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { relative, sep } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { srcFiles } from './files.js';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const C_M_JS_JSX_TS_TSX_REGEX = /\.(?:c|m)?(?:js|jsx|ts|tsx)$/;
export type SingleUseFinding = { file: string; line: number; name: string; decision: 'INLINE' | 'KEEP' | 'REVIEW'; reason: string };
type Candidate = { file: string; source: ts.SourceFile; statement: ts.Statement; name: ts.Identifier; symbol: ts.Symbol; kind: 'type' | 'interface' | 'variable' | 'function' };
type Reference = { file: string; source: ts.SourceFile; node: ts.Identifier };
const canonical = (c: ts.TypeChecker, s: ts.Symbol | undefined): ts.Symbol | undefined => (s && s.flags & ts.SymbolFlags.Alias ? c.getAliasedSymbol(s) : s);
const isCandidateStatement = (s: ts.Statement): boolean => {
	if (ts.canHaveModifiers(s) && ts.getModifiers(s)?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword)) return false;
	return (
		ts.isTypeAliasDeclaration(s) ||
		ts.isInterfaceDeclaration(s) ||
		(ts.isFunctionDeclaration(s) && Boolean(s.body)) ||
		(ts.isVariableStatement(s) && s.declarationList.declarations.length === 1 && ts.isIdentifier(s.declarationList.declarations[0]?.name))
	);
};
const isImportNode = (n: ts.Node): boolean => {
	const src = n.getSourceFile();
	if (src.statements.some((s) => ts.isImportDeclaration(s) && n.getStart(src) >= s.getStart(src) && n.getEnd() <= s.getEnd())) return true;
	for (let parent: ts.Node | undefined = n.parent; parent && !ts.isSourceFile(parent); parent = parent.parent) if (ts.isImportDeclaration(parent)) return true;
	return false;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates the TypeScript program used to identify declarations and their consumers.
 *
 * @param cfg Quality configuration defining the source files to include.
 *
 * @return TypeScript program configured for repository JavaScript and TypeScript sources.
 */
function programFor(cfg: QualityCfg): ts.Program {
	const paths = Object.fromEntries(Object.entries(cfg.aliases ?? {}).map(([prefix, target]) => [prefix.endsWith('*') ? prefix : `${prefix}*`, [target.endsWith('*') ? target : `${target}*`]]));
	return ts.createProgram({
		rootNames: srcFiles(cfg).filter((f) => C_M_JS_JSX_TS_TSX_REGEX.test(f)),
		options: {
			allowJs: true,
			baseUrl: cfg.root,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			paths,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		},
	});
}

/**
 * Checks the single-use-specific scope without changing other quality checks.
 *
 * @param cfg Quality configuration containing rule-specific directory exclusions.
 * @param file Absolute source path being considered.
 *
 * @return `true` when the file is in scope for the single-use rule.
 */
function inSingleUseScope(cfg: QualityCfg, file: string): boolean {
	const roots = [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])];
	const skipped = cfg.singleUse?.skippedDirectories ?? [];
	return roots.some((root) => file === root || file.startsWith(`${root}${sep}`)) && !skipped.some((directory) => file === directory || file.startsWith(`${directory}${sep}`));
}

/**
 * Checks whether a file can contribute references, including files skipped as declaration candidates.
 *
 * @param cfg Quality configuration defining the source roots.
 * @param file Absolute source path being considered.
 *
 * @return `true` when the file is in a configured source root.
 */
function inSingleUseRoots(cfg: QualityCfg, file: string): boolean {
	return [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])].some((root) => file === root || file.startsWith(`${root}${sep}`));
}

/**
 * Collects eligible declarations and all non-import references to their symbols.
 *
 * @param cfg Quality configuration defining which source roots are in scope.
 * @param program TypeScript program containing the source files to inspect.
 * @param checker TypeScript type checker used to canonicalize aliases and references.
 *
 * @return Candidate declarations and references grouped by canonical symbol.
 */
function collect(cfg: QualityCfg, program: ts.Program, checker: ts.TypeChecker): { candidates: Candidate[]; references: Map<ts.Symbol, Reference[]> } {
	const candidates: Candidate[] = [];
	const declarationByLocation = new Map<string, Candidate>();
	const candidateBySymbol = new Map<ts.Symbol, Candidate>();
	const references = new Map<ts.Symbol, Reference[]>();
	for (const source of program.getSourceFiles()) {
		if (source.isDeclarationFile || !inSingleUseScope(cfg, source.fileName) || !C_M_JS_JSX_TS_TSX_REGEX.test(source.fileName)) continue;
		const visitCandidates = (node: ts.Node): void => {
			if (!isCandidateStatement(node as ts.Statement)) {
				ts.forEachChild(node, visitCandidates);
				return;
			}
			const statement = node as ts.Statement;
			const name =
				ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isFunctionDeclaration(statement)
					? statement.name
					: ts.isVariableStatement(statement)
						? statement.declarationList.declarations[0]?.name
						: undefined;
			if (!name || !ts.isIdentifier(name)) {
				ts.forEachChild(node, visitCandidates);
				return;
			}
			const symbol = canonical(checker, checker.getSymbolAtLocation(name));
			if (!symbol) {
				ts.forEachChild(node, visitCandidates);
				return;
			}
			const kind = ts.isTypeAliasDeclaration(statement) ? 'type' : ts.isInterfaceDeclaration(statement) ? 'interface' : ts.isFunctionDeclaration(statement) ? 'function' : 'variable';
			const candidate = { file: source.fileName, source, statement, name, symbol, kind } satisfies Candidate;
			candidates.push(candidate);
			declarationByLocation.set(`${source.fileName}:${name.getStart(source)}`, candidate);
			candidateBySymbol.set(symbol, candidate);
			ts.forEachChild(node, visitCandidates);
		};
		visitCandidates(source);
	}
	const candidateSymbols = new Set(candidates.map((c) => c.symbol));
	for (const src of program.getSourceFiles()) {
		if (src.isDeclarationFile || !inSingleUseRoots(cfg, src.fileName) || !C_M_JS_JSX_TS_TSX_REGEX.test(src.fileName)) continue;
		const visit = (node: ts.Node): void => {
			if (ts.isIdentifier(node)) {
				if (ts.isBindingElement(node.parent)) {
					ts.forEachChild(node, visit);
					return;
				}
				let importUse = false;
				for (let parent: ts.Node | undefined = node.parent; parent && !ts.isSourceFile(parent); parent = parent.parent) {
					if (ts.isImportDeclaration(parent)) {
						importUse = true;
						break;
					}
				}
				const shorthandSymbol = ts.isShorthandPropertyAssignment(node.parent) ? checker.getShorthandAssignmentValueSymbol(node.parent) : undefined;
				const symbol = canonical(
					checker,
					shorthandSymbol ?? checker.getSymbolAtLocation(node) ?? (ts.isTypeQueryNode(node.parent) ? checker.getSymbolAtLocation(node.parent) : undefined),
				);
				if (!importUse && symbol && candidateSymbols.has(symbol)) {
					const declaration = declarationByLocation.get(`${src.fileName}:${node.getStart(src)}`);
					const candidate = candidateBySymbol.get(symbol);
					const selfReference = candidate?.file === src.fileName && node.getStart(src) >= candidate.statement.getStart(src) && node.getEnd() <= candidate.statement.getEnd();
					if (!declaration && !selfReference) references.set(symbol, [...(references.get(symbol) ?? []), { file: src.fileName, source: src, node }]);
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(src);
	}
	return { candidates, references };
}

/**
 * Classifies a single-consumer declaration according to its safety and readability boundary.
 *
 * @param candidate Declaration candidate whose kind and initializer determine the recommendation.
 *
 * @return Decision and explanation for the candidate.
 */
function classify(candidate: Candidate): [SingleUseFinding['decision'], string] {
	return ['INLINE', `${candidate.kind} declaration has one in-scope consumer`];
}

/**
 * Finds type-position references to a candidate declaration across the configured source scope.
 *
 * @param cfg Quality configuration defining the source roots to scan.
 * @param c Type alias or interface whose consumers should be located.
 * @param program TypeScript program containing the source files to inspect.
 *
 * @return Type references excluding the declaration and import syntax itself.
 */
function typeUses(cfg: QualityCfg, c: Candidate, program: ts.Program): Reference[] {
	const uses: Reference[] = [];
	for (const src of program.getSourceFiles()) {
		if (src.isDeclarationFile || !inSingleUseRoots(cfg, src.fileName) || !C_M_JS_JSX_TS_TSX_REGEX.test(src.fileName)) continue;
		const visit = (n: ts.Node): void => {
			const target = ts.isIdentifier(n) ? referenceTarget(n) : n;
			if (
				ts.isIdentifier(n) &&
				n.text === c.name.text &&
				!(src.fileName === c.file && n.getStart(src) === c.name.getStart(c.source)) &&
				!ts.isExportSpecifier(n.parent) &&
				(ts.isTypeReferenceNode(target) || ts.isExpressionWithTypeArguments(target))
			)
				uses.push({ file: src.fileName, source: src, node: n });
			ts.forEachChild(n, visit);
		};
		visit(src);
	}
	return uses;
}

/**
 * Checks whether a declaration is re-exported through a local export list.
 *
 * @param candidate Declaration whose exported binding is being checked.
 * @param checker TypeScript type checker used to resolve export specifiers.
 *
 * @return `true` when inlining would replace a module export with an expression.
 */
function hasExportSpecifier(candidate: Candidate, checker: ts.TypeChecker): boolean {
	return candidate.source.statements.some(statement =>
		ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause) &&
		statement.exportClause.elements.some(specifier => canonical(checker, checker.getSymbolAtLocation(specifier.propertyName ?? specifier.name)) === candidate.symbol),
	);
}

/** Keeps exported bindings that are imported from Astro frontmatter outside the TypeScript program. */
function hasAstroConsumer(candidate: Candidate, cfg: QualityCfg, program: ts.Program): boolean {
	if (!ts.canHaveModifiers(candidate.statement) || !ts.getModifiers(candidate.statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return false;
	return srcFiles(cfg).filter((file) => file.endsWith('.astro')).some((file) => {
		const match = readFileSync(file, 'utf8').match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
		if (!match) return false;
		const source = ts.createSourceFile(file, match[1]!, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		return source.statements.some((statement) => {
			if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return false;
			const bindings = statement.importClause?.namedBindings;
			if (!bindings || !ts.isNamedImports(bindings) || !bindings.elements.some((element) => (element.propertyName ?? element.name).text === candidate.name.text)) return false;
			const resolved = ts.resolveModuleName(statement.moduleSpecifier.text, file, program.getCompilerOptions(), ts.sys).resolvedModule?.resolvedFileName;
			return resolved === candidate.file;
		});
	});
}

/**
 * Checks whether a cross-file type body depends on names unavailable to the consumer.
 *
 * @param candidate Type declaration proposed for inlining.
 * @param reference Its consumer reference.
 * @param checker Type checker used to resolve names in the declaration body.
 *
 * @return `true` when copied type syntax remains resolvable in the consumer file.
 */
function crossFileTypeSafe(candidate: Candidate, reference: Reference, checker: ts.TypeChecker): boolean {
	if (candidate.file === reference.file) return true;
	let safe = true;
	const visit = (node: ts.Node): void => {
		if (ts.isTypeReferenceNode(node)) {
			const symbol = checker.getSymbolAtLocation(node.typeName);
			const declaration = symbol?.declarations?.[0];
			if (declaration && !ts.isTypeParameterDeclaration(declaration) && declaration.getSourceFile().fileName !== reference.file && declaration.getSourceFile().isDeclarationFile === false) safe = false;
		}
		ts.forEachChild(node, visit);
	};
	if (ts.isTypeAliasDeclaration(candidate.statement)) visit(candidate.statement.type);
	if (ts.isInterfaceDeclaration(candidate.statement)) {
		for (const member of candidate.statement.members) visit(member);
		for (const clause of candidate.statement.heritageClauses ?? []) visit(clause);
	}
	return safe;
}

/**
 * Rejects type aliases whose expansion would introduce explicit `any` at their use site.
 *
 * @param candidate Type alias or interface proposed for inlining.
 *
 * @return `true` when the declaration body contains an explicit `any` type node.
 */
function containsExplicitAny(candidate: Candidate): boolean {
	let found = false;
	const visit = (node: ts.Node): void => {
		if (node.kind === ts.SyntaxKind.AnyKeyword) found = true;
		ts.forEachChild(node, visit);
	};
	if (ts.isTypeAliasDeclaration(candidate.statement)) visit(candidate.statement.type);
	if (ts.isInterfaceDeclaration(candidate.statement)) visit(candidate.statement);
	return found;
}

/** Rejects initializers whose await would be moved into an unrelated callback. */
function containsAwait(candidate: Candidate): boolean {
	if (!ts.isVariableStatement(candidate.statement)) return false;
	let found = false;
	const visit = (node: ts.Node): void => {
		if (ts.isAwaitExpression(node)) found = true;
		ts.forEachChild(node, visit);
	};
	const initializer = candidate.statement.declarationList.declarations[0]?.initializer;
	if (initializer) visit(initializer);
	return found;
}

/**
 * Checks whether a cross-file variable initializer is a self-contained literal value.
 *
 * @param candidate Variable declaration proposed for inlining.
 *
 * @return `true` when the initializer has no references to module-local bindings.
 */
function crossFileVariableSafe(candidate: Candidate): boolean {
	if (candidate.kind !== 'variable' || !ts.isVariableStatement(candidate.statement)) return false;
	const initializer = candidate.statement.declarationList.declarations[0]?.initializer;
	if (!initializer) return false;
	let safe = true;
	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node) && !((ts.isPropertyAssignment(node.parent) && node.parent.name === node) || (ts.isMethodDeclaration(node.parent) && node.parent.name === node))) safe = false;
		ts.forEachChild(node, visit);
	};
	visit(initializer);
	return safe;
}

/**
 * Checks whether replacing a variable reference would make it an invalid or mutating target.
 *
 * @param reference Reference to a variable candidate.
 *
 * @return `true` when the reference is used as a write target.
 */
function isWriteReference(reference: Reference): boolean {
	let target: ts.Node = reference.node;
	while (target.parent && ((ts.isPropertyAccessExpression(target.parent) && target.parent.expression === target) || (ts.isElementAccessExpression(target.parent) && target.parent.expression === target))) target = target.parent;
	const parent = target.parent;
	return (
		(ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.operator) ||
		(ts.isBinaryExpression(parent) && parent.left === target && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
		ts.isDeleteExpression(parent)
	);
}

/**
 * Identifies a reference that only re-exports an imported binding.
 *
 * @param reference Symbol reference being classified.
 *
 * @return `true` when the reference is part of an export list, not an inline consumer.
 */
function isExportSpecifierReference(reference: Reference): boolean {
	return ts.isExportSpecifier(reference.node.parent);
}

/**
 * Reports declarations that have exactly one in-scope consumer.
 *
 * @param cfg Quality configuration defining the source scope.
 *
 * @return Single-use recommendations with their locations and safety decisions.
 */
export function singleUseFindings(cfg: QualityCfg): SingleUseFinding[] {
	const program = programFor(cfg);
	const checker = program.getTypeChecker();
	const { candidates, references } = collect(cfg, program, checker);
	return candidates.flatMap((c) => {
		if (hasExportSpecifier(c, checker) || hasAstroConsumer(c, cfg, program)) return [];
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeUses(cfg, c, program) : (references.get(c.symbol) ?? []).filter((r) => !isImportNode(r.node) && !isExportSpecifierReference(r));
		if (uses.length !== 1) return [];
		const use = uses[0]!;
		if (!inSingleUseScope(cfg, use.file)) return [];
		if (c.kind === 'function' && c.file !== use.file) return [];
		if (c.kind === 'variable' && c.file !== use.file && !crossFileVariableSafe(c)) return [];
		if ((c.kind === 'type' || c.kind === 'interface') && !crossFileTypeSafe(c, use, checker)) return [];
		if ((c.kind === 'type' || c.kind === 'interface') && containsExplicitAny(c)) return [];
		if (c.kind === 'variable' && containsAwait(c)) return [];
		if (c.kind === 'variable' && isWriteReference(use)) return [];
		const [decision, reason] = classify(c);
		return [{ file: relative(cfg.root, c.file), line: c.source.getLineAndCharacterOfPosition(c.name.getStart(c.source)).line + 1, name: c.name.text, decision, reason }];
	});
}

/**
 * Finds the source span of an imported named binding that refers to a target symbol.
 *
 * @param reference Consumer reference whose import statement may be edited.
 * @param checker TypeScript type checker used to compare canonical symbols.
 * @param tgt Canonical declaration symbol being inlined.
 *
 * @return Import-binding span to remove, or `null` when the reference is not a named import.
 */
function importEdit(reference: Reference, checker: ts.TypeChecker, tgt: ts.Symbol): { start: number; end: number } | null {
	for (const statement of reference.source.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		const bindings = statement.importClause?.namedBindings;
		if (!bindings || !ts.isNamedImports(bindings)) continue;
		const specifier = bindings.elements.find((e) => canonical(checker, checker.getSymbolAtLocation(e.name)) === tgt);
		if (!specifier) continue;
		if (bindings.elements.length === 1) return { start: statement.getStart(reference.source), end: statement.getEnd() };
		const idx = bindings.elements.indexOf(specifier);
		return idx === 0
			? { start: specifier.getStart(reference.source), end: bindings.elements[1]!.getStart(reference.source) }
			: { start: bindings.elements[idx - 1]!.getEnd(), end: specifier.getEnd() };
	}
	return null;
}

/**
 * Builds a function type from a declaration for consumers in a type query.
 *
 * @param statement Function declaration used by the type query.
 *
 * @return A TypeScript function type preserving declared parameters and result.
 */
function functionType(statement: ts.FunctionDeclaration): string {
	const parameters = statement.parameters.map((parameter) =>
		ts.factory.createParameterDeclaration(
			undefined,
			parameter.dotDotDotToken,
			parameter.name,
			parameter.questionToken,
			parameter.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
		),
	);
	const type = ts.factory.createFunctionTypeNode(statement.typeParameters, parameters, statement.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword));
	return ts.createPrinter().printNode(ts.EmitHint.Unspecified, type, statement.getSourceFile());
}

/**
 * Expands a component use into a createElement call so the component remains a React component.
 *
 * @param ref Single JSX component reference.
 * @param replacement Inline function or component expression.
 * @param reactName Local import alias for React's createElement function.
 *
 * @return JSX replacement edit, or `null` when the reference is not a JSX tag.
 */
function jsxInlineEdit(ref: Reference, replacement: string, reactName: string, componentType?: string): { start: number; end: number; text: string } | null {
	const opening = ref.node.parent;
	if ((!ts.isJsxOpeningElement(opening) && !ts.isJsxSelfClosingElement(opening)) || opening.tagName !== ref.node) return null;
	const el = ts.isJsxSelfClosingElement(opening) ? opening : ts.isJsxElement(opening.parent) ? opening.parent : null;
	if (!el) return null;
	const props = opening.attributes.properties.map((attr) => {
		if (ts.isJsxSpreadAttribute(attr)) return `...${attr.expression.getText(ref.source)}`;
		const name = JSON.stringify(attr.name.getText(ref.source));
		if (!attr.initializer) return `${name}: true`;
		if (ts.isStringLiteral(attr.initializer)) return `${name}: ${JSON.stringify(attr.initializer.text)}`;
		if (ts.isJsxExpression(attr.initializer)) return `${name}: ${attr.initializer.expression?.getText(ref.source) ?? 'undefined'}`;
		return `${name}: ${attr.initializer.getText(ref.source)}`;
	});
	if (ts.isJsxElement(el) && el.children.length) props.push(`children: <>${el.children.map((child) => child.getText(ref.source)).join('')}</>`);
	const call = `${reactName}(${componentType ? `(${replacement} as ${componentType})` : replacement}, { ${props.join(', ')} })`;
	const nested = ts.isJsxElement(el.parent) || ts.isJsxFragment(el.parent);
	return { start: el.getStart(ref.source), end: el.getEnd(), text: nested ? `{${call}}` : call };
}

/**
 * Expands a property or namespace access when the declaration is its right-hand identifier.
 *
 * @param n Identifier reference to expand.
 *
 * @return Largest qualified/property access expression containing the identifier.
 */
function referenceTarget(node: ts.Identifier): ts.Node {
	let target: ts.Node = node;
	while (target.parent && ((ts.isQualifiedName(target.parent) && target.parent.right === target) || (ts.isPropertyAccessExpression(target.parent) && target.parent.name === target))) target = target.parent;
	if (
		target.parent &&
		((ts.isTypeReferenceNode(target.parent) && target.parent.typeName === target) || (ts.isExpressionWithTypeArguments(target.parent) && target.parent.expression === target))
	)
		target = target.parent;
	return target;
}

/**
 * Substitutes generic arguments into an inlined type declaration.
 *
 * @param declaration Type declaration supplying the generic parameters.
 * @param reference Consumer type reference carrying the concrete arguments.
 * @param type Type body to expand.
 *
 * @return Expanded type text, or `null` when generic arity does not match.
 */
function inlineGenericType(declaration: ts.TypeAliasDeclaration | ts.InterfaceDeclaration, reference: ts.TypeReferenceNode, type: ts.TypeNode): string | null {
	const parameters = declaration.typeParameters ?? [];
	const arguments_ = reference.typeArguments ?? [];
	if (parameters.length !== arguments_.length) return null;
	const substitutions = new Map(parameters.map((parameter, index) => [parameter.name.text, arguments_[index]!]));
	const transformed = ts.transform(type, [context => {
		const visit: ts.Visitor = node => {
			if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && substitutions.has(node.typeName.text)) return substitutions.get(node.typeName.text)!;
			if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName) && substitutions.has(node.exprName.text)) return substitutions.get(node.exprName.text)!;
			return ts.visitEachChild(node, visit, context);
		};
		return root => ts.visitNode(root, visit) as ts.TypeNode;
	}]);
	const result = ts.createPrinter().printNode(ts.EmitHint.Unspecified, transformed.transformed[0]!, declaration.getSourceFile());
	transformed.dispose();
	return `(${result})`;
}

/**
 * Removes export modifiers and converts a function declaration into an expression.
 *
 * @param statement Function declaration selected for inlining.
 *
 * @return Function expression source or `null` for an overload without a body.
 */
function fnExpr(statement: ts.FunctionDeclaration): string | null {
	if (!statement.body) return null;
	return `(${statement
		.getText(statement.getSourceFile())
		.replace(/^export\s+default\s+/, '')
		.replace(/^export\s+/, '')
		.replace(/^declare\s+/, '')})`;
}

/**
 * Chooses the expression or type text that replaces a declaration reference.
 *
 * @param c Candidate selected for inlining.
 * @param ref Single consumer location.
 *
 * @return Inline source text, or `null` when the declaration has no replacement.
 */
function replacementFor(c: Candidate, ref: Reference, checker: ts.TypeChecker): string | null {
	const typeReference = referenceTarget(ref.node);
	if ((ts.isTypeAliasDeclaration(c.statement) || ts.isInterfaceDeclaration(c.statement)) && ts.isTypeReferenceNode(typeReference)) {
		if (ts.isTypeAliasDeclaration(c.statement)) return inlineGenericType(c.statement, typeReference, c.statement.type);
		const interfaceType = ts.factory.createTypeLiteralNode(c.statement.members);
		return inlineGenericType(c.statement, typeReference, interfaceType);
	}
	if (ts.isTypeAliasDeclaration(c.statement)) return c.statement.typeParameters?.length ? null : `(${c.statement.type.getText(c.source)})`;
	if (ts.isInterfaceDeclaration(c.statement)) {
		if (c.statement.typeParameters?.length) return null;
		const members = `{ ${c.statement.members.map((member) => member.getText(c.source)).join(' ')} }`;
		const bases = c.statement.heritageClauses?.flatMap((clause) => clause.types.map((type) => type.getText(c.source))) ?? [];
		return bases.length ? `(${[...bases, members].join(' & ')})` : `(${members})`;
	}
	if (ts.isFunctionDeclaration(c.statement)) {
		if (ts.isTypeQueryNode(ref.node.parent)) return functionType(c.statement);
		return fnExpr(c.statement);
	}
	if (!ts.isVariableStatement(c.statement)) return null;
	const initializer = c.statement.declarationList.declarations[0]?.initializer;
	if (initializer && ts.isTypeQueryNode(ref.node.parent)) {
		const inferredType = checker.typeToTypeNode(checker.getTypeAtLocation(initializer), undefined, ts.NodeBuilderFlags.NoTruncation);
		return inferredType ? ts.createPrinter().printNode(ts.EmitHint.Unspecified, inferredType, ref.source) : null;
	}
	return initializer ? `(${initializer.getText(c.source)})` : 'undefined';
}

/**
 * Finds a collision-free local name for React's createElement import.
 *
 * @param source Consumer source file.
 *
 * @return An identifier that does not occur in the consumer.
 */
function reactCreateElementName(source: ts.SourceFile): string {
	let name = '__terraQualityCreateElement';
	while (source.text.includes(name)) name += '_';
	return name;
}

/**
 * Places an injected React import after existing imports or the file header.
 *
 * @param source Consumer source file.
 *
 * @return Source offset for the generated import.
 */
function reactImportPosition(source: ts.SourceFile): number {
	const imports = source.statements.filter(ts.isImportDeclaration);
	if (imports.length) return imports[imports.length - 1]!.end;
	return source.statements[0]?.getStart(source) ?? 0;
}

function attachedComments(c: Candidate): { start: number; end: number; text: string }[] {
	const start = c.statement.getFullStart();
	const end = c.statement.getStart(c.source);
	const ranges = ts.getLeadingCommentRanges(c.source.text, start) ?? [];
	return ranges.filter((range, index) => range.end <= end && /^\s*$/.test(c.source.text.slice(range.end, ranges[index + 1]?.pos ?? end))).filter((range) => {
		const value = c.source.text.slice(range.pos, range.end);
		return !(/^\s*$/.test(c.source.text.slice(0, range.pos)) && /^\/\*\*\s*(?:\*\s*)?[\w./-]+\.[cm]?[jt]sx?\b/.test(value)) && !/^\/\*\/{10,}/.test(value) && !/^\/\/\s*[A-Z][A-Z _-]*\s*$/.test(value);
	}).map((range) => ({ start: range.pos, end: range.end, text: c.source.text.slice(range.pos, range.end) }));
}

function discardedDeclarationComments(c: Candidate): string[] {
	if (!ts.isVariableStatement(c.statement)) return [];
	const declaration = c.statement.declarationList.declarations[0];
	if (!declaration?.initializer) return [];
	const start = c.statement.getStart(c.source);
	const prefix = c.source.text.slice(start, declaration.initializer.getStart(c.source));
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, c.source.languageVariant, prefix);
	const comments: string[] = [];
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
		if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) comments.push(scanner.getTokenText());
	}
	return comments;
}

/**
 * Inlines every single-use declaration and validates each rewritten source file.
 *
 * @param cfg Quality configuration defining the source scope and files to rewrite.
 *
 * @return Number of files containing edits, including declaration and consumer files.
 */
function fixSingleUsePass(cfg: QualityCfg, changedFiles: Set<string>): number {
	const program = programFor(cfg);
	const checker = program.getTypeChecker();
	const { candidates, references: refs } = collect(cfg, program, checker);
	const edits = new Map<string, { start: number; end: number; text: string }[]>();
	const pending: { fileEdits: { file: string; start: number; end: number; text: string }[]; referenceLength: number; nestedReference: boolean; jsxFile?: string }[] = [];
	for (const c of candidates) {
		if (hasExportSpecifier(c, checker) || hasAstroConsumer(c, cfg, program)) continue;
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeUses(cfg, c, program) : (refs.get(c.symbol) ?? []).filter((r) => !isImportNode(r.node) && !isExportSpecifierReference(r));
		if (uses.length !== 1) continue;
		const ref = uses[0]!;
		if (!inSingleUseScope(cfg, ref.file)) continue;
		if (c.kind === 'function' && c.file !== ref.file) continue;
		if (c.kind === 'variable' && c.file !== ref.file && !crossFileVariableSafe(c)) continue;
		if ((c.kind === 'type' || c.kind === 'interface') && !crossFileTypeSafe(c, ref, checker)) continue;
		if ((c.kind === 'type' || c.kind === 'interface') && containsExplicitAny(c)) continue;
		if (c.kind === 'variable' && containsAwait(c)) continue;
		if (c.kind === 'variable' && isWriteReference(ref)) continue;
		if (
			c.kind === 'variable' &&
			candidates.some((outer) => {
				if (outer === c || outer.kind !== 'function' || outer.file !== c.file || ref.file !== outer.file) return false;
				if (ref.node.getStart(ref.source) < outer.statement.getStart(outer.source) || ref.node.getEnd() > outer.statement.getEnd()) return false;
				const outerUses = (refs.get(outer.symbol) ?? []).filter((use) => !isImportNode(use.node) && !isExportSpecifierReference(use));
				return outerUses.length === 1 && outer.file === outerUses[0]!.file && inSingleUseScope(cfg, outerUses[0]!.file);
			})
		) continue;
		const replacement = replacementFor(c, ref, checker);
		if (!replacement) continue;
		const comments = attachedComments(c);
		const commentTexts = [...comments.map(({ text: value }) => value), ...discardedDeclarationComments(c)];
		const inlineReplacement = commentTexts.length ? `${commentTexts.map((value) => value.startsWith('//') ? `/* ${value.slice(2).trim()} */` : value).join(' ')} ${replacement}` : replacement;
		const candidateEdits: { file: string; start: number; end: number; text: string }[] = [];
		for (const comment of comments) candidateEdits.push({ file: c.file, start: comment.start, end: comment.end, text: '' });
		const componentType = ts.isFunctionDeclaration(c.statement) && c.statement.parameters[0]?.type ? `React.ComponentType<${c.statement.parameters[0].type.getText(c.source)}>` : undefined;
		const jsxName = jsxInlineEdit(ref, inlineReplacement, reactCreateElementName(ref.source), componentType);
		let jsxFile: string | undefined;
		if (jsxName) {
			candidateEdits.push({ file: ref.file, ...jsxName });
			jsxFile = ref.file;
		} else if (ts.isShorthandPropertyAssignment(ref.node.parent)) {
			candidateEdits.push({ file: ref.file, start: ref.node.getStart(ref.source), end: ref.node.getEnd(), text: `${ref.node.text}: ${inlineReplacement}` });
		} else {
			const target = ts.isTypeQueryNode(ref.node.parent) ? ref.node.parent : referenceTarget(ref.node);
			candidateEdits.push({ file: ref.file, start: target.getStart(ref.source), end: target.getEnd(), text: inlineReplacement });
		}
		const removedImport = importEdit(ref, checker, c.symbol);
		if (removedImport) candidateEdits.push({ file: ref.file, ...removedImport, text: '' });
		candidateEdits.push({ file: c.file, start: c.statement.getStart(c.source), end: c.statement.getEnd(), text: '' });
		const referenceEdit = candidateEdits.find((edit) => edit.file === ref.file && edit.end > edit.start)!;
		const nestedReference = candidates.some(
			(other) => other !== c && other.source === ref.source && ref.node.getStart(ref.source) >= other.statement.getStart(ref.source) && ref.node.getEnd() <= other.statement.getEnd(),
		);
		pending.push({ fileEdits: candidateEdits, referenceLength: referenceEdit.end - referenceEdit.start, nestedReference, jsxFile });
	}
	const selected: typeof pending = [];
	for (const candidate of pending.sort((left, right) => Number(right.nestedReference) - Number(left.nestedReference) || left.referenceLength - right.referenceLength)) {
		const overlaps = selected.some((selectedCandidate) =>
			candidate.fileEdits.some((candidateEdit) =>
				selectedCandidate.fileEdits.some((selectedEdit) => selectedEdit.file === candidateEdit.file && candidateEdit.start < selectedEdit.end && selectedEdit.start < candidateEdit.end),
			),
		);
		if (overlaps) continue;
		selected.push(candidate);
	}
	for (const candidate of selected) for (const edit of candidate.fileEdits) edits.set(edit.file, [...(edits.get(edit.file) ?? []), { start: edit.start, end: edit.end, text: edit.text }]);
	for (const file of new Set(selected.flatMap((candidate) => (candidate.jsxFile ? [candidate.jsxFile] : [])))) {
		const source = program.getSourceFile(file)!;
		const position = reactImportPosition(source);
		edits.set(file, [...(edits.get(file) ?? []), { start: position, end: position, text: `${position ? '\n' : ''}import { createElement as ${reactCreateElementName(source)} } from 'react';\n` }]);
	}
	const updates: { file: string; text: string }[] = [];
	for (const [file, fileEdits] of edits) {
		const src = readFileSync(file, 'utf8');
		const ascending = [...fileEdits].sort((a, b) => a.start - b.start || a.end - b.end);
		if (ascending.some((edit, index) => edit.end > edit.start && index > 0 && ascending[index - 1]!.end > ascending[index - 1]!.start && edit.start < ascending[index - 1]!.end)) continue;
		const updated = ascending.reverse().reduce((t, e) => t.slice(0, e.start) + e.text + t.slice(e.end), src);
		if (updated === src) continue;
		const parsed = ts.createSourceFile(
			file,
			updated,
			ts.ScriptTarget.Latest,
			true,
			file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
		);
		const parseDiagnostics = (parsed as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
		if (parseDiagnostics.length) {
			const diagnostic = parseDiagnostics[0]!;
			const offset = diagnostic.start ?? 0;
			throw new Error(
				`Single-use inline produced invalid syntax in ${relative(cfg.root, file)} near ${JSON.stringify(updated.slice(Math.max(0, offset - 100), Math.min(updated.length, offset + 140)))}: ${parseDiagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('; ')}`,
			);
		}
		updates.push({ file, text: updated });
	}
	for (const { file, text } of updates) {
		writeFileSync(file, text);
		changedFiles.add(file);
	}
	return updates.length;
}

/**
 * Repeats single-use inlining until nested edits have been applied in separate valid passes.
 *
 * @param cfg Quality configuration defining the source scope and files to rewrite.
 *
 * @return Number of files changed across all passes.
 */
export function fixSingleUseDeclarations(cfg: QualityCfg, changedFileNames?: Set<string>): number {
	const changedFiles = new Set<string>();
	for (let pass = 0; pass < 1000; pass++) {
		const changed = fixSingleUsePass(cfg, changedFiles);
		if (changed === 0) {
			for (const file of changedFiles) changedFileNames?.add(file);
			return changedFiles.size;
		}
	}
	throw new Error('Single-use inlining exceeded 1000 passes; check for a rewrite that does not converge.');
}

/**
 * Backwards-compatible name for callers that previously fixed only type declarations.
 *
 * @param cfg Quality configuration defining the source scope and files to rewrite.
 *
 * @return Number of files containing edits.
 */
export function fixSingleUseTypes(cfg: QualityCfg): number {
	return fixSingleUseDeclarations(cfg);
}
