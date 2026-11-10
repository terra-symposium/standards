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
/**
 * Sorts responsive results by their rendered viewport width.
 *
 * @param r Result whose viewport label should be parsed.
 *
 * @return Numeric viewport width, or a final sort value when unavailable.
 */
const viewportWidth = (r: VisualResult): number => Number.parseInt(r.viewportSize.split('×')[0] || '', 10) || Number.MAX_SAFE_INTEGER;
/** Optional visible and metadata overrides for a slideshow artifact. */
export type SlideshowOptions = { title?: string; author?: string; company?: string; subject?: string; loadTestingEnabled?: boolean };
/** One test result paired with a graded timing measurement for the report. */
type LoadRow = { result: VisualResult; measurement: NonNullable<VisualResult['loadMeasurements']>[number] };
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
	const presentation: Presentation = new /* The runtime package is CommonJS while NodeNext exposes its constructor through a namespace type. */ (
		createRequire(import.meta.url)('pptxgenjs') as new () => Presentation
	)();
	presentation.layout = 'LAYOUT_WIDE';
	presentation.author = opts.author || 'Test evidence reporter';
	presentation.company = opts.company || 'Test evidence';
	presentation.subject = opts.subject || 'Screenshot evidence and UI review prompts';
	presentation.title = opts.title || 'Test evidence slideshow';
	let slideNumber = 0;
	if (loadEnabled) {
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
		const responsiveGroup = [...byViewport.values()].sort((a, b) => viewportWidth(a) - viewportWidth(b));
		const first = responsiveGroup[0];
		if (!first) continue;
		slideNumber += 1;
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
		const cols = Math.min(3, responsiveGroup.length);
		const rows = Math.ceil(responsiveGroup.length / cols);
		const width = (12.55 - gap * (cols - 1)) / cols;
		const height = (6.02 - gap * (rows - 1)) / rows;
		for (const [idx, r] of responsiveGroup.entries()) {
			const x = 0.38 + (idx % cols) * (width + gap);
			const y = 1.02 + Math.floor(idx / cols) * (height + gap);
			slide.addShape(presentation.ShapeType.roundRect, { fill: { color: 'FFFFFF' }, line: { color: COLOURS.line, width: 1 }, x, y, w: width, h: height, rectRadius: 0.04 });
			const gradeCounts = loadGradeCounts(r.loadMeasurements || []);
			const loadGrade = gradeCounts.fail ? 'fail' : gradeCounts.warning ? 'warning' : gradeCounts.pass ? 'pass' : '';
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
				const reviewMetadata = await sharp(r.screenshot).metadata();
				const cues: string[] = [];
				if ((reviewMetadata.height || 0) > (reviewMetadata.width || 0) * 2.2) cues.push('Long full-page capture: inspect vertical rhythm, repeated whitespace, and section transitions.');
				if (r.viewport !== 'xl') cues.push(`Responsive capture: inspect breakpoint changes at ${r.viewportSize}, especially wrapping, navigation, grids, and overflow.`);
				if (r.browserErrors) cues.push('Browser diagnostics were captured; check whether the visible surface reflects the reported error.');
				if (r.terminalErrors) cues.push('Terminal diagnostics were captured; compare the visible state with the runtime warning or failure.');
				if (r.status !== 'passed') cues.push(`Test status is ${r.status}; confirm whether the visible defect is causal or incidental.`);
				if (!cues.length) cues.push('Inspect alignment, text wrapping, control density, whitespace, and visual hierarchy for issues not covered by assertions.');
				const previewMetadata = await sharp(r.screenshot).metadata();
				const previewWidth = previewMetadata.width || 1;
				const [viewportWidth, viewportHeight] = r.viewportSize.split('×').map((value) => Number.parseInt(value, 10));
				const previewHeight = Math.min(previewMetadata.height || 1, Math.max(1, viewportWidth && viewportHeight ? Math.round((previewWidth * viewportHeight) / viewportWidth) : Math.round(previewWidth / 0.38)));
				const scale = Math.min((width - 0.16) / Math.max(previewWidth, 1), (height - 0.46) / Math.max(previewHeight, 1));
				const fittedWidth = previewWidth * scale;
				const fittedHeight = previewHeight * scale;
				slide.addImage({
					data: `data:image/png;base64,${(await sharp(r.screenshot).extract({ height: previewHeight, left: 0, top: 0, width: previewWidth }).png().toBuffer()).toString('base64')}`,
					h: fittedHeight,
					w: fittedWidth,
					x: x + 0.08 + (width - 0.16 - fittedWidth) / 2,
					y: y + 0.38 + (height - 0.46 - fittedHeight) / 2,
				});
				notes.push(
					`${r.viewport}: full-page screenshot images/${path.basename(r.screenshot)}\n${[
						`${r.project} · ${r.viewport} · ${r.viewportSize}`,
						r.groups || r.file,
						`Status: ${r.status}${r.duration ? ` · ${r.duration} ms` : ''}${loadGrade ? ` · Load: ${loadGrade}` : ''}`,
						...(r.loadMeasurements || []).map((measurement) => `Load ${measurement.kind}: ${measurement.name} — ${measurement.durationMs.toFixed(1)} ms (${measurement.grade}; warn ${measurement.budget.warnMs} / fail ${measurement.budget.failMs} ms)`),
						'',
						...cues.map((cue) => `• ${cue}`),
						...(r.error ? ['', `Test error: ${r.error}`] : []),
						...(r.browserErrors ? ['', `Browser: ${r.browserErrors}`] : []),
						...(r.terminalErrors ? ['', `Terminal: ${r.terminalErrors}`] : []),
					].join('\n')}`,
				);
			} else {
				slide.addText('SCREENSHOT MISSING', { align: 'center', bold: true, color: '9A3412', fontFace: 'Aptos', fontSize: 12, x: x + 0.2, y: y + height / 2 - 0.14, w: width - 0.4, h: 0.28 });
				notes.push(`${r.viewport}: no screenshot captured`);
			}
		}
		slide.addNotes(notes.join('\n\n'));
	}
	if (!slideNumber) {
		const slide = presentation.addSlide();
		slide.background = { color: COLOURS.surface };
		slide.addText('Test evidence slideshow', { align: 'center', bold: true, color: COLOURS.accent, fontFace: 'Aptos Display', fontSize: 30, x: 0.8, y: 2.6, w: 11.7, h: 0.6 });
		slide.addText('No browser test results were collected in this run.', { align: 'center', color: COLOURS.muted, fontFace: 'Aptos', fontSize: 16, x: 1.2, y: 3.35, w: 10.9, h: 0.5 });
	}
	if (loadEnabled) {
		const measurements: LoadRow[] = results.flatMap((r) => (r.loadMeasurements || []).map((measurement) => ({ result: r, measurement })));
		const pageSize = 12;
		const pages = Math.max(1, Math.ceil(measurements.length / pageSize));
		for (let page = 0; page < pages; page += 1) {
			const slide = presentation.addSlide();
			slide.background = { color: COLOURS.surface };
			slide.addText(`Load timing details ${page + 1}/${pages}`, { bold: true, color: COLOURS.ink, fontFace: 'Aptos Display', fontSize: 22, margin: 0, x: 0.55, y: 0.4, w: 12.2, h: 0.45 });
			slide.addText(
				measurements
					.slice(page * pageSize, (page + 1) * pageSize)
					.map(
						({ result: r, measurement }) =>
							`${measurement.grade.toUpperCase().padEnd(7)} ${measurement.durationMs.toFixed(1).padStart(9)} ms  ${measurement.kind.padEnd(9)} ${r.file} · ${r.title} · ${measurement.name}  [warn ${measurement.budget.warnMs} / fail ${measurement.budget.failMs} ms]`,
					)
					.join('\n') || 'No load measurements were collected.',
				{
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
				},
			);
		}
	}
	await presentation.writeFile({ fileName: file });
	await neutralizeApplicationMetadata(file);
};
