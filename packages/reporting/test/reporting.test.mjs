/**
 * packages/reporting/test/reporting.test.mjs
 */

// packages/reporting/test/reporting.test.mjs

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const execFileAsync = promisify(execFile);
const { diagnosticCount, normalizeVisualStatus: normVisualStatus, orderedFiles, statusCounts } = await import('@terra-symposium/standards-reporting/core');
const { parseDiagnostics, stripAnsi, default: ProgressReporter } = await import('@terra-symposium/standards-reporting/playwright');
const { baseVisualProjectName, projectViewportName, resolveVisualViewports, visualProjectName, withResponsivePlaywright } = await import('@terra-symposium/standards-reporting/viewports');
const {
	DEFAULT_LOAD_BUDGET,
	gradeLoad,
	gradeLoadMeasurement,
	normalizeLoadTestingConfig: normLoadTestingCfg,
	readLoadTestingConfig: readLoadTestingCfg,
	timeLoadOperation: timeLoadOp,
} = await import('@terra-symposium/standards-reporting/load-testing');
const { writeSpreadsheet } = await import('@terra-symposium/standards-reporting/spreadsheet');
const { writeScreenshotSlideshow, writeSlideshow } = await import('@terra-symposium/standards-reporting/slideshow');

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/* Creates the smallest complete normalized result fixture for reporting tests. */
const result = (overrides = {}) => ({
	browserErrors: '',
	duration: 10,
	error: '',
	file: 'example.spec.ts',
	groups: 'Example',
	project: 'root-example',
	retry: 0,
	screenshot: '',
	status: 'passed',
	terminalErrors: '',
	title: 'renders the example',
	visual: 'No visual surface',
	viewport: 'xl',
	viewportSize: '1280×720',
	...overrides,
});

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

/* Covers status normalization, diagnostics, file ordering, and viewport aliases. */
test('normalizes result summaries and viewport project names', () => {
	const vals = [result(), result({ status: 'failed' }), result({ status: 'interrupted', file: 'other.spec.ts' })];
	assert.deepEqual(statusCounts(vals), { passed: 1, failed: 1, timedOut: 0, skipped: 0, interrupted: 1 });
	assert.equal(diagnosticCount('one\ntwo'), 2);
	assert.equal(normVisualStatus('unknown'), 'failed');
	assert.equal(stripAnsi('\u001b[31merror\u001b[0m'), 'error');
	assert.deepEqual(parseDiagnostics(JSON.stringify([{ level: 'error', message: 'Broken request', url: 'http://localhost' }])), ['error: Broken request (http://localhost)']);
	assert.deepEqual(orderedFiles({ featureFiles: ['example.spec.ts'], projects: [], results: vals, runDiagnostics: [] }), ['example.spec.ts', 'other.spec.ts']);
	assert.equal(
		visualProjectName('root-example', { name: 'mobile', width: 390, height: 844 }, [
			{ name: 'mobile', width: 390, height: 844 },
			{ name: 'xl', width: 1280, height: 720 },
		]),
		'root-example-mobile',
	);
	assert.deepEqual(resolveVisualViewports('phone,desktop'), [
		{ name: 'mobile', width: 390, height: 844 },
		{ name: 'xl', width: 1280, height: 720 },
	]);
	const customCatalog = { mobile: { width: 390, height: 844 }, 'interaction-mobile': { width: 375, height: 812 }, desktop: { width: 1440, height: 900 } };
	assert.equal(projectViewportName('salesphere-interactions-interaction-mobile', customCatalog), 'interaction-mobile');
	assert.equal(baseVisualProjectName('salesphere-interactions-interaction-mobile', customCatalog), 'salesphere-interactions');
	assert.deepEqual(resolveVisualViewports('phone,desktop', customCatalog), [
		{ name: 'mobile', width: 390, height: 844 },
		{ name: 'desktop', width: 1440, height: 900 },
	]);
});

