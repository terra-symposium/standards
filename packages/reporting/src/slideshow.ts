/**
 * packages/reporting/src/slideshow.ts
 * Slideshow evidence writer for screenshot-backed test runs.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { loadGradeCounts } from './load-testing.js';
import { neutralizeApplicationMetadata } from './metadata.js';
import { VISUAL_VIEWPORTS } from './viewports.js';

// TYPES
import type { VisualResult } from './core.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Minimal presentation surface required from the slideshow library. */
type Presentation = {
	layout: string;
	author: string;
	company: string;
	subject: string;
	title: string;
	ShapeType: { line: string; roundRect: string };
	addSlide: () => /** Minimal slide surface used by the writer's runtime-compatible adapter. */ {
		background: { color: string };
		addText: (text: string, options: Record<string, unknown>) => void;
		addShape: (shape: string, options: Record<string, unknown>) => void;
		addImage: (options: Record<string, unknown>) => void;
		addNotes: (notes: string) => void;
	};
	writeFile: (options: { fileName: string }) => Promise<string>;
};
const COLOURS = { accent: '1F4E78', ink: '16202A', line: 'D8DEE6', muted: '52606D', surface: 'F5F7FA' };
/** Holds screenshot dimensions and review cues for one slide image. */
type ImgReview = { cues: string[]; height: number; width: number };
/**
 * Derives visual-review prompts from screenshot dimensions and test diagnostics.
 *
 * @param file Screenshot path used for dimension analysis.
 * @param r Result metadata and diagnostics used to derive review cues.
 * @returns Screenshot dimensions and prompts for visual review.
 */
const reviewImg = async (file: string, r: VisualResult): Promise<ImgReview> => {
	const metadata = await sharp(file).metadata();
	const width = metadata.width || 0;
	const height = metadata.height || 0;
	const cues: string[] = [];
	if (height > width * 2.2) cues.push('Long full-page capture: inspect vertical rhythm, repeated whitespace, and section transitions.');
	if (r.viewport !== 'xl') cues.push(`Responsive capture: inspect breakpoint changes at ${r.viewportSize}, especially wrapping, navigation, grids, and overflow.`);
	if (r.browserErrors) cues.push('Browser diagnostics were captured; check whether the visible surface reflects the reported error.');
	if (r.terminalErrors) cues.push('Terminal diagnostics were captured; compare the visible state with the runtime warning or failure.');
	if (r.status !== 'passed') cues.push(`Test status is ${r.status}; confirm whether the visible defect is causal or incidental.`);
	if (!cues.length) cues.push('Inspect alignment, text wrapping, control density, whitespace, and visual hierarchy for issues not covered by assertions.');
	return { cues, height, width };
};
/**
 * Fits an image into a bounded slide region while preserving its aspect ratio.
 *
 * @param width Source image width.
 * @param height Source image height.
 * @param x Left edge of the target region.
 * @param y Top edge of the target region.
 * @param maxWidth Maximum target width.
 * @param maxHeight Maximum target height.
 * @returns Positioned dimensions that fit inside the target region.
 */
const fitImg = (width: number, height: number, x: number, y: number, maxWidth: number, maxHeight: number): { h: number; w: number; x: number; y: number } => {
	const scale = Math.min(maxWidth / Math.max(width, 1), maxHeight / Math.max(height, 1));
	const fittedWidth = width * scale;
	const fittedHeight = height * scale;
	return { h: fittedHeight, w: fittedWidth, x: x + (maxWidth - fittedWidth) / 2, y: y + (maxHeight - fittedHeight) / 2 };
};
/**
 * Crops a tall screenshot into a slide-friendly preview while retaining the original in notes.
 *
 * @param file Screenshot path to preview.
 * @returns Base64 image data and preview dimensions.
 */
const previewImg = async (file: string, viewportSize: string): Promise<{ data: string; height: number; width: number }> => {
	const metadata = await sharp(file).metadata();
	const width = metadata.width || 1;
	const [viewportWidth, viewportHeight] = viewportSize.split('×').map((v) => Number.parseInt(v, 10));
	const viewportPreviewHeight = viewportWidth && viewportHeight ? Math.round((width * viewportHeight) / viewportWidth) : Math.round(width / 0.38);
	const height = Math.min(metadata.height || 1, Math.max(1, viewportPreviewHeight));
	const data = await sharp(file).extract({ height, left: 0, top: 0, width }).png().toBuffer();
	return { data: `data:image/png;base64,${data.toString('base64')}`, height, width };
};
/**
 * Sorts responsive results by their rendered viewport width.
 *
 * @param r Result whose viewport label should be parsed.
 * @returns Numeric viewport width, or a final sort value when unavailable.
 */
