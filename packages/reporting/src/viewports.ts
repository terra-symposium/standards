/**
 * packages/reporting/src/viewports.ts
 * Responsive viewport selection and Playwright project naming helpers.
 */

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
 * @param raw - or whitespace-separated viewport names, aliases, or `all`.
 * @param catalog Viewport catalog against which names are validated.
 * @returns The selected viewport definitions in request order.
 * @throws When the selection contains a name absent from the catalog.
 */
export const resolveVisualViewports = (raw = process.env.PW_VIEWPORTS, catalog: ViewportCatalog = VISUAL_VIEWPORTS): VisualViewport[] => {
	const names = Object.keys(catalog);
	const selection = raw?.trim().toLowerCase() || 'default';
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
 * @returns The project name used for this viewport.
 */
export const visualProjectName = (baseName: string, viewport: VisualViewport, selected: readonly VisualViewport[]): string =>
	selected.length === 1 && viewport.name === 'xl' ? baseName : `${baseName}-${viewport.name}`;

/**
 * Finds the viewport suffix represented by a Playwright project name.
 *
 * @param projectName Playwright project name to inspect.
 * @param catalog Viewport catalog containing recognized suffixes.
 * @returns The matching viewport name, or the default `xl` name.
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
 * @returns The base project name without its viewport suffix.
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
 * @returns A width-by-height label using the multiplication sign.
 */
export const viewportSizeLabel = (viewport: string, catalog: ViewportCatalog = VISUAL_VIEWPORTS): string => {
	const size = catalog[viewport] || catalog.xl || VISUAL_VIEWPORTS.xl;
	return `${size.width}×${size.height}`;
};
