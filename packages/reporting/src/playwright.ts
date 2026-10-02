/**
 * packages/reporting/src/playwright.ts
 * Playwright fixtures and reporter for reusable test evidence.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import path from 'node:path';
import { baseVisualProjectName, projectViewportName, viewportSizeLabel } from './viewports.js';
import { diagnosticCount, normalizeVisualStatus } from './core.js';
import { test as base } from '@playwright/test';
import { writeSlideshow } from './slideshow.js';
import { writeSpreadsheet } from './spreadsheet.js';

// DATA
import { VISUAL_VIEWPORTS } from './viewports.js';

// TYPES
import type { ProjectDefinition, ReportRun, VisualResult } from './core.js';
import type { ViewportCatalog } from './viewports.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Browser diagnostic captured by the reusable page fixture. */
export type BrowserDiagnostic = { level: string; message: string; url?: string };

/*//////////////////////////////////////////////////
FIXTURES
//////////////////////////////////////////////////*/

/** Playwright fixture that records browser console, page, and request failures. */
export const diagnosticsTest = base.extend({
	page: async ({ page, context: ctx }, use, info): Promise<void> => {
		const diagnostics: BrowserDiagnostic[] = [];
		const observe = (tgt: typeof page): void => {
			tgt.on('console', (m) => {
				if (!['error', 'warning'].includes(m.type())) return;
				diagnostics.push({ level: m.type(), message: m.text(), url: tgt.url() });
			});
			tgt.on('pageerror', (e) => diagnostics.push({ level: 'pageerror', message: e.message, url: tgt.url() }));
			tgt.on('requestfailed', (r) => diagnostics.push({ level: 'requestfailed', message: `${r.method()} ${r.url()} ${r.failure()?.errorText || 'Request failed.'}`, url: r.url() }));
		};
		observe(page);
		ctx.on('page', observe);
		try {
			await use(page);
		} finally {
			ctx.off('page', observe);
			if (diagnostics.length) {
				try {
					await info.attach('browser-diagnostics', { body: Buffer.from(JSON.stringify(diagnostics)), contentType: 'application/json' });
				} catch {
					// Preserve the test result if Playwright has already closed its attachment store.
				}
			}
		}
	},
});

/** Playwright fixture that captures a full-page screenshot after each test. */
export const visualTest = diagnosticsTest.extend({
	page: async ({ page }, use, info): Promise<void> => {
		try {
			await use(page);
		} finally {
			try {
				const screenshot = info.outputPath('visual.png');
				await page.screenshot({ fullPage: true, path: screenshot });
				await info.attach('visual', { contentType: 'image/png', path: screenshot });
			} catch (err) {
				await info.attach('visual-error', { body: Buffer.from(err instanceof Error ? err.message : String(err)), contentType: 'text/plain' });
			}
		}
	},
});

/** Application-specific paths and catalog settings for the shared reporter. */
export type ReportingOptions = {
	featureFiles?: readonly string[];
	projects?: readonly ProjectDefinition[];
	viewportCatalog?: ViewportCatalog;
	outputRoot?: string;
	reportFile?: string;
	slideshowFile?: string;
};
/** Playwright attachment metadata consumed by the shared visual reporter. */
type ReporterAttachment = { body?: Buffer; contentType?: string; name?: string; path?: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Removes terminal color escapes before diagnostics enter an artifact.
 * @param value Terminal output that may contain ANSI escape sequences.
 * @returns Terminal output with ANSI formatting removed.
 */
export const stripAnsi = (val: string): string => val.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g'), '');

/**
 * Parses browser diagnostic attachments into readable artifact lines.
 * @param raw JSON attachment text or a plain diagnostic message.
 * @returns Normalized diagnostic lines.
 */
export const parseDiagnostics = (raw: string): string[] => {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((v: unknown) => {
			if (!v || typeof v !== 'object') return [];
			const rec = v as { level?: string; message?: string; url?: string };
			return rec.message ? [`${rec.level || 'diagnostic'}: ${rec.message}${rec.url ? ` (${rec.url})` : ''}`] : [];
		});
	} catch {
		return [raw];
	}
};

/**
 * Normalizes a terminal output chunk for diagnostic matching and storage.
 * @param chunk Terminal text or bytes emitted by Playwright.
 * @returns Trimmed, ANSI-free terminal text.
 */
const terminalText = (chunk: string | Buffer): string => stripAnsi(chunk.toString('utf8')).trim();

/**
 * Identifies terminal output that should be retained as diagnostic evidence.
 * @param value Normalized terminal output.
 * @returns Whether the output contains a diagnostic keyword.
 */
const isTerminalDiagnostic = (val: string): boolean => /\b(?:error|errors|failed|failure|exception|warning|warn|timeout|requestfailed|pageerror)\b/i.test(val);

