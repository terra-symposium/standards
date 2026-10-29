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
import { createHash, randomUUID } from 'node:crypto';
import { baseVisualProjectName, projectViewportName, viewportSizeLabel } from './viewports.js';
import { diagnosticCount, normalizeVisualStatus } from './core.js';
import { gradeLoadMeasurement, loadGradeCounts, loadTestId, readLoadTestingConfig, timeLoadOperation, validateLoadBudgetOverride } from './load-testing.js';
import { test as base } from '@playwright/test';
import { writeScreenshotSlideshowFromDirectory, writeSlideshow } from './slideshow.js';
import { writeSpreadsheet } from './spreadsheet.js';

// DATA
import { VISUAL_VIEWPORTS } from './viewports.js';

// TYPES
import type { LoadBudgetOverride, LoadMeasurement, LoadMeasurementInput, LoadTestingConfig, ProjectDefinition, ReportRun, VisualResult } from './core.js';
import type { ViewportCatalog } from './viewports.js';
import type { ScreenshotCapture } from './slideshow.js';
import type { Page } from '@playwright/test';

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

/** Test-local load helpers exposed by the reusable load fixture. */
export type LoadTestController = {
	/** Sets a budget override for this test's total elapsed duration. */
	setTestBudget: (budget: LoadBudgetOverride) => void;
	/** Measures a named asynchronous or synchronous operation and preserves its return value. */
	measure: <T>(name: string, op: () => T | Promise<T>, budget?: LoadBudgetOverride) => Promise<T>;
};

/**
 * Playwright fixture that records navigations and named operation timings.
 * Import as `test` in suites that need page and operation-level measurements.
 */
export const loadTest = diagnosticsTest.extend<{ load: LoadTestController }>({
	load: [
		async ({ page, context: ctx }, use, info): Promise<void> => {
			const cfgdEnabled = (info.config as unknown as { metadata?: Record<string, unknown> }).metadata?.terraLoadTestingEnabled;
			const enabled = typeof cfgdEnabled === 'boolean' ? cfgdEnabled : readLoadTestingConfig().enabled;
			const measurements: LoadMeasurementInput[] = [];
			const pending: Promise<void>[] = [];
			let testBudget: LoadBudgetOverride | undefined;
			const observe = (tgt: typeof page): void => {
				tgt.on('load', () => {
					if (!enabled || tgt.url() === 'about:blank') return;
					const pendingLoad = tgt
						.evaluate(() => {
							const entry = performance.getEntries().find((i) => String(i.entryType) === 'navigation') as PerformanceNavigationTiming | undefined;
							return entry ? { durationMs: entry.duration, pathname: location.pathname } : undefined;
						})
						.then((navigation) => {
							if (!navigation || navigation.durationMs <= 0) return;
							measurements.push({ name: `page load: ${navigation.pathname || '/'}`, kind: 'page', durationMs: navigation.durationMs });
						})
						.catch(() => undefined);
					pending.push(pendingLoad);
				});
			};
			observe(page);
			ctx.on('page', observe);
			const controller: LoadTestController = {
				setTestBudget: (budget) => {
					testBudget = validateLoadBudgetOverride(budget);
				},
				measure: async <T>(name: string, op: () => T | Promise<T>, budget?: LoadBudgetOverride): Promise<T> => {
					if (!enabled) return op();
					return timeLoadOperation(
						name,
						op,
						(measurement) => {
							measurements.push(measurement);
						},
						budget,
					);
				},
			};
			try {
				await use(controller);
			} finally {
				ctx.off('page', observe);
				await Promise.all(pending);
				if (enabled && (measurements.length || testBudget)) {
					try {
						await info.attach('load-testing', {
							body: Buffer.from(JSON.stringify({ measurements, testBudget })),
							contentType: 'application/json',
						});
					} catch {
						// Preserve the test result if Playwright has already closed its attachment store.
					}
				}
			}
		},
		{ auto: true },
	],
});

