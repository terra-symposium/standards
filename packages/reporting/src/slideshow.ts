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
const previewImg = async (file: string): Promise<{ data: string; height: number; width: number }> => {
	const metadata = await sharp(file).metadata();
	const width = metadata.width || 1;
	const height = Math.min(metadata.height || 1, Math.max(1, Math.round(width / 0.38)));
	return { data: `data:image/png;base64,${(await sharp(file).extract({ height, left: 0, top: 0, width }).png().toBuffer()).toString('base64')}`, height, width };
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
const slideCopy = (r: VisualResult, review: ImgReview): string => {
	const lines = [`${r.project} · ${r.viewport} · ${r.viewportSize}`, r.groups || r.file, `Status: ${r.status}${r.duration ? ` · ${r.duration} ms` : ''}`, '', ...review.cues.map((c) => `• ${c}`)];
	if (r.error) lines.push('', `Test error: ${r.error}`);
	if (r.browserErrors) lines.push('', `Browser: ${r.browserErrors}`);
	if (r.terminalErrors) lines.push('', `Terminal: ${r.terminalErrors}`);
	return lines.join('\n');
};
/** Keeps the single-use slide-writing operations together around their shared presentation. */
class SlideshowWriter {
	/**
	 * Adds a single-result slide with its screenshot and review prompts.
	 *
	 * @param presentation Presentation receiving the slide.
	 * @param r Screenshot-backed result to render.
	 * @param slideNumber One-based slide number shown in the title.
	 * @returns A promise that resolves after the slide and notes are added.
	 */
	static async addSingleViewportSlide(presentation: Presentation, r: VisualResult, slideNumber: number): Promise<void> {
		if (!r.screenshot || !fs.existsSync(r.screenshot)) return;
		const review = await reviewImg(r.screenshot, r);
		const slide = presentation.addSlide();
		slide.background = { color: COLOURS.surface };
		slide.addText(`${String(slideNumber).padStart(3, '0')}  ${r.title}`, {
			bold: true,
			color: COLOURS.ink,
			fit: 'shrink',
			fontFace: 'Aptos Display',
			fontSize: 20,
			margin: 0,
			x: 0.38,
			y: 0.25,
			w: 12.55,
			h: 0.36,
		});
		slide.addShape(presentation.ShapeType.line, { line: { color: COLOURS.line, width: 1 }, x: 0.38, y: 0.78, w: 12.55, h: 0 });
		slide.addShape(presentation.ShapeType.roundRect, { fill: { color: 'FFFFFF' }, line: { color: COLOURS.line, width: 1 }, x: 0.38, y: 0.98, w: 8.2, h: 5.95, rectRadius: 0.06 });
		const preview = await previewImg(r.screenshot);
		slide.addImage({ data: preview.data, ...fitImg(preview.width, preview.height, 0.58, 1.18, 7.8, 5.55) });
		slide.addShape(presentation.ShapeType.roundRect, { fill: { color: 'FFFFFF' }, line: { color: COLOURS.line, width: 1 }, x: 8.85, y: 0.98, w: 4.08, h: 5.95, rectRadius: 0.06 });
		slide.addText('UI review prompts', { bold: true, color: COLOURS.accent, fontFace: 'Aptos Display', fontSize: 13, margin: 0, x: 9.12, y: 1.2, w: 3.55, h: 0.28 });
		slide.addText(slideCopy(r, review), { color: COLOURS.muted, fit: 'shrink', fontFace: 'Aptos', fontSize: 9, margin: 0.02, x: 9.12, y: 1.58, w: 3.55, h: 5.05 });
		slide.addNotes(`Screenshot: ${path.resolve(r.screenshot)}\n\n${slideCopy(r, review)}`);
	}
	/**
	 * Adds a responsive comparison slide for results sharing one test identity.
	 *
	 * @param presentation Presentation receiving the slide.
	 * @param group Results for the same test across one or more viewports.
	 * @param slideNumber One-based slide number shown in the title.
	 * @returns A promise that resolves after the comparison slide is added.
	 */
	static async addResponsiveSlide(presentation: Presentation, group: readonly VisualResult[], slideNumber: number): Promise<void> {
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
		slide.addText(`${first.project} · responsive comparison · ${first.groups || first.file}`, {
			color: COLOURS.muted,
			fontFace: 'Aptos',
			fontSize: 8.5,
			margin: 0,
			x: 0.38,
			y: 0.62,
			w: 12.55,
			h: 0.2,
		});
		slide.addShape(presentation.ShapeType.line, { line: { color: COLOURS.line, width: 1 }, x: 0.38, y: 0.9, w: 12.55, h: 0 });
		const notes: string[] = [];
		const gap = 0.08;
		const width = (12.55 - gap * (group.length - 1)) / group.length;
		const height = 5.65;
		for (const [idx, r] of group.entries()) {
			const x = 0.38 + idx * (width + gap);
			const y = 1.08;
			slide.addShape(presentation.ShapeType.roundRect, { fill: { color: 'FFFFFF' }, line: { color: COLOURS.line, width: 1 }, x, y, w: width, h: height, rectRadius: 0.04 });
			slide.addText(`${r.viewport} · ${r.viewportSize} · ${r.status}`, {
				bold: true,
				color: COLOURS.accent,
				fontFace: 'Aptos',
				fontSize: 7.2,
				margin: 0,
				x: x + 0.12,
				y: y + 0.1,
				w: width - 0.24,
				h: 0.18,
			});
			if (r.screenshot && fs.existsSync(r.screenshot)) {
				const preview = await previewImg(r.screenshot);
				slide.addImage({ data: preview.data, ...fitImg(preview.width, preview.height, x + 0.06, y + 0.34, width - 0.12, height - 0.42) });
				notes.push(`${r.viewport}: ${path.resolve(r.screenshot)}\n${slideCopy(r, await reviewImg(r.screenshot, r))}`);
			} else {
				slide.addText('No screenshot captured', { align: 'center', color: COLOURS.muted, fontFace: 'Aptos', fontSize: 11, x: x + 0.2, y: y + 1.2, w: width - 0.4, h: 0.3 });
				notes.push(`${r.viewport}: no screenshot captured`);
			}
		}
		slide.addNotes(notes.join('\n\n'));
	}
}

/**
 * Writes screenshot-backed results as single-viewport or responsive review slides.
 *
 * @param file Output path for the slideshow artifact.
 * @param results Normalized results to group and render.
 * @param opts Optional visible title and document metadata overrides.
 * @returns A promise that resolves after the slideshow has been written.
 */
export const writeSlideshow = async (file: string, results: readonly VisualResult[], opts: { title?: string; author?: string; company?: string; subject?: string } = {}): Promise<void> => {
	const presentation = new /* The runtime package is CommonJS while NodeNext exposes its constructor through a namespace type. */ (
		createRequire(import.meta.url)('pptxgenjs') as new () => Presentation
	)();
	presentation.layout = 'LAYOUT_WIDE';
	presentation.author = opts.author || 'Test evidence reporter';
	presentation.company = opts.company || 'Test evidence';
	presentation.subject = opts.subject || 'Screenshot evidence and UI review prompts';
	presentation.title = opts.title || 'Test evidence slideshow';
	const groups = new Map<string, VisualResult[]>();
	for (const r of results.filter((r) => r.screenshot && fs.existsSync(r.screenshot))) {
		const key = [r.project, r.file, r.groups, r.title].join('|');
		groups.set(key, [...(groups.get(key) || []), r]);
	}
	let slideNumber = 0;
	for (const group of groups.values()) {
		const ordered = [...group].sort((a, b) => viewportWidth(a) - viewportWidth(b));
		if (!ordered.some((r) => r.screenshot && fs.existsSync(r.screenshot))) continue;
		if (ordered.length > 1) await SlideshowWriter.addResponsiveSlide(presentation, ordered, ++slideNumber);
		else await SlideshowWriter.addSingleViewportSlide(presentation, ordered[0], ++slideNumber);
	}
	if (!slideNumber) {
		const slide = presentation.addSlide();
		slide.background = { color: COLOURS.surface };
		slide.addText('Test evidence slideshow', { align: 'center', bold: true, color: COLOURS.accent, fontFace: 'Aptos Display', fontSize: 30, x: 0.8, y: 2.6, w: 11.7, h: 0.6 });
		slide.addText('No screenshot-backed browser surfaces were captured in this run.', { align: 'center', color: COLOURS.muted, fontFace: 'Aptos', fontSize: 16, x: 1.2, y: 3.35, w: 10.9, h: 0.5 });
	}
	await presentation.writeFile({ fileName: file });
	await neutralizeApplicationMetadata(file);
};
