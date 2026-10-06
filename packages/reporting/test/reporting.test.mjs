// packages/reporting/test/reporting.test.mjs

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const execFileAsync = promisify(execFile);

const { diagnosticCount, normalizeVisualStatus: normVisualStatus, orderedFiles, statusCounts } = await import('@terra-symposium/reporting/core');
const { parseDiagnostics, stripAnsi } = await import('@terra-symposium/reporting/playwright');
const { baseVisualProjectName, projectViewportName, resolveVisualViewports, visualProjectName, withResponsivePlaywright } = await import('@terra-symposium/reporting/viewports');
const { writeSpreadsheet } = await import('@terra-symposium/reporting/spreadsheet');
const { writeSlideshow } = await import('@terra-symposium/reporting/slideshow');

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Creates the smallest complete normalized result fixture for reporting tests. */
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

/** Covers status normalization, diagnostics, file ordering, and viewport aliases. */
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

/** Covers default viewport expansion, focused selection, and projects that must run once. */
test('expands regular Playwright projects and preserves single-run setup/capture projects', () => {
	const original = process.env.PW_VIEWPORTS;
	delete process.env.PW_VIEWPORTS;
	const defaultViewports = resolveVisualViewports();
	assert.deepEqual(defaultViewports.map(({ name: n }) => n), ['mobile', 'sm', 'md', 'lg', 'xl', '2xl']);
	if (original === undefined) delete process.env.PW_VIEWPORTS;
	else process.env.PW_VIEWPORTS = original;

	const cfg = withResponsivePlaywright({
		reporter: ['list'],
		projects: [
			{ name: 'browser', testMatch: '**/*.spec.ts', use: { baseURL: 'http://localhost' } },
			{ name: 'auth-setup', testMatch: '**/*.setup.ts' },
			{ name: 'app', dependencies: ['auth-setup'], testMatch: '**/app.spec.ts' },
			{ name: 'manual-capture', testMatch: '**/capture.ts' },
		],
	}, { singleRunProjects: ['manual-capture'] });
	assert.deepEqual(
		cfg.projects.map(({ name: n }) => n),
		['browser-mobile', 'browser-sm', 'browser-md', 'browser-lg', 'browser-xl', 'browser-2xl', 'auth-setup', 'app-mobile', 'app-sm', 'app-md', 'app-lg', 'app-xl', 'app-2xl', 'manual-capture'],
	);
	assert.equal(cfg.outputDir, 'test-results/playwright-output');
	assert.deepEqual(cfg.use.screenshot, { mode: 'on', fullPage: true, caret: 'initial' });
	assert.deepEqual(cfg.projects.find(({ name: n }) => n === 'app-mobile').dependencies, ['auth-setup']);
	assert.equal(cfg.projects.find(({ name: n }) => n === 'browser-mobile').use.viewport.width, 390);
	assert.ok(cfg.reporter.some((r) => Array.isArray(r) && r[0] === '@terra-symposium/reporting/playwright'));

	process.env.PW_VIEWPORTS = 'md,xl';
	assert.deepEqual(resolveVisualViewports().map(({ name: n }) => n), ['md', 'xl']);
	const focused = withResponsivePlaywright({ projects: [{ name: 'browser' }] });
	assert.deepEqual(focused.projects.map(({ name: n }) => n), ['browser-md', 'browser-xl']);
	if (original === undefined) delete process.env.PW_VIEWPORTS;
	else process.env.PW_VIEWPORTS = original;
});

/** Covers neutral spreadsheet/slideshow metadata, embedded evidence, and empty runs. */
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
		results: [
			result({ file: 'tests/actions/registry.test.mjs' }),
			result({ file: 'tests/actions/registry.test.mjs?' }),
		],
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
