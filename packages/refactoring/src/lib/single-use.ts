/**
 * packages/quality/src/lib/single-use.ts
 * AST inventory and safe autofix for single-consumer declarations (types, and helpers).
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { basename, dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { hasGeneratedSourceHeader, qualityProgress, srcFiles } from '@terra-symposium/standards-quality-core';
import { readFileSync, statSync, writeFileSync } from 'node:fs';

// TYPES
import type { QualityCfg } from '@terra-symposium/standards-quality-core';
const S_U_REGEX = /^\s*$/u;

const S_S_W_CM_JT_SX_B_REGEX = /^\/\*\*\s*(?:\*\s*)?[\w./-]+\.[cm]?[jt]sx?\b/;
const PLAYWRIGHT_QUERY_METHODS = new Set([
	'first',
	'frameLocator',
	'getByAltText',
	'getByDisplayValue',
	'getByLabel',
	'getByPlaceholder',
	'getByRole',
	'getByTestId',
	'getByText',
	'getByTitle',
	'last',
	'locator',
	'nth',
	'filter',
]);
const REPEATED_CALLBACK_METHODS = new Set(['every', 'filter', 'find', 'findIndex', 'findLast', 'findLastIndex', 'flatMap', 'forEach', 'map', 'reduce', 'reduceRight', 'some', 'sort']);

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const S_REGEX = /^\s*$/;
const C_M_JS_JSX_TS_TSX_REGEX = /\.(?:c|m)?(?:js|jsx|ts|tsx)$/;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Reports progress at the start, end, and roughly twenty evenly spaced points of an analysis pass.
 *
 * @param label Name of the analysis phase shown to the user.
 * @param idx Number of completed items in the current phase.
 * @param total Total items scheduled for the current phase.
 */
const reportProgress = (label: string, idx: number, total: number): void => {
	if (idx === 0 || idx === total || idx % Math.max(1, Math.ceil(total / 20)) === 0) qualityProgress(label, idx, total);
};
/** A single-consumer source issue and the safety recommendation for handling it. */
export type SingleUseFinding = { file: string; line: number; name: string; decision: 'INLINE' | 'REVIEW'; autofixable: boolean; reason: string; agentAction: string };
/** A declaration eligible for consumer counting and possible inlining. */
type Candidate = { file: string; source: ts.SourceFile; statement: ts.Statement; name: ts.Identifier; symbol: ts.Symbol; kind: 'type' | 'interface' | 'variable' | 'function' };
/**
 * Detects authored TSDoc that the single-use fixer must preserve for agent review.
 *
 * @param candidate Declaration whose leading comments are inspected.
 *
 * @return Whether the candidate has authored TSDoc rather than a generated path comment.
 */
const hasMeaningfulLeadingTSDoc = (candidate: Candidate): boolean =>
	(ts.getLeadingCommentRanges(candidate.source.text, candidate.statement.getFullStart()) ?? []).some(range => {
		const comment = candidate.source.text.slice(range.pos, range.end);
		return comment.startsWith('/**') && !S_S_W_CM_JT_SX_B_REGEX.test(comment);
	});
/** One resolved use of a candidate declaration. */
type Reference = { file: string; source: ts.SourceFile; node: ts.Identifier };
/** A single-use exception, valid only when it names a declaration and explains its boundary. */
type SingleUseIgnoreDirective = { source: ts.SourceFile; line: number; reason?: string; candidateKey?: string };
const SINGLE_USE_IGNORE_PREFIX_REGEX = /^\/\/\s*terra-quality-ignore\s+single-use\b/;
const SINGLE_USE_IGNORE_DOC_GAP_REGEX = /^[ \t]*\r?\n[ \t]*\/\*\*[\s\S]*?\*\/[ \t]*\r?\n[ \t]*$/;
const rejectedInlineCandidates = new Map<string, string>();
const astroConsumerCache = new WeakMap<QualityCfg, { signature: string; consumers: Set<string> }>();
const repeatedCallbackOwnerCache = new WeakMap<ts.SourceFile, Set<ts.Symbol>>();
const dynamicScopeCache = new WeakMap<ts.SourceFile, boolean>();
/**
 * Resolves alias symbols before candidate/reference identity comparisons.
 *
 * @param c Type checker that can follow symbol aliases.
 * @param s Symbol to canonicalize, when one was found.
 *
 * @return Target symbol for aliases, the original symbol, or `undefined`.
 */
const canonical = (c: ts.TypeChecker, s: ts.Symbol | undefined): ts.Symbol | undefined => (s && s.flags & ts.SymbolFlags.Alias ? c.getAliasedSymbol(s) : s);
/**
 * Checks whether a syntax node is part of an import declaration.
 *
 * @param n Node whose containing source is inspected.
 *
 * @return Whether the node appears within an import statement.
 */
const isImportNode = (n: ts.Node): boolean => {
	const src = n.getSourceFile();
	if (src.statements.some(s => ts.isImportDeclaration(s) && n.getStart(src) >= s.getStart(src) && n.getEnd() <= s.getEnd())) return true;
	for (let parent: ts.Node | undefined = n.parent; parent && !ts.isSourceFile(parent); parent = parent.parent) if (ts.isImportDeclaration(parent)) return true;
	return false;
};

/**
 * Resolves reasoned single-use exceptions beside one declaration.
 *
 * @param cfg Quality configuration defining the in-scope source roots.
 * @param sources TypeScript source files from the current analysis program.
 * @param candidates Eligible declarations which may receive a directive.
 *
 * @return Every marker and the declaration it protects, when present.
 */
function singleUseIgnoreDirectives(
	cfg: QualityCfg,
	sources: readonly ts.SourceFile[],
	candidates: readonly Candidate[],
): { directives: SingleUseIgnoreDirective[]; byCandidate: Map<string, SingleUseIgnoreDirective> } {
	const directives: SingleUseIgnoreDirective[] = [];
	const byCandidate = new Map<string, SingleUseIgnoreDirective>();
	for (const source of sources) {
		if (source.isDeclarationFile || !inSingleUseScope(cfg, source.fileName)) continue;
		const comments = new Map<number, ts.CommentRange>();
		const nodes: ts.Node[] = [source];
		while (nodes.length) {
			const node = nodes.pop()!;
			for (const range of [...(ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? []), ...(ts.getTrailingCommentRanges(source.text, node.getEnd()) ?? [])])
				if (range.kind === ts.SyntaxKind.SingleLineCommentTrivia) comments.set(range.pos, range);
			node.forEachChild(child => {
				nodes.push(child);
			});
		}
		for (const range of [...comments.values()].sort((left, right) => left.pos - right.pos)) {
			if (!SINGLE_USE_IGNORE_PREFIX_REGEX.test(source.text.slice(range.pos, range.end))) continue;
			const start = range.pos;
			const line = source.getLineAndCharacterOfPosition(start).line + 1;
			const attached = candidates.find(candidate => {
				if (candidate.source !== source) return false;
				return (
					(range.end <= candidate.statement.getStart(source) &&
						((source.getLineAndCharacterOfPosition(candidate.statement.getStart(source)).line + 1 === line + 1 && S_REGEX.test(source.text.slice(range.end, candidate.statement.getStart(source)))) ||
							SINGLE_USE_IGNORE_DOC_GAP_REGEX.test(source.text.slice(range.end, candidate.statement.getStart(source))))) ||
					(source.getLineAndCharacterOfPosition(candidate.statement.getEnd()).line + 1 === line &&
						candidate.statement.getEnd() <= start &&
						S_REGEX.test(source.text.slice(candidate.statement.getEnd(), start)))
				);
			});
			const candidateKey = attached ? `${attached.file}:${attached.name.getStart(attached.source)}` : undefined;
			const directive = { source, line, reason: /^\/\/\s*terra-quality-ignore\s+single-use\s+--\s*(\S.*)$/.exec(source.text.slice(range.pos, range.end))?.[1]?.trim(), candidateKey };
			directives.push(directive);
			if (candidateKey && !byCandidate.has(candidateKey)) byCandidate.set(candidateKey, directive);
		}
	}
	return { directives, byCandidate };
}

/**
 * Reports an invalid, detached, duplicate, or stale single-use exception.
 *
 * @param cfg Quality configuration defining repository-relative paths.
 * @param directive Inline single-use marker to report.
 *
 * @return A blocking finding that requires the marker to be corrected or removed.
 */
function singleUseDirectiveFinding(cfg: QualityCfg, directive: SingleUseIgnoreDirective): SingleUseFinding {
	return {
		file: relative(cfg.root, directive.source.fileName),
		line: directive.line,
		name: 'single-use-ignore',
		decision: 'REVIEW',
		autofixable: false,
		reason: !directive.reason
			? 'single-use ignore markers require a concrete reason after --'
			: !directive.candidateKey
				? 'single-use ignore marker must be immediately before or after one declaration'
				: 'single-use ignore marker is stale or duplicated; its declaration has no matching single-use finding',
		agentAction: 'Attach the marker to one declaration with a concrete reason, or remove it when the declaration no longer has one in-scope consumer.',
	};
}

