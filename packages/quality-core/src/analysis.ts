/**
 * packages/quality-core/src/analysis.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { srcFiles } from './lib/files.js';

// TYPES
import type { QualityCfg } from './types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Shared parsed sources, texts, and checker for one quality analysis run. */
export type QualityAnalysis = ReturnType<typeof createQualityAnalysis>;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Builds the shared TypeScript program and source cache for a quality run.
 *
 * @param cfg Repository root and source-scope settings used to select files for the shared program.
 *
 * @return Source paths, source texts, parsed files, and the TypeScript program and checker for this run.
 */
export function createQualityAnalysis(cfg: QualityCfg): { files: string[]; texts: Map<string, string>; sources: Map<string, ts.SourceFile>; program: ts.Program; checker: ts.TypeChecker } {
	const files = srcFiles(cfg);
	const program = ts.createProgram({
		rootNames: files.filter(f => /\.(?:c|m)?(?:js|jsx|ts|tsx)$/.test(f)),
		options: {
			allowNonTsExtensions: true,
			allowJs: true,
			checkJs: false,
			jsx: ts.JsxEmit.Preserve,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
		},
	});
	return {
		files,
		texts: new Map(files.map(f => [f, readFileSync(f, 'utf8')])),
		sources: new Map(files.map(f => [f, program.getSourceFile(f)]).filter((e): e is [string, ts.SourceFile] => Boolean(e[1]))),
		program,
		checker: program.getTypeChecker(),
	};
}