// Confirms page timing starts without destructuring the controller fixture.
test('captures page navigation for tests that do not destructure the load fixture', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'reporting-load-fixture-'));
	const specFile = path.join(root, 'navigation.spec.mjs');
	const cfgFile = path.join(root, 'playwright.config.mjs');
	const reportFile = path.join(root, 'playwright-report.json');
	await fs.writeFile(
		specFile,
		`import { visualTest as test } from ${JSON.stringify(new URL('../dist/playwright.js', import.meta.url).href)};\ntest('captures a keyed screenshot', async ({ page, visuals }) => { await page.goto('data:text/html,<title>loaded</title>'); await visuals.capture('/example'); });\n`,
	);
	await fs.writeFile(
		cfgFile,
		`export default { testDir: ${JSON.stringify(root)}, outputDir: ${JSON.stringify(path.join(root, 'output'))}, reporter: [['json', { outputFile: ${JSON.stringify(reportFile)} }]], projects: [{ name: 'chromium', use: { browserName: 'chromium' } }] };\n`,
	);
	try {
		await execFileAsync('pnpm', ['--filter', '@terra-symposium/standards-reporting', 'exec', 'playwright', 'test', '--config', cfgFile], {
			cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..'),
			timeout: 60000,
		});
		const report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
		const results = report.suites.flatMap((suite) => suite.specs.flatMap((spec) => spec.tests.flatMap((e) => e.results)));
		const attachment = results.flatMap((r) => r.attachments).find((e) => e.name === 'load-testing');
		assert.ok(attachment, 'the automatic fixture should attach load measurements');
		const payload = JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'));
		assert.ok(
			payload.measurements.some((measurement) => measurement.kind === 'page' && measurement.durationMs > 0),
			JSON.stringify(payload),
		);
		const capturesAttachment = results.flatMap((r) => r.attachments).find((e) => e.name === 'visual-captures');
		assert.ok(capturesAttachment, 'the visual fixture should attach capture metadata');
		const captures = JSON.parse(Buffer.from(capturesAttachment.body, 'base64').toString('utf8'));
		assert.equal(captures.length, 1);
		assert.equal(captures[0].key, '/example');
		const screenshot = results.flatMap((r) => r.attachments).find((e) => e.name === captures[0].attachmentName);
		assert.equal(screenshot.contentType, 'image/jpeg');
		assert.ok((await fs.stat(screenshot.path)).size > 0);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

/* Covers default viewport expansion, focused selection, and projects that must run once. */
test('expands regular Playwright projects and preserves single-run setup/capture projects', () => {
	const original = process.env.PW_VIEWPORTS;
	delete process.env.PW_VIEWPORTS;
	const defaultViewports = resolveVisualViewports();
	assert.deepEqual(
		defaultViewports.map(({ name: n }) => n),
		['mobile', 'sm', 'md', 'lg', 'xl', '2xl'],
	);
	if (original === undefined) delete process.env.PW_VIEWPORTS;
	else process.env.PW_VIEWPORTS = original;
	const cfg = withResponsivePlaywright(
		{
			reporter: ['list'],
			projects: [
				{ name: 'browser', testMatch: '**/*.spec.ts', use: { baseURL: 'http://localhost' } },
				{ name: 'auth-setup', testMatch: '**/*.setup.ts' },
				{ name: 'app', dependencies: ['auth-setup'], testMatch: '**/app.spec.ts' },
				{ name: 'manual-capture', testMatch: '**/capture.ts' },
			],
		},
		{ singleRunProjects: ['manual-capture'] },
	);
	assert.deepEqual(
		cfg.projects.map(({ name: n }) => n),
		['browser-mobile', 'browser-sm', 'browser-md', 'browser-lg', 'browser-xl', 'browser-2xl', 'auth-setup', 'app-mobile', 'app-sm', 'app-md', 'app-lg', 'app-xl', 'app-2xl', 'manual-capture'],
	);
	assert.equal(cfg.outputDir, 'test-results/playwright-output');
	assert.deepEqual(cfg.use.screenshot, { mode: 'on', fullPage: true, caret: 'initial' });
	assert.deepEqual(cfg.projects.find(({ name: n }) => n === 'app-mobile').dependencies, ['auth-setup']);
	assert.equal(cfg.projects.find(({ name: n }) => n === 'browser-mobile').use.viewport.width, 390);
	assert.ok(cfg.reporter.some((r) => Array.isArray(r) && r[0] === '@terra-symposium/standards-reporting/playwright'));
	const screenshotsOnly = withResponsivePlaywright({ projects: [{ name: 'browser' }] }, { screenshotOnlySlideshow: true });
	assert.equal(screenshotsOnly.reporter.find((r) => Array.isArray(r) && r[0] === '@terra-symposium/standards-reporting/playwright')[1].screenshotOnlySlideshow, true);
	process.env.PW_VIEWPORTS = 'md,xl';
	assert.deepEqual(
		resolveVisualViewports().map(({ name: n }) => n),
		['md', 'xl'],
	);
	const focused = withResponsivePlaywright({ projects: [{ name: 'browser' }] });
	assert.deepEqual(
		focused.projects.map(({ name: n }) => n),
		['browser-md', 'browser-xl'],
	);
	assert.equal(focused.metadata.terraLoadTestingEnabled, true);
	if (original === undefined) delete process.env.PW_VIEWPORTS;
	else process.env.PW_VIEWPORTS = original;
});

/* Covers default timing thresholds, grading boundaries, config overrides, and failure-safe measurement. */
test('loads and grades per-test and operation timing budgets', async () => {
	assert.deepEqual(DEFAULT_LOAD_BUDGET, { warnMs: 2000, failMs: 5000 });
	assert.equal(gradeLoad(2000, DEFAULT_LOAD_BUDGET), 'pass');
	assert.equal(gradeLoad(2001, DEFAULT_LOAD_BUDGET), 'warning');
	assert.equal(gradeLoad(5000, DEFAULT_LOAD_BUDGET), 'warning');
	assert.equal(gradeLoad(5001, DEFAULT_LOAD_BUDGET), 'fail');
	const cfg = normLoadTestingCfg({
		defaultBudget: { warnMs: 2000, failMs: 5000 },
		testBudgets: { 'tests/example.spec.ts::Dashboard loads': { failMs: 10000 } },
		operationBudgets: { 'bulk import': { warnMs: 5000, failMs: 9000 } },
	});
	assert.equal(gradeLoadMeasurement({ name: 'test duration', kind: 'test', durationMs: 6000 }, cfg, 'tests/example.spec.ts::Dashboard loads').grade, 'warning');
	assert.deepEqual(gradeLoadMeasurement({ name: 'bulk import', kind: 'operation', durationMs: 6000 }, cfg, 'tests/example.spec.ts::Dashboard loads').budget, { warnMs: 5000, failMs: 9000 });
	assert.deepEqual(gradeLoadMeasurement({ name: 'bulk import', kind: 'operation', durationMs: 2500, budget: { warnMs: 1000 } }, cfg, 'tests/example.spec.ts::Dashboard loads').budget, {
		warnMs: 1000,
		failMs: 9000,
	});
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terra-load-config-'));
	const cfgFile = path.join(root, 'quality.json');
	await fs.writeFile(cfgFile, JSON.stringify({ loadTesting: { enabled: false, defaultBudget: { warnMs: 3000, failMs: 7000 } } }));
	assert.equal(readLoadTestingCfg(cfgFile).enabled, false);
	assert.deepEqual(readLoadTestingCfg(cfgFile, { enabled: true }).defaultBudget, { warnMs: 3000, failMs: 7000 });
	assert.equal(withResponsivePlaywright({ projects: [{ name: 'browser' }] }, { qualityConfigFile: cfgFile }).metadata.terraLoadTestingEnabled, false);
	const recorded = [];
	assert.equal(
		await timeLoadOp(
			'read cache',
			() => 42,
			(sample) => recorded.push(sample),
		),
		42,
	);
	assert.equal(recorded[0].name, 'read cache');
	assert.equal(recorded[0].kind, 'operation');
	assert.ok(recorded[0].durationMs >= 0);
	await assert.rejects(
		() =>
			timeLoadOp(
				'failed operation',
				() => Promise.reject(new Error('operation failed')),
				(sample) => recorded.push(sample),
			),
		/operation failed/,
	);
	assert.equal(recorded[1].name, 'failed operation');
});

/* Covers neutral spreadsheet/slideshow metadata, embedded evidence, and empty runs. */
test('writes neutral spreadsheet and slideshow artifacts', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terra-reporting-'));
	const { default: sharp } = await import('sharp');
	const { default: ExcelJS } = await import('exceljs');
	const screenshot = path.join(root, 'source.png');
	await sharp({ create: { width: 4, height: 3, channels: 4, background: { r: 20, g: 30, b: 40, alpha: 1 } } })
		.png()
		.toFile(screenshot);
	const run = {
		featureFiles: ['example.spec.ts', 'interrupted.spec.ts'],
		projects: [{ name: 'root-example', configuredFiles: ['example.spec.ts', 'interrupted.spec.ts'] }],
		results: [result({ screenshot }), result({ file: 'interrupted.spec.ts', status: 'interrupted', title: 'never starts', visual: 'No visual surface' })],
		runDiagnostics: ['runner warning'],
	};
	const spreadsheet = path.join(root, 'report.xlsx');
	const slideshow = path.join(root, 'report.pptx');
	await writeSpreadsheet(spreadsheet, run);
	await writeSlideshow(slideshow, run.results);
	assert.ok((await fs.stat(spreadsheet)).size > 0);
	assert.ok((await fs.stat(slideshow)).size > 0);
	const { stdout: coreProperties } = await execFileAsync('unzip', ['-p', slideshow, 'docProps/core.xml']);
	assert.match(coreProperties, /Test evidence slideshow/);
	assert.doesNotMatch(coreProperties, /PowerPoint|Excel|Terra/);
	const { stdout: slideshowProperties } = await execFileAsync('unzip', ['-p', slideshow, 'docProps/app.xml']);
	assert.match(slideshowProperties, /Test evidence reporter/);
	assert.doesNotMatch(slideshowProperties, /PowerPoint|Excel|Terra/);
	const { stdout: slideText } = await execFileAsync('unzip', ['-p', slideshow, 'ppt/slides/slide1.xml']);
	assert.doesNotMatch(slideText, /PowerPoint|Excel|Terra/);
	const { stdout: notes } = await execFileAsync('unzip', ['-p', slideshow, 'ppt/notesSlides/notesSlide1.xml']);
	assert.match(notes, /full-page screenshot/);
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.readFile(spreadsheet);
	assert.equal(workbook.creator, 'Test evidence reporter');
	assert.equal(workbook.title, 'Test evidence spreadsheet');
	const { stdout: spreadsheetProperties } = await execFileAsync('unzip', ['-p', spreadsheet, 'docProps/app.xml']);
	assert.match(spreadsheetProperties, /Test evidence reporter/);
	assert.doesNotMatch(spreadsheetProperties, /PowerPoint|Excel|Terra/);
	assert.deepEqual(
		workbook.worksheets.map((s) => s.name),
		['Summary', 'example.spec.ts', 'interrupted.spec.ts', 'Projects', 'Run diagnostics'],
	);
	assert.equal(workbook.getWorksheet('Summary').getCell('F2').value, 0);
	assert.equal(workbook.getWorksheet('Summary').getCell('F3').value, 1);
	assert.ok(workbook.model.media.length > 0);
	assert.match(workbook.getWorksheet('Run diagnostics').getCell('B2').value, /runner warning/);
	const nestedReport = path.join(root, 'nested-report.xlsx');
	await writeSpreadsheet(nestedReport, {
		featureFiles: ['tests/actions/registry.test.mjs', 'tests/actions/registry.test.mjs?'],
		projects: [],
		results: [result({ file: 'tests/actions/registry.test.mjs' }), result({ file: 'tests/actions/registry.test.mjs?' })],
		runDiagnostics: [],
	});
	const nestedWorkbook = new ExcelJS.Workbook();
	await nestedWorkbook.xlsx.readFile(nestedReport);
	assert.equal(nestedWorkbook.worksheets[1].name, 'tests_actions_registry.test.mjs');
	assert.equal(nestedWorkbook.worksheets[2].name, 'tests_actions_registry.test (2)');
	const responsive = path.join(root, 'responsive.pptx');
	const responsiveResults = [
		result({ viewport: 'mobile', viewportSize: '390×844', screenshot }),
		result({ viewport: 'sm', viewportSize: '640×800', screenshot }),
		result({ viewport: 'md', viewportSize: '768×900', screenshot: '', visual: 'No visual surface' }),
		result({ viewport: 'lg', viewportSize: '1024×768', screenshot }),
		result({ viewport: 'xl', viewportSize: '1280×720', screenshot }),
		result({ viewport: '2xl', viewportSize: '1536×864', screenshot }),
	];
	await writeSlideshow(responsive, responsiveResults);
	const { stdout: responsiveArchive } = await execFileAsync('unzip', ['-l', responsive]);
	assert.match(responsiveArchive, /ppt\/slides\/slide1\.xml/);
	assert.doesNotMatch(responsiveArchive, /ppt\/slides\/slide2\.xml/);
	const { stdout: responsiveText } = await execFileAsync('unzip', ['-p', responsive, 'ppt/slides/slide1.xml']);
	assert.match(responsiveText, /mobile/);
	assert.match(responsiveText, /sm/);
	assert.match(responsiveText, /md/);
	assert.match(responsiveText, /lg/);
	assert.match(responsiveText, /xl/);
	assert.match(responsiveText, /2xl/);
	assert.match(responsiveText, /SCREENSHOT MISSING/);
	assert.equal((responsiveText.match(/<p:pic>/g) || []).length, 5);
	const emptySlideshow = path.join(root, 'empty.pptx');
	await writeSlideshow(emptySlideshow, []);
	const { stdout: emptyNotes } = await execFileAsync('unzip', ['-p', emptySlideshow, 'ppt/slides/slide1.xml']);
	assert.match(emptyNotes, /No browser test results were collected/);
});

