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

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

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
	sheet.getRow(1).fill = {
		fgColor: { argb: 'FF1F4E78' },
		pattern: 'solid',
		type: 'pattern',
	};
	sheet.getRow(1).alignment = { vertical: 'middle' };
	sheet.getRow(1).height = 22;
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
	cell.fill = {
		fgColor: { argb: style.fill },
		pattern: 'solid',
		type: 'pattern',
	};
	cell.font = { bold: true, color: { argb: style.font } };
	cell.alignment = { horizontal: 'center', vertical: 'middle' };
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
	const summary = book.addWorksheet('Summary');
	summary.addRow(['File', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total', ...(loadEnabled ? ['Load passes', 'Load warnings', 'Load failures'] : [])]);
	for (const file of orderedFiles(run)) {
		const vals = resultsForFile(run, file);
		const counts = statusCounts(vals);
		const loadCounts = loadGradeCounts(vals.flatMap((r) => r.loadMeasurements || []));
		summary.addRow([
			file,
			...VISUAL_STATUSES.map((s) => counts[s]),
			VISUAL_STATUSES.reduce((t, s) => t + counts[s], 0),
			...(loadEnabled ? [loadCounts.pass, loadCounts.warning, loadCounts.fail] : []),
		]);
	}
	styleHeader(summary);
	summary.columns = [{ width: 32 }, ...Array.from({ length: loadEnabled ? 9 : 6 }, () => ({ width: 14 }))];
	for (const fileName of orderedFiles(run)) {
		const base =
			[...fileName]
				.map((c) => ('\\/:*?[]'.includes(c) ? '_' : c))
				.join('')
				.replace(/^'+|'+$/g, '')
				.slice(0, 31) || 'Results';
		let sheetName = base;
		for (let suffix = 2; [...book.worksheets.map((s) => s.name.toLowerCase()), 'summary', 'projects', 'run diagnostics'].includes(sheetName.toLowerCase()); suffix++) {
			sheetName = `${base.slice(0, 31 - ` (${suffix})`.length)} (${suffix})`;
		}
		const sheet = book.addWorksheet(sheetName);
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
		for (const val of resultsForFile(run, fileName)) {
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
			const statusCell = row.getCell(6);
			const statusStyle = STATUS_STYLES[val.status] || STATUS_STYLES.failed;
			statusCell.value = statusLabel(val.status);
			statusCell.fill = {
				fgColor: { argb: statusStyle.fill },
				pattern: 'solid',
				type: 'pattern',
			};
			statusCell.font = { bold: true, color: { argb: statusStyle.font } };
			statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
			statusCell.border = {
				bottom: { color: { argb: statusStyle.font }, style: 'thin' },
				left: { color: { argb: statusStyle.font }, style: 'thin' },
				right: { color: { argb: statusStyle.font }, style: 'thin' },
				top: { color: { argb: statusStyle.font }, style: 'thin' },
			};
			if (loadEnabled && resultLoadGrade(val)) styleLoadGrade(row.getCell(7), resultLoadGrade(val));
			if (val.browserErrors) row.getCell(loadEnabled ? 11 : 10).note = val.browserErrors;
			if (val.terminalErrors) row.getCell(loadEnabled ? 12 : 11).note = val.terminalErrors;
			if (!val.screenshot || !fs.existsSync(val.screenshot)) continue;
			const img = fs.readFileSync(val.screenshot);
			const width = img.readUInt32BE(16);
			const height = img.readUInt32BE(20);
			const scale = Math.min(180 / width, 135 / height);
			const size = {
				height: Math.round(height * scale),
				width: Math.round(width * scale),
			};
			row.height = Math.ceil(size.height * 0.75) + 6;
			sheet.addImage(
				book.addImage({
					buffer: img as unknown as ExcelJS.Image['buffer'],
					extension: 'png',
				}),
				{
					editAs: 'oneCell',
					ext: size,
					tl: { col: loadEnabled ? 12 : 11, row: row.number - 1 },
				},
			);
		}
	}
	if (loadEnabled) {
		const timings = book.addWorksheet('Load timings');
		timings.addRow(['File', 'Test title', 'Project', 'Viewport', 'Kind', 'Measurement', 'Duration (ms)', 'Warn at (ms)', 'Fail at (ms)', 'Grade']);
		for (const result of run.results) {
			for (const measurement of result.loadMeasurements || []) {
				const row = timings.addRow([
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
		timings.columns = [{ width: 32 }, { width: 42 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }];
		styleHeader(timings);
	}
	const projects = book.addWorksheet('Projects');
	projects.addRow(['Project', 'Configured files', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total']);
	for (const project of run.projects) {
		const counts = statusCounts(run.results.filter((r) => r.project === project.name));
		projects.addRow([project.name, project.configuredFiles.join(', '), ...VISUAL_STATUSES.map((s) => counts[s]), VISUAL_STATUSES.reduce((t, s) => t + counts[s], 0)]);
	}
	projects.columns = [{ width: 30 }, { width: 48 }, ...Array.from({ length: 6 }, () => ({ width: 14 }))];
	styleHeader(projects);
	for (const row of projects.getRows(2, projects.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	const diagnostics = book.addWorksheet('Run diagnostics');
	diagnostics.addRow(['Source', 'Message']);
	for (const val of run.runDiagnostics) diagnostics.addRow(['Terminal', val]);
	if (!run.runDiagnostics.length) diagnostics.addRow(['Run', 'No run-level diagnostics captured.']);
	diagnostics.columns = [{ width: 18 }, { width: 120 }];
	styleHeader(diagnostics);
	for (const row of diagnostics.getRows(2, diagnostics.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	book.views = [
		{
			x: 0,
			y: 0,
			width: 19200,
			height: 10800,
			visibility: 'visible',
			activeTab: 0,
			firstSheet: 0,
		},
	];
	await book.xlsx.writeFile(file);
	await neutralizeApplicationMetadata(file);
};
/** A report workbook and its repository label for an aggregate evidence workbook. */
export type SpreadsheetSource = { label: string; file: string };

// AGGREGATE WORKBOOK
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
		} else if (header.length !== summaryHeader.length - 1 || header.some((value, i) => value !== summaryHeader?.[i + 1])) {
			throw new Error(`Reporting workbook Summary columns do not match the aggregate contract: ${sourceFile}`);
		}
		for (let rowNumber = 2; rowNumber <= sourceSummary.rowCount; rowNumber++) {
			const row = sourceSummary.getRow(rowNumber);
			if (!row.hasValues) continue;
			summary.addRow([label, ...valuesForRow(row)]);
			row.eachCell({ includeEmpty: true }, (sourceCell, colNumber) => {
				summary.getRow(summary.rowCount).getCell(colNumber + 1).style = structuredClone(sourceCell.style);
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
			for (let suffix = 2; usedSheetNames.has(sheetName.toLowerCase()); suffix++) {
				sheetName = `${base.slice(0, 31 - ` (${suffix})`.length)} (${suffix})`;
			}
			usedSheetNames.add(sheetName.toLowerCase());
			const targetSheet = aggregate.addWorksheet(sheetName);
			targetSheet.properties = structuredClone(sourceSheet.properties);
			targetSheet.views = structuredClone(sourceSheet.views);
			targetSheet.pageSetup = structuredClone(sourceSheet.pageSetup);
			targetSheet.headerFooter = structuredClone(sourceSheet.headerFooter);
			targetSheet.state = sourceSheet.state;
			targetSheet.columns = sourceSheet.columns.map((col) => ({
				width: col.width,
				hidden: col.hidden,
				outlineLevel: col.outlineLevel,
				style: structuredClone(col.style),
				header: structuredClone(col.header),
				key: col.key,
			}));
			sourceSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
				const targetRow = targetSheet.getRow(rowNumber);
				targetRow.height = row.height;
				targetRow.hidden = row.hidden;
				targetRow.outlineLevel = row.outlineLevel;
				row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
					const targetCell = targetRow.getCell(colNumber);
					targetCell.value = structuredClone(cell.value);
					targetCell.style = structuredClone(cell.style);
					if (cell.note) targetCell.note = structuredClone(cell.note);
					if (cell.dataValidation) targetCell.dataValidation = structuredClone(cell.dataValidation);
				});
			});
			for (const range of sourceSheet.model.merges || []) targetSheet.mergeCells(range);
			for (const image of sourceSheet.getImages()) targetSheet.addImage(aggregate.addImage(sourceBook.getImage(Number(image.imageId))), structuredClone(image.range));
		}
	}
	if (!summaryHeader) throw new Error('No summary rows were available in the Reporting workbooks.');
	summary.columns = [{ width: 18 }, ...summaryHeader.slice(1).map(() => ({ width: 18 }))];
	summary.views = [{ showGridLines: false, state: 'frozen', ySplit: 1 }];
	summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
	summary.getRow(1).fill = {
		fgColor: { argb: 'FF1F4E78' },
		pattern: 'solid',
		type: 'pattern',
	};
	for (const row of summary.getRows(2, summary.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	aggregate.views = [
		{
			x: 0,
			y: 0,
			width: 19200,
			height: 10800,
			visibility: 'visible',
			activeTab: 0,
			firstSheet: 0,
		},
	];
	await aggregate.xlsx.writeFile(file);
	await neutralizeApplicationMetadata(file);
};