/**
 * Reads an inline or file-backed Playwright attachment.
 * @param attachment Attachment metadata supplied by Playwright.
 * @returns Attachment text, or an empty string when it is unavailable.
 */
const readAttachment = (attachment: ReporterAttachment): string => {
	if (attachment.body) return attachment.body.toString('utf8');
	if (attachment.path && fs.existsSync(attachment.path)) return fs.readFileSync(attachment.path, 'utf8');
	return '';
};

/**
 * Extracts one named JSON diagnostic attachment.
 * @param attachments Attachments emitted for one test result.
 * @param name Diagnostic attachment name to locate.
 * @returns Parsed diagnostic lines from the matching attachment.
 */
const diagnosticText = (attachments: readonly ReporterAttachment[], name: string): string[] => {
	const attachment = attachments.find((v) => v.name === name && v.contentType === 'application/json');
	const raw = attachment ? readAttachment(attachment) : '';
	if (!raw) return [];
	return parseDiagnostics(raw);
};

/**
 * Resolves the path of a captured screenshot attachment.
 * @param attachments Attachments emitted for one test result.
 * @returns Screenshot path, or an empty string when no screenshot exists.
 */
const screenshotAttachment = (attachments: readonly ReporterAttachment[]): string => attachments.find((v) => v.name === 'visual' && v.contentType === 'image/png')?.path || '';

/**
 * Creates the framework-neutral identity fields shared by all result records.
 * @param test Playwright test identity.
 * @param configuredProject Configured Playwright project name.
 * @param viewportCatalog Catalog used to resolve viewport labels and sizes.
 * @returns Framework-neutral identity fields for a visual result.
 */
const testIdentity = (
	test: { location: { file: string }; title: string; titlePath: () => string[] },
	cfgdProject: string,
	viewportCatalog: ViewportCatalog,
): Omit<VisualResult, 'status' | 'duration' | 'retry' | 'error' | 'browserErrors' | 'terminalErrors' | 'screenshot' | 'visual'> => {
	const file = path.basename(test.location.file);
	const fullTitlePath = test.titlePath();
	const fileIdx = fullTitlePath.findIndex((v) => v.endsWith(file));
	const titlePath = fullTitlePath.slice(fileIdx >= 0 ? fileIdx + 1 : 0);
	const viewport = projectViewportName(cfgdProject, viewportCatalog);
	return {
		file,
		groups: titlePath.join(' › '),
		project: baseVisualProjectName(cfgdProject, viewportCatalog),
		title: titlePath.pop() || test.title,
		viewport,
		viewportSize: viewportSizeLabel(viewport, viewportCatalog),
	};
};

/**
 * Generates a stable filename for a copied screenshot.
 * @param result Result whose identity contributes to the filename.
 * @param index Result position used to keep duplicate names distinct.
 * @returns A filesystem-safe screenshot filename.
 */
const screenshotName = (result: VisualResult, idx: number): string => {
	return `${String(idx + 1).padStart(4, '0')}-${
		`${result.project}-${result.file}-${result.title}-${result.viewport}`
			.replace(/[^a-z0-9_-]+/gi, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase() || 'screenshot'
	}.png`;
};

/**
 * Copies captured screenshots into the timestamped run directory.
 * @param results Results whose screenshot paths should be relocated.
 * @param runDirectory Timestamped output directory for the current run.
 * @returns Results with copied screenshot paths.
 */
const copyScreenshots = (results: readonly VisualResult[], runDir: string): VisualResult[] => {
	const imgs = path.join(runDir, 'images');
	fs.mkdirSync(imgs, { recursive: true });
	return results.map((r, i) => {
		if (!r.screenshot || !fs.existsSync(r.screenshot)) return r;
		const dest = path.join(imgs, screenshotName(r, i));
		fs.copyFileSync(r.screenshot, dest);
		return { ...r, screenshot: dest };
	});
};

/** Creates the reusable Playwright reporter with application-specific output configuration. */
export default class ProgressReporter {
	private readonly options: Required<Pick<ReportingOptions, 'featureFiles' | 'projects' | 'viewportCatalog' | 'outputRoot' | 'reportFile' | 'slideshowFile'>>;
	private readonly results: VisualResult[] = [];
	private readonly terminalDiagnostics = new Map<object, string[]>();
	private readonly runDiagnostics: string[] = [];
	private readonly expectedTests = new Map<string, { location: { file: string }; title: string; titlePath: () => string[]; parent: { project: () => { name: string } | undefined } }>();
	private readonly completedTests = new Set<string>();

	/**
	 * Creates a reporter that writes application-specific visual test artifacts.
	 *
	 * @param opts Application-specific reporter configuration.
	 */
	constructor(opts: ReportingOptions = {}) {
		this.options = {
			featureFiles: opts.featureFiles || [],
			projects: opts.projects || [],
			viewportCatalog: opts.viewportCatalog || VISUAL_VIEWPORTS,
			outputRoot: opts.outputRoot || 'test-results/visual',
			reportFile: opts.reportFile || 'report.xlsx',
			slideshowFile: opts.slideshowFile || 'report.pptx',
		};
	}

