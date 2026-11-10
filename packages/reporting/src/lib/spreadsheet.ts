/**
 * packages/reporting/src/lib/spreadsheet.ts
 * Spreadsheet evidence writer for Playwright test runs.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import { diagnosticCount, orderedFiles, resultsForFile, statusCounts, statusLabel } from './core.js';
import { loadGradeCounts } from './load-testing.js';
import { neutralizeApplicationMetadata } from './metadata.js';

// COMPONENTS
import ExcelJS from 'exceljs';

// DATA
import { VISUAL_STATUSES } from './core.js';

// TYPES
import type { ReportRun, VisualResult } from './core.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// STATUS AND TIMING STYLES
const STATUS_STYLES: Record<string, { fill: string; font: string }> = {
	passed: { fill: 'FFDCEFE0', font: 'FF166534' },
	failed: { fill: 'FFFEE2E2', font: 'FF991B1B' },
	timedOut: { fill: 'FFFEE2E2', font: 'FF991B1B' },
	interrupted: { fill: 'FFFEE2E2', font: 'FF991B1B' },
	skipped: { fill: 'FFFEF3C7', font: 'FF92400E' },
};
const LOAD_STYLES: Record<string, { fill: string; font: string }> = {
	pass: { fill: 'FFDCEFE0', font: 'FF166534' },
	warning: { fill: 'FFFEF3C7', font: 'FF92400E' },
	fail: { fill: 'FFFEE2E2', font: 'FF991B1B' },
};

// CELL FORMATTING
/**
 * Applies the shared header layout to a worksheet.
 *
 * @param sheet Worksheet whose header and columns should be styled.
 *
 * @return Nothing; the worksheet is mutated in place.
 */
const styleHeader = (sheet: ExcelJS.Worksheet): void => {
	sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 1 }];
	sheet.columns = [{ width: 18 }, { width: 24 }, { width: 42 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 28 }, { width: 14 }, { width: 14 }, { width: 18 }];
	sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
	sheet.getRow(1).fill = { fgColor: { argb: 'FF1F4E78' }, pattern: 'solid', type: 'pattern' };
	sheet.getRow(1).alignment = { vertical: 'middle' };
	sheet.getRow(1).height = 22;
};
/**
 * Applies the status label and its semantic color treatment to a cell.
 *
 * @param cell Cell that will display the status.
 * @param status Normalized status key used to select the style.
 *
 * @return Nothing; the cell is mutated in place.
 */
const styleStatus = (cell: ExcelJS.Cell, status: string): void => {
	const style = STATUS_STYLES[status] || STATUS_STYLES.failed;
	cell.value = statusLabel(status as VisualResult['status']);
	cell.fill = { fgColor: { argb: style.fill }, pattern: 'solid', type: 'pattern' };
	cell.font = { bold: true, color: { argb: style.font } };
	cell.alignment = { horizontal: 'center', vertical: 'middle' };
	cell.border = {
		bottom: { color: { argb: style.font }, style: 'thin' },
		left: { color: { argb: style.font }, style: 'thin' },
		right: { color: { argb: style.font }, style: 'thin' },
		top: { color: { argb: style.font }, style: 'thin' },
	};
};
/**
 * Applies a timing grade and its semantic color treatment to a cell.
 *
 * @param cell Cell that will display the timing grade.
 * @param grade Grade key used to select the timing color treatment.
 */
const styleLoadGrade = (cell: ExcelJS.Cell, grade: string): void => {
	const style = LOAD_STYLES[grade] || LOAD_STYLES.fail;
	cell.value = grade;
	cell.fill = { fgColor: { argb: style.fill }, pattern: 'solid', type: 'pattern' };
	cell.font = { bold: true, color: { argb: style.font } };
	cell.alignment = { horizontal: 'center', vertical: 'middle' };
};
/**
 * Produces a worksheet-safe name unique within the workbook for a feature file.
 *
 * @param book Workbook whose existing worksheet names must be avoided.
 * @param src Feature-file path or label to convert into a worksheet name.
 *
 * @return A sanitized name of at most 31 characters, with a numeric suffix when needed to avoid collisions.
 */
