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
const { readScreenshotCapturesFromDirectory, writeScreenshotSlideshow, writeScreenshotSlideshowFromDirectory, writeSlideshow } = await import('@terra-symposium/standards-reporting/slideshow');

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
	assert.equal(focused.reporter.find((r) => Array.isArray(r) && r[0] === '@terra-symposium/standards-reporting/playwright')[1].screenshotOnlySlideshow, true);
	if (original === undefined) delete process.env.PW_VIEWPORTS;
	else process.env.PW_VIEWPORTS = original;
});

test('collects only declared viewport scenarios and passes custom dimensions to reporting', () => {
	const viewportCatalog = { compact: { width: 767, height: 900 }, expanded: { width: 768, height: 900 } };
	const config = withResponsivePlaywright({ projects: [{ name: 'dashboard', testMatch: '**/dashboard.spec.ts' }] }, { viewportPolicy: 'declared', viewportCatalog, loadTesting: { enabled: false } });
	assert.deepEqual(
		config.projects.map(({ name }) => name),
		['dashboard-compact', 'dashboard-expanded'],
	);
	assert.match('@viewport:compact', config.projects[0].grep);
	assert.doesNotMatch('@viewport:expanded', config.projects[0].grep);
	assert.deepEqual(config.reporter.find((entry) => Array.isArray(entry) && entry[0] === '@terra-symposium/standards-reporting/playwright')[1].viewportCatalog, viewportCatalog);
	const filtered = withResponsivePlaywright({ projects: [{ name: 'dashboard', grep: /@sanity-studio/u }] }, { viewportPolicy: 'declared', viewportCatalog });
	assert.match('@sanity-studio @viewport:compact', filtered.projects[0].grep);
	assert.doesNotMatch('@sanity-studio @viewport:expanded', filtered.projects[0].grep);
});