const viewportWidth = (r: VisualResult): number => Number.parseInt(r.viewportSize.split('×')[0] || '', 10) || Number.MAX_SAFE_INTEGER;
/**
 * Builds the visible review copy and diagnostics for one result.
 *
 * @param r Result metadata and diagnostics to describe.
 * @param review Screenshot review cues to include.
 * @returns Text shown beside the screenshot and in speaker notes.
 */
const resultLoadGrade = (r: VisualResult): string => {
	const counts = loadGradeCounts(r.loadMeasurements || []);
	return counts.fail ? 'fail' : counts.warning ? 'warning' : counts.pass ? 'pass' : '';
};
const slideCopy = (r: VisualResult, review: ImgReview): string => {
	const grade = resultLoadGrade(r);
	const measurements = r.loadMeasurements || [];
	const lines = [
		`${r.project} · ${r.viewport} · ${r.viewportSize}`,
		r.groups || r.file,
		`Status: ${r.status}${r.duration ? ` · ${r.duration} ms` : ''}${grade ? ` · Load: ${grade}` : ''}`,
		...measurements.map((i) => `Load ${i.kind}: ${i.name} — ${i.durationMs.toFixed(1)} ms (${i.grade}; warn ${i.budget.warnMs} / fail ${i.budget.failMs} ms)`),
		'',
		...review.cues.map((c) => `• ${c}`),
	];
	if (r.error) lines.push('', `Test error: ${r.error}`);
	if (r.browserErrors) lines.push('', `Browser: ${r.browserErrors}`);
	if (r.terminalErrors) lines.push('', `Terminal: ${r.terminalErrors}`);
	return lines.join('\n');
};
/**
 * Adds a single-result slide with its screenshot and review prompts.
 *
 * @param presentation Presentation receiving the slide.
 * @param r Screenshot-backed result to render.
 * @param slideNumber One-based slide number shown in the title.
 * @returns A promise that resolves after the slide and notes are added.
 */
/**
 * Adds a responsive comparison slide for results sharing one test identity.
 *
 * @param presentation Presentation receiving the slide.
 * @param group Results for the same test across one or more viewports.
 * @param slideNumber One-based slide number shown in the title.
 * @returns A promise that resolves after the comparison slide is added.
 */
