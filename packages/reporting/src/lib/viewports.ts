/**
 * packages/reporting/src/lib/viewports.ts
 * Responsive viewport selection and Playwright project naming helpers.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import path from 'node:path';
import { readLoadTestingConfig } from './load-testing.js';

// TYPES
import type { LoadTestingConfig } from './core.js';
import type { PlaywrightTestConfig } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** The default responsive viewport catalog used by the shared reporter. */
export const VISUAL_VIEWPORTS = {
	mobile: { height: 844, width: 390 },
	sm: { height: 800, width: 640 },
	md: { height: 900, width: 768 },
	lg: { height: 768, width: 1024 },
	xl: { height: 720, width: 1280 },
	'2xl': { height: 864, width: 1536 },
} as const;

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/** A named viewport catalog supplied by an application or test suite. */
export type ViewportCatalog = Readonly<Record<string, { height: number; width: number }>>;

/** Names available in the default viewport catalog. */
export type VisualViewportName = keyof typeof VISUAL_VIEWPORTS;

/** A resolved viewport with the name retained for project and artifact labels. */
export type VisualViewport = { name: string; height: number; width: number };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Resolves an environment selection or alias list against an application catalog.
 *
 * @param raw Comma- or whitespace-separated viewport names, aliases, or `all`.
 * @param catalog Viewport catalog against which names are validated.
 *
 * @return The selected viewport definitions in request order.
 *
 * @throws When the selection contains a name absent from the catalog.
 */
export const resolveVisualViewports = (raw = process.env.PW_VIEWPORTS, catalog: ViewportCatalog = VISUAL_VIEWPORTS): VisualViewport[] => {
	const names = Object.keys(catalog);
	const selection = raw?.trim().toLowerCase() || 'all';
	const selected =
		selection === 'all'
			? names
			: selection
					.split(/[\s,]+/)
					.filter(Boolean)
					.map((n) => (names.includes(n) ? n : { computer: 'xl', default: 'xl', desktop: 'xl', phone: 'mobile', tablet: 'md', wide: '2xl' }[n] || n));
	const unique = selected.filter((n, i) => selected.indexOf(n) === i);
	const invalid = unique.filter((n) => !names.includes(n));
	if (invalid.length) throw new Error(`Unknown PW_VIEWPORTS value(s): ${invalid.join(', ')}. Use default, all, or ${names.join(', ')}.`);
	return unique.map((n) => ({ name: n, ...catalog[n] }));
};

/**
 * Adds a viewport suffix unless the default single-xl project can retain its base name.
 *
 * @param baseName Base Playwright project name.
 * @param viewport Viewport being assigned to the project.
 * @param selected All viewports selected for the run.
 *
 * @return The project name used for this viewport.
 */
export const visualProjectName = (baseName: string, viewport: VisualViewport, selected: readonly VisualViewport[]): string =>
	selected.length === 1 && viewport.name === 'xl' ? baseName : `${baseName}-${viewport.name}`;

/**
 * Finds the viewport suffix represented by a Playwright project name.
 *
 * @param projectName Playwright project name to inspect.
 * @param catalog Viewport catalog containing recognized suffixes.
 *
 * @return The matching viewport name, or the default `xl` name.
 */
export const projectViewportName = (projectName: string, catalog: ViewportCatalog = VISUAL_VIEWPORTS): string => {
	const names = Object.keys(catalog).sort((a, b) => b.length - a.length);
	const match = names.find((n) => projectName.endsWith(`-${n}`));
	if (match) return match;
	return names.includes(projectName) ? projectName : 'xl';
};

/**
 * Removes a recognized viewport suffix from a Playwright project name.
 *
 * @param projectName Playwright project name to normalize.
 * @param catalog Viewport catalog containing recognized suffixes.
 *
 * @return The base project name without its viewport suffix.
 */
export const baseVisualProjectName = (projectName: string, catalog: ViewportCatalog = VISUAL_VIEWPORTS): string => {
	const viewport = projectViewportName(projectName, catalog);
	return projectName.endsWith(`-${viewport}`) ? projectName.slice(0, -(viewport.length + 1)) : projectName;
};

/**
 * Formats a viewport's dimensions for result tables and review slides.
 *
 * @param viewport Viewport name to format.
 * @param catalog Viewport catalog containing dimensions.
 *
 * @return A width-by-height label using the multiplication sign.
 */
export const viewportSizeLabel = (viewport: string, catalog: ViewportCatalog = VISUAL_VIEWPORTS): string => {
	const size = catalog[viewport] || catalog.xl || VISUAL_VIEWPORTS.xl;
	return `${size.width}×${size.height}`;
};