const resultSheetName = (book: ExcelJS.Workbook, src: string): string => {
	const base =
		[...src]
			.map((c) => ('\\/:*?[]'.includes(c) ? '_' : c))
			.join('')
			.replace(/^'+|'+$/g, '')
			.slice(0, 31) || 'Results';
	const reserved = new Set(['summary', 'projects', 'run diagnostics']);
	const used = new Set([...book.worksheets.map((s) => s.name.toLowerCase()), ...reserved]);
	let name = base;
	let suffix = 2;
	while (used.has(name.toLowerCase())) {
		const label = ` (${suffix++})`;
		name = `${base.slice(0, 31 - label.length)}${label}`;
	}
	return name;
};
/**
 * Reads the populated cell values in worksheet order, including empty positions within the row.
 *
 * @param row Worksheet row whose values are copied into the aggregate summary.
 *
 * @return Cell values from the first column through the row's last populated cell.
 */
const valuesForRow = (row: ExcelJS.Row): (ExcelJS.CellValue | null)[] => Array.from({ length: row.cellCount }, (_, i) => row.getCell(i + 1).value);
/**
 * Chooses the worst timing grade recorded for one test result.
 *
 * @param val Result whose timing measurements contribute to the displayed grade.
 *
 * @return `fail`, `warning`, `pass`, or an empty string when the result has no timing samples.
 */
const resultLoadGrade = (val: VisualResult): string => {
	const counts = loadGradeCounts(val.loadMeasurements || []);
	return counts.fail ? 'fail' : counts.warning ? 'warning' : counts.pass ? 'pass' : '';
};

// RESULT WORKSHEETS
/**
 * Adds a feature-file worksheet with result rows and any available screenshot evidence.
 *
 * @param book Workbook receiving the worksheet and embedded images.
 * @param name Feature-file label used to derive the worksheet name.
 * @param vals Normalized results belonging to that feature file.
 * @param loadEnabled Whether the result rows include load-grade values.
 */
const addResultSheet = (book: ExcelJS.Workbook, name: string, vals: readonly VisualResult[], loadEnabled: boolean): void => {
	const sheet = book.addWorksheet(resultSheetName(book, name));
	sheet.addRow([
		'Project',
		'Groups',
		'Test title',
		'Viewport',
		'Viewport size',
		'Status',
		...(loadEnabled ? ['Load grade'] : []),
		'Duration (ms)',
		'Retries',
		'Error',
		'Browser errors',
		'Terminal errors',
		'Evidence',
	]);
	styleHeader(sheet);
	if (loadEnabled)
		sheet.columns = [
			{ width: 18 },
			{ width: 24 },
			{ width: 42 },
			{ width: 12 },
			{ width: 14 },
			{ width: 12 },
			{ width: 12 },
			{ width: 14 },
			{ width: 8 },
			{ width: 28 },
			{ width: 14 },
			{ width: 14 },
			{ width: 18 },
		];
	for (const val of vals) {
		const row = sheet.addRow([
			val.project,
			val.groups,
			val.title,
			val.viewport,
			val.viewportSize,
			statusLabel(val.status),
			...(loadEnabled ? [resultLoadGrade(val)] : []),
			val.duration,
			val.retry,
			val.error,
			diagnosticCount(val.browserErrors),
			diagnosticCount(val.terminalErrors),
			val.visual === 'Embedded' ? '' : val.visual,
		]);
		row.alignment = { vertical: 'top' };
		row.getCell(loadEnabled ? 8 : 7).numFmt = '0';
		row.getCell(loadEnabled ? 9 : 8).numFmt = '0';
		styleStatus(row.getCell(6), val.status);
		if (loadEnabled && resultLoadGrade(val)) styleLoadGrade(row.getCell(7), resultLoadGrade(val));
		if (val.browserErrors) row.getCell(loadEnabled ? 11 : 10).note = val.browserErrors;
		if (val.terminalErrors) row.getCell(loadEnabled ? 12 : 11).note = val.terminalErrors;
		if (!val.screenshot || !fs.existsSync(val.screenshot)) continue;
		const img = fs.readFileSync(val.screenshot);
		const width = img.readUInt32BE(16);
		const height = img.readUInt32BE(20);
		const scale = Math.min(180 / width, 135 / height);
		const size = { height: Math.round(height * scale), width: Math.round(width * scale) };
		row.height = Math.ceil(size.height * 0.75) + 6;
		sheet.addImage(book.addImage({ buffer: img as unknown as ExcelJS.Image['buffer'], extension: 'png' }), { editAs: 'oneCell', ext: size, tl: { col: loadEnabled ? 12 : 11, row: row.number - 1 } });
	}
};
/**
 * Adds the file-level status summary for the run.
 *
 * @param book Workbook receiving the summary sheet.
 * @param run Normalized report run to summarize.
 * @param loadEnabled Whether load-grade totals are included in the summary columns.
 *
 * @return Nothing; the workbook is mutated in place.
 */