const addResponsiveSlide = async (presentation: Presentation, group: readonly VisualResult[], slideNumber: number): Promise<void> => {
	const first = group[0];
	if (!first) return;
	const slide = presentation.addSlide();
	slide.background = { color: COLOURS.surface };
	slide.addText(`${String(slideNumber).padStart(3, '0')}  ${first.title}`, {
		bold: true,
		color: COLOURS.ink,
		fit: 'shrink',
		fontFace: 'Aptos Display',
		fontSize: 18,
		margin: 0,
		x: 0.38,
		y: 0.22,
		w: 12.55,
		h: 0.34,
	});
	slide.addText(`${first.project} · responsive comparison · ${first.groups || first.file}`, { color: COLOURS.muted, fontFace: 'Aptos', fontSize: 8.5, margin: 0, x: 0.38, y: 0.62, w: 12.55, h: 0.2 });
	slide.addShape(presentation.ShapeType.line, { line: { color: COLOURS.line, width: 1 }, x: 0.38, y: 0.9, w: 12.55, h: 0 });
	const notes: string[] = [];
	const gap = 0.12;
	const cols = Math.min(3, group.length);
	const rows = Math.ceil(group.length / cols);
	const width = (12.55 - gap * (cols - 1)) / cols;
	const height = (6.02 - gap * (rows - 1)) / rows;
	for (const [idx, r] of group.entries()) {
		const col = idx % cols;
		const row = Math.floor(idx / cols);
		const x = 0.38 + col * (width + gap);
		const y = 1.02 + row * (height + gap);
		slide.addShape(presentation.ShapeType.roundRect, { fill: { color: 'FFFFFF' }, line: { color: COLOURS.line, width: 1 }, x, y, w: width, h: height, rectRadius: 0.04 });
		const loadGrade = resultLoadGrade(r);
		slide.addText(`${r.viewport} · ${r.viewportSize} · ${r.status}${loadGrade ? ` · Load ${loadGrade}` : ''}`, {
			bold: true,
			color: COLOURS.accent,
			fontFace: 'Aptos',
			fontSize: 7.2,
			margin: 0,
			x: x + 0.12,
			y: y + 0.1,
			w: width - 0.24,
			h: 0.2,
		});
		if (r.screenshot && fs.existsSync(r.screenshot)) {
			const review = await reviewImg(r.screenshot, r);
			const preview = await previewImg(r.screenshot, r.viewportSize);
			slide.addImage({ data: preview.data, ...fitImg(preview.width, preview.height, x + 0.08, y + 0.38, width - 0.16, height - 0.46) });
			notes.push(`${r.viewport}: full-page screenshot images/${path.basename(r.screenshot)}\n${slideCopy(r, review)}`);
		} else {
			slide.addText('SCREENSHOT MISSING', { align: 'center', bold: true, color: '9A3412', fontFace: 'Aptos', fontSize: 12, x: x + 0.2, y: y + height / 2 - 0.14, w: width - 0.4, h: 0.28 });
			notes.push(`${r.viewport}: no screenshot captured`);
		}
	}
	slide.addNotes(notes.join('\n\n'));
};
/** Optional visible and metadata overrides for a slideshow artifact. */
export type SlideshowOptions = { title?: string; author?: string; company?: string; subject?: string; loadTestingEnabled?: boolean };

/** A named screenshot collected by the shared Playwright visual-capture fixture. */
export type ScreenshotCapture = {
	/** Stable test- and application-scoped group key shared across viewports. */
	group: string;
	/** Stable capture key shared across responsive projects. */
	key: string;
	/** Human-readable scenario label shown above its screenshot group. */
	title: string;
	/** Responsive viewport name. */
	viewport: string;
	/** Human-readable viewport dimensions. */
	viewportSize: string;
	/** Accessible screenshot file. */
	screenshot: string;
	/** Retry number used to select the final capture for each viewport. */
	retry?: number;
	/** Run that produced this capture. Missing IDs identify legacy evidence. */
	runId?: string;
	/** Time this capture was persisted. */
	capturedAt?: string;
	/** True when the capture predates the latest run marker in its directory. */
	historical?: boolean;
};

/** Expected test identities and viewports captured by one logical reporter run. */
type ScreenshotRunInventory = { runId: string; expectedCaptureGroups?: Array<{ group: string; viewports: string[] }> };

/** Presentation metadata and optional logical-run selection for screenshot-only captures. */
export type ScreenshotSlideshowOptions = {
	title?: string;
	author?: string;
	company?: string;
	subject?: string;
	/** Restrict a directory rebuild to this run; omit it to include historical captures. */
	currentRunId?: string;
	/** Restrict a directory-tree rebuild to one or more current run IDs per top-level repository folder. */
	currentRunIdsBySource?: Record<string, string | string[]>;
};

/** One repository's durable screenshot directory and optional exact Playwright run. */
export type ScreenshotDirectorySource = { label: string; directory: string; runId?: string };