/* Ensures keyed viewport captures produce image-only PowerPoint slides. */
test('writes responsive screenshot-only slides', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terra-screenshot-slideshow-'));
	try {
		const { default: sharp } = await import('sharp');
		const screenshot = path.join(root, 'capture.png');
		await sharp({ create: { width: 32, height: 18, channels: 3, background: { r: 40, g: 80, b: 120 } } })
			.png()
			.toFile(screenshot);
		const viewports = [
			['mobile', '390×844'],
			['sm', '640×800'],
			['md', '768×900'],
			['lg', '1024×768'],
			['xl', '1280×720'],
			['2xl', '1536×864'],
		];
		const slideshow = path.join(root, 'screenshots.pptx');
		await writeScreenshotSlideshow(
			slideshow,
			viewports.map(([viewport, viewportSize]) => ({ group: 'example route', key: '/example', title: 'Example route', viewport, viewportSize, screenshot })),
		);
		const { stdout: slide } = await execFileAsync('unzip', ['-p', slideshow, 'ppt/slides/slide1.xml']);
		assert.equal((slide.match(/<p:pic>/g) || []).length, 6);
		assert.doesNotMatch(slide, /<p:sp>/);
		assert.doesNotMatch(slide, /Example route|mobile|desktop|Load timing/);
		const { stdout: archive } = await execFileAsync('unzip', ['-l', slideshow]);
		assert.doesNotMatch(archive, /ppt\/slides\/slide2\.xml/);
		const reporter = new ProgressReporter({ outputRoot: path.join(root, 'reporter'), screenshotOnlySlideshow: true, loadTesting: { enabled: false } });
		for (const [viewport] of viewports) {
			const captureName = 'visual-capture-00001';
			reporter.onTestEnd(
				{
					id: `test-${viewport}`,
					location: { file: path.join(root, 'routes.spec.ts') },
					title: 'captures route screenshots',
					titlePath: () => ['routes.spec.ts', 'captures route screenshots'],
					parent: { project: () => ({ name: `root-routes-${viewport}` }) },
				},
				{
					attachments: [
						{
							name: 'visual-captures',
							contentType: 'application/json',
							body: Buffer.from(JSON.stringify([{ attachmentName: captureName, contentType: 'image/jpeg', key: '/example', title: 'Example route' }])),
						},
						{ name: captureName, contentType: 'image/jpeg', path: screenshot },
					],
					duration: 100,
					error: undefined,
					retry: 0,
					status: 'passed',
				},
			);
		}
		assert.equal(await reporter.onEnd(), undefined);
		const runDirectory = (await fs.readdir(path.join(root, 'reporter')))[0];
		const reporterSlides = path.join(root, 'reporter', runDirectory, 'report.pptx');
		const { stdout: reporterSlide } = await execFileAsync('unzip', ['-p', reporterSlides, 'ppt/slides/slide1.xml']);
		assert.equal((reporterSlide.match(/<p:pic>/g) || []).length, 6);
		assert.doesNotMatch(reporterSlide, /<p:sp>/);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

// Covers timing artifacts, supplemental runner rows, reporter enforcement, and the legacy opt-out. */
test('reports load timing details and fails only when enabled budgets are exceeded', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terra-load-report-'));
	const budget = { warnMs: 2000, failMs: 5000 };
	const browserResult = result({
		title: 'dashboard loads',
		loadTestId: 'tests/dashboard.spec.ts::Dashboard loads',
		loadMeasurements: [
			{ name: 'test duration', kind: 'test', durationMs: 900, budget, grade: 'pass' },
			{ name: 'page load: /dashboard', kind: 'page', durationMs: 2500, budget, grade: 'warning' },
			{ name: 'bulk import', kind: 'operation', durationMs: 6200, budget, grade: 'fail' },
		],
	});
	const supplementalResult = result({
		file: 'tests/import.test.mjs',
		groups: 'imports',
		project: 'supplemental',
		title: 'imports a large archive',
		viewport: 'supplemental',
		viewportSize: 'N/A',
		loadMeasurements: [{ name: 'disk staging', kind: 'operation', durationMs: 800, budget, grade: 'pass' }],
	});
	const run = {
		featureFiles: ['example.spec.ts', 'tests/import.test.mjs'],
		projects: [{ name: 'root-example', configuredFiles: ['example.spec.ts'] }],
		results: [browserResult, supplementalResult],
		runDiagnostics: [],
		loadTestingEnabled: true,
	};
	const spreadsheet = path.join(root, 'load.xlsx');
	const slideshow = path.join(root, 'load.pptx');
	await writeSpreadsheet(spreadsheet, run);
	await writeSlideshow(slideshow, run.results, { loadTestingEnabled: true });
	const { default: ExcelJS } = await import('exceljs');
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.readFile(spreadsheet);
	assert.ok(workbook.getWorksheet('Load timings'));
	assert.equal(workbook.getWorksheet('Summary').getCell('H2').value, 1);
	assert.equal(workbook.getWorksheet('Summary').getCell('I2').value, 1);
	assert.equal(workbook.getWorksheet('Summary').getCell('J2').value, 1);
	assert.equal(workbook.getWorksheet('example.spec.ts').getCell('G2').value, 'fail');
	assert.equal(workbook.getWorksheet('Load timings').getCell('F4').value, 'bulk import');
	assert.equal(workbook.getWorksheet('Load timings').getCell('F5').value, 'disk staging');
	const { stdout: slide1 } = await execFileAsync('unzip', ['-p', slideshow, 'ppt/slides/slide1.xml']);
	const { stdout: slide2 } = await execFileAsync('unzip', ['-p', slideshow, 'ppt/slides/slide2.xml']);
	const { stdout: slide4 } = await execFileAsync('unzip', ['-p', slideshow, 'ppt/slides/slide4.xml']);
	assert.match(slide1, /Load timing summary/);
	assert.match(slide1, /2 pass/);
	assert.match(slide1, /1 warning/);
	assert.match(slide1, /1 fail/);
	assert.match(slide2, /Load fail/);
	assert.match(slide4, /bulk import/);
	assert.match(slide4, /disk staging/);
	const reporter = new ProgressReporter({ outputRoot: path.join(root, 'enforced'), loadTesting: { defaultBudget: { warnMs: 1000, failMs: 2000 } } });
	const testCase = {
		id: 'slow-test',
		location: { file: path.join(root, 'tests', 'slow.spec.ts') },
		title: 'takes too long',
		titlePath: () => ['slow.spec.ts', 'takes too long'],
		parent: { project: () => ({ name: 'root-example' }) },
	};
	reporter.onTestEnd(testCase, { attachments: [], duration: 2501, error: undefined, retry: 0, status: 'passed' });
	assert.equal(await reporter.onEnd(), 'failed');
	const warningOnly = new ProgressReporter({ outputRoot: path.join(root, 'warning-only'), loadTesting: { defaultBudget: { warnMs: 1000, failMs: 3000 } } });
	warningOnly.onTestEnd(testCase, { attachments: [], duration: 2501, error: undefined, retry: 0, status: 'passed' });
	assert.equal(await warningOnly.onEnd(), undefined);
	const testOverride = new ProgressReporter({ outputRoot: path.join(root, 'test-override'), loadTesting: { defaultBudget: { warnMs: 1000, failMs: 2000 } } });
	testOverride.onTestEnd(testCase, {
		attachments: [{ name: 'load-testing', contentType: 'application/json', body: Buffer.from(JSON.stringify({ testBudget: { failMs: 3000 }, measurements: [] })) }],
		duration: 2501,
		error: undefined,
		retry: 0,
		status: 'passed',
	});
	assert.equal(await testOverride.onEnd(), undefined);
	const optedOut = new ProgressReporter({ outputRoot: path.join(root, 'opted-out'), loadTesting: { enabled: false } });
	optedOut.onTestEnd(testCase, { attachments: [], duration: 2501, error: undefined, retry: 0, status: 'passed' });
	assert.equal(await optedOut.onEnd(), undefined);
	const legacyWorkbook = new ExcelJS.Workbook();
	const optedOutRun = (await fs.readdir(path.join(root, 'opted-out')))[0];
	await legacyWorkbook.xlsx.readFile(path.join(root, 'opted-out', optedOutRun, 'report.xlsx'));
	assert.deepEqual(
		legacyWorkbook.worksheets.map((sheet) => sheet.name),
		['Summary', 'slow.spec.ts', 'Projects', 'Run diagnostics'],
	);
	const optedOutSlideshow = path.join(root, 'opted-out', optedOutRun, 'report.pptx');
	const { stdout: legacySlide } = await execFileAsync('unzip', ['-p', optedOutSlideshow, 'ppt/slides/slide1.xml']);
	assert.doesNotMatch(legacySlide, /Load timing summary/);
});
