/**
 * packages/quality/src/single-use.ts
 * AST inventory and safe autofix for single-consumer declarations (types, and helpers).
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { dirname, join, relative, sep } from 'node:path';
import { qualityProgress } from './progress.js';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { srcFiles } from './files.js';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const S_REGEX = /^\s*$/;
const C_M_JS_JSX_TS_TSX_REGEX = /\.(?:c|m)?(?:js|jsx|ts|tsx)$/;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

const reportProgress = (label: string, idx: number, total: number): void => {
	if (idx === 0 || idx === total || idx % Math.max(1, Math.ceil(total / 20)) === 0) qualityProgress(label, idx, total);
};
/** A single-consumer source issue and the safety recommendation for handling it. */
export type SingleUseFinding = { file: string; line: number; name: string; decision: 'INLINE' | 'REVIEW'; autofixable: boolean; reason: string; agentAction: string };
/** A declaration eligible for consumer counting and possible inlining. */
type Candidate = { file: string; source: ts.SourceFile; statement: ts.Statement; name: ts.Identifier; symbol: ts.Symbol; kind: 'type' | 'interface' | 'variable' | 'function' };
/** One resolved use of a candidate declaration. */
type Reference = { file: string; source: ts.SourceFile; node: ts.Identifier };
const rejectedInlineCandidates = new Map<string, string>();
const astroConsumerCache = new WeakMap<QualityCfg, { signature: string; consumers: Set<string> }>();
const canonical = (c: ts.TypeChecker, s: ts.Symbol | undefined): ts.Symbol | undefined => (s && s.flags & ts.SymbolFlags.Alias ? c.getAliasedSymbol(s) : s);
const isCandidateStatement = (s: ts.Statement): boolean => {
	if (ts.canHaveModifiers(s) && ts.getModifiers(s)?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) return false;
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

/**
 * Creates the TypeScript program used to identify declarations and their consumers.
 *
 * @param cfg Quality configuration defining the source files to include.
 *
 * @return TypeScript program configured for repository JavaScript and TypeScript sources.
 */
function programFor(cfg: QualityCfg): ts.Program {
	const paths = Object.fromEntries(Object.entries(cfg.aliases ?? {}).map(([p, t]) => [p.endsWith('*') ? p : `${p}*`, [t.endsWith('*') ? t : `${t}*`]]));
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
 * Creates the shared TypeScript program used to validate a complete dead-code edit batch.
 *
 * @param cfg Quality configuration defining the source roots and compiler settings.
 *
 * @return TypeScript program used to inspect and validate the configured source files.
 */
export function deadCodeTypeProgram(cfg: QualityCfg): ts.Program {
	return programFor(cfg);
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
	return roots.some((r) => file === r || file.startsWith(`${r}${sep}`));
}

/**
 * Excludes configured directories from single-use candidate analysis.
 *
 * @param cfg Quality configuration containing source and single-use roots.
 * @param file Absolute source path being considered.
 *
 * @return Whether the path is eligible for single-use analysis.
 */
function isSingleUseCandidate(cfg: QualityCfg, file: string): boolean {
	return inSingleUseScope(cfg, file) && !(cfg.singleUse?.skippedDirectories ?? []).some((directory) => file === directory || file.startsWith(`${directory}${sep}`));
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
	return [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])].some((r) => file === r || file.startsWith(`${r}${sep}`));
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
	const scopedSrcs = program.getSourceFiles().filter((source) => !source.isDeclarationFile && isSingleUseCandidate(cfg, source.fileName) && C_M_JS_JSX_TS_TSX_REGEX.test(source.fileName));
	reportProgress('Single-use declaration scan:', 0, scopedSrcs.length);
	for (const [sourceIndex, source] of scopedSrcs.entries()) {
		reportProgress('Single-use declaration scan:', sourceIndex + 1, scopedSrcs.length);
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
	const referenceSrcs = program.getSourceFiles().filter((source) => !source.isDeclarationFile && inSingleUseRoots(cfg, source.fileName) && C_M_JS_JSX_TS_TSX_REGEX.test(source.fileName));
	const requiredExports = new Map<ts.Symbol, ts.Symbol>();
	for (const src of referenceSrcs) {
		const visitRequires = (node: ts.Node): void => {
			if (
				ts.isVariableDeclaration(node) &&
				ts.isObjectBindingPattern(node.name) &&
				node.initializer &&
				ts.isCallExpression(node.initializer) &&
				ts.isIdentifier(node.initializer.expression) &&
				node.initializer.expression.text === 'require' &&
				node.initializer.arguments.length === 1 &&
				ts.isStringLiteral(node.initializer.arguments[0]!)
			) {
				const moduleSpecifier = node.initializer.arguments[0]!;
				const moduleSrc = program.getSourceFile(ts.resolveModuleName(moduleSpecifier.text, src.fileName, program.getCompilerOptions(), ts.sys).resolvedModule?.resolvedFileName ?? '');
				const moduleSymbol = moduleSrc && checker.getSymbolAtLocation(moduleSrc);
				if (moduleSymbol) {
					const exports = checker.getExportsOfModule(moduleSymbol);
					for (const element of node.name.elements) {
						if (!ts.isIdentifier(element.name) || element.dotDotDotToken) continue;
						const exportName = element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName.text : element.name.text;
						const localSymbol = canonical(checker, checker.getSymbolAtLocation(element.name));
						const exportSymbol = canonical(
							checker,
							exports.find((i) => i.name === exportName),
						);
						if (localSymbol && exportSymbol && candidateSymbols.has(exportSymbol)) requiredExports.set(localSymbol, exportSymbol);
					}
				}
			}
			ts.forEachChild(node, visitRequires);
		};
		visitRequires(src);
	}
	reportProgress('Single-use reference scan:', 0, referenceSrcs.length);
	for (const [sourceIndex, src] of referenceSrcs.entries()) {
		reportProgress('Single-use reference scan:', sourceIndex + 1, referenceSrcs.length);
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
				const symbol = canonical(checker, shorthandSymbol ?? checker.getSymbolAtLocation(node) ?? (ts.isTypeQueryNode(node.parent) ? checker.getSymbolAtLocation(node.parent) : undefined));
				const candidateSymbol = symbol && (candidateSymbols.has(symbol) ? symbol : requiredExports.get(symbol));
				if (!importUse && candidateSymbol) {
					const declaration = declarationByLocation.get(`${src.fileName}:${node.getStart(src)}`);
					const candidate = candidateBySymbol.get(candidateSymbol);
					const selfReference = candidate?.file === src.fileName && node.getStart(src) >= candidate.statement.getStart(src) && node.getEnd() <= candidate.statement.getEnd();
					if (!declaration && !selfReference) references.set(candidateSymbol, [...(references.get(candidateSymbol) ?? []), { file: src.fileName, source: src, node }]);
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
	if (candidate.kind === 'function') return ['REVIEW', 'inlining a function can change its identity, closure, stack, or component behavior'];
	if (candidate.kind === 'variable') {
		if (!initSafeToInline(candidate)) return ['REVIEW', 'initializer is not a side-effect-free primitive constant'];
		return ['INLINE', 'side-effect-free primitive constant has one in-scope consumer'];
	}
	return ['INLINE', `${candidate.kind} declaration has one in-scope consumer`];
}
/**
 * Builds the review action for an eligible or advisory single-use candidate.
 *
 * @param candidate Declaration whose only consumer is being considered.
 * @param use The source reference that consumes the declaration.
 * @param canInline Whether the canonical rewrite can safely apply automatically.
 * @param reason Finding reason used to select a boundary-specific action.
 *
 * @return A concise next step for reviewing or applying the finding.
 */
function singleUseAgentAction(candidate: Candidate, use: Reference, canInline: boolean, reason: string): string {
	if (canInline) return 'Run the canonical dead-code autofix, then verify the inlined type/value remains equivalent and rerun the affected test or typecheck.';
	if (candidate.kind === 'function') {
		if (candidate.file !== use.file)
			return 'Keep the helper in its declaring module unless its module-local dependencies move with it; if you restructure that boundary, preserve closure capture, recursion, async behavior, and the caller contract.';
		const isJsxUse = ts.isJsxOpeningElement(use.node.parent) || ts.isJsxSelfClosingElement(use.node.parent);
		return isJsxUse
			? 'Inline this component at its only JSX use only if React component identity, local state, hooks, effects, and render behavior remain unchanged. Otherwise retain it only for a concrete semantic boundary and verify with a focused render test.'
			: 'Inline this helper at its sole call only if closure capture, recursion, `this`, async boundaries, stack-sensitive behavior, and evaluation order remain unchanged. Otherwise retain it only for a concrete semantic boundary and run its focused test.';
	}
	if (candidate.kind === 'type' || candidate.kind === 'interface')
		return 'Inline this declaration at its sole type use only if generic arguments, imported names, and inferred specificity remain equivalent. Otherwise retain the separate type only when its name is materially useful, and verify with typecheck.';
	if (reason.includes('cross-file initializer'))
		return 'Keep the value in its declaring module unless its module-local dependencies move with it; if you restructure that boundary, verify initialization order and the consumer behavior.';
	if (reason.includes('move await'))
		return 'Keep the await at its current async boundary. Only inline after a deliberate async refactor that preserves sequencing, rejection handling, and the caller contract.';
	if (reason.includes('write target'))
		return 'Keep the binding because its only use is a write target. Do not substitute its initializer unless the same writable location and mutation semantics are preserved.';
	if (reason.includes('imported type annotation'))
		return 'Keep the binding and its imported type annotation together; only inline after preserving the annotation and confirming the affected typecheck.';
	if (reason.includes('explicit any')) return 'Keep the named type boundary unless it can be inlined without introducing explicit any; verify the consumer with typecheck.';
	const reactSrc = /\.(?:tsx|jsx)$/.test(candidate.source.fileName);
	const invariants = reactSrc
		? 'evaluation order and timing, closure capture, identity, writes, React hook order, and observable effects'
		: 'evaluation order and timing, closure capture, identity, writes, and observable effects';
	return `Inline the initializer at its sole use only if ${invariants} remain unchanged. Otherwise retain the binding for the concrete semantic reason reported above and verify the focused behavior.`;
}

/**
 * Finds type-position references to a candidate declaration across the configured source scope.
 *
 * @param candidate Declaration whose references are being filtered.
 * @param references Resolved references grouped by declaration symbol.
 *
 * @return Type references excluding the declaration and import syntax itself.
 */
function typeReferences(candidate: Candidate, references: Map<ts.Symbol, Reference[]>): Reference[] {
	return (references.get(candidate.symbol) ?? []).filter((reference) => {
		const tgt = referenceTgt(reference.node);
		return !isExportSpecifierReference(reference) && (ts.isTypeReferenceNode(tgt) || ts.isExpressionWithTypeArguments(tgt));
	});
}

/**
 * Collects Astro frontmatter and markup consumers once for an analysis run.
 *
 * @param cfg Quality configuration defining the files to inspect.
 * @param program TypeScript program used to map declarations and imports.
 *
 * @return Source-and-name keys for declarations referenced from Astro files.
 */
function astroConsumersFor(cfg: QualityCfg, program: ts.Program): Set<string> {
	const astroFiles = srcFiles(cfg).filter((path) => path.endsWith('.astro'));
	const signature = astroFiles
		.map((f) => {
			const stats = statSync(f);
			return `${f}:${stats.mtimeMs}:${stats.size}`;
		})
		.join('\n');
	let cached = astroConsumerCache.get(cfg);
	if (!cached || cached.signature !== signature) {
		const consumers = new Set<string>();
		for (const f of astroFiles) {
			const raw = readFileSync(f, 'utf8');
			const match = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
			if (!match) continue;
			const src = ts.createSourceFile(f, match[1]!, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
			const markup = raw.slice(match[0].length);
			for (const statement of src.statements) {
				if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
				const bindings = statement.importClause?.namedBindings;
				if (!bindings || !ts.isNamedImports(bindings)) continue;
				const resolved = ts.resolveModuleName(statement.moduleSpecifier.text, f, program.getCompilerOptions(), ts.sys).resolvedModule?.resolvedFileName;
				if (!resolved) continue;
				for (const imported of bindings.elements) {
					if (!markup.includes(imported.name.text)) {
						let used = false;
						const inspect = (node: ts.Node): void => {
							if (node === statement || used) return;
							if (ts.isIdentifier(node) && node.text === imported.name.text && !isImportNode(node)) used = true;
							ts.forEachChild(node, inspect);
						};
						for (const bodyStatement of src.statements) inspect(bodyStatement);
						if (!used) continue;
					}
					consumers.add(`${resolved}\u0000${(imported.propertyName ?? imported.name).text}`);
				}
			}
		}
		cached = { signature, consumers };
		astroConsumerCache.set(cfg, cached);
	}
	return cached.consumers;
}

/**
 * Keeps exported bindings that are imported from Astro frontmatter outside the TypeScript program.
 *
 * @param candidate Candidate declaration whose Astro use should be checked.
 * @param consumers Source-and-name keys collected from Astro frontmatter and markup.
 *
 * @return Whether an Astro file references this declaration.
 */
function hasAstroConsumer(candidate: Candidate, consumers: Set<string>): boolean {
	return consumers.has(`${candidate.file}\u0000${candidate.name.text}`);
}

/**
 * Keeps explicitly configured module contracts out of single-consumer cleanup.
 *
 * @param cfg Quality configuration containing explicit framework export contracts.
 * @param candidate Candidate declaration to match against the configured contract.
 * @param checker TypeScript checker used to confirm the binding is exported.
 *
 * @return Whether this named export is protected by configuration.
 */
function isCfgdPublicContract(cfg: QualityCfg, candidate: Candidate, checker: ts.TypeChecker): boolean {
	const file = relative(cfg.root, candidate.file).split(sep).join('/');
	if (!cfg.frameworkEntryExports?.[file]?.includes(candidate.name.text)) return false;
	const moduleSymbol = checker.getSymbolAtLocation(candidate.source);
	const exported = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === candidate.name.text);
	return Boolean(exported && canonical(checker, exported) === candidate.symbol);
}

/**
 * Keeps declarations exported by a package entrypoint out of local single-use advice.
 *
 * @param cfg Quality configuration defining the repository package root.
 * @param candidate Candidate declaration to match against the package entry points.
 * @param checker TypeScript checker used to resolve module exports.
 *
 * @return Whether the declaration is reachable from a package entry point.
 */
function isPackageEntryExport(cfg: QualityCfg, candidate: Candidate, checker: ts.TypeChecker): boolean {
	const moduleSymbol = checker.getSymbolAtLocation(candidate.source);
	const exported = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === candidate.name.text);
	if (!exported || canonical(checker, exported) !== candidate.symbol) return false;
	for (let dir = dirname(candidate.file); dir.startsWith(cfg.root); dir = dirname(dir)) {
		const manifestPath = join(dir, 'package.json');
		if (!statSync(manifestPath, { throwIfNoEntry: false })?.isFile()) continue;
		try {
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { exports?: unknown; main?: string; module?: string; types?: string; typings?: string };
			const tgts: string[] = [];
			const collectTgts = (val: unknown): void => {
				if (typeof val === 'string') tgts.push(val);
				else if (Array.isArray(val)) val.forEach(collectTgts);
				else if (val && typeof val === 'object') Object.values(val).forEach(collectTgts);
			};
			collectTgts(manifest.exports);
			if (tgts.length === 0) tgts.push(...[manifest.main, manifest.module, manifest.types, manifest.typings].filter((v): v is string => Boolean(v)));
			const relFile = relative(dir, candidate.file).split(sep).join('/');
			for (const tgt of tgts) {
				const norm = tgt.replace(/^\.\//, '').replace(/\.(?:m|c)?(?:js|jsx|ts|tsx|d\.ts)$/, '');
				if (norm === relFile.replace(C_M_JS_JSX_TS_TSX_REGEX, '')) return true;
				const tsconfigPath = join(dir, 'tsconfig.json');
				if (!statSync(tsconfigPath, { throwIfNoEntry: false })?.isFile()) continue;
				const parsed = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
				if (parsed.error) continue;
				const { rootDir, outDir } = ts.parseJsonConfigFileContent(parsed.config, ts.sys, dir).options;
				if (!rootDir || !outDir) continue;
				const outputFile = relative(dir, join(outDir, `${relative(rootDir, candidate.file).replace(C_M_JS_JSX_TS_TSX_REGEX, '')}.js`))
					.split(sep)
					.join('/');
				if (norm === outputFile.replace(C_M_JS_JSX_TS_TSX_REGEX, '')) return true;
			}
			return false;
		} catch {
			return false;
		}
	}
	return false;
}

/**
 * Preserves a React identity hook or interval handle whose one use is required by lifecycle semantics.
 *
 * @param candidate Candidate value declaration whose lifecycle behavior is checked.
 * @param use The candidate's single reference.
 *
 * @return Whether retaining the binding protects hook or interval lifecycle semantics.
 */
function isRequiredLifecycleVal(candidate: Candidate, use: Reference): boolean {
	if (candidate.kind !== 'variable' || !ts.isVariableStatement(candidate.statement)) return false;
	const init = candidate.statement.declarationList.declarations[0]?.initializer;
	if (!init || !ts.isCallExpression(init)) return false;
	const hookCall = ts.isIdentifier(init.expression) && init.expression.text === 'useId';
	const intervalCall =
		ts.isPropertyAccessExpression(init.expression) && ts.isIdentifier(init.expression.expression) && init.expression.expression.text === 'window' && init.expression.name.text === 'setInterval';
	if (hookCall) return true;
	if (!intervalCall || !ts.isCallExpression(use.node.parent)) return false;
	return (
		ts.isPropertyAccessExpression(use.node.parent.expression) &&
		ts.isIdentifier(use.node.parent.expression.expression) &&
		use.node.parent.expression.expression.text === 'window' &&
		use.node.parent.expression.name.text === 'clearInterval'
	);
}

/**
 * Keeps imported type names in scope when an inline would discard their annotation.
 *
 * @param candidate Variable candidate whose explicit annotation might be discarded.
 * @param checker TypeScript checker used to identify whether annotation names are imported.
 *
 * @return Whether inlining would remove a required imported type annotation.
 */
function hasImportedTypeAnnotation(candidate: Candidate, checker: ts.TypeChecker): boolean {
	if (candidate.kind !== 'variable' || !ts.isVariableStatement(candidate.statement)) return false;
	return candidate.statement.declarationList.declarations.some((d) => {
		if (!d.type) return false;
		let imported = false;
		const inspect = (node: ts.Node): void => {
			const symbol = ts.isIdentifier(node) ? checker.getSymbolAtLocation(node) : undefined;
			if (symbol?.flags && symbol.flags & ts.SymbolFlags.Alias) imported = true;
			ts.forEachChild(node, inspect);
		};
		inspect(d.type);
		return imported;
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
	let s = true;
	const visit = (node: ts.Node): void => {
		if (ts.isTypeReferenceNode(node)) {
			const symbol = checker.getSymbolAtLocation(node.typeName);
			const declaration = symbol?.declarations?.[0];
			if (declaration && !ts.isTypeParameterDeclaration(declaration) && declaration.getSourceFile().fileName !== reference.file && declaration.getSourceFile().isDeclarationFile === false) s = false;
		}
		ts.forEachChild(node, visit);
	};
	if (ts.isTypeAliasDeclaration(candidate.statement)) visit(candidate.statement.type);
	if (ts.isInterfaceDeclaration(candidate.statement)) {
		for (const mem of candidate.statement.members) visit(mem);
		for (const clause of candidate.statement.heritageClauses ?? []) visit(clause);
	}
	return s;
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

/**
 * Rejects initializers whose await would be moved into an unrelated callback.
 *
 * @param candidate Candidate declaration whose initializer is inspected.
 *
 * @return Whether the initializer contains an await expression.
 */
function containsAwait(candidate: Candidate): boolean {
	if (!ts.isVariableStatement(candidate.statement)) return false;
	let found = false;
	const visit = (node: ts.Node): void => {
		if (ts.isAwaitExpression(node)) found = true;
		ts.forEachChild(node, visit);
	};
	const init = candidate.statement.declarationList.declarations[0]?.initializer;
	if (init) visit(init);
	return found;
}

/**
 * Rejects expressions whose timing, hook order, or observable identity can change when moved.
 *
 * @param candidate Candidate declaration whose initializer is checked for safe substitution.
 *
 * @return Whether inlining the initializer preserves simple constant evaluation.
 */
function initSafeToInline(candidate: Candidate): boolean {
	if (candidate.kind !== 'variable' || !ts.isVariableStatement(candidate.statement)) return true;
	const declaration = candidate.statement.declarationList.declarations[0];
	const init = declaration?.initializer;
	if (!init || !(candidate.statement.declarationList.flags & ts.NodeFlags.Const) || init.getText(candidate.source).length > 120) return false;
	return (
		ts.isStringLiteral(init) ||
		ts.isNumericLiteral(init) ||
		ts.isNoSubstitutionTemplateLiteral(init) ||
		init.kind === ts.SyntaxKind.TrueKeyword ||
		init.kind === ts.SyntaxKind.FalseKeyword ||
		init.kind === ts.SyntaxKind.NullKeyword
	);
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
	const init = candidate.statement.declarationList.declarations[0]?.initializer;
	if (!init) return false;
	let s = true;
	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node) && !((ts.isPropertyAssignment(node.parent) && node.parent.name === node) || (ts.isMethodDeclaration(node.parent) && node.parent.name === node))) s = false;
		ts.forEachChild(node, visit);
	};
	visit(init);
	return s;
}

/**
 * Checks whether replacing a variable reference would make it an invalid or mutating target.
 *
 * @param reference Reference to a variable candidate.
 *
 * @return `true` when the reference is used as a write target.
 */
function isWriteReference(reference: Reference): boolean {
	let tgt: ts.Node = reference.node;
	while (tgt.parent && ((ts.isPropertyAccessExpression(tgt.parent) && tgt.parent.expression === tgt) || (ts.isElementAccessExpression(tgt.parent) && tgt.parent.expression === tgt))) tgt = tgt.parent;
	return (
		((ts.isPrefixUnaryExpression(tgt.parent) || ts.isPostfixUnaryExpression(tgt.parent)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(tgt.parent.operator)) ||
		(ts.isBinaryExpression(tgt.parent) && tgt.parent.left === tgt && tgt.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && tgt.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
		ts.isDeleteExpression(tgt.parent)
	);
}

/**
 * Preserves saved values used to restore mutable object or property state.
 *
 * @param reference Candidate reference whose assignment target is inspected.
 *
 * @return Whether the reference is a saved value used to restore mutable state.
 */
function isStateRestorationReference(reference: Reference): boolean {
	return (
		ts.isBinaryExpression(reference.node.parent) &&
		reference.node.parent.right === reference.node &&
		reference.node.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
		reference.node.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
		(ts.isPropertyAccessExpression(reference.node.parent.left) || ts.isElementAccessExpression(reference.node.parent.left))
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
 * Classifies single-use declarations using an existing TypeScript analysis.
 *
 * @param cfg Quality configuration defining the source scope.
 * @param checker TypeScript checker belonging to the program.
 * @param candidates Declarations eligible for single-use classification.
 * @param references Resolved references for each declaration symbol.
 * @param astroConsumers Framework references discovered from Astro files.
 * @param program TypeScript program used for declaration and reference analysis.
 *
 * @return Single-use recommendations with their locations and safety decisions.
 */
function findingsFromAnalysis(cfg: QualityCfg, checker: ts.TypeChecker, candidates: Candidate[], references: Map<ts.Symbol, Reference[]>, astroConsumers: Set<string>): SingleUseFinding[] {
	const findings: SingleUseFinding[] = [];
	reportProgress('Single-use classification:', 0, candidates.length);
	for (const [candidateIdx, c] of candidates.entries()) {
		reportProgress('Single-use classification:', candidateIdx + 1, candidates.length);
		if (isCfgdPublicContract(cfg, c, checker) || isPackageEntryExport(cfg, c, checker)) continue;
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeReferences(c, references) : (references.get(c.symbol) ?? []).filter((r) => !isImportNode(r.node) && !isExportSpecifierReference(r));
		if (uses.length !== 1) continue;
		const use = uses[0]!;
		if (!inSingleUseScope(cfg, use.file)) continue;
		if (isRequiredLifecycleVal(c, use)) continue;
		const [initialDecision, initialReason] = classify(c);
		let reason = initialReason;
		let canInline = initialDecision === 'INLINE';
		if (hasAstroConsumer(c, astroConsumers)) continue;
		if (c.kind === 'function') [canInline, reason] = [false, 'inlining a function can change its identity, closure, stack, or component behavior'];
		else if (c.kind === 'variable' && c.file !== use.file && !crossFileVariableSafe(c)) [canInline, reason] = [false, 'cross-file initializer depends on module-local values'];
		else if ((c.kind === 'type' || c.kind === 'interface') && !crossFileTypeSafe(c, use, checker)) [canInline, reason] = [false, 'type depends on declarations that are not available at the consumer'];
		else if ((c.kind === 'type' || c.kind === 'interface') && containsExplicitAny(c)) [canInline, reason] = [false, 'inlining would introduce explicit any'];
		else if (c.kind === 'variable' && containsAwait(c)) [canInline, reason] = [false, 'inlining would move await into another evaluation context'];
		else if (c.kind === 'variable' && !initSafeToInline(c)) [canInline, reason] = [false, 'inlining could change evaluation timing, hook order, or side effects'];
		else if (c.kind === 'variable' && isStateRestorationReference(use)) [canInline, reason] = [false, 'inlining would discard a saved value needed to restore mutable state'];
		else if (c.kind === 'variable' && isWriteReference(use)) [canInline, reason] = [false, 'the sole reference is a write target'];
		else if (c.kind === 'variable' && (ts.isJsxOpeningElement(use.node.parent) || ts.isJsxSelfClosingElement(use.node.parent)))
			[canInline, reason] = [false, 'this is a standalone JSX component; keep its component identity and declaration boundary, or export it from its definition if it is a module-level component'];
		else if (hasImportedTypeAnnotation(c, checker)) [canInline, reason] = [false, 'inlining would remove a required imported type annotation'];
		const decision: SingleUseFinding['decision'] = canInline ? 'INLINE' : 'REVIEW';
		const rejectedReason = rejectedInlineCandidates.get(`${c.file}:${c.name.text}`);
		findings.push({
			file: relative(cfg.root, c.file),
			line: c.source.getLineAndCharacterOfPosition(c.name.getStart(c.source)).line + 1,
			name: c.name.text,
			decision: rejectedReason ? 'REVIEW' : decision,
			autofixable: !rejectedReason && decision === 'INLINE',
			reason: rejectedReason ?? reason,
			agentAction: singleUseAgentAction(c, use, !rejectedReason && canInline, rejectedReason ?? reason),
		});
	}
	return findings;
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
	return findingsFromAnalysis(cfg, checker, candidates, references, astroConsumersFor(cfg, program));
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
function fnType(statement: ts.FunctionDeclaration): string {
	const params = statement.parameters.map((p) =>
		ts.factory.createParameterDeclaration(undefined, p.dotDotDotToken, p.name, p.questionToken, p.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)),
	);
	const type = ts.factory.createFunctionTypeNode(statement.typeParameters, params, statement.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword));
	return ts.createPrinter().printNode(ts.EmitHint.Unspecified, type, statement.getSourceFile());
}

/**
 * Expands a component use into a createElement call so the component remains a React component.
 *
 * @param ref Single JSX component reference.
 * @param replacement Inline function or component expression.
 * @param reactName Local import alias for React's createElement function.
 * @param componentType Optional type annotation applied to the generated component expression.
 *
 * @return JSX replacement edit, or `null` when the reference is not a JSX tag.
 */
function jsxInlineEdit(ref: Reference, replacement: string, reactName: string, componentType?: string): { start: number; end: number; text: string } | null {
	if ((!ts.isJsxOpeningElement(ref.node.parent) && !ts.isJsxSelfClosingElement(ref.node.parent)) || ref.node.parent.tagName !== ref.node) return null;
	const el = ts.isJsxSelfClosingElement(ref.node.parent) ? ref.node.parent : ts.isJsxElement(ref.node.parent.parent) ? ref.node.parent.parent : null;
	if (!el) return null;
	const props = ref.node.parent.attributes.properties.map((a) => {
		if (ts.isJsxSpreadAttribute(a)) return `...${a.expression.getText(ref.source)}`;
		const name = JSON.stringify(a.name.getText(ref.source));
		if (!a.initializer) return `${name}: true`;
		if (ts.isStringLiteral(a.initializer)) return `${name}: ${JSON.stringify(a.initializer.text)}`;
		if (ts.isJsxExpression(a.initializer)) return `${name}: ${a.initializer.expression?.getText(ref.source) ?? 'undefined'}`;
		return `${name}: ${a.initializer.getText(ref.source)}`;
	});
	if (ts.isJsxElement(el) && el.children.length) props.push(`children: <>${el.children.map((c) => c.getText(ref.source)).join('')}</>`);
	const call = `${reactName}(${componentType ? `(${replacement} as ${componentType})` : replacement}, { ${props.join(', ')} })`;
	const nested = ts.isJsxElement(el.parent) || ts.isJsxFragment(el.parent);
	return { start: el.getStart(ref.source), end: el.getEnd(), text: nested ? `{${call}}` : call };
}

/**
 * Expands a property or namespace access when the declaration is its right-hand identifier.
 *
 * @param node Identifier reference whose surrounding access expression is expanded.
 *
 * @return Largest qualified/property access expression containing the identifier.
 */
function referenceTgt(node: ts.Identifier): ts.Node {
	let tgt: ts.Node = node;
	while (tgt.parent && ((ts.isQualifiedName(tgt.parent) && tgt.parent.right === tgt) || (ts.isPropertyAccessExpression(tgt.parent) && tgt.parent.name === tgt))) tgt = tgt.parent;
	if (tgt.parent && ((ts.isTypeReferenceNode(tgt.parent) && tgt.parent.typeName === tgt) || (ts.isExpressionWithTypeArguments(tgt.parent) && tgt.parent.expression === tgt))) tgt = tgt.parent;
	return tgt;
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
	const params = declaration.typeParameters ?? [];
	const arguments_ = reference.typeArguments ?? [];
	if (params.length !== arguments_.length) return null;
	const substitutions = new Map(params.map((p, i) => [p.name.text, arguments_[i]!]));
	const transformed = ts.transform(type, [
		(ctx) => {
			const visit: ts.Visitor = (node) => {
				if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && substitutions.has(node.typeName.text)) return substitutions.get(node.typeName.text)!;
				if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName) && substitutions.has(node.exprName.text)) return substitutions.get(node.exprName.text)!;
				return ts.visitEachChild(node, visit, ctx);
			};
			return (root) => ts.visitNode(root, visit) as ts.TypeNode;
		},
	]);
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
 * @param checker TypeScript checker used to preserve resolved declaration details.
 *
 * @return Inline source text, or `null` when the declaration has no replacement.
 */
function replacementFor(c: Candidate, ref: Reference, checker: ts.TypeChecker): string | null {
	const typeReference = referenceTgt(ref.node);
	if ((ts.isTypeAliasDeclaration(c.statement) || ts.isInterfaceDeclaration(c.statement)) && ts.isTypeReferenceNode(typeReference)) {
		if (ts.isTypeAliasDeclaration(c.statement)) return inlineGenericType(c.statement, typeReference, c.statement.type);
		const interfaceType = ts.factory.createTypeLiteralNode(c.statement.members);
		return inlineGenericType(c.statement, typeReference, interfaceType);
	}
	if (ts.isTypeAliasDeclaration(c.statement)) return c.statement.typeParameters?.length ? null : `(${c.statement.type.getText(c.source)})`;
	if (ts.isInterfaceDeclaration(c.statement)) {
		if (c.statement.typeParameters?.length) return null;
		const mems = `{ ${c.statement.members.map((m) => m.getText(c.source)).join(' ')} }`;
		const bases = c.statement.heritageClauses?.flatMap((v) => v.types.map((t) => t.getText(c.source))) ?? [];
		return bases.length ? `(${[...bases, mems].join(' & ')})` : `(${mems})`;
	}
	if (ts.isFunctionDeclaration(c.statement)) {
		if (ts.isTypeQueryNode(ref.node.parent)) return fnType(c.statement);
		return fnExpr(c.statement);
	}
	if (!ts.isVariableStatement(c.statement)) return null;
	const init = c.statement.declarationList.declarations[0]?.initializer;
	if (init && ts.isTypeQueryNode(ref.node.parent)) {
		const inferredType = checker.typeToTypeNode(checker.getTypeAtLocation(init), undefined, ts.NodeBuilderFlags.NoTruncation);
		return inferredType ? ts.createPrinter().printNode(ts.EmitHint.Unspecified, inferredType, ref.source) : null;
	}
	return init ? `(${init.getText(c.source)})` : 'undefined';
}

/**
 * Finds a collision-free local name for React's createElement import.
 *
 * @param src Consumer source file.
 *
 * @return An identifier that does not occur in the consumer.
 */
function reactCreateElementName(src: ts.SourceFile): string {
	let name = '__terraQualityCreateElement';
	while (src.text.includes(name)) name += '_';
	return name;
}

/**
 * Places an injected React import after existing imports or the file header.
 *
 * @param src Consumer source file.
 *
 * @return Source offset for the generated import.
 */
function reactImportPos(src: ts.SourceFile): number {
	const imports = src.statements.filter(ts.isImportDeclaration);
	if (imports.length) return imports[imports.length - 1]!.end;
	return src.statements[0]?.getStart(src) ?? 0;
}
/**
 * Collects meaningful leading comments that belong to a candidate declaration.
 *
 * @param c Candidate whose leading source comments are being preserved.
 *
 * @return Comment ranges and text that can move safely with an inline rewrite.
 */
function attachedComments(c: Candidate): { start: number; end: number; text: string }[] {
	const start = c.statement.getFullStart();
	const end = c.statement.getStart(c.source);
	const ranges = ts.getLeadingCommentRanges(c.source.text, start) ?? [];
	return ranges
		.filter((r, i) => r.end <= end && S_REGEX.test(c.source.text.slice(r.end, ranges[i + 1]?.pos ?? end)))
		.filter((r) => {
			const val = c.source.text.slice(r.pos, r.end);
			return !(S_REGEX.test(c.source.text.slice(0, r.pos)) && /^\/\*\*\s*(?:\*\s*)?[\w./-]+\.[cm]?[jt]sx?\b/.test(val)) && !/^\/\*\/{10,}/.test(val) && !/^\/\/\s*[A-Z][A-Z _-]*\s*$/.test(val);
		})
		.map((r) => ({ start: r.pos, end: r.end, text: c.source.text.slice(r.pos, r.end) }));
}
/**
 * Extracts comments between a variable declaration and its initializer.
 *
 * @param c Candidate variable declaration being rewritten.
 *
 * @return Comments that would otherwise be lost when the declaration is removed.
 */
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
 * Rejects a batch when its edited files gain TypeScript errors.
 *
 * @param program Original TypeScript program used as the baseline.
 * @param updates Candidate source texts keyed by the edited absolute filename.
 *
 * @return Files whose proposed edits add TypeScript diagnostics.
 */
function filesWithNewTypeErrs(program: ts.Program, updates: Map<string, string>): Set<string> {
	const files = [...updates.keys()];
	const total = files.length * 2;
	qualityProgress('TypeScript validation', 0, total);
	const opts = program.getCompilerOptions();
	const host = ts.createCompilerHost(opts);
	const originalGetSrcFile = host.getSourceFile.bind(host);
	const originalDiagnostics: ts.Diagnostic[] = [];
	for (const [fileIndex, file] of files.entries()) {
		const sourceFile = program.getSourceFile(file);
		if (sourceFile) originalDiagnostics.push(...ts.getPreEmitDiagnostics(program, sourceFile));
		qualityProgress('TypeScript validation', fileIndex + 1, total);
	}
	const virtualFiles = new Map([...updates].map(([f, text]) => [f, text]));
	host.getSourceFile = (fileName, langVersion, onErr, shouldCreateNewSrcFile) => {
		const text = virtualFiles.get(fileName);
		const scriptKind = fileName.endsWith('.tsx')
			? ts.ScriptKind.TSX
			: fileName.endsWith('.jsx')
				? ts.ScriptKind.JSX
				: fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs')
					? ts.ScriptKind.JS
					: ts.ScriptKind.TS;
		return text === undefined ? originalGetSrcFile(fileName, langVersion, onErr, shouldCreateNewSrcFile) : ts.createSourceFile(fileName, text, langVersion, true, scriptKind);
	};
	host.readFile = (fileName) => virtualFiles.get(fileName) ?? ts.sys.readFile(fileName);
	const originalFileExists = host.fileExists.bind(host);
	host.fileExists = (fileName) => virtualFiles.has(fileName) || originalFileExists(fileName);
	const updatedProgram = ts.createProgram({ rootNames: program.getRootFileNames(), options: opts, host });
	const diagnosticKey = (diagnostic: ts.Diagnostic): string => `${diagnostic.code}:${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
	const prevCounts = new Map<string, Map<string, number>>();
	for (const diagnostic of originalDiagnostics) {
		if (diagnostic.category !== ts.DiagnosticCategory.Error || !diagnostic.file) continue;
		const counts = prevCounts.get(diagnostic.file.fileName) ?? new Map<string, number>();
		const key = diagnosticKey(diagnostic);
		counts.set(key, (counts.get(key) ?? 0) + 1);
		prevCounts.set(diagnostic.file.fileName, counts);
	}
	const currCounts = new Map<string, Map<string, number>>();
	for (const [fileIndex, file] of files.entries()) {
		const sourceFile = updatedProgram.getSourceFile(file);
		if (sourceFile) {
			for (const diagnostic of ts.getPreEmitDiagnostics(updatedProgram, sourceFile)) {
				if (diagnostic.category !== ts.DiagnosticCategory.Error || !diagnostic.file) continue;
				const counts = currCounts.get(diagnostic.file.fileName) ?? new Map<string, number>();
				const key = diagnosticKey(diagnostic);
				counts.set(key, (counts.get(key) ?? 0) + 1);
				currCounts.set(diagnostic.file.fileName, counts);
			}
		}
		qualityProgress('TypeScript validation', files.length + fileIndex + 1, total);
	}
	const introducedErrs = [...currCounts].some(([f, after]) => {
		const before = prevCounts.get(f) ?? new Map<string, number>();
		return [...after].some(([key, count]) => count > (before.get(key) ?? 0));
	});
	return introducedErrs ? new Set(updates.keys()) : new Set();
}

/**
 * Returns whether a proposed batch adds any TypeScript error in an edited file.
 *
 * @param program Original TypeScript program used as the baseline.
 * @param updates Candidate source texts keyed by the edited absolute filename.
 *
 * @return Whether any edited file would gain TypeScript diagnostics.
 */
export function deadCodeEditsIntroduceTypeErrors(program: ts.Program, updates: Map<string, string>): boolean {
	return filesWithNewTypeErrs(program, updates).size > 0;
}

/**
 * Inlines every single-use declaration and validates each rewritten source file.
 *
 * @param cfg Quality configuration defining the source scope and files to rewrite.
 * @param changedFiles Set updated with files that receive a validated rewrite.
 * @param finalFindings Optional caller array populated from this final analysis when no rewrite remains.
 *
 * @return Number of files containing edits, including declaration and consumer files.
 */
function fixSingleUsePass(cfg: QualityCfg, changedFiles: Set<string>, finalFindings?: SingleUseFinding[]): number {
	const program = programFor(cfg);
	const checker = program.getTypeChecker();
	const { candidates, references: refs } = collect(cfg, program, checker);
	const astroConsumers = astroConsumersFor(cfg, program);
	const edits = new Map<string, { start: number; end: number; text: string }[]>();
	const pending: { fileEdits: { file: string; start: number; end: number; text: string }[]; referenceLength: number; nestedReference: boolean; candidateKey: string; jsxFile?: string }[] = [];
	for (const c of candidates) {
		if (hasAstroConsumer(c, astroConsumers) || isCfgdPublicContract(cfg, c, checker) || isPackageEntryExport(cfg, c, checker)) continue;
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeReferences(c, refs) : (refs.get(c.symbol) ?? []).filter((r) => !isImportNode(r.node) && !isExportSpecifierReference(r));
		if (uses.length !== 1) continue;
		const ref = uses[0]!;
		if (!inSingleUseScope(cfg, ref.file)) continue;
		if (isRequiredLifecycleVal(c, ref)) continue;
		if (c.kind === 'variable' && (ts.isJsxOpeningElement(ref.node.parent) || ts.isJsxSelfClosingElement(ref.node.parent))) continue;
		if (c.kind === 'function') continue;
		if (c.kind === 'variable' && c.file !== ref.file && !crossFileVariableSafe(c)) continue;
		if ((c.kind === 'type' || c.kind === 'interface') && !crossFileTypeSafe(c, ref, checker)) continue;
		if ((c.kind === 'type' || c.kind === 'interface') && containsExplicitAny(c)) continue;
		if (c.kind === 'variable' && containsAwait(c)) continue;
		if (c.kind === 'variable' && !initSafeToInline(c)) continue;
		if (c.kind === 'variable' && isStateRestorationReference(ref)) continue;
		if (c.kind === 'variable' && isWriteReference(ref)) continue;
		if (hasImportedTypeAnnotation(c, checker)) continue;
		if (
			c.kind === 'variable' &&
			candidates.some((o) => {
				if (o === c || o.kind !== 'function' || o.file !== c.file || ref.file !== o.file) return false;
				if (ref.node.getStart(ref.source) < o.statement.getStart(o.source) || ref.node.getEnd() > o.statement.getEnd()) return false;
				const outerUses = (refs.get(o.symbol) ?? []).filter((u) => !isImportNode(u.node) && !isExportSpecifierReference(u));
				return outerUses.length === 1 && o.file === outerUses[0]!.file && inSingleUseScope(cfg, outerUses[0]!.file);
			})
		)
			continue;
		const replacement = replacementFor(c, ref, checker);
		if (!replacement) continue;
		const comments = attachedComments(c);
		const commentTexts = [...comments.map(({ text: val }) => val).filter((val) => !val.startsWith('/**')), ...discardedDeclarationComments(c)];
		const inlineReplacement = commentTexts.length ? `${commentTexts.map((v) => (v.startsWith('//') ? `/* ${v.slice(2).trim()} */` : v)).join(' ')} ${replacement}` : replacement;
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
			const tgt = ts.isTypeQueryNode(ref.node.parent) ? ref.node.parent : referenceTgt(ref.node);
			candidateEdits.push({ file: ref.file, start: tgt.getStart(ref.source), end: tgt.getEnd(), text: inlineReplacement });
		}
		const removedImport = importEdit(ref, checker, c.symbol);
		if (removedImport) candidateEdits.push({ file: ref.file, ...removedImport, text: '' });
		candidateEdits.push({ file: c.file, start: c.statement.getStart(c.source), end: c.statement.getEnd(), text: '' });
		const referenceEdit = candidateEdits.find((e) => e.file === ref.file && e.end > e.start)!;
		const nestedReference = candidates.some(
			(o) => o !== c && o.source === ref.source && ref.node.getStart(ref.source) >= o.statement.getStart(ref.source) && ref.node.getEnd() <= o.statement.getEnd(),
		);
		pending.push({ fileEdits: candidateEdits, referenceLength: referenceEdit.end - referenceEdit.start, nestedReference, candidateKey: `${c.file}:${c.name.text}`, jsxFile });
	}
	const selected: typeof pending = [];
	for (const candidate of pending.sort((l, r) => Number(r.nestedReference) - Number(l.nestedReference) || l.referenceLength - r.referenceLength)) {
		if (selected.some((other) => candidate.fileEdits.some((edit) => other.fileEdits.some((existing) => edit.file === existing.file && edit.start < existing.end && existing.start < edit.end))))
			continue;
		selected.push(candidate);
	}
	let remaining = selected;
	while (remaining.length) {
		edits.clear();
		const jsxFiles = new Set(remaining.flatMap((c) => (c.jsxFile ? [c.jsxFile] : [])));
		for (const candidate of remaining) for (const edit of candidate.fileEdits) edits.set(edit.file, [...(edits.get(edit.file) ?? []), edit]);
		for (const file of jsxFiles) {
			const source = program.getSourceFile(file)!;
			const pos = reactImportPos(source);
			edits.set(file, [...(edits.get(file) ?? []), { start: pos, end: pos, text: `${pos ? '\n' : ''}import { createElement as ${reactCreateElementName(source)} } from 'react';\n` }]);
		}
		const invalidFiles = new Set<string>();
		for (const [file, fileEdits] of edits) {
			const source = program.getSourceFile(file);
			const ascending = [...fileEdits].sort((a, b) => a.start - b.start || a.end - b.end);
			if (!source || ascending.some((edit, i) => i > 0 && edit.end > edit.start && ascending[i - 1]!.end > ascending[i - 1]!.start && edit.start < ascending[i - 1]!.end)) {
				invalidFiles.add(file);
				continue;
			}
			const original = readFileSync(file, 'utf8');
			const updated = ascending.reverse().reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), original);
			const parsed = ts.createSourceFile(
				file,
				updated,
				ts.ScriptTarget.Latest,
				true,
				file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
			);
			if ((parsed as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) invalidFiles.add(file);
		}
		if (!invalidFiles.size) break;
		const rejected = remaining.filter((c) => c.fileEdits.some((edit) => invalidFiles.has(edit.file)) || (c.jsxFile && invalidFiles.has(c.jsxFile)));
		for (const candidate of rejected)
			rejectedInlineCandidates.set(
				candidate.candidateKey,
				`the combined inline in ${[...invalidFiles].map((f) => relative(cfg.root, f)).join(', ')} would produce invalid syntax; resolve this candidate manually`,
			);
		remaining = remaining.filter((c) => !rejected.includes(c));
	}
	const updates: { file: string; text: string }[] = [];
	for (const [file, fileEdits] of edits) {
		const src = readFileSync(file, 'utf8');
		const ascending = [...fileEdits].sort((a, b) => a.start - b.start || a.end - b.end);
		if (ascending.some((e, i) => e.end > e.start && i > 0 && ascending[i - 1]!.end > ascending[i - 1]!.start && e.start < ascending[i - 1]!.end)) continue;
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
		if (parseDiagnostics.length) continue;
		updates.push({ file, text: updated });
	}
	for (const { file, text } of updates) {
		writeFileSync(file, text);
		changedFiles.add(file);
	}
	if (!updates.length && finalFindings) finalFindings.splice(0, finalFindings.length, ...findingsFromAnalysis(cfg, checker, candidates, refs, astroConsumers));
	return updates.length;
}

/**
 * Repeats single-use inlining until nested edits have been applied in separate valid passes.
 *
 * @param cfg Quality configuration defining the source scope and files to rewrite.
 * @param changedFileNames Optional caller-owned set updated with files changed by this run.
 * @param onPass Optional callback invoked after each pass with its index and changed-file count.
 * @param finalFindings Optional array populated from the final pass's already-scanned declarations and references.
 *
 * @return Number of files changed across all passes.
 */
export function fixSingleUseDeclarations(cfg: QualityCfg, changedFileNames?: Set<string>, onPass?: (pass: number, changedFiles: number) => void, finalFindings?: SingleUseFinding[]): number {
	rejectedInlineCandidates.clear();
	const changedFiles = new Set<string>();
	for (let pass = 0; pass < 1000; pass++) {
		onPass?.(pass + 1, changedFiles.size);
		const changed = fixSingleUsePass(cfg, changedFiles, finalFindings);
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