/** Reads persisted screenshot records and labels captures outside the latest run as historical. */
export const readScreenshotCapturesFromDirectory = (directory: string, currentRunId?: string | readonly string[]): ScreenshotCapture[] => {
	if (!fs.existsSync(directory)) return [];
	let markerRunId: string | undefined;
	const currentRunIds = new Set(typeof currentRunId === 'string' ? [currentRunId] : currentRunId || []);
	let currentCaptureGroups: Map<string, Set<string>> | undefined;
	try {
		const run = JSON.parse(fs.readFileSync(path.join(directory, '.terra-playwright-run.json'), 'utf8')) as ScreenshotRunInventory;
		markerRunId = run.runId;
		if (!currentRunIds.size) currentRunIds.add(run.runId);
		if (currentRunIds.has(run.runId) && Array.isArray(run.expectedCaptureGroups)) {
			currentCaptureGroups = new Map(
				run.expectedCaptureGroups
					.filter((item) => item && typeof item.group === 'string' && Array.isArray(item.viewports) && item.viewports.every((viewport) => typeof viewport === 'string'))
					.map(({ group, viewports }) => [group, new Set(viewports)]),
			);
		}
	} catch {
		// Legacy folders have no current-run marker; their captures are historical.
	}
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry): ScreenshotCapture[] => {
		if (!entry.isFile() || !entry.name.endsWith('.json')) return [];
		try {
			const row: unknown = JSON.parse(fs.readFileSync(path.join(directory, entry.name), 'utf8'));
			if (!row || typeof row !== 'object') return [];
			const capture = row as Record<string, unknown>;
			if (
				typeof capture.group !== 'string' ||
				typeof capture.key !== 'string' ||
				typeof capture.title !== 'string' ||
				typeof capture.viewport !== 'string' ||
				typeof capture.viewportSize !== 'string' ||
				typeof capture.screenshot !== 'string'
			)
				return [];
			const group = capture.group;
			const viewport = capture.viewport;
			const screenshot = path.isAbsolute(capture.screenshot)
				? capture.screenshot
				: [path.resolve(directory, capture.screenshot), path.resolve(capture.screenshot)].find((candidate) => fs.existsSync(candidate));
			if (!screenshot || !fs.existsSync(screenshot)) return [];
			const captureRunId = typeof capture.runId === 'string' ? capture.runId : undefined;
			const currentTest =
				currentCaptureGroups?.size && captureRunId === markerRunId
					? [...currentCaptureGroups].some(([expectedGroup, viewports]) => group.startsWith(`${expectedGroup}\u0000`) && viewports.has(viewport))
					: currentCaptureGroups && captureRunId === markerRunId
						? false
						: true;
			return [
				{
					group: capture.group,
					key: capture.key,
					title: capture.title,
					viewport: capture.viewport,
					viewportSize: capture.viewportSize,
					screenshot,
					retry: typeof capture.retry === 'number' ? capture.retry : 0,
					runId: typeof capture.runId === 'string' ? capture.runId : undefined,
					capturedAt: typeof capture.capturedAt === 'string' ? capture.capturedAt : undefined,
					historical: !captureRunId || !currentRunIds.has(captureRunId) || !currentTest,
				},
			];
		} catch {
			return [];
		}
	});
};
/** One test result paired with a graded timing measurement for the report. */
type LoadRow = { result: VisualResult; measurement: NonNullable<VisualResult['loadMeasurements']>[number] };
/** Adds a run-level load summary slide and names the slowest measurements. */
const addLoadSummarySlide = (presentation: Presentation, results: readonly VisualResult[]): void => {
	const measurements: LoadRow[] = results.flatMap((r) => (r.loadMeasurements || []).map((measurement) => ({ result: r, measurement })));
	const counts = loadGradeCounts(measurements.map(({ measurement }) => measurement));
	const slowest = [...measurements].sort((a, b) => b.measurement.durationMs - a.measurement.durationMs).slice(0, 6);
	const slide = presentation.addSlide();
	slide.background = { color: COLOURS.surface };
	slide.addText('Load timing summary', { bold: true, color: COLOURS.ink, fontFace: 'Aptos Display', fontSize: 26, margin: 0, x: 0.55, y: 0.45, w: 12.2, h: 0.5 });
	slide.addText(`${measurements.length} measurements   ·   ${counts.pass} pass   ·   ${counts.warning} warning   ·   ${counts.fail} fail`, {
		bold: true,
		color: COLOURS.accent,
		fontFace: 'Aptos',
		fontSize: 17,
		margin: 0,
		x: 0.58,
		y: 1.28,
		w: 12.1,
		h: 0.35,
	});
	slide.addText(
		slowest.length
			? `Slowest measurements\n${slowest.map(({ result: r, measurement }) => `${measurement.grade.toUpperCase()}  ${measurement.durationMs.toFixed(1)} ms  ${r.file} · ${r.title} · ${measurement.name}`).join('\n')}`
			: 'No load measurements were collected.',
		{ color: COLOURS.ink, fontFace: 'Aptos', fontSize: 13, fit: 'shrink', margin: 0.08, valign: 'mid', x: 0.58, y: 2.05, w: 12.1, h: 4.3 },
	);
};
/** Adds paginated slides containing every individual test, page, and operation measurement. */
const addLoadDetailSlides = (presentation: Presentation, results: readonly VisualResult[]): number => {
	const measurements: LoadRow[] = results.flatMap((r) => (r.loadMeasurements || []).map((measurement) => ({ result: r, measurement })));
	const pageSize = 12;
	const pages = Math.max(1, Math.ceil(measurements.length / pageSize));
	for (let page = 0; page < pages; page += 1) {
		const lines = measurements
			.slice(page * pageSize, (page + 1) * pageSize)
			.map(
				({ result: r, measurement }) =>
					`${measurement.grade.toUpperCase().padEnd(7)} ${measurement.durationMs.toFixed(1).padStart(9)} ms  ${measurement.kind.padEnd(9)} ${r.file} · ${r.title} · ${measurement.name}  [warn ${measurement.budget.warnMs} / fail ${measurement.budget.failMs} ms]`,
			);
		const slide = presentation.addSlide();
		slide.background = { color: COLOURS.surface };
		slide.addText(`Load timing details ${page + 1}/${pages}`, { bold: true, color: COLOURS.ink, fontFace: 'Aptos Display', fontSize: 22, margin: 0, x: 0.55, y: 0.4, w: 12.2, h: 0.45 });
		slide.addText(lines.join('\n') || 'No load measurements were collected.', {
			color: COLOURS.ink,
			fontFace: 'Aptos',
			fontSize: 11,
			fit: 'shrink',
			margin: 0.08,
			valign: 'mid',
			x: 0.55,
			y: 1.05,
			w: 12.2,
			h: 5.95,
		});
	}
	return pages;
};
/**
 * Writes screenshot-backed results as single-viewport or responsive review slides.
 *
 * @param file Output path for the slideshow artifact.
 * @param results Normalized results to group and render.
 * @param opts Optional visible title and document metadata overrides.
 * @returns A promise that resolves after the slideshow has been written.
 */