const addSummary = (book: ExcelJS.Workbook, run: ReportRun, loadEnabled: boolean): void => {
	const sheet = book.addWorksheet('Summary');
	sheet.addRow(['File', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total', ...(loadEnabled ? ['Load passes', 'Load warnings', 'Load failures'] : [])]);
	for (const file of orderedFiles(run)) {
		const vals = resultsForFile(run, file);
		const counts = statusCounts(vals);
		const loadCounts = loadGradeCounts(vals.flatMap((r) => r.loadMeasurements || []));
		sheet.addRow([file, ...VISUAL_STATUSES.map((s) => counts[s]), VISUAL_STATUSES.reduce((t, s) => t + counts[s], 0), ...(loadEnabled ? [loadCounts.pass, loadCounts.warning, loadCounts.fail] : [])]);
	}
	styleHeader(sheet);
	sheet.columns = [{ width: 32 }, ...Array.from({ length: loadEnabled ? 9 : 6 }, () => ({ width: 14 }))];
};
/**
 * Adds a row for every timed test, page navigation, and named operation.
 *
 * @param book Workbook receiving the timing sheet.
 * @param results Results whose attached measurements are listed as rows.
 */
const addLoadTimings = (book: ExcelJS.Workbook, results: readonly VisualResult[]): void => {
	const sheet = book.addWorksheet('Load timings');
	sheet.addRow(['File', 'Test title', 'Project', 'Viewport', 'Kind', 'Measurement', 'Duration (ms)', 'Warn at (ms)', 'Fail at (ms)', 'Grade']);
	for (const result of results) {
		for (const measurement of result.loadMeasurements || []) {
			const row = sheet.addRow([
				result.file,
				result.title,
				result.project,
				result.viewport,
				measurement.kind,
				measurement.name,
				measurement.durationMs,
				measurement.budget.warnMs,
				measurement.budget.failMs,
				measurement.grade,
			]);
			row.getCell(7).numFmt = '0.0';
			row.getCell(8).numFmt = '0';
			row.getCell(9).numFmt = '0';
			styleLoadGrade(row.getCell(10), measurement.grade);
			row.alignment = { vertical: 'top' };
		}
	}
	sheet.columns = [{ width: 32 }, { width: 42 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }];
	styleHeader(sheet);
};
/**
 * Adds project configuration and status totals for the run.
 *
 * @param book Workbook receiving the project sheet.
 * @param run Normalized report run to summarize.
 *
 * @return Nothing; the workbook is mutated in place.
 */
const addProjects = (book: ExcelJS.Workbook, run: ReportRun): void => {
	const sheet = book.addWorksheet('Projects');
	sheet.addRow(['Project', 'Configured files', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total']);
	for (const project of run.projects) {
		const counts = statusCounts(run.results.filter((r) => r.project === project.name));
		sheet.addRow([project.name, project.configuredFiles.join(', '), ...VISUAL_STATUSES.map((s) => counts[s]), VISUAL_STATUSES.reduce((t, s) => t + counts[s], 0)]);
	}
	sheet.columns = [{ width: 30 }, { width: 48 }, ...Array.from({ length: 6 }, () => ({ width: 14 }))];
	styleHeader(sheet);
	for (const row of sheet.getRows(2, sheet.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
};
/**
 * Adds run-level terminal diagnostics, including an explicit empty-run row.
 *
 * @param book Workbook receiving the diagnostics sheet.
 * @param run Normalized report run whose diagnostics should be written.
 *
 * @return Nothing; the workbook is mutated in place.
 */
const addDiagnostics = (book: ExcelJS.Workbook, run: ReportRun): void => {
	const sheet = book.addWorksheet('Run diagnostics');
	sheet.addRow(['Source', 'Message']);
	for (const val of run.runDiagnostics) sheet.addRow(['Terminal', val]);
	if (!run.runDiagnostics.length) sheet.addRow(['Run', 'No run-level diagnostics captured.']);
	sheet.columns = [{ width: 18 }, { width: 120 }];
	styleHeader(sheet);
	for (const row of sheet.getRows(2, sheet.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
};
/**
 * Writes the neutral spreadsheet artifact for a normalized report run.
 *
 * @param file Output path for the spreadsheet artifact.
 * @param run Normalized results, project metadata, and diagnostics to write.
 *
 * @return A promise that resolves after the workbook has been written.
 */
export const writeSpreadsheet = async (file: string, run: ReportRun): Promise<void> => {
	const loadEnabled = run.loadTestingEnabled ?? run.results.some((r) => !!r.loadMeasurements?.length);
	const book = new ExcelJS.Workbook();
	book.creator = 'Test evidence reporter';
	book.lastModifiedBy = 'Test evidence reporter';
	book.title = 'Test evidence spreadsheet';
	book.subject = 'Test evidence and diagnostics';
	book.description = 'Spreadsheet evidence from an automated test run.';
	addSummary(book, run, loadEnabled);
	for (const fileName of orderedFiles(run)) addResultSheet(book, fileName, resultsForFile(run, fileName), loadEnabled);
	if (loadEnabled) addLoadTimings(book, run.results);
	addProjects(book, run);
	addDiagnostics(book, run);
	book.views = [{ x: 0, y: 0, width: 19200, height: 10800, visibility: 'visible', activeTab: 0, firstSheet: 0 }];
	await book.xlsx.writeFile(file);
	await neutralizeApplicationMetadata(file);
};
/** A report workbook and its repository label for an aggregate evidence workbook. */
export type SpreadsheetSource = { label: string; file: string };

// AGGREGATE WORKBOOK
/**
 * Copies tabular content, cell styling, merges, and embedded images into one named worksheet.
 *
 * @param source Worksheet whose cells, formatting, merges, and images are copied.
 * @param target Empty destination worksheet receiving the copied content.
 * @param sourceBook Workbook that owns image references in the source worksheet.
 * @param targetBook Workbook that receives cloned image references.
 */
const copyWorksheet = (source: ExcelJS.Worksheet, target: ExcelJS.Worksheet, sourceBook: ExcelJS.Workbook, targetBook: ExcelJS.Workbook): void => {
	target.properties = structuredClone(source.properties);
	target.views = structuredClone(source.views);
	target.pageSetup = structuredClone(source.pageSetup);
	target.headerFooter = structuredClone(source.headerFooter);
	target.state = source.state;
	target.columns = source.columns.map((c) => ({ width: c.width, hidden: c.hidden, outlineLevel: c.outlineLevel, style: structuredClone(c.style), header: structuredClone(c.header), key: c.key }));
	source.eachRow({ includeEmpty: true }, (r, v) => {
		const targetRow = target.getRow(v);
		targetRow.height = r.height;
		targetRow.hidden = r.hidden;
		targetRow.outlineLevel = r.outlineLevel;
		r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
			const targetCell = targetRow.getCell(colNumber);
			targetCell.value = structuredClone(cell.value);
			targetCell.style = structuredClone(cell.style);
			if (cell.note) targetCell.note = structuredClone(cell.note);
			if (cell.dataValidation) targetCell.dataValidation = structuredClone(cell.dataValidation);
		});
	});
	for (const range of source.model.merges || []) target.mergeCells(range);
	for (const { imageId: imgId, range } of source.getImages()) {
		const img = sourceBook.getImage(Number(imgId));
		target.addImage(targetBook.addImage(img), structuredClone(range));
	}
};
/**
 * Combines per-repository Reporting workbooks into an all-tests workbook.
 *
 * @param file Output path for the aggregate workbook.
 * @param sources Repository labels and source report.xlsx paths.
 *
 * @return A promise that resolves after summaries, detailed rows, and screenshot images are copied.
 */
export const mergeSpreadsheets = async (file: string, sources: readonly SpreadsheetSource[]): Promise<void> => {
	if (!sources.length) throw new Error('At least one Reporting workbook is required to create an aggregate spreadsheet.');
	const aggregate = new ExcelJS.Workbook();
	aggregate.creator = 'Test evidence reporter';
	aggregate.lastModifiedBy = 'Test evidence reporter';
	aggregate.title = 'Aggregate test evidence spreadsheet';
	aggregate.subject = 'Cross-repository Playwright results and screenshots';
	aggregate.description = 'Programmatically combined repository test evidence.';
	const summary = aggregate.addWorksheet('All tests');
	let summaryHeader: ExcelJS.CellValue[] | undefined;
	const usedSheetNames = new Set(['all tests']);
	for (const { label, file: sourceFile } of sources) {
		const sourceBook = new ExcelJS.Workbook();
		await sourceBook.xlsx.readFile(sourceFile);
		const sourceSummary = sourceBook.getWorksheet('Summary');
		if (!sourceSummary) throw new Error(`Reporting workbook has no Summary worksheet: ${sourceFile}`);
		const header = valuesForRow(sourceSummary.getRow(1)) as ExcelJS.CellValue[];
		if (!summaryHeader) {
			summaryHeader = ['Repository', ...header];
			summary.addRow(summaryHeader);
		} else if (header.length !== summaryHeader.length - 1 || header.some((v, i) => v !== summaryHeader?.[i + 1])) {
			throw new Error(`Reporting workbook Summary columns do not match the aggregate contract: ${sourceFile}`);
		}
		for (let rowNumber = 2; rowNumber <= sourceSummary.rowCount; rowNumber++) {
			const row = sourceSummary.getRow(rowNumber);
			if (!row.hasValues) continue;
			const aggregateRow = summary.addRow([label, ...valuesForRow(row)]);
			row.eachCell({ includeEmpty: true }, (s, c) => {
				aggregateRow.getCell(c + 1).style = structuredClone(s.style);
			});
		}
		for (const sourceSheet of sourceBook.worksheets) {
			if (sourceSheet.name === 'Summary') continue;
			const base =
				`${label} ${sourceSheet.name}`
					.replace(/[\\/*?:[\]]/gu, '_')
					.replace(/^'+|'+$/gu, '')
					.slice(0, 31) || 'Results';
			let sheetName = base;
			let suffix = 2;
			while (usedSheetNames.has(sheetName.toLowerCase())) {
				const postfix = ` (${suffix++})`;
				sheetName = `${base.slice(0, 31 - postfix.length)}${postfix}`;
			}
			usedSheetNames.add(sheetName.toLowerCase());
			copyWorksheet(sourceSheet, aggregate.addWorksheet(sheetName), sourceBook, aggregate);
		}
	}
	if (!summaryHeader) throw new Error('No summary rows were available in the Reporting workbooks.');
	summary.columns = [{ width: 18 }, ...summaryHeader.slice(1).map(() => ({ width: 18 }))];
	summary.views = [{ showGridLines: false, state: 'frozen', ySplit: 1 }];
	summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
	summary.getRow(1).fill = { fgColor: { argb: 'FF1F4E78' }, pattern: 'solid', type: 'pattern' };
	for (const row of summary.getRows(2, summary.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	aggregate.views = [{ x: 0, y: 0, width: 19200, height: 10800, visibility: 'visible', activeTab: 0, firstSheet: 0 }];
	await aggregate.xlsx.writeFile(file);
	await neutralizeApplicationMetadata(file);
};
