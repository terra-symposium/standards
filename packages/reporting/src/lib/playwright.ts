/**
 * packages/reporting/src/lib/playwright.ts
 * Playwright fixtures and reporter for reusable test evidence.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import path from 'node:path';
import { baseVisualProjectName, projectViewportName, viewportSizeLabel } from './viewports.js';
import { createHash, randomUUID } from 'node:crypto';
import { diagnosticCount, normalizeVisualStatus } from './core.js';
import { gradeLoadMeasurement, loadGradeCounts, loadTestId, readLoadTestingConfig, timeLoadOperation, validateLoadBudgetOverride } from './load-testing.js';
import { test as base } from '@playwright/test';
import { writeScreenshotSlideshowFromDirectory, writeSlideshow } from './slideshow.js';
import { writeSpreadsheet } from './spreadsheet.js';

// DATA
import { VISUAL_VIEWPORTS } from './viewports.js';

// TYPES
import type { LoadBudgetOverride, LoadMeasurement, LoadMeasurementInput, LoadTestingConfig, ProjectDefinition, VisualResult } from './core.js';
import type { Page } from '@playwright/test';
import type { ScreenshotCapture } from './slideshow.js';
import type { ViewportCatalog } from './viewports.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

/**
 * Creates a fresh matcher for characters that cannot appear in artifact names.
 *
 * @return Global matcher for characters outside the test-id filename alphabet.
 */
const A_Z0_9_GI_REGEX = () => /[^a-z0-9_-]/gi;

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/** Browser diagnostic captured by the reusable page fixture. */
export type BrowserDiagnostic = { level: string; message: string; url?: string };

/*//////////////////////////////////////////////////
FIXTURES
//////////////////////////////////////////////////*/