export const writeSlideshow = async (file: string, results: readonly VisualResult[], opts: SlideshowOptions = {}): Promise<void> => {
	const loadEnabled = opts.loadTestingEnabled ?? results.some((r) => !!r.loadMeasurements?.length);
	const presentation = new /* The runtime package is CommonJS while NodeNext exposes its constructor through a namespace type. */ (
		createRequire(import.meta.url)('pptxgenjs') as new () => Presentation
	)();
	presentation.layout = 'LAYOUT_WIDE';
	presentation.author = opts.author || 'Test evidence reporter';
	presentation.company = opts.company || 'Test evidence';
	presentation.subject = opts.subject || 'Screenshot evidence and UI review prompts';
	presentation.title = opts.title || 'Test evidence slideshow';
	let slideNumber = 0;
	if (loadEnabled) {
		addLoadSummarySlide(presentation, results);
		slideNumber += 1;
	}
	const groups = new Map<string, VisualResult[]>();
	for (const r of results) {
		const key = [r.project, r.file, r.groups, r.title].join('|');
		groups.set(key, [...(groups.get(key) || []), r]);
	}
	for (const group of groups.values()) {
		const byViewport = new Map<string, VisualResult>();
		for (const result of group) {
			const prev = byViewport.get(result.viewport);
			if (!prev || result.retry >= prev.retry) byViewport.set(result.viewport, result);
		}
		const ordered = [...byViewport.values()].sort((a, b) => viewportWidth(a) - viewportWidth(b));
		await addResponsiveSlide(presentation, ordered, ++slideNumber);
	}
	if (!slideNumber) {
		const slide = presentation.addSlide();
		slide.background = { color: COLOURS.surface };
		slide.addText('Test evidence slideshow', { align: 'center', bold: true, color: COLOURS.accent, fontFace: 'Aptos Display', fontSize: 30, x: 0.8, y: 2.6, w: 11.7, h: 0.6 });
		slide.addText('No browser test results were collected in this run.', { align: 'center', color: COLOURS.muted, fontFace: 'Aptos', fontSize: 16, x: 1.2, y: 3.35, w: 10.9, h: 0.5 });
	}
	if (loadEnabled) addLoadDetailSlides(presentation, results);
	await presentation.writeFile({ fileName: file });
	await neutralizeApplicationMetadata(file);
};