/** Options for the shared responsive Playwright configuration helper. */
export type ResponsivePlaywrightOptions = {
	/** Project names that represent manual, single-run browser captures. */
	singleRunProjects?: readonly string[];
	/** Disposable Playwright output directory, separate from timestamped reports. */
	outputDir?: string;
	/** Parent directory for timestamped reports and their shared images folder. */
	outputRoot?: string;
	/** Optional structured results file to add to the workbook exactly once. */
	supplementalResultsFile?: string;
	/** Optional path to the repository's quality.json; defaults to the current directory. */
	qualityConfigFile?: string;
	/** Explicit timing settings that override matching quality.json values. */
	loadTesting?: LoadTestingConfig;
};
/** Project fields needed to expand and classify a Playwright project. */
type ResponsiveProjectConfig = { dependencies?: readonly string[]; name?: string; testMatch?: unknown; use?: Record<string, unknown> };

/**
 * Expands every regular Playwright project across Terra's shared responsive viewport set.
 *
 * Setup projects (projects referenced as dependencies, setup-named projects, or projects
 * matching a `.setup.*` file) run once. Manual browser capture projects can be listed in
 * `singleRunProjects`. The helper adds full-page automatic screenshots and the shared
 * evidence reporter while preserving any other configured reporters.
 *
 * @param cfg Existing Playwright configuration to extend.
 * @param opts Shared matrix and reporting options.
 *
 * @return Configuration with responsive projects, native screenshots, and reporting.
 */
export const withResponsivePlaywright = <T extends PlaywrightTestConfig>(cfg: T, opts: ResponsivePlaywrightOptions = {}): T => {
	const viewports = resolveVisualViewports();
	const loadTesting = readLoadTestingConfig(opts.qualityConfigFile, opts.loadTesting);
	const sharedDistCandidates = [
		path.resolve(process.cwd(), 'node_modules/@terra-symposium/standards-reporting/dist'),
		path.resolve(process.cwd(), 'dist'),
		path.resolve(process.cwd(), 'packages/reporting/dist'),
	];
	const sharedDist = sharedDistCandidates.find((c) => fs.existsSync(c)) || sharedDistCandidates[0];
	// Thread configuration snapshots through parameters to retain their evaluation order.
	return ((resolvedSharedDist: string, getProjects: () => ResponsiveProjectConfig[]) =>
		((external: string[], projects: ResponsiveProjectConfig[]) =>
			((dependencyProjects: Set<string>, singleRun: Set<string>) =>
				((responsiveProjects: unknown[]) =>
					((
						cfgdReporters: unknown[],
						reportingOpts: {
							outputRoot: ResponsivePlaywrightOptions['outputRoot'];
							supplementalResultsFile: ResponsivePlaywrightOptions['supplementalResultsFile'];
							qualityConfigFile: ResponsivePlaywrightOptions['qualityConfigFile'];
							loadTesting: LoadTestingConfig;
						},
					) =>
						((reporters: unknown[]) =>
							({
								...cfg,
								metadata: { ...(cfg.metadata || {}), terraLoadTestingEnabled: loadTesting.enabled },
								build: { ...(cfg.build || {}), external },
								outputDir: opts.outputDir || 'test-results/playwright-output',
								projects: responsiveProjects,
								reporter: reporters,
								use: { ...(cfg.use || {}), screenshot: { mode: 'on', fullPage: true, caret: 'initial' } },
							}) as T)([
							...cfgdReporters.filter((r) => {
								const name = Array.isArray(r) ? r[0] : r;
								return !(typeof name === 'string' && name.includes('@terra-symposium/standards-reporting/playwright'));
							}),
							['@terra-symposium/standards-reporting/playwright', reportingOpts],
						]))(cfg.reporter ? (Array.isArray(cfg.reporter) ? cfg.reporter : [cfg.reporter]) : [], {
						outputRoot: opts.outputRoot,
						supplementalResultsFile: opts.supplementalResultsFile,
						qualityConfigFile: opts.qualityConfigFile,
						loadTesting,
					}))(
					projects.flatMap((p, i) => {
						const baseName = p.name || `project-${i + 1}`;
						const name = p.name || `project-${i + 1}`;
						if (
							((matchText: string) => dependencyProjects.has(name) || /setup/i.test(name) || /\.setup\.[cm]?[jt]sx?/i.test(matchText))(
								(Array.isArray(p.testMatch) ? p.testMatch : [p.testMatch]).map((e) => (e instanceof RegExp ? e.source : String(e || ''))).join(' '),
							) ||
							singleRun.has(baseName)
						)
							return [p];
						return viewports.map((v) => ({
							...p,
							name: visualProjectName(baseName, v, viewports),
							use: { ...(p.use || {}), viewport: { width: v.width, height: v.height }, screenshot: { mode: 'on', fullPage: true, caret: 'initial' } },
						}));
					}),
				))(new Set(projects.flatMap((p) => p.dependencies || [])), new Set(opts.singleRunProjects || [])))([...(cfg.build?.external || []), path.join(resolvedSharedDist, '**')], getProjects()))(
		fs.existsSync(sharedDist) ? fs.realpathSync(sharedDist) : sharedDist,
		() => (cfg.projects || []) as ResponsiveProjectConfig[],
	);
};