/** Screenshot settings accepted by the reusable visual-capture fixture. */
export type VisualCaptureOptions = {
	/** Optional label recorded with the capture; it is not printed on screenshot-only slides. */
	title?: string;
	/** Playwright screenshot options, excluding the output path owned by the fixture. */
	screenshot?: Omit<NonNullable<Parameters<Page['screenshot']>[0]>, 'path'>;
};

/** Captures keyed screenshots and attaches their metadata for cross-viewport reporting. */
export type VisualCaptureController = {
	/** Captures the current page and associates it with a stable key across projects/viewports. */
	capture: (key: string, options?: VisualCaptureOptions) => Promise<void>;
};

/**
 * Playwright fixture for collecting any number of named screenshots from a test.
 * The shared reporter matches equal keys across responsive projects.
 */
export const visualTest = loadTest.extend<{ visuals: VisualCaptureController }>({
	visuals: async ({ page }, use, info): Promise<void> => {
		const captures: Array<{ attachmentName: string; contentType: string; key: string; title: string }> = [];
		const keys = new Set<string>();
		await use({
			capture: async (key, options = {}): Promise<void> => {
				const normalizedKey = key.trim();
				if (!normalizedKey) throw new Error('A visual capture key is required.');
				if (keys.has(normalizedKey)) throw new Error(`Duplicate visual capture key: ${normalizedKey}`);
				keys.add(normalizedKey);
				const attachmentName = `visual-capture-${String(captures.length + 1).padStart(5, '0')}`;
				const screenshotOptions: NonNullable<Parameters<Page['screenshot']>[0]> = {
					type: 'jpeg',
					quality: 65,
					fullPage: false,
					animations: 'disabled' as const,
					caret: 'hide' as const,
					...options.screenshot,
				};
				const extension = screenshotOptions.type === 'png' ? 'png' : 'jpg';
				const contentType = screenshotOptions.type === 'png' ? 'image/png' : 'image/jpeg';
				const screenshotPath = info.outputPath(`${attachmentName}.${extension}`);
				await fs.promises.writeFile(screenshotPath, await page.screenshot(screenshotOptions));
				await info.attach(attachmentName, { path: screenshotPath, contentType });
				captures.push({ attachmentName, contentType, key: normalizedKey, title: options.title?.trim() || normalizedKey });
			},
		});
		if (captures.length) {
			try {
				await info.attach('visual-captures', { body: Buffer.from(JSON.stringify(captures)), contentType: 'application/json' });
			} catch {
				// Preserve the test result if Playwright has already closed its attachment store.
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
	/** Folder for durable screenshot captures shared across partial and repeated test runs. */
	screenshotsDirectory?: string;
	reportFile?: string;
	slideshowFile?: string;
	supplementalResultsFile?: string;
	qualityConfigFile?: string;
	loadTesting?: LoadTestingConfig;
	/** Write report.pptx using only keyed screenshots, with no text or diagnostic slides. */
	screenshotOnlySlideshow?: boolean;
};

/** Describes a Playwright attachment passed to the shared reporter. */
type ReporterAttachment = { body?: Buffer; contentType?: string; name?: string; path?: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Removes terminal color escapes before diagnostics enter an artifact.
 * @param valerminal output that may contain ANSI escape sequences.
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
 * @param valormalized terminal output.
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
const screenshotAttachment = (attachments: readonly ReporterAttachment[]): ReporterAttachment | undefined =>
	attachments.find((v) => ['visual', 'screenshot'].includes(v.name || '') && v.contentType === 'image/png');

/** Saves one capture under a stable identity so reruns replace it without duplicating the deck. */
const persistScreenshotCapture = (directory: string, capture: ScreenshotCapture): ScreenshotCapture => {
	if (!capture.screenshot || !fs.existsSync(capture.screenshot)) return capture;
	const key = createHash('sha256').update([capture.group, capture.key, capture.viewport].join('\0')).digest('hex');
	const extension = path.extname(capture.screenshot) || '.png';
	const screenshot = path.join(directory, `${key}${extension}`);
	const recordFile = path.join(directory, `${key}.json`);
	fs.mkdirSync(directory, { recursive: true });
	if (fs.existsSync(recordFile)) {
		try {
			const previous = JSON.parse(fs.readFileSync(recordFile, 'utf8')) as ScreenshotCapture;
			if (previous.runId === capture.runId && (previous.retry || 0) > (capture.retry || 0)) return { ...previous, screenshot };
		} catch {
			// Replace an incomplete record with the next valid result.
		}
	}
	const temporaryImage = `${screenshot}.${process.pid}.tmp`;
	fs.copyFileSync(capture.screenshot, temporaryImage);
	fs.renameSync(temporaryImage, screenshot);
	const persisted = { ...capture, screenshot };
	const temporaryRecord = `${recordFile}.${process.pid}.tmp`;
	fs.writeFileSync(temporaryRecord, JSON.stringify(persisted));
	fs.renameSync(temporaryRecord, recordFile);
	return persisted;
};

const screenshotRunFile = '.terra-playwright-run.json';
/** Latest reporter collection state persisted beside accumulated screenshots. */
type ScreenshotRun = {
	runId: string;
	startedAt: string;
	expectedTestCount: number;
	completedTestCount: number;
	expectedTestIds?: string[];
	completedTestIds?: string[];
	finishedAt?: string;
	collectionFinished: boolean;
};
/** Reads the latest marker while treating malformed or legacy state as absent. */
const readScreenshotRun = (directory: string): ScreenshotRun | undefined => {
	try {
		const run: unknown = JSON.parse(fs.readFileSync(path.join(directory, screenshotRunFile), 'utf8'));
		if (!run || typeof run !== 'object') return undefined;
		const value = run as Record<string, unknown>;
		if (typeof value.runId !== 'string' || typeof value.startedAt !== 'string' || typeof value.expectedTestCount !== 'number' || typeof value.completedTestCount !== 'number') return undefined;
		return {
			runId: value.runId,
			startedAt: value.startedAt,
			expectedTestCount: value.expectedTestCount,
			completedTestCount: value.completedTestCount,
			expectedTestIds: Array.isArray(value.expectedTestIds) ? value.expectedTestIds.filter((id): id is string => typeof id === 'string') : undefined,
			completedTestIds: Array.isArray(value.completedTestIds) ? value.completedTestIds.filter((id): id is string => typeof id === 'string') : undefined,
			finishedAt: typeof value.finishedAt === 'string' ? value.finishedAt : undefined,
			collectionFinished: value.collectionFinished === true,
		};
	} catch {
		return undefined;
	}
};
/** Atomically writes the latest run marker so interrupted captures remain identifiable. */
const writeScreenshotRun = (directory: string, run: ScreenshotRun): void => {
	fs.mkdirSync(directory, { recursive: true });
	const file = path.join(directory, screenshotRunFile);
	const temporaryFile = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(temporaryFile, JSON.stringify(run));
	fs.renameSync(temporaryFile, file);
};

/** Validates the keyed-capture manifest emitted by the `visualTest` fixture. */
const visualCaptureManifest = (attachments: readonly ReporterAttachment[]): Array<{ attachmentName: string; contentType: string; key: string; title: string }> => {
	const attachment = attachments.find((item) => item.name === 'visual-captures' && item.contentType === 'application/json');
	if (!attachment) return [];
	try {
		const parsed: unknown = JSON.parse(readAttachment(attachment));
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item): Array<{ attachmentName: string; contentType: string; key: string; title: string }> => {
			if (!item || typeof item !== 'object') return [];
			const row = item as Record<string, unknown>;
			if (typeof row.attachmentName !== 'string' || typeof row.contentType !== 'string' || typeof row.key !== 'string' || typeof row.title !== 'string') return [];
			return [{ attachmentName: row.attachmentName, contentType: row.contentType, key: row.key, title: row.title }];
		});
	} catch {
		return [];
	}
};

/** Reads timing samples and a test override from the fixture attachment. */
const loadAttachment = (attachments: readonly ReporterAttachment[]): { measurements: LoadMeasurementInput[]; testBudget?: LoadBudgetOverride } => {
	const attachment = attachments.find((v) => v.name === 'load-testing' && v.contentType === 'application/json');
	if (!attachment) return { measurements: [] };
	try {
		const parsed = JSON.parse(readAttachment(attachment)) as Record<string, unknown>;
		const measurements = Array.isArray(parsed.measurements)
			? parsed.measurements.flatMap((v): LoadMeasurementInput[] => {
					if (!v || typeof v !== 'object') return [];
					const row = v as Record<string, unknown>;
					if (typeof row.name !== 'string' || !row.name.trim() || !['page', 'operation'].includes(String(row.kind))) return [];
					if (typeof row.durationMs !== 'number' || !Number.isFinite(row.durationMs) || row.durationMs < 0) return [];
					let budget: LoadBudgetOverride | undefined;
					if (row.budget && typeof row.budget === 'object') budget = validateLoadBudgetOverride(row.budget as LoadBudgetOverride);
					return [{ name: redactEvidence(row.name), kind: row.kind as LoadMeasurementInput['kind'], durationMs: row.durationMs, ...(budget ? { budget } : {}) }];
				})
			: [];
		const testBudget = parsed.testBudget && typeof parsed.testBudget === 'object' ? validateLoadBudgetOverride(parsed.testBudget as LoadBudgetOverride) : undefined;
		return { measurements, ...(testBudget ? { testBudget } : {}) };
	} catch {
		return { measurements: [] };
	}
};

/** Grades the test duration and attached page/operation samples for one result. */
const addLoadMeasurements = (
	result: VisualResult,
	id: string,
	inputs: readonly LoadMeasurementInput[],
	testBudget: LoadBudgetOverride | undefined,
	cfg: ReturnType<typeof readLoadTestingConfig>,
): VisualResult => {
	if (!cfg.enabled) return result;
	const measurements: LoadMeasurement[] = [
		gradeLoadMeasurement({ name: 'test duration', kind: 'test', durationMs: result.duration, ...(testBudget ? { budget: testBudget } : {}) }, cfg, id),
		...inputs.map((input) => gradeLoadMeasurement(input, cfg, id)),
	];
	return { ...result, loadMeasurements: measurements, loadTestId: id };
};

/**
 * Creates the framework-neutral identity fields shared by all result records.
 * @param test Playwright test identity.
 * @param cfgdProjectgured Playwright project name.
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
		file: redactEvidence(file),
		groups: redactEvidence(titlePath.join(' › ')),
		project: redactEvidence(baseVisualProjectName(cfgdProject, viewportCatalog)),
		title: redactEvidence(titlePath.pop() || test.title),
		viewport,
		viewportSize: viewportSizeLabel(viewport, viewportCatalog),
	};
};

/** Resolves the title path portion used by the stable test budget key. */
const testTitleParts = (test: { location: { file: string }; title: string; titlePath: () => string[] }): string[] => {
	const file = path.basename(test.location.file);
	const fullTitlePath = test.titlePath();
	const fileIdx = fullTitlePath.findIndex((v) => v.endsWith(file));
	return fullTitlePath.slice(fileIdx >= 0 ? fileIdx + 1 : 0).filter(Boolean);
};

/**
 * Generates a stable filename for a copied screenshot.
 * @param result Result whose identity contributes to the filename.
 * @param idxesult position used to keep duplicate names distinct.
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
 * @param runDirtamped output directory for the current run.
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

/** Redacts personal identifiers and configured secrets from report text. */
const redactEvidence = (val: unknown): string => {
	let text = Array.from(stripAnsi(String(val ?? '')))
		.filter((c) => {
			const code = c.codePointAt(0) ?? 0;
			return code === 9 || code === 10 || code === 13 || (code > 31 && code !== 0xfffe && code !== 0xffff);
		})
		.join('')
		.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted email]')
		.replace(/\b[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}\b/gi, '[redacted id]');
	for (const [name, secret] of Object.entries(process.env)) {
		if (secret && /(?:secret|token|password|credential|private.?key|api.?key|publishable.?key|service[_-]?role.?key)/i.test(name)) text = text.replaceAll(secret, '[redacted secret]');
	}
	return text.replaceAll(process.cwd(), '[workspace]');
};

/** Converts untrusted supplemental timing values to supported measurement inputs. */
const supplementalMeasurements = (val: unknown): LoadMeasurementInput[] => {
	if (!Array.isArray(val)) return [];
	return val.flatMap((e): LoadMeasurementInput[] => {
		if (!e || typeof e !== 'object') return [];
		const row = e as Record<string, unknown>;
		if (typeof row.name !== 'string' || !row.name.trim() || !['page', 'operation'].includes(String(row.kind))) return [];
		if (typeof row.durationMs !== 'number' || !Number.isFinite(row.durationMs) || row.durationMs < 0) return [];
		let budget: LoadBudgetOverride | undefined;
		try {
			if (row.budget && typeof row.budget === 'object') budget = validateLoadBudgetOverride(row.budget as LoadBudgetOverride);
		} catch {
			return [];
		}
		return [{ name: redactEvidence(row.name), kind: row.kind as LoadMeasurementInput['kind'], durationMs: row.durationMs, ...(budget ? { budget } : {}) }];
	});
};

/** Converts an optional structured results file into the shared row model. */
const supplementalResults = (file: string, loadTesting: ReturnType<typeof readLoadTestingConfig>): { results: VisualResult[]; diagnostics: string[] } => {
	const unavailable = (err: string): VisualResult => ({
		browserErrors: '',
		duration: 0,
		error: err,
		file: path.basename(file),
		groups: 'Supplemental results',
		project: 'supplemental',
		retry: 0,
		screenshot: '',
		status: 'interrupted',
		terminalErrors: '',
		title: 'Structured supplemental results unavailable',
		visual: 'No visual surface',
		viewport: 'supplemental',
		viewportSize: 'N/A',
	});
	if (!fs.existsSync(file)) return { results: [unavailable(`Supplemental results file was not found: ${file}`)], diagnostics: [] };
	try {
		const payload = JSON.parse(fs.readFileSync(file, 'utf8')) as { complete?: unknown; results?: unknown; runDiagnostics?: unknown };
		const rows = Array.isArray(payload.results) ? payload.results : [];
		const results = rows.map((v): VisualResult => {
			const row = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
			const rawDuration = Number(row.duration ?? row.duration_ms ?? 0);
			const result: VisualResult = {
				browserErrors: '',
				duration: Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0,
				error: redactEvidence(row.error),
				file: redactEvidence(row.file || path.basename(file)),
				groups: redactEvidence(row.groups || row.file || 'Supplemental results'),
				project: redactEvidence(row.project || 'supplemental'),
				retry: Number(row.retry ?? 0) || 0,
				screenshot: '',
				status: normalizeVisualStatus(String(row.status || 'failed')),
				terminalErrors: '',
				title: redactEvidence(row.title || 'Untitled supplemental result'),
				visual: 'No visual surface',
				viewport: 'supplemental',
				viewportSize: 'N/A',
			};
			if (!loadTesting.enabled) return result;
			const rawFile = String(row.file || path.basename(file));
			const titlePath = [String(row.groups || ''), String(row.title || 'Untitled supplemental result')].filter(Boolean).flatMap((part) => part.split(' › '));
			const id = String(row.loadTestId || row.testId || loadTestId(rawFile, titlePath, loadTesting.root));
			const testBudget = row.testBudget && typeof row.testBudget === 'object' ? validateLoadBudgetOverride(row.testBudget as LoadBudgetOverride) : undefined;
			return addLoadMeasurements(result, id, supplementalMeasurements(row.loadMeasurements), testBudget, loadTesting);
		});
		const diagnostics = Array.isArray(payload.runDiagnostics) ? payload.runDiagnostics.map(redactEvidence) : [];
		if (payload.complete === false) results.unshift(unavailable('The supplemental test run reported an incomplete result inventory.'));
		return { results, diagnostics };
	} catch (err) {
		return { results: [unavailable(`Could not read supplemental results: ${err instanceof Error ? err.message : String(err)}`)], diagnostics: [] };
	}
};

/** Creates the reusable Playwright reporter with application-specific output configuration. */
export default class ProgressReporter {
	private readonly options: Required<Pick<ReportingOptions, 'featureFiles' | 'projects' | 'viewportCatalog' | 'outputRoot' | 'reportFile' | 'slideshowFile' | 'screenshotsDirectory'>> &
		Pick<ReportingOptions, 'supplementalResultsFile'> & { loadTesting: ReturnType<typeof readLoadTestingConfig>; screenshotOnlySlideshow: boolean };
	private readonly results: VisualResult[] = [];
	private readonly screenshotCaptures: ScreenshotCapture[] = [];
	private readonly terminalDiagnostics = new Map<object, string[]>();
	private readonly runDiagnostics: string[] = [];
	private readonly expectedTests = new Map<string, { location: { file: string }; title: string; titlePath: () => string[]; parent: { project: () => { name: string } | undefined } }>();
	private readonly completedTests = new Set<string>();
	private readonly screenshotRunId = process.env.TERRA_SCREENSHOT_RUN_ID?.trim() || randomUUID();
	private readonly finalizeScreenshotRun = process.env.TERRA_SCREENSHOT_RUN_FINALIZE !== '0';
	private readonly screenshotRunStartedAt = new Date().toISOString();

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
			screenshotsDirectory: opts.screenshotsDirectory || path.join(opts.outputRoot || 'test-results/visual', 'screenshots'),
			reportFile: opts.reportFile || 'report.xlsx',
			slideshowFile: opts.slideshowFile || 'report.pptx',
			supplementalResultsFile: opts.supplementalResultsFile,
			loadTesting: readLoadTestingConfig(opts.qualityConfigFile, opts.loadTesting),
			screenshotOnlySlideshow: opts.screenshotOnlySlideshow ?? process.env.TERRA_SCREENSHOT_ONLY_SLIDESHOW !== '0',
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
		if (!process.argv.includes('--list')) {
			const directory = path.resolve(this.options.screenshotsDirectory);
			const previous = readScreenshotRun(directory);
			const sameRun = previous?.runId === this.screenshotRunId ? previous : undefined;
			const expectedTestIds = [...new Set([...(sameRun?.expectedTestIds || []), ...this.expectedTests.keys()])].sort();
			const completedTestIds = [...new Set(sameRun?.completedTestIds || [])].sort();
			writeScreenshotRun(directory, {
				collectionFinished: false,
				completedTestCount: Math.max(sameRun?.completedTestCount || 0, completedTestIds.length),
				completedTestIds,
				expectedTestCount: Math.max(sameRun?.expectedTestCount || 0, expectedTestIds.length),
				expectedTestIds,
				runId: this.screenshotRunId,
				startedAt: sameRun?.startedAt || this.screenshotRunStartedAt,
			});
		}
		if (!this.options.featureFiles.length || !this.options.projects.length) {
			const projectFiles = new Map<string, Set<string>>();
			const files = new Set<string>();
			for (const test of suite.allTests()) {
				const file = path.basename(test.location.file);
				const cfgd = test.parent.project()?.name || test.titlePath().find((v) => v.startsWith('root-')) || 'unknown';
				const project = baseVisualProjectName(cfgd, this.options.viewportCatalog);
				files.add(file);
				projectFiles.set(project, new Set([...(projectFiles.get(project) || []), file]));
			}
			if (!this.options.featureFiles.length) this.options.featureFiles = [...files];
			if (!this.options.projects.length) this.options.projects = [...projectFiles].map(([n, c]) => ({ name: n, configuredFiles: [...c] }));
		}
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
		const attachment = screenshotAttachment(result.attachments);
		let screenshot = attachment?.path || '';
		if (!screenshot && attachment?.body) {
			screenshot = path.resolve(`test-results/playwright-output/${test.id.replace(/[^a-z0-9_-]/gi, '-')}-screenshot.png`);
			fs.mkdirSync(path.dirname(screenshot), { recursive: true });
			fs.writeFileSync(screenshot, attachment.body);
		}
		const titleParts = testTitleParts(test);
		const testId = loadTestId(test.location.file, titleParts, this.options.loadTesting.root);
		const attachedLoad = loadAttachment(result.attachments);
		const norm: VisualResult = {
			...testIdentity(test, test.parent.project()?.name || test.titlePath().find((v) => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog),
			browserErrors: redactEvidence(diagnosticText(result.attachments, 'browser-diagnostics').join('\n')),
			duration: result.duration,
			error: redactEvidence(result.error?.message?.split('\n')[0] || ''),
			retry: result.retry,
			screenshot,
			status: normalizeVisualStatus(result.status),
			terminalErrors: redactEvidence(this.terminalDiagnostics.get(result)?.join('\n') || ''),
			visual: screenshot ? 'Embedded' : result.attachments.some((v) => v.name === 'visual-error') ? 'Capture failed' : 'No visual surface',
		};
		this.results.push(addLoadMeasurements(norm, testId, attachedLoad.measurements, attachedLoad.testBudget, this.options.loadTesting));
		const identity = testIdentity(test, test.parent.project()?.name || test.titlePath().find((v) => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog);
		const stableTestGroup = [identity.project, path.relative(process.cwd(), test.location.file), identity.groups, identity.title].join('\u0000');
		if (screenshot) {
			this.screenshotCaptures.push(
				persistScreenshotCapture(path.resolve(this.options.screenshotsDirectory), {
					group: `${stableTestGroup}\u0000test-result`,
					key: 'test-result',
					title: identity.title,
					viewport: identity.viewport,
					viewportSize: identity.viewportSize,
					screenshot,
					retry: result.retry,
					runId: this.screenshotRunId,
					capturedAt: new Date().toISOString(),
				}),
			);
		}
		for (const capture of visualCaptureManifest(result.attachments)) {
			const image = result.attachments.find((item) => item.name === capture.attachmentName && item.contentType === capture.contentType);
			if (!image) {
				this.runDiagnostics.push(`Missing screenshot attachment ${capture.attachmentName} for ${capture.key} (${identity.viewport}).`);
				continue;
			}
			let capturePath = image.path || '';
			if (!capturePath && image.body) {
				const extension = capture.contentType === 'image/png' ? 'png' : 'jpg';
				capturePath = path.resolve('test-results/playwright-output', `${test.id.replace(/[^a-z0-9_-]/gi, '-')}-${capture.attachmentName}.${extension}`);
				fs.mkdirSync(path.dirname(capturePath), { recursive: true });
				fs.writeFileSync(capturePath, image.body);
			}
			if (!capturePath) {
				this.runDiagnostics.push(`Screenshot data unavailable for ${capture.key} (${identity.viewport}).`);
				continue;
			}
			this.screenshotCaptures.push(
				persistScreenshotCapture(path.resolve(this.options.screenshotsDirectory), {
					group: `${stableTestGroup}\u0000${capture.key}`,
					key: capture.key,
					title: redactEvidence(capture.title),
					viewport: identity.viewport,
					viewportSize: identity.viewportSize,
					screenshot: capturePath,
					retry: result.retry,
					runId: this.screenshotRunId,
					capturedAt: new Date().toISOString(),
				}),
			);
		}
		this.terminalDiagnostics.delete(result);
	}

	/**
	 * Emits interrupted results and writes the spreadsheet and slideshow artifacts.
	 * @returns A promise that resolves after both report artifacts are written.
	 */
	async onEnd(): Promise<'failed' | void> {
		if (process.argv.includes('--list')) return;
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
		if (!process.argv.includes('--list')) {
			const directory = path.resolve(this.options.screenshotsDirectory);
			const previous = readScreenshotRun(directory);
			const sameRun = previous?.runId === this.screenshotRunId ? previous : undefined;
			const expectedTestIds = [...new Set([...(sameRun?.expectedTestIds || []), ...this.expectedTests.keys()])].sort();
			const completedTestIds = [...new Set([...(sameRun?.completedTestIds || []), ...this.completedTests])].sort();
			writeScreenshotRun(directory, {
				collectionFinished: this.finalizeScreenshotRun,
				completedTestCount: Math.max(sameRun?.completedTestCount || 0, completedTestIds.length),
				completedTestIds,
				expectedTestCount: Math.max(sameRun?.expectedTestCount || 0, expectedTestIds.length),
				expectedTestIds,
				...(this.finalizeScreenshotRun ? { finishedAt: new Date().toISOString() } : {}),
				runId: this.screenshotRunId,
				startedAt: sameRun?.startedAt || this.screenshotRunStartedAt,
			});
		}
		const runDir = path.resolve(this.options.outputRoot, new Date().toISOString().replace(/[:.]/g, '-'));
		fs.mkdirSync(runDir, { recursive: true });
		const browserResults = copyScreenshots(this.results, runDir);
		const supplemental = this.options.supplementalResultsFile ? supplementalResults(path.resolve(this.options.supplementalResultsFile), this.options.loadTesting) : { results: [], diagnostics: [] };
		const results = [...browserResults, ...supplemental.results];
		const run: ReportRun = {
			featureFiles: [...new Set([...this.options.featureFiles, ...supplemental.results.map((r) => r.file)])],
			projects: [
				...this.options.projects,
				...[
					...supplemental.results.reduce((p, r) => {
						p.set(r.project, new Set([...(p.get(r.project) || []), r.file]));
						return p;
					}, new Map<string, Set<string>>()),
				].map(([n, c]) => ({ name: n, configuredFiles: [...c] })),
			],
			results,
			runDiagnostics: [...this.runDiagnostics.map(redactEvidence), ...supplemental.diagnostics],
			loadTestingEnabled: this.options.loadTesting.enabled,
		};
		const spreadsheet = path.join(runDir, this.options.reportFile);
		const slideshow = path.join(runDir, this.options.slideshowFile);
		await writeSpreadsheet(spreadsheet, run);
		if (this.options.screenshotOnlySlideshow && !this.finalizeScreenshotRun) {
			process.stdout.write('Screenshot slideshow deferred until the logical run is finalized.\n');
		} else {
			if (this.options.screenshotOnlySlideshow) await writeScreenshotSlideshowFromDirectory(path.resolve(this.options.screenshotsDirectory), slideshow);
			else await writeSlideshow(slideshow, this.options.loadTesting.enabled ? results : browserResults, { loadTestingEnabled: this.options.loadTesting.enabled });
			process.stdout.write(`Test slideshow: ${slideshow}\n`);
		}
		process.stdout.write(`Test spreadsheet: ${spreadsheet}\n`);
		const measurements = results.flatMap((r) => r.loadMeasurements || []);
		const loadCounts = loadGradeCounts(measurements);
		if (this.options.loadTesting.enabled) process.stdout.write(`Load budgets: ${loadCounts.pass} pass, ${loadCounts.warning} warning, ${loadCounts.fail} fail.\n`);
		return loadCounts.fail ? 'failed' : undefined;
	}
}
export { diagnosticCount };