/**
 * Writes keyed Playwright screenshots as responsive comparison slides with run provenance labels.
 *
 * @param file Output path for the slideshow artifact.
 * @param captures Screenshots collected across test projects and viewports.
 * @param opts Optional presentation metadata overrides.
 * @returns A promise that resolves after the screenshot-backed slideshow has been written.
 */
export const writeScreenshotSlideshow = async (file: string, captures: readonly ScreenshotCapture[], opts: ScreenshotSlideshowOptions = {}): Promise<void> => {
	if (!captures.length) throw new Error('No keyed Playwright screenshots were captured for the screenshot slideshow.');
	const presentation = new /* The runtime package is CommonJS while NodeNext exposes its constructor through a namespace type. */ (
		createRequire(import.meta.url)('pptxgenjs') as new () => Presentation
	)();
	presentation.layout = 'LAYOUT_WIDE';
	presentation.author = opts.author || 'Test evidence reporter';
	presentation.company = opts.company || 'Test evidence';
	presentation.subject = opts.subject || 'Responsive Playwright screenshots';
	presentation.title = opts.title || 'Playwright screenshots';
	const groups = new Map<string, ScreenshotCapture[]>();
	for (const capture of captures) {
		const groupKey = `${capture.group}\0${capture.historical ? 'historical' : 'current'}`;
		groups.set(groupKey, [...(groups.get(groupKey) || []), capture]);
	}
	const knownViewports = Object.keys(VISUAL_VIEWPORTS);
	const viewportWidth = (capture: ScreenshotCapture): number => Number.parseInt(capture.viewportSize.split('×')[0] || '', 10) || Number.MAX_SAFE_INTEGER;
	const orderedGroups = [...groups.entries()].sort(([first], [second]) => first.localeCompare(second));
	const slideWidth = 13.333;
	const slideHeight = 7.5;
	const margin = 0.08;
	const gap = 0.08;
	const columns = 3;
	const cellWidth = (slideWidth - margin * 2 - gap * (columns - 1)) / columns;
	for (const [, group] of orderedGroups) {
		const byViewport = new Map<string, ScreenshotCapture>();
		for (const capture of group) {
			const previous = byViewport.get(capture.viewport);
			const sameRun = previous && capture.runId === previous.runId;
			const capturedAt = Date.parse(capture.capturedAt || '') || 0;
			const previousCapturedAt = Date.parse(previous?.capturedAt || '') || 0;
			const isNewer = capturedAt >= previousCapturedAt;
			if (!previous || (sameRun ? (capture.retry || 0) > (previous.retry || 0) || ((capture.retry || 0) === (previous.retry || 0) && isNewer) : isNewer)) {
				byViewport.set(capture.viewport, capture);
			}
		}
		const ordered = [...byViewport.values()].sort((first, second) => {
			const firstIndex = knownViewports.indexOf(first.viewport);
			const secondIndex = knownViewports.indexOf(second.viewport);
			if (firstIndex >= 0 || secondIndex >= 0) return (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) - (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex);
			return viewportWidth(first) - viewportWidth(second);
		});
		const rows = Math.ceil(ordered.length / columns);
		const cellHeight = (slideHeight - margin * 2 - 0.22 - gap * Math.max(0, rows - 1)) / rows;
		const slide = presentation.addSlide();
		slide.background = { color: 'FFFFFF' };
		const historical = group[0]?.historical === true;
		slide.addText(`${historical ? 'HISTORICAL CAPTURE' : 'CURRENT RUN'} · ${group[0]?.title || 'Playwright capture'}`, {
			bold: true,
			color: historical ? '8A5A32' : '315B43',
			fontFace: 'Aptos',
			fontSize: 8,
			fit: 'shrink',
			margin: 0,
			x: margin,
			y: 0.025,
			w: slideWidth - margin * 2,
			h: 0.18,
		});
		for (const [index, capture] of ordered.entries()) {
			if (!fs.existsSync(capture.screenshot)) throw new Error(`Screenshot is missing for ${capture.key} (${capture.viewport}): ${capture.screenshot}`);
			const column = index % columns;
			const row = Math.floor(index / columns);
			const x = margin + column * (cellWidth + gap);
			const y = margin + 0.22 + row * (cellHeight + gap);
			const { data, info } = await sharp(capture.screenshot)
				.rotate()
				.resize({ width: 720, height: 405, fit: 'inside', withoutEnlargement: true })
				.jpeg({ quality: 62, mozjpeg: true })
				.toBuffer({ resolveWithObject: true });
			slide.addImage({ data: `data:image/jpeg;base64,${data.toString('base64')}`, ...fitImg(info.width, info.height, x, y, cellWidth, cellHeight) });
		}
	}
	await fs.promises.mkdir(path.dirname(file), { recursive: true });
	await presentation.writeFile({ fileName: file });
	await neutralizeApplicationMetadata(file);
};