/* Persists default Playwright result screenshots across partial runs and rebuilds a deduplicated deck from the folder. */
test('rebuilds the default screenshot deck from accumulated captures', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terra-reporting-capture-folder-'));
	try {
		const { default: sharp } = await import('sharp');
		const screenshot = path.join(root, 'source.png');
		await sharp({ create: { width: 24, height: 16, channels: 3, background: { r: 60, g: 100, b: 140 } } })
			.png()
			.toFile(screenshot);
		const outputRoot = path.join(root, 'visual');
		const testCase = {
			id: 'result-screenshot',
			location: { file: path.join(root, 'tests', 'responsive.spec.ts') },
			title: 'renders the page',
			titlePath: () => ['responsive.spec.ts', 'renders the page'],
			parent: { project: () => ({ name: 'browser-mobile' }) },
		};
		const run = async (projectName, retry = 0) => {
			const reporter = new ProgressReporter({ outputRoot, loadTesting: { enabled: false } });
			const selectedTest = { ...testCase, parent: { project: () => ({ name: projectName }) } };
			reporter.onBegin({}, { allTests: () => [selectedTest] });
			reporter.onTestEnd(selectedTest, { attachments: [{ name: 'screenshot', contentType: 'image/png', path: screenshot }], duration: 5, error: undefined, retry, status: 'passed' });
			assert.equal(await reporter.onEnd(), undefined);
		};
		await run('browser-mobile', 2);
		await run('browser-xl');
		await run('browser-mobile');
		const evidenceDirectory = path.join(outputRoot, 'screenshots');
		const entries = await fs.readdir(evidenceDirectory);
		assert.equal(entries.filter((name) => name.endsWith('.png')).length, 2);
		assert.equal(entries.filter((name) => name.endsWith('.json') && name !== '.terra-playwright-run.json').length, 2);
		const persisted = readScreenshotCapturesFromDirectory(evidenceDirectory);
		const currentRun = JSON.parse(await fs.readFile(path.join(evidenceDirectory, '.terra-playwright-run.json'), 'utf8'));
		assert.equal(currentRun.collectionFinished, true);
		assert.equal(currentRun.expectedTestCount, 1);
		assert.equal(currentRun.completedTestCount, 1);
		assert.deepEqual(persisted.map(({ viewport, historical }) => [viewport, historical]).sort(), [
			['mobile', false],
			['xl', true],
		]);
		assert.equal(persisted.find(({ viewport }) => viewport === 'mobile').retry, 0, 'a fresh run replaces a previous run even when its retry number is lower');
		await fs.writeFile(path.join(evidenceDirectory, 'interrupted-write.json'), '{');
		const rebuilt = path.join(root, 'rebuilt.pptx');
		await writeScreenshotSlideshowFromDirectory(evidenceDirectory, rebuilt);
		const { stdout: archive } = await execFileAsync('unzip', ['-l', rebuilt]);
		assert.match(archive, /ppt\/slides\/slide2\.xml/);
		const { stdout: currentSlide } = await execFileAsync('unzip', ['-p', rebuilt, 'ppt/slides/slide1.xml']);
		const { stdout: historicalSlide } = await execFileAsync('unzip', ['-p', rebuilt, 'ppt/slides/slide2.xml']);
		assert.equal((currentSlide.match(/<p:pic>/g) || []).length, 1);
		assert.equal((historicalSlide.match(/<p:pic>/g) || []).length, 1);
		assert.match(`${currentSlide}${historicalSlide}`, /CURRENT RUN/);
		assert.match(`${currentSlide}${historicalSlide}`, /HISTORICAL CAPTURE/);

		const interruptedReporter = new ProgressReporter({ outputRoot, loadTesting: { enabled: false } });
		interruptedReporter.onBegin({}, { allTests: () => [testCase] });
		const interruptedRun = JSON.parse(await fs.readFile(path.join(evidenceDirectory, '.terra-playwright-run.json'), 'utf8'));
		assert.equal(interruptedRun.collectionFinished, false);
		const interruptedDeck = path.join(root, 'interrupted-rebuilt.pptx');
		await writeScreenshotSlideshowFromDirectory(evidenceDirectory, interruptedDeck);
		const { stdout: interruptedSlide } = await execFileAsync('unzip', ['-p', interruptedDeck, 'ppt/slides/slide1.xml']);
		assert.match(interruptedSlide, /HISTORICAL CAPTURE/);
		assert.doesNotMatch(interruptedSlide, /CURRENT RUN/);

		const legacyDirectory = path.join(root, 'legacy-screenshots');
		await fs.mkdir(legacyDirectory, { recursive: true });
		await fs.copyFile(screenshot, path.join(legacyDirectory, 'legacy.png'));
		await fs.writeFile(
			path.join(legacyDirectory, 'legacy.json'),
			JSON.stringify({ group: 'legacy', key: 'test-result', title: 'legacy capture', viewport: 'mobile', viewportSize: '390×844', screenshot: 'legacy.png' }),
		);
		const legacyDeck = path.join(root, 'legacy-rebuilt.pptx');
		await writeScreenshotSlideshowFromDirectory(legacyDirectory, legacyDeck);
		const { stdout: legacySlide } = await execFileAsync('unzip', ['-p', legacyDeck, 'ppt/slides/slide1.xml']);
		assert.equal((legacySlide.match(/<p:pic>/g) || []).length, 1);
		assert.match(legacySlide, /HISTORICAL CAPTURE/);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

/* Keeps automatic screenshot decks bounded while retaining deliberate full-folder recovery. */
test('writes one slide per current capture when a run ID is supplied', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terra-reporting-current-run-'));
	try {
		const { default: sharp } = await import('sharp');
		const evidenceDirectory = path.join(root, 'screenshots');
		await fs.mkdir(evidenceDirectory, { recursive: true });
		await sharp({ create: { width: 24, height: 16, channels: 3, background: { r: 60, g: 100, b: 140 } } })
			.png()
			.toFile(path.join(evidenceDirectory, 'capture.png'));
		const runId = 'current-run';
		for (let index = 0; index < 66; index++) {
			await fs.writeFile(
				path.join(evidenceDirectory, `capture-${index}.json`),
				JSON.stringify({
					group: `case-${index}`,
					key: 'test-result',
					title: `case ${index}`,
					viewport: 'xl',
					viewportSize: '1280×720',
					screenshot: 'capture.png',
					runId: index < 65 ? runId : 'historical-run',
				}),
			);
		}
		await fs.writeFile(
			path.join(evidenceDirectory, '.terra-playwright-run.json'),
			JSON.stringify({ runId, startedAt: new Date().toISOString(), expectedTestCount: 65, completedTestCount: 65, collectionFinished: true }),
		);
		const captures = readScreenshotCapturesFromDirectory(evidenceDirectory);
		assert.equal(captures.filter(({ historical }) => !historical).length, 65);
		assert.equal(captures.filter(({ historical }) => historical).length, 1);
		const currentDeck = path.join(root, 'current.pptx');
		await writeScreenshotSlideshowFromDirectory(evidenceDirectory, currentDeck, { currentRunId: runId });
		const { stdout: currentArchive } = await execFileAsync('unzip', ['-l', currentDeck]);
		assert.match(currentArchive, /ppt\/slides\/slide65\.xml/);
		assert.doesNotMatch(currentArchive, /ppt\/slides\/slide66\.xml/);
		const { stdout: currentSlide } = await execFileAsync('unzip', ['-p', currentDeck, 'ppt/slides/slide1.xml']);
		assert.match(currentSlide, /CURRENT RUN/);
		const accumulatedDeck = path.join(root, 'accumulated.pptx');
		await writeScreenshotSlideshowFromDirectory(evidenceDirectory, accumulatedDeck);
		const { stdout: accumulatedArchive } = await execFileAsync('unzip', ['-l', accumulatedDeck]);
		assert.match(accumulatedArchive, /ppt\/slides\/slide66\.xml/);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

/* Aggregates sequential viewport reporter processes into one logical screenshot run and resumes it after interruption. */
test('aggregates shared screenshot runs across viewport subprocesses and restarts', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terra-reporting-matrix-run-'));
	const runId = `matrix-${path.basename(root)}`;
	try {
		const { default: sharp } = await import('sharp');
		const screenshot = path.join(root, 'source.png');
		await sharp({ create: { width: 24, height: 16, channels: 3, background: { r: 60, g: 100, b: 140 } } })
			.png()
			.toFile(screenshot);
		const outputRoot = path.join(root, 'visual');
		const evidenceDirectory = path.join(outputRoot, 'screenshots');
		const latestArtifacts = async () => {
			const runs = (await fs.readdir(outputRoot, { withFileTypes: true }))
				.filter((entry) => entry.isDirectory() && entry.name !== 'screenshots')
				.map((entry) => entry.name)
				.sort();
			return fs.readdir(path.join(outputRoot, runs.at(-1)));
		};
		const makeTest = (id, viewport) => ({
			id,
			location: { file: path.join(root, 'tests', 'responsive.spec.ts') },
			title: `renders ${viewport}`,
			titlePath: () => ['responsive.spec.ts', `renders ${viewport}`],
			parent: { project: () => ({ name: `browser-${viewport}` }) },
		});
		const reporterProgram = `
			import ProgressReporter from '@terra-symposium/standards-reporting/playwright';
			const reporter = new ProgressReporter({ outputRoot: process.env.OUTPUT_ROOT, loadTesting: { enabled: false } });
			const selectedTest = {
				id: process.env.TEST_ID,
				location: { file: 'tests/responsive.spec.ts' },
				title: 'renders ' + process.env.VIEWPORT,
				titlePath: () => ['responsive.spec.ts', 'renders ' + process.env.VIEWPORT],
				parent: { project: () => ({ name: 'browser-' + process.env.VIEWPORT }) },
			};
			reporter.onBegin({}, { allTests: () => [selectedTest] });
			if (process.env.COMPLETE_TEST === '1') reporter.onTestEnd(selectedTest, {
				attachments: [{ name: 'screenshot', contentType: 'image/png', path: process.env.SCREENSHOT }],
				duration: 5,
				error: undefined,
				retry: 0,
				status: 'passed',
			});
			await reporter.onEnd();
		`;
		const runProcess = async (selectedTest, { completed = true, finalize = false, selectedRunId = runId } = {}) => {
			await execFileAsync(process.execPath, ['--input-type=module', '-e', reporterProgram], {
				cwd: process.cwd(),
				env: {
					...process.env,
					TERRA_SCREENSHOT_RUN_ID: selectedRunId,
					TERRA_SCREENSHOT_RUN_FINALIZE: finalize ? '1' : '0',
					OUTPUT_ROOT: outputRoot,
					SCREENSHOT: screenshot,
					TEST_ID: selectedTest.id,
					VIEWPORT: selectedTest.parent.project().name.slice('browser-'.length),
					COMPLETE_TEST: completed ? '1' : '0',
				},
			});
		};

		const mobile = makeTest('mobile-test-id', 'mobile');
		const desktop = makeTest('desktop-test-id', 'xl');
		await runProcess(mobile);
		let marker = JSON.parse(await fs.readFile(path.join(evidenceDirectory, '.terra-playwright-run.json'), 'utf8'));
		assert.deepEqual([marker.expectedTestCount, marker.completedTestCount, marker.collectionFinished], [1, 1, false]);
		assert.ok((await latestArtifacts()).includes('report.xlsx'));
		assert.ok(!(await latestArtifacts()).includes('report.pptx'), 'intermediate viewport process does not build a deck');

		// The desktop subprocess starts but is interrupted. It must add its expected ID without replacing the mobile result.
		await runProcess(desktop, { completed: false });
		marker = JSON.parse(await fs.readFile(path.join(evidenceDirectory, '.terra-playwright-run.json'), 'utf8'));
		assert.deepEqual([marker.expectedTestCount, marker.completedTestCount, marker.collectionFinished], [2, 1, false]);
		assert.deepEqual(marker.expectedTestIds, ['desktop-test-id', 'mobile-test-id']);
		assert.deepEqual(marker.completedTestIds, ['mobile-test-id']);
		assert.equal(readScreenshotCapturesFromDirectory(evidenceDirectory).length, 1, 'the partial folder still rebuilds from its completed capture');

		// Restarting the same viewport under the same logical ID completes the matrix without recounting prior tests.
		await runProcess(desktop, { finalize: true });
		marker = JSON.parse(await fs.readFile(path.join(evidenceDirectory, '.terra-playwright-run.json'), 'utf8'));
		assert.deepEqual([marker.expectedTestCount, marker.completedTestCount, marker.collectionFinished], [2, 2, true]);
		assert.ok((await latestArtifacts()).includes('report.xlsx'));
		assert.ok((await latestArtifacts()).includes('report.pptx'), 'final viewport process builds the accumulated deck');
		const captures = readScreenshotCapturesFromDirectory(evidenceDirectory);
		assert.deepEqual(captures.map(({ viewport, runId: captureRunId, historical }) => [viewport, captureRunId, historical]).sort(), [
			['mobile', runId, false],
			['xl', runId, false],
		]);

		// Repeating an already counted subsection is idempotent for expected/executed totals.
		await runProcess(mobile, { finalize: true });
		marker = JSON.parse(await fs.readFile(path.join(evidenceDirectory, '.terra-playwright-run.json'), 'utf8'));
		assert.deepEqual([marker.expectedTestCount, marker.completedTestCount, marker.collectionFinished], [2, 2, true]);

		// A later subset run gets a bounded deck while the directory can still rebuild accumulated evidence.
		const subsetRunId = `subset-${path.basename(root)}`;
		await runProcess(mobile, { finalize: true, selectedRunId: subsetRunId });
		const subsetArtifacts = await latestArtifacts();
		assert.ok(subsetArtifacts.includes('report.pptx'));
		const runDirectories = (await fs.readdir(outputRoot, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory() && entry.name !== 'screenshots')
			.map((entry) => entry.name)
			.sort();
		const subsetDeck = path.join(outputRoot, runDirectories.at(-1), 'report.pptx');
		const { stdout: subsetSlide } = await execFileAsync('unzip', ['-p', subsetDeck, 'ppt/slides/slide1.xml']);
		assert.equal((subsetSlide.match(/<p:pic>/g) || []).length, 1);
		assert.match(subsetSlide, /CURRENT RUN/);
		assert.doesNotMatch(subsetSlide, /HISTORICAL CAPTURE/);
		const accumulatedDeck = path.join(root, 'accumulated.pptx');
		await writeScreenshotSlideshowFromDirectory(evidenceDirectory, accumulatedDeck);
		const { stdout: accumulatedArchive } = await execFileAsync('unzip', ['-l', accumulatedDeck]);
		assert.match(accumulatedArchive, /ppt\/slides\/slide2\.xml/);
		const { stdout: accumulatedCurrent } = await execFileAsync('unzip', ['-p', accumulatedDeck, 'ppt/slides/slide1.xml']);
		const { stdout: accumulatedHistorical } = await execFileAsync('unzip', ['-p', accumulatedDeck, 'ppt/slides/slide2.xml']);
		assert.match(accumulatedCurrent, /CURRENT RUN/);
		assert.match(accumulatedHistorical, /HISTORICAL CAPTURE/);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
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

/* Ensures keyed viewport captures produce screenshot-backed PowerPoint slides. */
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
		assert.match(slide, /CURRENT RUN/);
		assert.doesNotMatch(slide, /mobile|desktop|Load timing/);
		const { stdout: archive } = await execFileAsync('unzip', ['-l', slideshow]);
		assert.doesNotMatch(archive, /ppt\/slides\/slide2\.xml/);
		const reporter = new ProgressReporter({ outputRoot: path.join(root, 'reporter'), screenshotOnlySlideshow: true, loadTesting: { enabled: false } });
		const reporterTests = viewports.map(([viewport]) => ({
			id: `test-${viewport}`,
			location: { file: path.join(root, 'routes.spec.ts') },
			title: 'captures route screenshots',
			titlePath: () => ['routes.spec.ts', 'captures route screenshots'],
			parent: { project: () => ({ name: `root-routes-${viewport}` }) },
		}));
		reporter.onBegin({}, { allTests: () => reporterTests });
		for (const [viewport] of viewports) {
			const captureName = 'visual-capture-00001';
			reporter.onTestEnd(
				reporterTests.find(({ id }) => id === `test-${viewport}`),
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
		assert.match(reporterSlide, /CURRENT RUN/);
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
	const reporter = new ProgressReporter({ outputRoot: path.join(root, 'enforced'), loadTesting: { defaultBudget: { warnMs: 1000, failMs: 2000 } }, screenshotOnlySlideshow: false });
	const testCase = {
		id: 'slow-test',
		location: { file: path.join(root, 'tests', 'slow.spec.ts') },
		title: 'takes too long',
		titlePath: () => ['slow.spec.ts', 'takes too long'],
		parent: { project: () => ({ name: 'root-example' }) },
	};
	reporter.onTestEnd(testCase, { attachments: [], duration: 2501, error: undefined, retry: 0, status: 'passed' });
	assert.equal(await reporter.onEnd(), 'failed');
	const warningOnly = new ProgressReporter({ outputRoot: path.join(root, 'warning-only'), loadTesting: { defaultBudget: { warnMs: 1000, failMs: 3000 } }, screenshotOnlySlideshow: false });
	warningOnly.onTestEnd(testCase, { attachments: [], duration: 2501, error: undefined, retry: 0, status: 'passed' });
	assert.equal(await warningOnly.onEnd(), undefined);
	const testOverride = new ProgressReporter({ outputRoot: path.join(root, 'test-override'), loadTesting: { defaultBudget: { warnMs: 1000, failMs: 2000 } }, screenshotOnlySlideshow: false });
	testOverride.onTestEnd(testCase, {
		attachments: [{ name: 'load-testing', contentType: 'application/json', body: Buffer.from(JSON.stringify({ testBudget: { failMs: 3000 }, measurements: [] })) }],
		duration: 2501,
		error: undefined,
		retry: 0,
		status: 'passed',
	});
	assert.equal(await testOverride.onEnd(), undefined);
	const optedOut = new ProgressReporter({ outputRoot: path.join(root, 'opted-out'), loadTesting: { enabled: false }, screenshotOnlySlideshow: false });
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
