/**
 * packages/reporting/src/lib/slideshow.ts
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
 *
 * @return Screenshot dimensions and prompts for visual review.
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
 *
 * @return Positioned dimensions that fit inside the target region.
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
 * @param viewportSize Rendered viewport dimensions, formatted as width-by-height.
 *
 * @return Base64 image data and preview dimensions.
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
 *
 * @return Numeric viewport width, or a final sort value when unavailable.
 */
const viewportWidth = (r: VisualResult): number => Number.parseInt(r.viewportSize.split('×')[0] || '', 10) || Number.MAX_SAFE_INTEGER;
/**
 * Returns the highest-priority load grade recorded for one result.
 *
 * @param r Result whose load measurements are summarized.
 *
 * @return `fail`, `warning`, or `pass`, or an empty string when no grade exists.
 */
const resultLoadGrade = (r: VisualResult): string => {
	const counts = loadGradeCounts(r.loadMeasurements || []);
	return counts.fail ? 'fail' : counts.warning ? 'warning' : counts.pass ? 'pass' : '';
};
/**
 * Builds the visible review copy and diagnostics for one result.
 *
 * @param r Result metadata and diagnostics to describe.
 * @param review Screenshot review cues to include.
 *
 * @return Text shown beside the screenshot and in speaker notes.
 */
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
 * Adds a responsive comparison slide for results sharing one test identity.
 *
 * @param presentation Presentation receiving the slide.
 * @param group Results for the same test across one or more viewports.
 * @param slideNumber One-based slide number shown in the title.
 *
 * @return A promise that resolves after the comparison slide is added.
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
/** One test result paired with a graded timing measurement for the report. */
type LoadRow = { result: VisualResult; measurement: NonNullable<VisualResult['loadMeasurements']>[number] };
/**
 * Adds a run-level load summary slide and names the slowest measurements.
 *
 * @param presentation Presentation receiving the summary slide.
 * @param results Results whose load measurements are summarized.
 */
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
/**
 * Adds paginated slides containing every individual test, page, and operation measurement.
 *
 * @param presentation Presentation receiving the detail slides.
 * @param results Results whose individual load measurements are listed.
 *
 * @return Number of detail slides added.
 */
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
 *
 * @return A promise that resolves after the slideshow has been written.
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