/** Reads current and historical screenshots beneath a folder, with stable source names for multi-repository reports. */
const readScreenshotCapturesFromDirectoryTree = (root: string, opts: ScreenshotSlideshowOptions): ScreenshotCapture[] => {
	const visited = new Set<string>();
	const read = (directory: string, isRoot = false): ScreenshotCapture[] => {
		let realDirectory: string;
		try {
			realDirectory = fs.realpathSync(directory);
			if (visited.has(realDirectory)) return [];
			visited.add(realDirectory);
		} catch {
			return [];
		}
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(directory, { withFileTypes: true });
		} catch {
			return [];
		}
		const sourcePath = path.relative(root, directory);
		const sourceName = sourcePath ? sourcePath.split(path.sep)[0] : '';
		const prefix = sourceName ? `${sourceName} · ` : '';
		const currentRunId = isRoot ? opts.currentRunId : opts.currentRunIdsBySource?.[sourceName];
		const local = readScreenshotCapturesFromDirectory(directory, currentRunId).map((capture) => ({
			...capture,
			group: `${prefix}${capture.group}`,
			key: sourceName ? `${sourceName}:${capture.key}` : capture.key,
			title: `${prefix}${capture.title}`,
		}));
		const nested = entries
			.filter((entry) => !['.git', 'node_modules'].includes(entry.name))
			.filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
			.sort((first, second) => first.name.localeCompare(second.name))
			.flatMap((entry) => {
				const child = path.join(directory, entry.name);
				try {
					return fs.statSync(child).isDirectory() ? read(child) : [];
				} catch {
					return [];
				}
			});
		return [...local, ...nested];
	};
	return read(root);
};

/** Rebuilds a screenshot-only slideshow from one capture folder or a tree of repository capture folders. */
export const writeScreenshotSlideshowFromDirectory = async (directory: string, file: string, opts: ScreenshotSlideshowOptions = {}): Promise<void> => {
	const captures = readScreenshotCapturesFromDirectoryTree(directory, opts).filter((capture) => {
		if (opts.currentRunId) return capture.runId === opts.currentRunId && !capture.historical;
		const sourceName = capture.group.includes(' · ') ? capture.group.slice(0, capture.group.indexOf(' · ')) : '';
		const currentRunIds = opts.currentRunIdsBySource?.[sourceName];
		const selectedRunIds = typeof currentRunIds === 'string' ? [currentRunIds] : currentRunIds;
		return !selectedRunIds?.length || (capture.runId !== undefined && selectedRunIds.includes(capture.runId) && !capture.historical);
	});
	if (captures.length) await writeScreenshotSlideshow(file, captures, opts);
};

/** Builds one screenshot-only deck from any completed or partial set of repository capture folders. */
export const writeScreenshotSlideshowFromDirectories = async (file: string, sources: readonly ScreenshotDirectorySource[], opts: ScreenshotSlideshowOptions = {}): Promise<void> => {
	const captures = sources.flatMap(({ label, directory, runId }) =>
		readScreenshotCapturesFromDirectory(directory, runId)
			.filter((capture) => !runId || capture.runId === runId)
			.map((capture) => ({
				...capture,
				group: `${label}/${capture.group}`,
				key: `${label}/${capture.key}`,
				title: `${label} · ${capture.title}`,
			})),
	);
	await writeScreenshotSlideshow(file, captures, opts);
};