	/**
	 * Records the full expected suite so interrupted tests can be represented.
	 * @param _config Playwright configuration supplied by the reporter lifecycle.
	 * @param suite Playwright suite containing all discovered tests.
	 * @returns Nothing; the expected-test registry is updated in place.
	 */
	onBegin(
		_config: Parameters<NonNullable<import('@playwright/test/reporter').Reporter['onBegin']>>[0],
		suite: Parameters<NonNullable<import('@playwright/test/reporter').Reporter['onBegin']>>[1],
	): void {
		for (const test of suite.allTests()) this.expectedTests.set(test.id, test);
	}

	/**
	 * Associates stderr with a test result or the run when no test is active.
	 * @param chunk Terminal output emitted by Playwright.
	 * @param test Active test identity, when available.
	 * @param result Active test result, when available.
	 * @returns Nothing; diagnostic state is updated in place.
	 */
	onStdErr(chunk: string | Buffer, test?: object, result?: object): void {
		const val = terminalText(chunk);
		if (!val) return;
		if (!test || !result) {
			this.runDiagnostics.push(val);
			return;
		}
		this.terminalDiagnostics.set(result, [...(this.terminalDiagnostics.get(result) || []), val]);
	}

	/**
	 * Retains diagnostic-looking stdout without treating ordinary output as failure evidence.
	 * @param chunk Terminal output emitted by Playwright.
	 * @param test Active test identity, when available.
	 * @param result Active test result, when available.
	 * @returns Nothing; diagnostic state is updated in place.
	 */
	onStdOut(chunk: string | Buffer, test?: object, result?: object): void {
		const val = terminalText(chunk);
		if (!val || !isTerminalDiagnostic(val)) return;
		if (!test || !result) {
			this.runDiagnostics.push(val);
			return;
		}
		this.terminalDiagnostics.set(result, [...(this.terminalDiagnostics.get(result) || []), val]);
	}

	/**
	 * Retains reporter-level errors in the run diagnostics.
	 * @param err Reporter-level error emitted by Playwright.
	 * @returns Nothing; run diagnostics are updated in place.
	 */
	onError(err: { message: string }): void {
		this.runDiagnostics.push(err.message);
	}

	/**
	 * Normalizes a completed Playwright result and associates its evidence.
	 * @param test Completed Playwright test case.
	 * @param result Completed Playwright test result and attachments.
	 * @returns Nothing; the normalized result is appended to the run.
	 */
	onTestEnd(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): void {
		this.completedTests.add(test.id);
		const screenshot = screenshotAttachment(result.attachments);
		this.results.push({
			...testIdentity(test, test.parent.project()?.name || test.titlePath().find((v) => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog),
			browserErrors: diagnosticText(result.attachments, 'browser-diagnostics').join('\n'),
			duration: result.duration,
			error: result.error?.message?.split('\n')[0] || '',
			retry: result.retry,
			screenshot,
			status: normalizeVisualStatus(result.status),
			terminalErrors: this.terminalDiagnostics.get(result)?.join('\n') || '',
			visual: screenshot ? 'Embedded' : result.attachments.some((v) => v.name === 'visual-error') ? 'Capture failed' : 'No visual surface',
		});
		this.terminalDiagnostics.delete(result);
	}

	/**
	 * Emits interrupted results and writes the spreadsheet and slideshow artifacts.
	 * @returns A promise that resolves after both report artifacts are written.
	 */
	async onEnd(): Promise<void> {
		for (const [id, test] of this.expectedTests) {
			if (this.completedTests.has(id)) continue;
			this.results.push({
				...testIdentity(test, test.parent.project()?.name || test.titlePath().find((v) => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog),
				browserErrors: '',
				duration: 0,
				error: 'Test did not start because an upstream dependency failed or the run was interrupted.',
				retry: 0,
				screenshot: '',
				status: 'interrupted',
				terminalErrors: '',
				visual: 'No visual surface',
			});
		}
		const runDir = path.resolve(this.options.outputRoot, new Date().toISOString().replace(/[:.]/g, '-'));
		fs.mkdirSync(runDir, { recursive: true });
		const results = copyScreenshots(this.results, runDir);
		const run: ReportRun = { featureFiles: this.options.featureFiles, projects: this.options.projects, results, runDiagnostics: this.runDiagnostics };
		const spreadsheet = path.join(runDir, this.options.reportFile);
		const slideshow = path.join(runDir, this.options.slideshowFile);
		await writeSpreadsheet(spreadsheet, run);
		await writeSlideshow(slideshow, results);
		process.stdout.write(`Test spreadsheet: ${spreadsheet}\nTest slideshow: ${slideshow}\n`);
	}
}
export { diagnosticCount };