/**
 * Creates the TypeScript program used to identify declarations and their consumers.
 *
 * @param cfg Quality configuration defining the source files to include.
 *
 * @return TypeScript program configured for repository JavaScript and TypeScript sources.
 */
function programFor(cfg: QualityCfg): ts.Program {
	return ts.createProgram({
		rootNames: srcFiles(cfg).filter(f => C_M_JS_JSX_TS_TSX_REGEX.test(f)),
		options: {
			allowJs: true,
			baseUrl: cfg.root,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			paths: Object.fromEntries(Object.entries(cfg.aliases ?? {}).map(([p, t]) => [p.endsWith('*') ? p : `${p}*`, [t.endsWith('*') ? t : `${t}*`]])),
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
 * @param cfg Quality configuration containing source roots.
 * @param file Absolute source path being considered.
 *
 * @return `true` when the file is in scope for the single-use rule.
 */
function inSingleUseScope(cfg: QualityCfg, file: string): boolean {
	if (file.split(sep).some(part => part === 'node_modules' || part === '.pnpm')) return false;
	return [...cfg.sourceRoots, ...(cfg.includeRoots ?? [])].some(r => file === r || file.startsWith(`${r}${sep}`));
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
	const references = new Map<ts.Symbol, Reference[]>();
	const scopedSrcs = program.getSourceFiles().filter(source => {
		if (source.isDeclarationFile || !C_M_JS_JSX_TS_TSX_REGEX.test(source.fileName) || !inSingleUseScope(cfg, source.fileName)) return false;
		return !(cfg.singleUse?.skippedDirectories ?? []).some(skipped => {
			const normalized = normalize(skipped.replaceAll('\\', '/'));
			if (!normalized || normalized === '.') return false;
			if (!normalized.includes(sep)) return basename(source.fileName) === normalized || source.fileName.split(sep).includes(normalized);
			const skippedPath = resolve(cfg.root, normalized);
			return source.fileName === skippedPath || source.fileName.startsWith(`${skippedPath}${sep}`);
		});
	});
	reportProgress('Single-use declaration scan:', 0, scopedSrcs.length);
	for (const [sourceIndex, source] of scopedSrcs.entries()) {
		reportProgress('Single-use declaration scan:', sourceIndex + 1, scopedSrcs.length);

		const visitCandidates = (node: ts.Node): void => {
			const statement = node as ts.Statement;
			if (
				(ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.DeclareKeyword)) ||
				!(
					ts.isTypeAliasDeclaration(statement) ||
					ts.isInterfaceDeclaration(statement) ||
					(ts.isFunctionDeclaration(statement) && Boolean(statement.body)) ||
					(ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1 && ts.isIdentifier(statement.declarationList.declarations[0]?.name))
				)
			) {
				ts.forEachChild(node, visitCandidates);
				return;
			}
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
			const candidate = {
				file: source.fileName,
				source,
				statement,
				name,
				symbol,
				kind: ts.isTypeAliasDeclaration(statement) ? 'type' : ts.isInterfaceDeclaration(statement) ? 'interface' : ts.isFunctionDeclaration(statement) ? 'function' : 'variable',
			} satisfies Candidate;
			candidates.push(candidate);
			declarationByLocation.set(`${source.fileName}:${name.getStart(source)}`, candidate);
			ts.forEachChild(node, visitCandidates);
		};
		visitCandidates(source);
	}
	const candidateSymbols = new Set(candidates.map(c => c.symbol));
	const referenceSrcs = program.getSourceFiles().filter(source => !source.isDeclarationFile && inSingleUseScope(cfg, source.fileName) && C_M_JS_JSX_TS_TSX_REGEX.test(source.fileName));
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
				const moduleSrc = program.getSourceFile(ts.resolveModuleName(node.initializer.arguments[0]!.text, src.fileName, program.getCompilerOptions(), ts.sys).resolvedModule?.resolvedFileName ?? '');
				const moduleSymbol = moduleSrc && checker.getSymbolAtLocation(moduleSrc);
				if (moduleSymbol) {
					for (const element of node.name.elements) {
						if (!ts.isIdentifier(element.name) || element.dotDotDotToken) continue;
						const localSymbol = canonical(checker, checker.getSymbolAtLocation(element.name));
						const exportSymbol = canonical(
							checker,
							checker
								.getExportsOfModule(moduleSymbol)
								.find(i => i.name === (element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName.text : ts.isIdentifier(element.name) ? element.name.text : '')),
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
				const symbol = canonical(
					checker,
					(ts.isShorthandPropertyAssignment(node.parent) ? checker.getShorthandAssignmentValueSymbol(node.parent) : undefined) ??
						checker.getSymbolAtLocation(node) ??
						(ts.isTypeQueryNode(node.parent) ? checker.getSymbolAtLocation(node.parent) : undefined),
				);
				const candidateSymbol = symbol && (candidateSymbols.has(symbol) ? symbol : requiredExports.get(symbol));
				if (!importUse && candidateSymbol) {
					if (!declarationByLocation.has(`${src.fileName}:${node.getStart(src)}`))
						references.set(candidateSymbol, [...(references.get(candidateSymbol) ?? []), { file: src.fileName, source: src, node }]);
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(src);
	}
	return { candidates, references };
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
	return (references.get(candidate.symbol) ?? []).filter(reference => {
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
	const astroFiles = srcFiles({ ...cfg, extensions: [...new Set([...cfg.extensions, '.astro'])] }).filter(path => path.endsWith('.astro'));
	const signature = astroFiles
		.map(f => {
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
			for (const statement of src.statements) {
				if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
				const bindings = statement.importClause?.namedBindings;
				if (!bindings || !ts.isNamedImports(bindings)) continue;
				const resolved = ts.resolveModuleName(statement.moduleSpecifier.text, f, program.getCompilerOptions(), ts.sys).resolvedModule?.resolvedFileName;
				if (!resolved) continue;
				for (const imported of bindings.elements) {
					if (!raw.slice(match[0].length).includes(imported.name.text)) {
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
	if (!cfg.frameworkEntryExports?.[relative(cfg.root, candidate.file).split(sep).join('/')]?.includes(candidate.name.text)) return false;
	const moduleSymbol = checker.getSymbolAtLocation(candidate.source);
	const exported = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find(symbol => symbol.name === candidate.name.text);
	return Boolean(exported && canonical(checker, exported) === candidate.symbol);
}

/**
 * Keeps module-exported declarations intact because consumers may exist outside the scanned source roots.
 *
 * @param candidate Declaration whose source module is inspected.
 * @param checker TypeScript checker used to resolve the source module's exports.
 *
 * @return Whether the declaration is reachable through any module export.
 */
function isModuleExport(candidate: Candidate, checker: ts.TypeChecker): boolean {
	const moduleSymbol = checker.getSymbolAtLocation(candidate.source);
	return Boolean(moduleSymbol && checker.getExportsOfModule(moduleSymbol).some(exported => canonical(checker, exported) === candidate.symbol));
}

/**
 * Keeps declarations exported by a package entrypoint out of local single-use advice.
 *
 * @param cfg Quality configuration defining the repository package root.
 * @param candidate Candidate declaration to match against the package entry points.
 * @param checker TypeScript checker used to resolve module exports.
 * @param program Program used to inspect package entry modules.
 *
 * @return Whether the declaration is reachable from a package entry point.
 */
function isPackageEntryExport(cfg: QualityCfg, candidate: Candidate, checker: ts.TypeChecker, program: ts.Program): boolean {
	const moduleSymbol = checker.getSymbolAtLocation(candidate.source);
	const exported = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find(symbol => symbol.name === candidate.name.text);
	if (!exported || canonical(checker, exported) !== candidate.symbol) return false;
	for (let dir = dirname(candidate.file); dir.startsWith(cfg.root); dir = dirname(dir)) {
		const manifestPath = join(dir, 'package.json');
		if (!statSync(manifestPath, { throwIfNoEntry: false })?.isFile()) continue;
		try {
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { exports?: unknown; main?: string; module?: string; types?: string; typings?: string };
			const tgts: string[] = [];
			const pending: unknown[] = [manifest.exports];
			while (pending.length) {
				const value = pending.pop();
				if (typeof value === 'string') tgts.push(value);
				else if (Array.isArray(value)) pending.push(...value);
				else if (value && typeof value === 'object') pending.push(...Object.values(value));
			}
			if (tgts.length === 0) tgts.push(...[manifest.main, manifest.module, manifest.types, manifest.typings].filter((v): v is string => Boolean(v)));
			for (const tgt of tgts) {
				const norm = tgt.replace(/^\.\//, '').replace(/\.(?:m|c)?(?:js|jsx|ts|tsx|d\.ts)$/, '');
				if (norm === relative(dir, candidate.file).split(sep).join('/').replace(C_M_JS_JSX_TS_TSX_REGEX, '')) return true;
				const tsconfigPath = [join(dir, 'tsconfig.json'), join(dir, 'config/tsconfig.json'), join(cfg.configRoot ?? join(cfg.root, 'config'), 'tsconfig.json')].find(path =>
					statSync(path, { throwIfNoEntry: false })?.isFile(),
				);
				if (!tsconfigPath) continue;
				const parsed = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
				if (parsed.error) continue;
				const { rootDir, outDir } = ts.parseJsonConfigFileContent(parsed.config, ts.sys, dirname(tsconfigPath)).options;
				if (!rootDir || !outDir) continue;
				if (
					norm ===
					relative(dir, join(outDir, `${relative(rootDir, candidate.file).replace(C_M_JS_JSX_TS_TSX_REGEX, '')}.js`))
						.split(sep)
						.join('/')
						.replace(C_M_JS_JSX_TS_TSX_REGEX, '')
				)
					return true;
				const entryOutput = relative(outDir, resolve(dir, norm)).split(sep).join('/');
				if (entryOutput === '..' || entryOutput.startsWith('../')) continue;
				const entrySource = program.getSourceFiles().find(source => {
					const entryPath = relative(rootDir, source.fileName).replace(C_M_JS_JSX_TS_TSX_REGEX, '').split(sep).join('/');
					return entryPath === entryOutput || entryPath === `${entryOutput === '.' ? '' : entryOutput}/index`;
				});
				const entrySymbol = entrySource && checker.getSymbolAtLocation(entrySource);
				if (entrySymbol && checker.getExportsOfModule(entrySymbol).some(entryExport => canonical(checker, entryExport) === candidate.symbol)) return true;
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
	if (ts.isIdentifier(init.expression) && init.expression.text === 'useId') return true;
	if (
		!(ts.isPropertyAccessExpression(init.expression) && ts.isIdentifier(init.expression.expression) && init.expression.expression.text === 'window' && init.expression.name.text === 'setInterval') ||
		!ts.isCallExpression(use.node.parent)
	)
		return false;
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
	return candidate.statement.declarationList.declarations.some(d => {
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
 * Detects explicit annotations that can change overload or generic call resolution.
 *
 * @param candidate Variable candidate whose annotation may affect its consumer.
 * @param checker TypeScript checker used to inspect call signatures.
 * @param reference Sole consumer that would receive the initializer.
 *
 * @return Whether replacing the annotated reference could select a different signature.
 */
function hasCallSensitiveTypeAnnotation(candidate: Candidate, checker: ts.TypeChecker, reference: Reference): boolean {
	if (candidate.kind !== 'variable' || !ts.isVariableDeclaration(candidate.name.parent) || !candidate.name.parent.type) return false;
	let value: ts.Expression = reference.node;
	while (
		ts.isParenthesizedExpression(value.parent) ||
		ts.isAsExpression(value.parent) ||
		ts.isTypeAssertionExpression(value.parent) ||
		ts.isNonNullExpression(value.parent) ||
		ts.isSatisfiesExpression(value.parent)
	) {
		value = value.parent;
	}
	const parent = value.parent;
	const call = (ts.isCallExpression(parent) && parent.arguments.includes(value)) || (ts.isNewExpression(parent) && parent.arguments?.includes(value)) ? parent : undefined;
	if (!call) return false;
	const signatures = checker.getSignaturesOfType(checker.getTypeAtLocation(call.expression), ts.SignatureKind.Call);
	return signatures.length > 1 || signatures.some(signature => Boolean(signature.typeParameters?.length));
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
			const declaration = checker.getSymbolAtLocation(node.typeName)?.declarations?.[0];
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
 * Determines whether an expression contains only literal values and static arrays or objects.
 *
 * @param expr Expression proposed for inlining.
 *
 * @return Whether evaluation avoids variable reads, spreads, computed keys, and executable properties.
 */
function isStaticLiteralExpr(expr: ts.Expression): boolean {
	const node = ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isNonNullExpression(expr) ? expr.expression : expr;
	if (
		ts.isStringLiteral(node) ||
		ts.isNumericLiteral(node) ||
		ts.isBigIntLiteral(node) ||
		ts.isNoSubstitutionTemplateLiteral(node) ||
		ts.isRegularExpressionLiteral(node) ||
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword ||
		node.kind === ts.SyntaxKind.NullKeyword
	)
		return true;
	if (ts.isPrefixUnaryExpression(node))
		return (node.operator === ts.SyntaxKind.PlusToken || node.operator === ts.SyntaxKind.MinusToken) && (ts.isNumericLiteral(node.operand) || ts.isBigIntLiteral(node.operand));
	if (ts.isArrayLiteralExpression(node)) return node.elements.every(element => !ts.isSpreadElement(element) && isStaticLiteralExpr(element));
	if (ts.isObjectLiteralExpression(node))
		return node.properties.every(property => ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) && isStaticLiteralExpr(property.initializer));
	return false;
}

/**
 * Checks whether a type is declared by Playwright as a lazy page or locator query receiver.
 *
 * @param type Type of the receiver for a query call.
 * @param checker Type checker for the current source program.
 *
 * @return Whether every receiver type is a Playwright `Page`, `Locator`, or `FrameLocator`.
 */
function isPlaywrightQueryReceiver(type: ts.Type, checker: ts.TypeChecker): boolean {
	const types = checker.getApparentType(type);
	return (types.isUnionOrIntersection() ? types.types : [types]).every(member => {
		const symbol = member.aliasSymbol ?? member.getSymbol();
		return (
			Boolean(symbol && ['Page', 'Locator', 'FrameLocator'].includes(symbol.name)) &&
			(symbol?.declarations ?? []).some(declaration => {
				return /\/node_modules\/(?:playwright-core|playwright|@playwright\/test)\//u.test(declaration.getSourceFile().fileName.replaceAll('\\', '/'));
			})
		);
	});
}

/**
 * Recognizes a lazy Playwright locator query whose call and arguments have no execution effects.
 *
 * @param init Variable initializer proposed for inlining.
 * @param checker Type checker used to confirm the receiver belongs to Playwright.
 *
 * @return Whether a static Playwright query can be recreated without moving application work.
 */
function isStaticPlaywrightLocator(init: ts.Expression, checker: ts.TypeChecker): boolean {
	if (!ts.isCallExpression(init) || init.questionDotToken || !ts.isPropertyAccessExpression(init.expression)) return false;
	const call = init.expression;
	if (call.questionDotToken || !PLAYWRIGHT_QUERY_METHODS.has(call.name.text)) return false;
	const receiver = call.expression;
	if (!isPlaywrightQueryReceiver(checker.getTypeAtLocation(receiver), checker)) return false;
	if (ts.isIdentifier(receiver)) {
		const symbol = checker.getSymbolAtLocation(receiver);
		if (!symbol) return false;
		let reassigned = false;
		const visit = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && checker.getSymbolAtLocation(node) === symbol) {
				const parent = node.parent;
				if (
					(ts.isBinaryExpression(parent) && parent.left === node && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
					((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.operator))
				)
					reassigned = true;
			}
			if (!reassigned) ts.forEachChild(node, visit);
		};
		visit(init.getSourceFile());
		if (reassigned) return false;
	} else if (!ts.isCallExpression(receiver) || !isStaticPlaywrightLocator(receiver, checker)) return false;
	return init.arguments.every(isStaticLiteralExpr);
}

// terra-quality-ignore single-use -- Keep the documented isModuleCallArgument declaration so its parameter and return contract remains attached.
/**
 * Checks whether a declaration and its reference share a single module-level call boundary.
 *
 * @param candidate Const declaration proposed for inlining.
 * @param reference Sole reference that would receive the initializer.
 *
 * @return Whether the initializer and its call execute once at module evaluation.
 */
function isModuleCallArgument(candidate: Candidate, reference: Reference): boolean {
	const call = reference.node.parent;
	return (
		candidate.statement.parent === candidate.source &&
		ts.isCallExpression(call) &&
		call.arguments.some(argument => argument === reference.node) &&
		ts.isExpressionStatement(call.parent) &&
		call.parent.parent === candidate.source
	);
}

/**
 * Recognizes inert configuration data containing literals and binding reads only.
 *
 * @param expr Expression proposed for a directly adjacent default export.
 *
 * @return Whether the value can be constructed without calls, accessors, spreads, or computed keys.
 */
function isStaticModuleDataExpr(expr: ts.Expression): boolean {
	const node = ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isNonNullExpression(expr) ? expr.expression : expr;
	if (ts.isIdentifier(node) || isStaticLiteralExpr(node)) return true;
	if (ts.isArrayLiteralExpression(node)) return node.elements.every(element => !ts.isSpreadElement(element) && isStaticModuleDataExpr(element));
	if (ts.isObjectLiteralExpression(node))
		return node.properties.every(property => ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) && isStaticModuleDataExpr(property.initializer));
	return false;
}

/**
 * Checks whether a static value is read by the immediately following module default export.
 *
 * @param candidate Const declaration proposed for inlining.
 * @param reference Sole reference that would become the default export expression.
 *
 * @return Whether declaration and export are adjacent top-level statements in the same module.
 */
function isAdjacentModuleDefaultExport(candidate: Candidate, reference: Reference): boolean {
	const exported = reference.node.parent;
	if (candidate.statement.parent !== candidate.source || !ts.isExportAssignment(exported) || exported.isExportEquals || exported.expression !== reference.node || exported.parent !== candidate.source)
		return false;
	const statements = candidate.source.statements;
	return statements[statements.indexOf(candidate.statement) + 1] === exported;
}

/**
 * Allows inlining only when the local value supplies the module's default export and no named export.
 *
 * @param candidate Candidate value whose module exports are inspected.
 * @param checker Type checker used to resolve the module's export symbols.
 * @param reference Sole reference proposed as the default export expression.
 *
 * @return Whether the adjacent default export is the candidate's only public module binding.
 */
function isExclusiveDefaultExport(candidate: Candidate, checker: ts.TypeChecker, reference: Reference): boolean {
	if (!isAdjacentModuleDefaultExport(candidate, reference)) return false;
	const moduleSymbol = checker.getSymbolAtLocation(candidate.source);
	const exports = moduleSymbol && checker.getExportsOfModule(moduleSymbol);
	return Boolean(
		exports?.some(exported => exported.name === 'default' && canonical(checker, exported) === candidate.symbol) &&
		!exports.some(exported => exported.name !== 'default' && canonical(checker, exported) === candidate.symbol),
	);
}

/**
 * Detects comment trivia inside an expression or between adjacent statements.
 *
 * @param source Source file containing the inspected span.
 * @param start First source offset in the span.
 * @param end Exclusive source offset at the end of the span.
 *
 * @return Whether moving the expression would also move or rewrite an authored comment.
 */
function containsCommentTrivia(source: ts.SourceFile, start: number, end: number): boolean {
	const scanner = ts.createScanner(source.languageVersion, false, source.languageVariant, source.text.slice(start, end));
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan())
		if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) return true;
	return false;
}

// terra-quality-ignore single-use -- Keep the documented isFirstConsumerEvaluation declaration so its parameter and return contract remains attached.
/**
 * Checks whether a single-use reference is evaluated before any other consumer expression.
 *
 * @param reference Identifier being considered for inlining.
 * @param init Initializer whose evaluation would move to the reference.
 * @param consumerStatement Immediate statement containing the only reference.
 *
 * @return Whether the reference is an unconditional first operand in the next statement, including
 * the first argument to a direct identifier call.
 */
function isFirstConsumerEvaluation(reference: ts.Identifier, init: ts.Expression, consumerStatement: ts.Statement): boolean {
	let expr: ts.Expression = reference;
	const initBase = unwrapExpr(init);
	let argumentExpr: ts.Expression = reference;
	while (
		ts.isParenthesizedExpression(argumentExpr.parent) ||
		ts.isAsExpression(argumentExpr.parent) ||
		ts.isTypeAssertionExpression(argumentExpr.parent) ||
		ts.isNonNullExpression(argumentExpr.parent) ||
		ts.isSatisfiesExpression(argumentExpr.parent)
	)
		argumentExpr = argumentExpr.parent;
	const argumentCall = argumentExpr.parent;
	if (
		(ts.isArrayLiteralExpression(initBase) || ts.isObjectLiteralExpression(initBase)) &&
		!(isStaticLiteralExpr(init) && ts.isCallExpression(argumentCall) && argumentCall.arguments[0] === argumentExpr && ts.isIdentifier(argumentCall.expression) && !argumentCall.questionDotToken)
	)
		return false;
	const initPreservesReceiver = ts.isPropertyAccessExpression(initBase) || ts.isElementAccessExpression(initBase);
	while (true) {
		const parent = expr.parent;
		if (
			(ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) || ts.isTypeAssertionExpression(parent) || ts.isNonNullExpression(parent) || ts.isSatisfiesExpression(parent)) &&
			parent.expression === expr
		) {
			expr = parent;
			continue;
		}
		if (ts.isPropertyAccessExpression(parent) && parent.expression === expr) {
			expr = parent;
			continue;
		}
		if (ts.isElementAccessExpression(parent) && parent.expression === expr) {
			expr = parent;
			continue;
		}
		if (ts.isBinaryExpression(parent) && parent.left === expr && parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
			expr = parent;
			continue;
		}
		if (ts.isConditionalExpression(parent) && parent.condition === expr) {
			expr = parent;
			continue;
		}
		if (ts.isCallExpression(parent) && parent.arguments[0] === expr && ts.isIdentifier(parent.expression) && !parent.questionDotToken && isStaticLiteralExpr(init)) {
			expr = parent;
			continue;
		}
		if (ts.isPrefixUnaryExpression(parent) && parent.operand === expr) {
			expr = parent;
			continue;
		}
		if (ts.isCallExpression(parent) && parent.expression === expr && !initPreservesReceiver) {
			expr = parent;
			continue;
		}
		if (ts.isNewExpression(parent) && parent.expression === expr && !initPreservesReceiver) {
			expr = parent;
			continue;
		}
		if (ts.isArrayLiteralExpression(parent) && parent.elements[0] === expr) {
			expr = parent;
			continue;
		}
		if (ts.isSpreadElement(parent) && ts.isArrayLiteralExpression(parent.parent) && parent.parent.elements[0] === parent) {
			expr = parent.parent;
			continue;
		}
		if (
			ts.isPropertyAssignment(parent) &&
			parent.initializer === expr &&
			ts.isObjectLiteralExpression(parent.parent) &&
			parent.parent.properties[0] === parent &&
			(ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name) || ts.isNumericLiteral(parent.name))
		) {
			expr = parent.parent;
			continue;
		}
		if (
			ts.isVariableDeclaration(parent) &&
			parent.initializer === expr &&
			ts.isVariableDeclarationList(parent.parent) &&
			parent.parent.declarations.length === 1 &&
			parent.parent.parent === consumerStatement
		)
			return true;
		if ((ts.isReturnStatement(parent) || ts.isThrowStatement(parent) || ts.isExpressionStatement(parent)) && parent.expression === expr && parent === consumerStatement) return true;
		if ((ts.isIfStatement(parent) || ts.isSwitchStatement(parent)) && parent.expression === expr && parent === consumerStatement) return true;
		return false;
	}
}

// terra-quality-ignore single-use -- Keep the documented unwrapExpr declaration so its parameter and return contract remains attached.
/**
 * Removes syntax-only wrappers around an initializer before checking its receiver behavior.
 *
 * @param expr Initializer being inspected.
 *
 * @return The first non-wrapper expression node.
 */
function unwrapExpr(expr: ts.Expression): ts.Expression {
	while (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isNonNullExpression(expr) || ts.isSatisfiesExpression(expr)) expr = expr.expression;
	return expr;
}

/**
 * Rejects initializers whose movement could change evaluation, identity, or side effects.
 *
 * @param candidate Candidate declaration whose initializer is checked.
 * @param checker Type checker used to recognize lazy Playwright locator queries.
 * @param reference Sole reference that would receive the initializer after inlining.
 *
 * @return Whether inlining preserves initialization order, async context, receiver behavior, and authored boundaries.
 */
function initSafeToInline(candidate: Candidate, checker: ts.TypeChecker, reference?: Reference): boolean {
	if (candidate.kind !== 'variable' || !ts.isVariableStatement(candidate.statement)) return true;
	const init = candidate.statement.declarationList.declarations[0]?.initializer;
	if (!init || !(candidate.statement.declarationList.flags & ts.NodeFlags.Const)) return false;
	if (reference && candidate.file === reference.file) {
		let expr: ts.Expression = reference.node;
		while (
			ts.isParenthesizedExpression(expr.parent) ||
			ts.isAsExpression(expr.parent) ||
			ts.isTypeAssertionExpression(expr.parent) ||
			ts.isNonNullExpression(expr.parent) ||
			ts.isSatisfiesExpression(expr.parent)
		) {
			expr = expr.parent;
		}
		const parent = expr.parent;
		const statements = (() => {
			const list = candidate.statement.parent;
			return ts.isSourceFile(list) || ts.isBlock(list) || ts.isModuleBlock(list) || ts.isCaseClause(list) || ts.isDefaultClause(list) ? list.statements : undefined;
		})();
		let useStatement: ts.Statement | undefined;
		for (let node: ts.Node | undefined = expr; node; node = node.parent) {
			if (ts.isStatement(node) && node.parent === candidate.statement.parent) {
				useStatement = node;
				break;
			}
			if (node.parent === candidate.statement.parent) break;
		}
		const candidateIndex = statements?.indexOf(candidate.statement) ?? -1;
		let hasDynamicScope = dynamicScopeCache.get(candidate.source);
		if (hasDynamicScope === undefined) {
			hasDynamicScope = false;
			const inspect = (node: ts.Node): void => {
				if (ts.isWithStatement(node)) hasDynamicScope = true;
				if (ts.isCallExpression(node)) {
					let callee: ts.Expression = node.expression;
					while (ts.isParenthesizedExpression(callee)) callee = callee.expression;
					if (ts.isIdentifier(callee) && callee.text === 'eval') hasDynamicScope = true;
				}
				if (!hasDynamicScope) ts.forEachChild(node, inspect);
			};
			inspect(candidate.source);
			dynamicScopeCache.set(candidate.source, hasDynamicScope);
		}
		let boundarySensitive = false;
		const inspectInit = (node: ts.Node): void => {
			if (ts.isYieldExpression(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isClassExpression(node)) boundarySensitive = true;
			if (!boundarySensitive) ts.forEachChild(node, inspectInit);
		};
		inspectInit(init);
		if (
			useStatement &&
			candidateIndex >= 0 &&
			statements?.[candidateIndex + 1] === useStatement &&
			((((ts.isReturnStatement(parent) && parent.expression === expr) ||
				(ts.isThrowStatement(parent) && parent.expression === expr) ||
				(ts.isIfStatement(parent) && parent.expression === expr) ||
				(ts.isSwitchStatement(parent) && parent.expression === expr) ||
				(ts.isExpressionStatement(parent) && parent.expression === expr) ||
				(ts.isVariableDeclaration(parent) && parent.initializer === expr && ts.isVariableDeclarationList(parent.parent) && parent.parent.declarations.length === 1)) &&
				(ts.isVariableDeclaration(parent) ? parent.parent.parent : parent) === useStatement) ||
				isFirstConsumerEvaluation(reference.node, init, useStatement)) &&
			!(
				(ts.getLeadingCommentRanges(candidate.source.text, candidate.statement.getFullStart()) ?? []).length ||
				containsCommentTrivia(candidate.source, candidate.statement.getStart(candidate.source), candidate.statement.getEnd()) ||
				(useStatement && containsCommentTrivia(candidate.source, candidate.statement.getEnd(), useStatement.getStart(candidate.source)))
			) &&
			!hasDynamicScope &&
			!boundarySensitive
		)
			return true;
	}
	const declaration = candidate.name.parent;
	if (reference && ts.isVariableDeclaration(declaration) && !declaration.type && isModuleCallArgument(candidate, reference) && isStaticLiteralExpr(init)) return true;
	if (
		reference &&
		ts.isVariableDeclaration(declaration) &&
		!declaration.type &&
		isAdjacentModuleDefaultExport(candidate, reference) &&
		isStaticModuleDataExpr(init) &&
		!containsCommentTrivia(candidate.source, init.getFullStart(), init.getEnd()) &&
		!containsCommentTrivia(candidate.source, candidate.statement.getEnd(), reference.node.parent.getStart(candidate.source))
	)
		return true;
	if (init.getText(candidate.source).length > 120) return false;
	return (
		ts.isStringLiteral(init) ||
		ts.isNumericLiteral(init) ||
		ts.isNoSubstitutionTemplateLiteral(init) ||
		init.kind === ts.SyntaxKind.TrueKeyword ||
		init.kind === ts.SyntaxKind.FalseKeyword ||
		init.kind === ts.SyntaxKind.NullKeyword ||
		isStaticPlaywrightLocator(init, checker)
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
 * Checks whether a reference can execute repeatedly through an enclosing function or loop.
 *
 * A declaration outside a callback or loop can have one syntactic reference but many runtime reads.
 * A declaration and its reference inside the same execution body remain eligible because both are
 * evaluated once per invocation or iteration. Named functions passed to common repeated array
 * callbacks are treated the same way even when their identifier appears only at the call site.
 *
 * @param candidate Declaration whose consumer count is being evaluated.
 * @param reference Resolved source reference to the candidate.
 * @param checker Type checker used to recognize recursive function calls.
 *
 * @return Whether the reference may execute more than once for one declaration value.
 */
function isRuntimeRepeatedReference(candidate: Candidate, reference: Reference, checker: ts.TypeChecker): boolean {
	if (candidate.kind === 'type' || candidate.kind === 'interface') return false;
	const init = candidate.kind === 'variable' && ts.isVariableStatement(candidate.statement) ? candidate.statement.declarationList.declarations[0]?.initializer : undefined;
	if (candidate.kind === 'function' || Boolean(init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)))) {
		const call = reference.node.parent;
		if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && REPEATED_CALLBACK_METHODS.has(call.expression.name.text) && call.arguments.includes(reference.node)) return true;
	}
	for (let node: ts.Node | undefined = reference.node.parent; node && !ts.isSourceFile(node); node = node.parent) {
		const fnName =
			ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)
				? node.name && ts.isIdentifier(node.name)
					? node.name
					: undefined
				: ts.isArrowFunction(node) && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)
					? node.parent.name
					: undefined;
		const fnSymbol = fnName ? checker.getSymbolAtLocation(fnName) : undefined;
		let recursive = false;
		const body = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) ? node.body : undefined;
		if (fnSymbol && body) {
			const pending: ts.Node[] = [body];
			while (pending.length && !recursive) {
				const current = pending.pop()!;
				if (current !== body && ts.isFunctionLike(current)) continue;
				if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && checker.getSymbolAtLocation(current.expression) === fnSymbol) {
					recursive = true;
					break;
				}
				current.forEachChild(child => {
					pending.push(child);
				});
			}
		}
		let callbackOwner = false;
		if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && fnName?.parent && ts.isVariableDeclaration(fnName.parent)) {
			const ownerSymbol = checker.getSymbolAtLocation(fnName);
			if (ownerSymbol) {
				let repeatedOwners = repeatedCallbackOwnerCache.get(reference.source);
				if (!repeatedOwners) {
					repeatedOwners = new Set<ts.Symbol>();
					const pending: ts.Node[] = [reference.source];
					while (pending.length) {
						const current = pending.pop()!;
						if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression) && REPEATED_CALLBACK_METHODS.has(current.expression.name.text))
							for (const argument of current.arguments)
								if (ts.isIdentifier(argument)) {
									const symbol = checker.getSymbolAtLocation(argument);
									if (symbol) repeatedOwners.add(symbol);
								}
						current.forEachChild(child => {
							pending.push(child);
						});
					}
					repeatedCallbackOwnerCache.set(reference.source, repeatedOwners);
				}
				callbackOwner = repeatedOwners.has(ownerSymbol);
			}
		}
		if (!(
			((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
				ts.isCallExpression(node.parent) &&
				ts.isPropertyAccessExpression(node.parent.expression) &&
				REPEATED_CALLBACK_METHODS.has(node.parent.expression.name.text) &&
				node.parent.arguments.includes(node)) ||
			callbackOwner ||
			recursive ||
			ts.isForStatement(node) ||
			ts.isForInStatement(node) ||
			ts.isForOfStatement(node) ||
			ts.isWhileStatement(node) ||
			ts.isDoStatement(node)
		))
			continue;
		let containsCandidate = false;
		for (let ancestor: ts.Node | undefined = candidate.statement; ancestor; ancestor = ancestor.parent)
			if (ancestor === node) {
				containsCandidate = true;
				break;
			}
		if (!containsCandidate) return true;
	}
	return false;
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
function findingsFromAnalysis(
	cfg: QualityCfg,
	checker: ts.TypeChecker,
	candidates: Candidate[],
	references: Map<ts.Symbol, Reference[]>,
	astroConsumers: Set<string>,
	program: ts.Program,
): SingleUseFinding[] {
	const findings: SingleUseFinding[] = [];
	const { directives, byCandidate } = singleUseIgnoreDirectives(cfg, program.getSourceFiles(), candidates);
	const usedDirectives = new Set<SingleUseIgnoreDirective>();
	reportProgress('Single-use classification:', 0, candidates.length);
	candidateLoop: for (const [candidateIdx, c] of candidates.entries()) {
		reportProgress('Single-use classification:', candidateIdx + 1, candidates.length);
		const directive = byCandidate.get(`${c.file}:${c.name.getStart(c.source)}`);
		const publicContract = isCfgdPublicContract(cfg, c, checker) || isPackageEntryExport(cfg, c, checker, program);
		const uses = c.kind === 'type' || c.kind === 'interface' ? typeReferences(c, references) : (references.get(c.symbol) ?? []).filter(r => !isImportNode(r.node) && !isExportSpecifierReference(r));
		// A package-local scan can have one consumer while the repository scan sees more.
		// Keep that declaration's specific, reasoned marker valid when another source file consumes its exported boundary.
		if (directive?.reason && uses.some(use => use.file !== c.file) && (uses.length > 1 || publicContract)) usedDirectives.add(directive);
		if (publicContract) continue;
		if (uses.length !== 1) continue;
		const use = uses[0]!;
		if (isRuntimeRepeatedReference(c, use, checker)) continue;
		if (!inSingleUseScope(cfg, use.file)) continue;
		if (isRequiredLifecycleVal(c, use)) continue;
		if (c.kind === 'variable' && ts.isVariableStatement(c.statement)) {
			const init = c.statement.declarationList.declarations[0]?.initializer;
			if (init && ts.isPropertyAccessExpression(init) && init.name.text === 'value' && ts.isPropertyAccessExpression(init.expression) && init.expression.name.text === 'currentTarget') {
				for (let node: ts.Node | undefined = use.node; node && node !== c.statement; node = node.parent) {
					if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) continue candidateLoop;
				}
			}
		}
		if (directive?.reason) {
			usedDirectives.add(directive);
			continue;
		}
		let reason = '';
		let canInline = true;
		if (c.kind === 'function') {
			canInline = false;
			reason = 'inlining a function can change its identity, closure, stack, or component behavior';
		} else if (c.kind === 'variable') {
			canInline = initSafeToInline(c, checker, use);
			reason = canInline
				? 'single-use initializer can move to its first in-scope consumer without changing evaluation order or receiver behavior'
				: 'inlining is not proven to preserve evaluation order, async context, receiver behavior, or declaration boundaries';
		} else reason = `${c.kind} declaration has one in-scope consumer`;
		if (hasAstroConsumer(c, astroConsumers)) continue;
		if (c.kind === 'function') [canInline, reason] = [false, 'inlining a function can change its identity, closure, stack, or component behavior'];
		else if (c.kind === 'variable' && c.file !== use.file && !crossFileVariableSafe(c)) [canInline, reason] = [false, 'cross-file initializer depends on module-local values'];
		else if ((c.kind === 'type' || c.kind === 'interface') && !crossFileTypeSafe(c, use, checker)) [canInline, reason] = [false, 'type depends on declarations that are not available at the consumer'];
		else if ((c.kind === 'type' || c.kind === 'interface') && containsExplicitAny(c)) [canInline, reason] = [false, 'inlining would introduce explicit any'];
		else if (c.kind === 'variable' && containsAwait(c) && !initSafeToInline(c, checker, use)) [canInline, reason] = [false, 'inlining would move await into another evaluation context'];
		else if (c.kind === 'variable' && !initSafeToInline(c, checker, use)) [canInline, reason] = [false, 'inlining could change evaluation timing, hook order, or side effects'];
		else if (c.kind === 'variable' && isStateRestorationReference(use)) [canInline, reason] = [false, 'inlining would discard a saved value needed to restore mutable state'];
		else if (c.kind === 'variable' && isWriteReference(use)) [canInline, reason] = [false, 'the sole reference is a write target'];
		else if (c.kind === 'variable' && (ts.isJsxOpeningElement(use.node.parent) || ts.isJsxSelfClosingElement(use.node.parent)))
			[canInline, reason] = [false, 'this is a standalone JSX component; keep its component identity and declaration boundary, or export it from its definition if it is a module-level component'];
		else if (hasImportedTypeAnnotation(c, checker)) [canInline, reason] = [false, 'inlining would remove a required imported type annotation'];
		else if (hasCallSensitiveTypeAnnotation(c, checker, use)) [canInline, reason] = [false, 'inlining could change overload or generic call resolution'];
		if (hasMeaningfulLeadingTSDoc(c)) {
			canInline = false;
			reason = 'attached TSDoc is authored documentation and requires agent review before changing its declaration boundary';
		}
		if (hasGeneratedSourceHeader(c.source.text) || hasGeneratedSourceHeader(use.source.text)) {
			canInline = false;
			reason = 'declaration or consumer is in generated source and must be corrected in its generator';
		} else if (isModuleExport(c, checker) && !isExclusiveDefaultExport(c, checker, use)) {
			canInline = false;
			reason = 'declaration is exported from its module and may be part of an external contract';
		}
		const decision: SingleUseFinding['decision'] = canInline ? 'INLINE' : 'REVIEW';
		const rejectedReason = rejectedInlineCandidates.get(`${c.file}:${c.name.text}`);
		findings.push({
			file: relative(cfg.root, c.file),
			line: c.source.getLineAndCharacterOfPosition(c.name.getStart(c.source)).line + 1,
			name: c.name.text,
			decision: rejectedReason ? 'REVIEW' : decision,
			autofixable: !rejectedReason && decision === 'INLINE',
			reason: rejectedReason ?? reason,
			agentAction: (() => {
				const actionReason = rejectedReason ?? reason;
				if (!rejectedReason && canInline) return 'Run the canonical dead-code autofix, then verify the inlined type/value remains equivalent and rerun the affected test or typecheck.';
				if (actionReason.includes('generated source')) return 'Update the schema, query, or generator that owns this declaration; do not edit generated output directly.';
				if (actionReason.includes('external contract'))
					return 'Keep this exported declaration in its declaring module while it has external consumers; if you change that API boundary, preserve module-local dependencies and package documentation.';
				if (c.kind === 'function') {
					if (c.file !== use.file)
						return 'Keep the helper in its declaring module unless its module-local dependencies move with it; if you restructure that boundary, preserve closure capture, recursion, async behavior, and the caller contract.';
					return ts.isJsxOpeningElement(use.node.parent) || ts.isJsxSelfClosingElement(use.node.parent)
						? 'Inline this component at its only JSX use only if React component identity, local state, hooks, effects, and render behavior remain unchanged. Otherwise retain it only for a concrete semantic boundary and verify with a focused render test.'
						: 'Inline this helper at its sole call only if closure capture, recursion, `this`, async boundaries, stack-sensitive behavior, and evaluation order remain unchanged. Otherwise retain it only for a concrete semantic boundary and run its focused test.';
				}
				if (c.kind === 'type' || c.kind === 'interface')
					return 'Inline this declaration at its sole type use only if generic arguments, imported names, and inferred specificity remain equivalent. Otherwise retain the separate type only when its name is materially useful, and verify with typecheck.';
				if (actionReason.includes('cross-file initializer'))
					return 'Keep the value in its declaring module unless its module-local dependencies move with it; if you restructure that boundary, verify initialization order and the consumer behavior.';
				if (actionReason.includes('move await'))
					return 'Keep the await at its current async boundary. Only inline after a deliberate async refactor that preserves sequencing, rejection handling, and the caller contract.';
				if (actionReason.includes('write target'))
					return 'Keep the binding because its only use is a write target. Do not substitute its initializer unless the same writable location and mutation semantics are preserved.';
				if (actionReason.includes('imported type annotation'))
					return 'Keep the binding and its imported type annotation together; only inline after preserving the annotation and confirming the affected typecheck.';
				if (actionReason.includes('explicit any')) return 'Keep the named type boundary unless it can be inlined without introducing explicit any; verify the consumer with typecheck.';
				return `Inline the initializer at its sole use only if ${/\.(?:tsx|jsx)$/.test(c.source.fileName) ? 'evaluation order and timing, closure capture, identity, writes, React hook order, and observable effects' : 'evaluation order and timing, closure capture, identity, writes, and observable effects'} remain unchanged. Otherwise retain the binding for the concrete semantic reason reported above and verify the focused behavior.`;
			})(),
		});
	}
	for (const directive of directives) if (!usedDirectives.has(directive)) findings.push(singleUseDirectiveFinding(cfg, directive));
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
	return findingsFromAnalysis(cfg, checker, candidates, references, astroConsumersFor(cfg, program), program);
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
		ctx => {
			/**
			 * Substitutes type parameters while preserving unrelated type syntax.
			 *
			 * @param node Type syntax node visited during generic expansion.
			 *
			 * @return Substituted node when it is a matching type reference, otherwise `undefined`.
			 */
			const visit: ts.Visitor = node => {
				if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && substitutions.has(node.typeName.text)) return substitutions.get(node.typeName.text)!;
				if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName) && substitutions.has(node.exprName.text)) return substitutions.get(node.exprName.text)!;
				return ts.visitEachChild(node, visit, ctx);
			};
			return root => ts.visitNode(root, visit) as ts.TypeNode;
		},
	]);
	try {
		return `(${ts.createPrinter().printNode(ts.EmitHint.Unspecified, transformed.transformed[0]!, declaration.getSourceFile())})`;
	} finally {
		transformed.dispose();
	}
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
 * Rejects a batch when its edited files gain TypeScript errors.
 *
 * @param program Original TypeScript program used as the baseline.
 * @param updates Candidate source texts keyed by the edited absolute filename.
 *
 * @return Files whose proposed edits add TypeScript diagnostics.
 */
export function deadCodeEditsIntroduceTypeErrors(program: ts.Program, updates: Map<string, string>): boolean {
	const files = [...updates.keys()];
	const total = files.length * 2;
	qualityProgress('TypeScript validation', 0, total);
	const opts = program.getCompilerOptions();
	const host = ts.createCompilerHost(opts);
	const originalHostMethods = { getSourceFile: host.getSourceFile.bind(host), fileExists: host.fileExists.bind(host) };
	const originalDiagnostics: ts.Diagnostic[] = [];
	for (const [fileIndex, file] of files.entries()) {
		const sourceFile = program.getSourceFile(file);
		if (sourceFile) originalDiagnostics.push(...ts.getPreEmitDiagnostics(program, sourceFile));
		qualityProgress('TypeScript validation', fileIndex + 1, total);
	}
	const virtualFiles = new Map([...updates].map(([f, text]) => [f, text]));
	host.getSourceFile = (fileName, langVersion, onErr, shouldCreateNewSrcFile) => {
		const text = virtualFiles.get(fileName);
		return text === undefined
			? originalHostMethods.getSourceFile(fileName, langVersion, onErr, shouldCreateNewSrcFile)
			: ts.createSourceFile(
					fileName,
					text,
					langVersion,
					true,
					fileName.endsWith('.tsx')
						? ts.ScriptKind.TSX
						: fileName.endsWith('.jsx')
							? ts.ScriptKind.JSX
							: fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs')
								? ts.ScriptKind.JS
								: ts.ScriptKind.TS,
				);
	};
	host.readFile = fileName => virtualFiles.get(fileName) ?? ts.sys.readFile(fileName);
	host.fileExists = fileName => virtualFiles.has(fileName) || originalHostMethods.fileExists(fileName);
	const updatedProgram = ts.createProgram({ rootNames: program.getRootFileNames(), options: opts, host });
	/**
	 * Creates a stable comparison key for one TypeScript diagnostic.
	 *
	 * @param diagnostic Diagnostic whose code and message are compared.
	 *
	 * @return Key combining the diagnostic code and flattened message.
	 */
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
	return [...currCounts].some(([file, after]) => [...after].some(([key, count]) => count > (prevCounts.get(file)?.get(key) ?? 0)));
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
		const program = programFor(cfg);
		const checker = program.getTypeChecker();
		const { candidates, references: refs } = collect(cfg, program, checker);
		const astroConsumers = astroConsumersFor(cfg, program);
		const { byCandidate: directivesByCandidate } = singleUseIgnoreDirectives(cfg, program.getSourceFiles(), candidates);
		const edits = new Map<string, { start: number; end: number; text: string }[]>();
		const pending: { fileEdits: { file: string; start: number; end: number; text: string }[]; referenceLength: number; nestedReference: boolean; candidateKey: string; jsxFile?: string }[] = [];
		for (const c of candidates) {
			if (hasGeneratedSourceHeader(c.source.text)) continue;
			if (hasAstroConsumer(c, astroConsumers) || isCfgdPublicContract(cfg, c, checker) || isPackageEntryExport(cfg, c, checker, program)) continue;
			if (directivesByCandidate.has(`${c.file}:${c.name.getStart(c.source)}`)) continue;
			if (hasMeaningfulLeadingTSDoc(c)) continue;
			const uses = c.kind === 'type' || c.kind === 'interface' ? typeReferences(c, refs) : (refs.get(c.symbol) ?? []).filter(r => !isImportNode(r.node) && !isExportSpecifierReference(r));
			if (uses.length !== 1) continue;
			const ref = uses[0]!;
			if (isRuntimeRepeatedReference(c, ref, checker)) continue;
			if (isModuleExport(c, checker) && !isExclusiveDefaultExport(c, checker, ref)) continue;
			if (hasGeneratedSourceHeader(ref.source.text)) continue;
			if (!inSingleUseScope(cfg, ref.file)) continue;
			if (isRequiredLifecycleVal(c, ref)) continue;
			if (c.kind === 'variable' && (ts.isJsxOpeningElement(ref.node.parent) || ts.isJsxSelfClosingElement(ref.node.parent))) continue;
			if (c.kind === 'function') continue;
			if (c.kind === 'variable' && c.file !== ref.file && !crossFileVariableSafe(c)) continue;
			if ((c.kind === 'type' || c.kind === 'interface') && !crossFileTypeSafe(c, ref, checker)) continue;
			if ((c.kind === 'type' || c.kind === 'interface') && containsExplicitAny(c)) continue;
			if (c.kind === 'variable' && !initSafeToInline(c, checker, ref)) continue;
			if (c.kind === 'variable' && isStateRestorationReference(ref)) continue;
			if (c.kind === 'variable' && isWriteReference(ref)) continue;
			if (hasImportedTypeAnnotation(c, checker) || hasCallSensitiveTypeAnnotation(c, checker, ref)) continue;
			const replacement = (() => {
				const typeReference = referenceTgt(ref.node);
				if ((ts.isTypeAliasDeclaration(c.statement) || ts.isInterfaceDeclaration(c.statement)) && ts.isTypeReferenceNode(typeReference)) {
					if (ts.isTypeAliasDeclaration(c.statement)) return inlineGenericType(c.statement, typeReference, c.statement.type);
					return inlineGenericType(c.statement, typeReference, ts.factory.createTypeLiteralNode(c.statement.members));
				}
				if (ts.isTypeAliasDeclaration(c.statement)) return c.statement.typeParameters?.length ? null : `(${c.statement.type.getText(c.source)})`;
				if (ts.isInterfaceDeclaration(c.statement)) {
					if (c.statement.typeParameters?.length) return null;
					const mems = `{ ${c.statement.members.map(member => member.getText(c.source)).join(' ')} }`;
					const bases = c.statement.heritageClauses?.flatMap(clause => clause.types.map(type => type.getText(c.source))) ?? [];
					return bases.length ? `(${[...bases, mems].join(' & ')})` : `(${mems})`;
				}
				if (ts.isFunctionDeclaration(c.statement)) {
					const statement = c.statement;
					if (ts.isTypeQueryNode(ref.node.parent))
						return ts.createPrinter().printNode(
							ts.EmitHint.Unspecified,
							ts.factory.createFunctionTypeNode(
								statement.typeParameters,
								statement.parameters.map(parameter =>
									ts.factory.createParameterDeclaration(
										undefined,
										parameter.dotDotDotToken,
										parameter.name,
										parameter.questionToken,
										parameter.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
									),
								),
								statement.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
							),
							statement.getSourceFile(),
						);
					if (!statement.body) return null;
					return `(${statement
						.getText(statement.getSourceFile())
						.replace(/^export\s+default\s+/, '')
						.replace(/^export\s+/, '')
						.replace(/^declare\s+/, '')})`;
				}
				if (!ts.isVariableStatement(c.statement)) return null;
				const init = c.statement.declarationList.declarations[0]?.initializer;
				if (init && ts.isTypeQueryNode(ref.node.parent)) {
					const inferredType = checker.typeToTypeNode(checker.getTypeAtLocation(init), undefined, ts.NodeBuilderFlags.NoTruncation);
					return inferredType ? ts.createPrinter().printNode(ts.EmitHint.Unspecified, inferredType, ref.source) : null;
				}
				return init ? (isAdjacentModuleDefaultExport(c, ref) ? init.getText(c.source) : `(${init.getText(c.source)})`) : 'undefined';
			})();
			if (!replacement) continue;
			const comments = (isAdjacentModuleDefaultExport(c, ref) ? [] : (ts.getLeadingCommentRanges(c.source.text, c.statement.getFullStart()) ?? []))
				.filter((r, i, ranges) => r.end <= c.statement.getStart(c.source) && S_REGEX.test(c.source.text.slice(r.end, ranges[i + 1]?.pos ?? c.statement.getStart(c.source))))
				.filter(r => {
					const val = c.source.text.slice(r.pos, r.end);
					return !(S_REGEX.test(c.source.text.slice(0, r.pos)) && S_S_W_CM_JT_SX_B_REGEX.test(val)) && !/^\/\*\/{10,}/.test(val) && !/^\/\/\s*[A-Z][A-Z _-]*\s*$/.test(val);
				})
				.map(r => ({ start: r.pos, end: r.end, text: c.source.text.slice(r.pos, r.end) }));
			const commentTexts = [
				...comments.map(({ text: val }) => val).filter(val => !val.startsWith('/**')),
				...(() => {
					const statement = c.statement;
					if (!ts.isVariableStatement(statement)) return [];
					const init = statement.declarationList.declarations[0]?.initializer;
					if (!init) return [];
					const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, c.source.languageVariant, c.source.text.slice(statement.getStart(c.source), init.getStart(c.source)));
					const discarded: string[] = [];
					for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan())
						if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) discarded.push(scanner.getTokenText());
					return discarded;
				})(),
			];
			const inlineReplacement = commentTexts.length ? `${commentTexts.map(v => (v.startsWith('//') ? `/* ${v.slice(2).trim()} */` : v)).join(' ')} ${replacement}` : replacement;
			const candidateEdits: { file: string; start: number; end: number; text: string }[] = [];
			for (const comment of comments) candidateEdits.push({ file: c.file, start: comment.start, end: comment.end, text: '' });
			const componentType = ts.isFunctionDeclaration(c.statement) && c.statement.parameters[0]?.type ? `React.ComponentType<${c.statement.parameters[0].type.getText(c.source)}>` : undefined;
			const jsxName = (() => {
				const parent = ref.node.parent;
				if ((!ts.isJsxOpeningElement(parent) && !ts.isJsxSelfClosingElement(parent)) || parent.tagName !== ref.node) return null;
				const el = ts.isJsxSelfClosingElement(parent) ? parent : ts.isJsxElement(parent.parent) ? parent.parent : null;
				if (!el) return null;
				const props = parent.attributes.properties.map(attr => {
					if (ts.isJsxSpreadAttribute(attr)) return `...${attr.expression.getText(ref.source)}`;
					const name = JSON.stringify(attr.name.getText(ref.source));
					if (!attr.initializer) return `${name}: true`;
					if (ts.isStringLiteral(attr.initializer)) return `${name}: ${JSON.stringify(attr.initializer.text)}`;
					if (ts.isJsxExpression(attr.initializer)) return `${name}: ${attr.initializer.expression?.getText(ref.source) ?? 'undefined'}`;
					return `${name}: ${attr.initializer.getText(ref.source)}`;
				});
				if (ts.isJsxElement(el) && el.children.length) props.push(`children: <>${el.children.map(child => child.getText(ref.source)).join('')}</>`);
				const call = `${reactCreateElementName(ref.source)}(${componentType ? `(${inlineReplacement} as ${componentType})` : inlineReplacement}, { ${props.join(', ')} })`;
				return { start: el.getStart(ref.source), end: el.getEnd(), text: ts.isJsxElement(el.parent) || ts.isJsxFragment(el.parent) ? `{${call}}` : call };
			})();
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
			const removedImport = (() => {
				for (const statement of ref.source.statements) {
					if (!ts.isImportDeclaration(statement)) continue;
					const bindings = statement.importClause?.namedBindings;
					if (!bindings || !ts.isNamedImports(bindings)) continue;
					const specifier = bindings.elements.find(element => canonical(checker, checker.getSymbolAtLocation(element.name)) === c.symbol);
					if (!specifier) continue;
					if (bindings.elements.length === 1) return { start: statement.getStart(ref.source), end: statement.getEnd() };
					const idx = bindings.elements.indexOf(specifier);
					return idx === 0 ? { start: specifier.getStart(ref.source), end: bindings.elements[1]!.getStart(ref.source) } : { start: bindings.elements[idx - 1]!.getEnd(), end: specifier.getEnd() };
				}
				return null;
			})();
			if (removedImport) candidateEdits.push({ file: ref.file, ...removedImport, text: '' });
			const statementStart = c.statement.getStart(c.source);
			const statementEnd = c.statement.getEnd();
			const lineStart = c.source.text.lastIndexOf('\n', statementStart - 1) + 1;
			const lineEnd = c.source.text.indexOf('\n', statementEnd);
			const ownsLine = S_U_REGEX.test(c.source.text.slice(lineStart, statementStart)) && S_U_REGEX.test(c.source.text.slice(statementEnd, lineEnd < 0 ? c.source.text.length : lineEnd));
			candidateEdits.push({ file: c.file, start: ownsLine ? lineStart : statementStart, end: ownsLine ? (lineEnd < 0 ? statementEnd : lineEnd + 1) : statementEnd, text: '' });
			const referenceEdit = candidateEdits.find(e => e.file === ref.file && e.end > e.start)!;
			pending.push({
				fileEdits: candidateEdits,
				referenceLength: referenceEdit.end - referenceEdit.start,
				nestedReference: candidates.some(o => o !== c && o.source === ref.source && ref.node.getStart(ref.source) >= o.statement.getStart(ref.source) && ref.node.getEnd() <= o.statement.getEnd()),
				candidateKey: `${c.file}:${c.name.text}`,
				jsxFile,
			});
		}
		const selected: typeof pending = [];
		for (const candidate of pending.sort((l, r) => Number(r.nestedReference) - Number(l.nestedReference) || l.referenceLength - r.referenceLength)) {
			if (selected.some(other => candidate.fileEdits.some(edit => other.fileEdits.some(existing => edit.file === existing.file && edit.start < existing.end && existing.start < edit.end)))) continue;
			selected.push(candidate);
		}
		let remaining = selected;
		while (remaining.length) {
			edits.clear();
			for (const candidate of remaining) for (const edit of candidate.fileEdits) edits.set(edit.file, [...(edits.get(edit.file) ?? []), edit]);
			for (const file of new Set(remaining.flatMap(candidate => (candidate.jsxFile ? [candidate.jsxFile] : [])))) {
				const source = program.getSourceFile(file)!;
				const imports = source.statements.filter(ts.isImportDeclaration);
				const pos = imports.length ? imports[imports.length - 1]!.end : (source.statements[0]?.getStart(source) ?? 0);
				edits.set(file, [...(edits.get(file) ?? []), { start: pos, end: pos, text: `${pos ? '\n' : ''}import { createElement as ${reactCreateElementName(source)} } from 'react';\n` }]);
			}
			const invalidFiles = new Set<string>();
			for (const [file, fileEdits] of edits) {
				const ascending = [...fileEdits].sort((a, b) => a.start - b.start || a.end - b.end);
				if (!program.getSourceFile(file) || ascending.some((edit, i) => i > 0 && edit.end > edit.start && ascending[i - 1]!.end > ascending[i - 1]!.start && edit.start < ascending[i - 1]!.end)) {
					invalidFiles.add(file);
					continue;
				}
				if (
					(
						ts.createSourceFile(
							file,
							ascending.reverse().reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), readFileSync(file, 'utf8')),
							ts.ScriptTarget.Latest,
							true,
							file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
						) as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }
					).parseDiagnostics.length
				)
					invalidFiles.add(file);
			}
			if (!invalidFiles.size) break;
			const rejected = remaining.filter(c => c.fileEdits.some(edit => invalidFiles.has(edit.file)) || (c.jsxFile && invalidFiles.has(c.jsxFile)));
			for (const candidate of rejected)
				rejectedInlineCandidates.set(
					candidate.candidateKey,
					`the combined inline in ${[...invalidFiles].map(f => relative(cfg.root, f)).join(', ')} would produce invalid syntax; resolve this candidate manually`,
				);
			remaining = remaining.filter(c => !rejected.includes(c));
		}
		const updates: { file: string; text: string }[] = [];
		for (const [file, fileEdits] of edits) {
			const src = readFileSync(file, 'utf8');
			const ascending = [...fileEdits].sort((a, b) => a.start - b.start || a.end - b.end);
			if (ascending.some((e, i) => e.end > e.start && i > 0 && ascending[i - 1]!.end > ascending[i - 1]!.start && e.start < ascending[i - 1]!.end)) continue;
			const updated = ascending.reverse().reduce((t, e) => t.slice(0, e.start) + e.text + t.slice(e.end), src);
			if (updated === src) continue;
			if (
				(
					ts.createSourceFile(
						file,
						updated,
						ts.ScriptTarget.Latest,
						true,
						file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
					) as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }
				).parseDiagnostics.length
			)
				continue;
			updates.push({ file, text: updated });
		}
		for (const { file, text } of updates) {
			writeFileSync(file, text);
			changedFiles.add(file);
		}
		if (!updates.length && finalFindings) finalFindings.splice(0, finalFindings.length, ...findingsFromAnalysis(cfg, checker, candidates, refs, astroConsumers, program));
		if (!updates.length) {
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
