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
import { diagnosticCount, normalizeVisualStatus } from './core.js';
import { gradeLoadMeasurement, loadGradeCounts, loadTestId, readLoadTestingConfig, timeLoadOperation, validateLoadBudgetOverride } from './load-testing.js';
import { test as base } from '@playwright/test';
import { writeSlideshow } from './slideshow.js';
import { writeSpreadsheet } from './spreadsheet.js';

// DATA
import { VISUAL_VIEWPORTS } from './viewports.js';

// TYPES
import type { LoadBudgetOverride, LoadMeasurement, LoadMeasurementInput, LoadTestingConfig, ProjectDefinition, ReportRun, VisualResult } from './core.js';
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
		/**
		 * Captures browser console errors, uncaught page errors, and failed requests.
		 * @param tgt Page whose console, page errors, and failed requests should be observed.
		 */
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
			/**
			 * Records navigation timing for each page opened during the test.
			 * @param tgt Page whose navigation timings should be recorded.
			 */
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

/** Application-specific paths and catalog settings for the shared reporter. */
export type ReportingOptions = {
	featureFiles?: readonly string[];
	projects?: readonly ProjectDefinition[];
	viewportCatalog?: ViewportCatalog;
	outputRoot?: string;
	reportFile?: string;
	slideshowFile?: string;
	supplementalResultsFile?: string;
	qualityConfigFile?: string;
	loadTesting?: LoadTestingConfig;
};

/** Describes a Playwright attachment passed to the shared reporter. */
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
 * Identifies terminal output that should be retained as diagnostic evidence.
 *
 * @param val Normalized terminal output to check for diagnostic keywords.
 *
 * @return Whether the output contains a diagnostic keyword.
 */
const isTerminalDiagnostic = (val: string): boolean => /\b(?:error|errors|failed|failure|exception|warning|warn|timeout|requestfailed|pageerror)\b/i.test(val);

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
	const attachment = attachments.find((v) => v.name === name && v.contentType === 'application/json');
	const raw = attachment ? readAttachment(attachment) : '';
	if (!raw) return [];
	return parseDiagnostics(raw);
};

/**
 * Resolves the path of a captured screenshot attachment.
 *
 * @param attachments Attachments emitted for one test result.
 *
 * @return Matching screenshot attachment, or `undefined` when none exists.
 */
const screenshotAttachment = (attachments: readonly ReporterAttachment[]): ReporterAttachment | undefined =>
	attachments.find((v) => ['visual', 'screenshot'].includes(v.name || '') && v.contentType === 'image/png');

/**
 * Reads timing samples and a test override from the fixture attachment.
 *
 * @param attachments Attachments emitted for one test result.
 *
 * @return Valid timing samples and the optional test-level budget from the fixture attachment.
 */
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

/**
 * Grades the test duration and attached page/operation samples for one result.
 *
 * @param result Result to augment with graded load measurements.
 * @param id Stable test identity used to resolve per-test thresholds.
 * @param inputs Valid page-load and operation measurements attached by the fixture.
 * @param testBudget Optional test-level threshold override.
 * @param cfg Normalized load-testing settings used to grade the measurements.
 *
 * @return The original result when load testing is disabled, or the result with graded timing data.
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
		...inputs.map((input) => gradeLoadMeasurement(input, cfg, id)),
	];
	return { ...result, loadMeasurements: measurements, loadTestId: id };
};

/**
 * Creates the framework-neutral identity fields shared by all result records.
 *
 * @param test Playwright test identity.
 * @param cfgdProject Configured Playwright project name used to derive project and viewport labels.
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

/**
 * Resolves the title path portion used by the stable test budget key.
 *
 * @param test Playwright test identity whose file and title path should be resolved.
 *
 * @return Title and group segments with the test file path removed.
 */
const testTitleParts = (test: { location: { file: string }; title: string; titlePath: () => string[] }): string[] => {
	const file = path.basename(test.location.file);
	const fullTitlePath = test.titlePath();
	const fileIdx = fullTitlePath.findIndex((v) => v.endsWith(file));
	return fullTitlePath.slice(fileIdx >= 0 ? fileIdx + 1 : 0).filter(Boolean);
};

/**
 * Generates a stable filename for a copied screenshot.
 *
 * @param result Result whose identity contributes to the filename.
 * @param idx Zero-based result position used to keep duplicate names distinct.
 *
 * @return A filesystem-safe screenshot filename.
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
 *
 * @param results Results whose screenshot paths should be relocated.
 * @param runDir Timestamped output directory where screenshots are copied.
 *
 * @return Results with copied screenshot paths.
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

/**
 * Redacts personal identifiers and configured secrets from report text.
 *
 * @param val Untrusted value that may contain personal identifiers or secrets.
 *
 * @return Text with identifiers, configured secrets, and the workspace path redacted.
 */
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

/**
 * Converts untrusted supplemental timing values to supported measurement inputs.
 *
 * @param val Untrusted supplemental value expected to contain timing measurements.
 *
 * @return Supported page and operation measurements with validated budgets.
 */
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

/**
 * Converts an optional structured results file into the shared row model.
 *
 * @param file Optional structured results file to read.
 * @param loadTesting Normalized timing settings for any measurements in the file.
 *
 * @return Normalized result rows and run-level diagnostics.
 */
const supplementalResults = (file: string, loadTesting: ReturnType<typeof readLoadTestingConfig>): { results: VisualResult[]; diagnostics: string[] } => {
	/**
	 * Creates an interrupted row when the supplemental results file is unavailable or invalid.
	 * @param err Explanation included in the interrupted result when the file cannot be used.
	 *
	 * @return An interrupted result row describing the unavailable supplemental source.
	 */
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
	private readonly options: Required<Pick<ReportingOptions, 'featureFiles' | 'projects' | 'viewportCatalog' | 'outputRoot' | 'reportFile' | 'slideshowFile'>> &
		Pick<ReportingOptions, 'supplementalResultsFile'> & { loadTesting: ReturnType<typeof readLoadTestingConfig> };
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
			supplementalResultsFile: opts.supplementalResultsFile,
			loadTesting: readLoadTestingConfig(opts.qualityConfigFile, opts.loadTesting),
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
		if (!val || !isTerminalDiagnostic(val)) return;
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
		this.terminalDiagnostics.delete(result);
	}

	/**
	 * Emits interrupted results and writes the spreadsheet and slideshow artifacts.
	 *
	 * @return A promise that resolves after both report artifacts are written.
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
		await writeSlideshow(slideshow, this.options.loadTesting.enabled ? results : browserResults, { loadTestingEnabled: this.options.loadTesting.enabled });
		process.stdout.write(`Test spreadsheet: ${spreadsheet}\nTest slideshow: ${slideshow}\n`);
		const measurements = results.flatMap((r) => r.loadMeasurements || []);
		const loadCounts = loadGradeCounts(measurements);
		if (this.options.loadTesting.enabled) process.stdout.write(`Load budgets: ${loadCounts.pass} pass, ${loadCounts.warning} warning, ${loadCounts.fail} fail.\n`);
		return loadCounts.fail ? 'failed' : undefined;
	}
}
export { diagnosticCount };