/** Playwright fixture that records browser console, page, and request failures. */
export const diagnosticsTest = base.extend({
	page: async ({ page: p, context: c }, u, i): Promise<void> => {
		const diagnostics: BrowserDiagnostic[] = [];
		/**
		 * Attaches console, page-error, and failed-request listeners to a page.
		 *
		 * @param tgt Page whose browser events should be collected for this test.
		 */
		const observe = (tgt: typeof p): void => {
			tgt.on('console', m => {
				if (!['error', 'warning'].includes(m.type())) return;
				diagnostics.push({ level: m.type(), message: m.text(), url: tgt.url() });
			});
			tgt.on('pageerror', e => diagnostics.push({ level: 'pageerror', message: e.message, url: tgt.url() }));
			tgt.on('requestfailed', r => diagnostics.push({ level: 'requestfailed', message: `${r.method()} ${r.url()} ${r.failure()?.errorText || 'Request failed.'}`, url: r.url() }));
		};
		observe(p);
		c.on('page', observe);
		try {
			await u(p);
		} finally {
			c.off('page', observe);
			if (diagnostics.length) {
				try {
					await i.attach('browser-diagnostics', { body: Buffer.from(JSON.stringify(diagnostics)), contentType: 'application/json' });
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
			/**
			 * Records navigation timing for a page when its load event fires.
			 *
			 * @param tgt Page whose navigation entries should be measured.
			 */
			const observe = (tgt: typeof page): void => {
				tgt.on('load', () => {
					if (!enabled || tgt.url() === 'about:blank') return;
					pending.push(
						tgt
							.evaluate(() => {
								const entry = performance.getEntries().find(i => String(i.entryType) === 'navigation') as PerformanceNavigationTiming | undefined;
								return entry ? { durationMs: entry.duration, pathname: location.pathname } : undefined;
							})
							.then(navigation => {
								if (!navigation || navigation.durationMs <= 0) return;
								measurements.push({ name: `page load: ${navigation.pathname || '/'}`, kind: 'page', durationMs: navigation.durationMs });
							})
							.catch(() => undefined),
					);
				});
			};
			observe(page);
			ctx.on('page', observe);
			try {
				await use({
					setTestBudget: budget => {
						testBudget = validateLoadBudgetOverride(budget);
					},
					measure: async <T>(name: string, op: () => T | Promise<T>, budget?: LoadBudgetOverride): Promise<T> => {
						if (!enabled) return op();
						return timeLoadOperation(
							name,
							op,
							measurement => {
								measurements.push(measurement);
							},
							budget,
						);
					},
				});
			} finally {
				ctx.off('page', observe);
				await Promise.all(pending);
				if (enabled && (measurements.length || testBudget)) {
					try {
						await info.attach('load-testing', { body: Buffer.from(JSON.stringify({ measurements, testBudget })), contentType: 'application/json' });
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
	visuals: async ({ page: p }, u, i): Promise<void> => {
		const captures: Array<{ attachmentName: string; contentType: string; key: string; title: string }> = [];
		const keys = new Set<string>();
		await u({
			capture: async (key, options = {}): Promise<void> => {
				const normKey = key.trim();
				if (!normKey) throw new Error('A visual capture key is required.');
				if (keys.has(normKey)) throw new Error(`Duplicate visual capture key: ${normKey}`);
				keys.add(normKey);
				const attachmentName = `visual-capture-${String(captures.length + 1).padStart(5, '0')}`;
				const screenshotOptions: NonNullable<Parameters<Page['screenshot']>[0]> = {
					type: 'jpeg',
					quality: 65,
					fullPage: false,
					animations: 'disabled' as const,
					caret: 'hide' as const,
					...options.screenshot,
				};
				const ext = screenshotOptions.type === 'png' ? 'png' : 'jpg';
				const contentType = screenshotOptions.type === 'png' ? 'image/png' : 'image/jpeg';
				const screenshotPath = i.outputPath(`${attachmentName}.${ext}`);
				await fs.promises.writeFile(screenshotPath, await p.screenshot(screenshotOptions));
				await i.attach(attachmentName, { path: screenshotPath, contentType });
				captures.push({ attachmentName, contentType, key: normKey, title: options.title?.trim() || normKey });
			},
		});
		if (captures.length) {
			try {
				await i.attach('visual-captures', { body: Buffer.from(JSON.stringify(captures)), contentType: 'application/json' });
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

/** Describes one Playwright attachment supplied to the shared reporter. */
type ReporterAttachment = { body?: Buffer; contentType?: string; name?: string; path?: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Removes terminal color escapes before diagnostics enter an artifact.
 *
 * @param val Terminal output that may contain ANSI escape sequences.
 *
 * @return Terminal output with ANSI formatting removed.
 */
export const stripAnsi = (val: string): string => val.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g'), '');

/**
 * Parses browser diagnostic attachments into readable artifact lines.
 *
 * @param raw JSON attachment text or a plain diagnostic message.
 *
 * @return Normalized diagnostic lines.
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
 *
 * @param chunk Terminal text or bytes emitted by Playwright.
 *
 * @return Trimmed, ANSI-free terminal text.
 */
const terminalText = (chunk: string | Buffer): string => stripAnsi(chunk.toString('utf8')).trim();

/**
 * Reads an inline or file-backed Playwright attachment.
 *
 * @param attachment Attachment metadata supplied by Playwright.
 *
 * @return Attachment text, or an empty string when it is unavailable.
 */
const readAttachment = (attachment: ReporterAttachment): string => {
	if (attachment.body) return attachment.body.toString('utf8');
	if (attachment.path && fs.existsSync(attachment.path)) return fs.readFileSync(attachment.path, 'utf8');
	return '';
};

/**
 * Extracts one named JSON diagnostic attachment.
 *
 * @param attachments Attachments emitted for one test result.
 * @param name Diagnostic attachment name to locate.
 *
 * @return Parsed diagnostic lines from the matching attachment.
 */
const diagnosticText = (attachments: readonly ReporterAttachment[], name: string): string[] => {
	const attachment = attachments.find(v => v.name === name && v.contentType === 'application/json');
	const raw = attachment ? readAttachment(attachment) : '';
	if (!raw) return [];
	return parseDiagnostics(raw);
};

/**
 * Resolves the path of a captured screenshot attachment.
 *
 * @param attachments Attachments emitted for one test result.
 *
 * @return Matching screenshot attachment, or `undefined` when no image attachment exists.
 */
const screenshotAttachment = (attachments: readonly ReporterAttachment[]): ReporterAttachment | undefined =>
	attachments.find(v => ['visual', 'screenshot'].includes(v.name || '') && v.contentType === 'image/png');

/**
 * Saves one capture under a stable identity so reruns replace it without duplicating the deck.
 *
 * @param dir Persistent directory for screenshot records and image files.
 * @param capture Capture metadata and the source screenshot path to persist.
 *
 * @return The capture with its persisted screenshot path, or the original capture when its source image is unavailable.
 */
const persistScreenshotCapture = (dir: string, capture: ScreenshotCapture): ScreenshotCapture => {
	if (!capture.screenshot || !fs.existsSync(capture.screenshot)) return capture;
	const key = createHash('sha256').update([capture.group, capture.key, capture.viewport].join('\0')).digest('hex');
	const ext = path.extname(capture.screenshot) || '.png';
	const screenshot = path.join(dir, `${key}${ext}`);
	const recordFile = path.join(dir, `${key}.json`);
	fs.mkdirSync(dir, { recursive: true });
	if (fs.existsSync(recordFile)) {
		try {
			const previous = JSON.parse(fs.readFileSync(recordFile, 'utf8')) as ScreenshotCapture;
			if (previous.runId === capture.runId && (previous.retry || 0) > (capture.retry || 0)) return { ...previous, screenshot };
		} catch {
			// Replace an incomplete record with the next valid result.
		}
	}
	const temporaryImg = `${screenshot}.${process.pid}.tmp`;
	fs.copyFileSync(capture.screenshot, temporaryImg);
	fs.renameSync(temporaryImg, screenshot);
	const persisted = { ...capture, screenshot };
	const temporaryRecord = `${recordFile}.${process.pid}.tmp`;
	fs.writeFileSync(temporaryRecord, JSON.stringify(persisted));
	fs.renameSync(temporaryRecord, recordFile);
	return persisted;
};
const screenshotRunFile = '.terra-playwright-run.json';
/** Expected test identity paired with the viewports discovered across one logical run. */
type ExpectedScreenshotGroup = { group: string; viewports: string[] };
/** Latest reporter collection state persisted beside accumulated screenshots. */
type ScreenshotRun = {
	runId: string;
	startedAt: string;
	expectedTestCount: number;
	completedTestCount: number;
	expectedTestIds?: string[];
	completedTestIds?: string[];
	expectedCaptureGroups?: ExpectedScreenshotGroup[];
	finishedAt?: string;
	collectionFinished: boolean;
};
/**
 * Reads the latest marker while treating malformed or legacy state as absent.
 *
 * @param dir Directory containing the run marker.
 *
 * @return Validated run state, or `undefined` when the marker is missing, malformed, or from an unsupported format.
 */
const readScreenshotRun = (dir: string): ScreenshotRun | undefined => {
	try {
		const run: unknown = JSON.parse(fs.readFileSync(path.join(dir, screenshotRunFile), 'utf8'));
		if (!run || typeof run !== 'object') return undefined;
		const value = run as Record<string, unknown>;
		if (typeof value.runId !== 'string' || typeof value.startedAt !== 'string' || typeof value.expectedTestCount !== 'number' || typeof value.completedTestCount !== 'number') return undefined;
		return {
			runId: value.runId,
			startedAt: value.startedAt,
			expectedTestCount: value.expectedTestCount,
			completedTestCount: value.completedTestCount,
			expectedTestIds: Array.isArray(value.expectedTestIds) ? value.expectedTestIds.filter((i): i is string => typeof i === 'string') : undefined,
			completedTestIds: Array.isArray(value.completedTestIds) ? value.completedTestIds.filter((i): i is string => typeof i === 'string') : undefined,
			expectedCaptureGroups: Array.isArray(value.expectedCaptureGroups)
				? value.expectedCaptureGroups.flatMap((i): ExpectedScreenshotGroup[] => {
						if (!i || typeof i !== 'object') return [];
						const row = i as Record<string, unknown>;
						if (typeof row.group !== 'string' || !Array.isArray(row.viewports)) return [];
						const viewports = row.viewports.filter((viewport): viewport is string => typeof viewport === 'string');
						return [{ group: row.group, viewports }];
					})
				: undefined,
			finishedAt: typeof value.finishedAt === 'string' ? value.finishedAt : undefined,
			collectionFinished: value.collectionFinished === true,
		};
	} catch {
		return undefined;
	}
};
/**
 * Atomically writes the latest run marker so interrupted captures remain identifiable.
 *
 * @param dir Directory in which the run marker is stored.
 * @param run Run state to serialize as the latest marker.
 */
const writeScreenshotRun = (dir: string, run: ScreenshotRun): void => {
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, screenshotRunFile);
	const temporaryFile = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(temporaryFile, JSON.stringify(run));
	fs.renameSync(temporaryFile, file);
};

/**
 * Validates the keyed-capture manifest emitted by the `visualTest` fixture.
 *
 * @param attachments Attachments emitted by the test result.
 *
 * @return Valid keyed-capture entries from the manifest, or an empty list when it is absent or malformed.
 */
const visualCaptureManifest = (attachments: readonly ReporterAttachment[]): Array<{ attachmentName: string; contentType: string; key: string; title: string }> => {
	const attachment = attachments.find(i => i.name === 'visual-captures' && i.contentType === 'application/json');
	if (!attachment) return [];
	try {
		const parsed: unknown = JSON.parse(readAttachment(attachment));
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((i): Array<{ attachmentName: string; contentType: string; key: string; title: string }> => {
			if (!i || typeof i !== 'object') return [];
			const row = i as Record<string, unknown>;
			if (typeof row.attachmentName !== 'string' || typeof row.contentType !== 'string' || typeof row.key !== 'string' || typeof row.title !== 'string') return [];
			return [{ attachmentName: row.attachmentName, contentType: row.contentType, key: row.key, title: row.title }];
		});
	} catch {
		return [];
	}
};

/**
 * Reads timing samples and a test override from the fixture attachment.
 *
 * @param attachments Attachments emitted by the test result.
 *
 * @return Valid timing measurements and optional test budget, or an empty measurement list when the attachment is absent or invalid.
 */
const loadAttachment = (attachments: readonly ReporterAttachment[]): { measurements: LoadMeasurementInput[]; testBudget?: LoadBudgetOverride } => {
	const attachment = attachments.find(v => v.name === 'load-testing' && v.contentType === 'application/json');
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

/**
 * Grades the test duration and attached page/operation samples for one result.
 *
 * @param result Normalized test result whose duration is graded alongside its attached timings.
 * @param id Stable test identity used to find per-test budget settings.
 * @param inputs Page-load and named-operation measurements collected by the fixture.
 * @param testBudget Optional test-level budget supplied by the fixture attachment.
 * @param cfg Validated timing configuration that controls whether and how measurements are graded.
 *
 * @return The original result when timing is disabled, otherwise a result containing graded measurements and its stable load-test key.
 */
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
		...inputs.map(i => gradeLoadMeasurement(i, cfg, id)),
	];
	return { ...result, loadMeasurements: measurements, loadTestId: id };
};

/**
 * Creates the framework-neutral identity fields shared by all result records.
 *
 * @param test Playwright test identity.
 * @param cfgdProject Playwright project name used to resolve its base project and viewport.
 * @param viewportCatalog Catalog used to resolve viewport labels and sizes.
 *
 * @return Framework-neutral identity fields for a visual result.
 */
const testIdentity = (
	test: { location: { file: string }; title: string; titlePath: () => string[] },
	cfgdProject: string,
	viewportCatalog: ViewportCatalog,
): Omit<VisualResult, 'status' | 'duration' | 'retry' | 'error' | 'browserErrors' | 'terminalErrors' | 'screenshot' | 'visual'> => {
	const file = path.basename(test.location.file);
	const fullTitlePath = test.titlePath();
	const fileIdx = fullTitlePath.findIndex(v => v.endsWith(file));
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

/**
 * Builds the stable key shared by a test's default and keyed screenshots across viewports.
 *
 * @param test Playwright test whose file and title path form the screenshot identity.
 * @param cfgdProject Configured project name used to remove the viewport suffix.
 * @param viewportCatalog Viewport definitions used to normalize the project identity.
 *
 * @return Stable identity shared by default screenshots and keyed captures across viewports.
 */
const screenshotTestGroup = (test: { location: { file: string }; title: string; titlePath: () => string[] }, cfgdProject: string, viewportCatalog: ViewportCatalog): string => {
	const identity = testIdentity(test, cfgdProject, viewportCatalog);
	return [identity.project, path.relative(process.cwd(), test.location.file), identity.groups, identity.title].join('\u0000');
};

/**
 * Resolves the title path portion used by the stable test budget key.
 *
 * @param test Playwright test whose runner title path supplies the stable title segments.
 *
 * @return Non-empty suite and test title segments, excluding the spec file entry.
 */
const testTitleParts = (test: { location: { file: string }; title: string; titlePath: () => string[] }): string[] => {
	const file = path.basename(test.location.file);
	const fullTitlePath = test.titlePath();
	const fileIdx = fullTitlePath.findIndex(v => v.endsWith(file));
	return fullTitlePath.slice(fileIdx >= 0 ? fileIdx + 1 : 0).filter(Boolean);
};

/**
 * Redacts personal identifiers and configured secrets from report text.
 *
 * @param val Untrusted text or value to sanitize before it enters report artifacts.
 *
 * @return Text with control characters, personal identifiers, configured secrets, ANSI codes, and the workspace path redacted.
 */
const redactEvidence = (val: unknown): string => {
	let text = Array.from(stripAnsi(String(val ?? '')))
		.filter(c => {
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
	private readonly expectedCaptureGroups = new Map<string, Set<string>>();
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
			outputRoot: opts.outputRoot || 'tests/results/visual',
			screenshotsDirectory: opts.screenshotsDirectory || path.join(opts.outputRoot || 'tests/results/visual', 'screenshots'),
			reportFile: opts.reportFile || 'report.xlsx',
			slideshowFile: opts.slideshowFile || 'report.pptx',
			supplementalResultsFile: opts.supplementalResultsFile,
			loadTesting: readLoadTestingConfig(opts.qualityConfigFile, opts.loadTesting),
			screenshotOnlySlideshow: opts.screenshotOnlySlideshow ?? process.env.TERRA_SCREENSHOT_ONLY_SLIDESHOW !== '0',
		};
	}

	/**
	 * Records the full expected suite so interrupted tests can be represented.
	 *
	 * @param _config Playwright configuration supplied by the reporter lifecycle.
	 * @param suite Playwright suite containing all discovered tests.
	 *
	 * @return Nothing; the expected-test registry is updated in place.
	 */
	onBegin(
		_config: Parameters<NonNullable<import('@playwright/test/reporter').Reporter['onBegin']>>[0],
		suite: Parameters<NonNullable<import('@playwright/test/reporter').Reporter['onBegin']>>[1],
	): void {
		for (const test of suite.allTests()) this.expectedTests.set(test.id, test);
		if (!process.argv.includes('--list')) {
			const dir = path.resolve(this.options.screenshotsDirectory);
			const previous = readScreenshotRun(dir);
			const sameRun = previous?.runId === this.screenshotRunId ? previous : undefined;
			for (const { group, viewports } of sameRun?.expectedCaptureGroups || []) this.expectedCaptureGroups.set(group, new Set(viewports));
			for (const test of suite.allTests()) {
				const configuredProject = test.parent.project()?.name || test.titlePath().find(v => v.startsWith('root-')) || 'unknown';
				const group = screenshotTestGroup(test, configuredProject, this.options.viewportCatalog);
				const viewports = this.expectedCaptureGroups.get(group) || new Set<string>();
				viewports.add(projectViewportName(configuredProject, this.options.viewportCatalog));
				this.expectedCaptureGroups.set(group, viewports);
			}
			const expectedTestIds = [...new Set([...(sameRun?.expectedTestIds || []), ...this.expectedTests.keys()])].sort();
			const completedTestIds = [...new Set(sameRun?.completedTestIds || [])].sort();
			writeScreenshotRun(dir, {
				collectionFinished: false,
				completedTestCount: Math.max(sameRun?.completedTestCount || 0, completedTestIds.length),
				completedTestIds,
				expectedTestCount: Math.max(sameRun?.expectedTestCount || 0, expectedTestIds.length),
				expectedTestIds,
				expectedCaptureGroups: [...this.expectedCaptureGroups].map(([g, v]) => ({ group: g, viewports: [...v] })),
				runId: this.screenshotRunId,
				startedAt: sameRun?.startedAt || this.screenshotRunStartedAt,
			});
		}
		if (!this.options.featureFiles.length || !this.options.projects.length) {
			const projectFiles = new Map<string, Set<string>>();
			const files = new Set<string>();
			for (const test of suite.allTests()) {
				const file = path.basename(test.location.file);
				const project = baseVisualProjectName(test.parent.project()?.name || test.titlePath().find(v => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog);
				files.add(file);
				projectFiles.set(project, new Set([...(projectFiles.get(project) || []), file]));
			}
			if (!this.options.featureFiles.length) this.options.featureFiles = [...files];
			if (!this.options.projects.length) this.options.projects = [...projectFiles].map(([n, c]) => ({ name: n, configuredFiles: [...c] }));
		}
	}

	/**
	 * Associates stderr with a test result or the run when no test is active.
	 *
	 * @param chunk Terminal output emitted by Playwright.
	 * @param test Active test identity, when available.
	 * @param result Active test result, when available.
	 *
	 * @return Nothing; diagnostic state is updated in place.
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
	 *
	 * @param chunk Terminal output emitted by Playwright.
	 * @param test Active test identity, when available.
	 * @param result Active test result, when available.
	 *
	 * @return Nothing; diagnostic state is updated in place.
	 */
	onStdOut(chunk: string | Buffer, test?: object, result?: object): void {
		const val = terminalText(chunk);
		if (!val || !/\b(?:error|errors|failed|failure|exception|warning|warn|timeout|requestfailed|pageerror)\b/i.test(val)) return;
		if (!test || !result) {
			this.runDiagnostics.push(val);
			return;
		}
		this.terminalDiagnostics.set(result, [...(this.terminalDiagnostics.get(result) || []), val]);
	}

	/**
	 * Retains reporter-level errors in the run diagnostics.
	 *
	 * @param err Reporter-level error emitted by Playwright.
	 *
	 * @return Nothing; run diagnostics are updated in place.
	 */
	onError(err: { message: string }): void {
		this.runDiagnostics.push(err.message);
	}

	/**
	 * Normalizes a completed Playwright result and associates its evidence.
	 *
	 * @param test Completed Playwright test case.
	 * @param result Completed Playwright test result and attachments.
	 *
	 * @return Nothing; the normalized result is appended to the run.
	 */
	onTestEnd(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): void {
		this.completedTests.add(test.id);

		// RESOLVE TEST IDENTITY AND DEFAULT SCREENSHOT
		const attachment = screenshotAttachment(result.attachments);
		let screenshot = attachment?.path || '';
		if (!screenshot && attachment?.body) {
			screenshot = path.resolve(`tests/results/playwright-output/${test.id.replace(A_Z0_9_GI_REGEX(), '-')}-screenshot.png`);
			fs.mkdirSync(path.dirname(screenshot), { recursive: true });
			fs.writeFileSync(screenshot, attachment.body);
		}
		const testId = loadTestId(test.location.file, testTitleParts(test), this.options.loadTesting.root);
		const attachedLoad = loadAttachment(result.attachments);
		const norm: VisualResult = {
			...testIdentity(test, test.parent.project()?.name || test.titlePath().find(v => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog),
			browserErrors: redactEvidence(diagnosticText(result.attachments, 'browser-diagnostics').join('\n')),
			duration: result.duration,
			error: redactEvidence(result.error?.message?.split('\n')[0] || ''),
			retry: result.retry,
			screenshot,
			status: normalizeVisualStatus(result.status),
			terminalErrors: redactEvidence(this.terminalDiagnostics.get(result)?.join('\n') || ''),
			visual: screenshot ? 'Embedded' : result.attachments.some(v => v.name === 'visual-error') ? 'Capture failed' : 'No visual surface',
		};
		this.results.push(addLoadMeasurements(norm, testId, attachedLoad.measurements, attachedLoad.testBudget, this.options.loadTesting));
		// PERSIST THE TEST'S EXPECTED RESPONSIVE CAPTURES
		const identity = testIdentity(test, test.parent.project()?.name || test.titlePath().find(v => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog);
		const stableTestGroup = screenshotTestGroup(test, test.parent.project()?.name || test.titlePath().find(v => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog);
		const expectedViewports = this.expectedCaptureGroups.get(stableTestGroup) || new Set<string>();
		expectedViewports.add(identity.viewport);
		this.expectedCaptureGroups.set(stableTestGroup, expectedViewports);
		if (screenshot)
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

		// RESOLVE AND PERSIST EACH KEYED SCREENSHOT
		for (const capture of visualCaptureManifest(result.attachments)) {
			const img = result.attachments.find(i => i.name === capture.attachmentName && i.contentType === capture.contentType);
			if (!img) {
				this.runDiagnostics.push(`Missing screenshot attachment ${capture.attachmentName} for ${capture.key} (${identity.viewport}).`);
				continue;
			}
			let capturePath = img.path || '';
			if (!capturePath && img.body) {
				capturePath = path.resolve('tests/results/playwright-output', `${test.id.replace(A_Z0_9_GI_REGEX(), '-')}-${capture.attachmentName}.${capture.contentType === 'image/png' ? 'png' : 'jpg'}`);
				fs.mkdirSync(path.dirname(capturePath), { recursive: true });
				fs.writeFileSync(capturePath, img.body);
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
	 *
	 * @return A promise that resolves after both report artifacts are written.
	 */
	async onEnd(): Promise<'failed' | void> {
		if (process.argv.includes('--list')) return;

		// REPRESENT TESTS THAT NEVER REACHED A RESULT CALLBACK
		for (const [id, test] of this.expectedTests) {
			if (this.completedTests.has(id)) continue;
			this.results.push({
				...testIdentity(test, test.parent.project()?.name || test.titlePath().find(v => v.startsWith('root-')) || 'unknown', this.options.viewportCatalog),
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

		// UPDATE THE LOGICAL RUN MARKER BEFORE WRITING ARTIFACTS
		if (!process.argv.includes('--list')) {
			const dir = path.resolve(this.options.screenshotsDirectory);
			const previous = readScreenshotRun(dir);
			const sameRun = previous?.runId === this.screenshotRunId ? previous : undefined;
			const expectedTestIds = [...new Set([...(sameRun?.expectedTestIds || []), ...this.expectedTests.keys()])].sort();
			const completedTestIds = [...new Set([...(sameRun?.completedTestIds || []), ...this.completedTests])].sort();
			writeScreenshotRun(dir, {
				collectionFinished: this.finalizeScreenshotRun,
				completedTestCount: Math.max(sameRun?.completedTestCount || 0, completedTestIds.length),
				completedTestIds,
				expectedTestCount: Math.max(sameRun?.expectedTestCount || 0, expectedTestIds.length),
				expectedTestIds,
				expectedCaptureGroups: [...this.expectedCaptureGroups].map(([g, v]) => ({ group: g, viewports: [...v] })),
				...(this.finalizeScreenshotRun ? { finishedAt: new Date().toISOString() } : {}),
				runId: this.screenshotRunId,
				startedAt: sameRun?.startedAt || this.screenshotRunStartedAt,
			});
		}
		const runDir = path.resolve(this.options.outputRoot, new Date().toISOString().replace(/[:.]/g, '-'));
		fs.mkdirSync(runDir, { recursive: true });
		fs.mkdirSync(path.join(runDir, 'images'), { recursive: true });
		const browserResults = this.results.map((result, i) => {
			if (!result.screenshot || !fs.existsSync(result.screenshot)) return result;
			const destination = path.join(
				runDir,
				'images',
				`${String(i + 1).padStart(4, '0')}-${
					`${result.project}-${result.file}-${result.title}-${result.viewport}`
						.replace(/[^a-z0-9_-]+/gi, '-')
						.replace(/^-+|-+$/g, '')
						.toLowerCase() || 'screenshot'
				}.png`,
			);
			fs.copyFileSync(result.screenshot, destination);
			return { ...result, screenshot: destination };
		});
		const supplemental: { results: VisualResult[]; diagnostics: string[] } = { results: [], diagnostics: [] };
		if (this.options.supplementalResultsFile) {
			const supplementalFile = path.resolve(this.options.supplementalResultsFile);
			const unavailable = (err: string): VisualResult => ({
				browserErrors: '',
				duration: 0,
				error: err,
				file: path.basename(supplementalFile),
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
			if (!fs.existsSync(supplementalFile)) {
				supplemental.results.push(unavailable(`Supplemental results file was not found: ${supplementalFile}`));
			} else {
				try {
					const payload = JSON.parse(fs.readFileSync(supplementalFile, 'utf8')) as { complete?: unknown; results?: unknown; runDiagnostics?: unknown };
					supplemental.results = (Array.isArray(payload.results) ? payload.results : []).map((value): VisualResult => {
						const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
						const rawDuration = Number(row.duration ?? row.duration_ms ?? 0);
						const result: VisualResult = {
							browserErrors: '',
							duration: Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0,
							error: redactEvidence(row.error),
							file: redactEvidence(row.file || path.basename(supplementalFile)),
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
						if (!this.options.loadTesting.enabled) return result;
						return addLoadMeasurements(
							result,
							String(
								row.loadTestId ||
									row.testId ||
									loadTestId(
										String(row.file || path.basename(supplementalFile)),
										[String(row.groups || ''), String(row.title || 'Untitled supplemental result')].filter(Boolean).flatMap(part => part.split(' › ')),
										this.options.loadTesting.root,
									),
							),
							Array.isArray(row.loadMeasurements)
								? row.loadMeasurements.flatMap((measurementValue): LoadMeasurementInput[] => {
										if (!measurementValue || typeof measurementValue !== 'object') return [];
										const measurement = measurementValue as Record<string, unknown>;
										if (typeof measurement.name !== 'string' || !measurement.name.trim() || !['page', 'operation'].includes(String(measurement.kind))) return [];
										if (typeof measurement.durationMs !== 'number' || !Number.isFinite(measurement.durationMs) || measurement.durationMs < 0) return [];
										let budget: LoadBudgetOverride | undefined;
										try {
											if (measurement.budget && typeof measurement.budget === 'object') budget = validateLoadBudgetOverride(measurement.budget as LoadBudgetOverride);
										} catch {
											return [];
										}
										return [{ name: redactEvidence(measurement.name), kind: measurement.kind as LoadMeasurementInput['kind'], durationMs: measurement.durationMs, ...(budget ? { budget } : {}) }];
									})
								: [],
							row.testBudget && typeof row.testBudget === 'object' ? validateLoadBudgetOverride(row.testBudget as LoadBudgetOverride) : undefined,
							this.options.loadTesting,
						);
					});
					if (payload.complete === false) supplemental.results.unshift(unavailable('The supplemental test run reported an incomplete result inventory.'));
					supplemental.diagnostics = Array.isArray(payload.runDiagnostics) ? payload.runDiagnostics.map(redactEvidence) : [];
				} catch (err) {
					supplemental.results = [unavailable(`Could not read supplemental results: ${err instanceof Error ? err.message : String(err)}`)];
					supplemental.diagnostics = [];
				}
			}
		}
		const results = [...browserResults, ...supplemental.results];
		const spreadsheet = path.join(runDir, this.options.reportFile);
		const slideshow = path.join(runDir, this.options.slideshowFile);
		await writeSpreadsheet(spreadsheet, {
			featureFiles: [...new Set([...this.options.featureFiles, ...supplemental.results.map(r => r.file)])],
			projects: [
				...this.options.projects,
				...[
					...supplemental.results.reduce((p, r) => {
						p.set(r.project, new Set([...(p.get(r.project) || []), r.file]));
						return p;
					}, new Map<string, Set<string>>()),
				].map(([n, c]) => ({ name: n, configuredFiles: [...c] })),
			],
			results: [...browserResults, ...supplemental.results],
			runDiagnostics: [...this.runDiagnostics.map(redactEvidence), ...supplemental.diagnostics],
			loadTestingEnabled: this.options.loadTesting.enabled,
		});
		if (this.options.screenshotOnlySlideshow && !this.finalizeScreenshotRun) process.stdout.write('Screenshot slideshow deferred until the logical run is finalized.\n');
		else {
			if (this.options.screenshotOnlySlideshow) await writeScreenshotSlideshowFromDirectory(path.resolve(this.options.screenshotsDirectory), slideshow, { currentRunId: this.screenshotRunId });
			else await writeSlideshow(slideshow, this.options.loadTesting.enabled ? [...browserResults, ...supplemental.results] : browserResults, { loadTestingEnabled: this.options.loadTesting.enabled });
			process.stdout.write(`Test slideshow: ${slideshow}\n`);
		}
		process.stdout.write(`Test spreadsheet: ${spreadsheet}\n`);
		const loadCounts = loadGradeCounts(results.flatMap(r => r.loadMeasurements || []));
		if (this.options.loadTesting.enabled) process.stdout.write(`Load budgets: ${loadCounts.pass} pass, ${loadCounts.warning} warning, ${loadCounts.fail} fail.\n`);
		return loadCounts.fail ? 'failed' : undefined;
	}
}
export { diagnosticCount };
