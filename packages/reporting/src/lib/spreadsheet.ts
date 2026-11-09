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
 * Applies the timing grade label and matching color treatment to a cell.
 *
 * @param cell Worksheet cell to update.
 * @param grade Timing grade to display.
 *
 * @return Nothing; the cell is mutated in place.
 */
const styleLoadGrade = (cell: ExcelJS.Cell, grade: string): void => {
	const style = LOAD_STYLES[grade] || LOAD_STYLES.fail;
	cell.value = grade;
	cell.fill = { fgColor: { argb: style.fill }, pattern: 'solid', type: 'pattern' };
	cell.font = { bold: true, color: { argb: style.font } };
	cell.alignment = { horizontal: 'center', vertical: 'middle' };
};
/**
 * Chooses the highest severity grade present in a visual result's measurements.
 *
 * @param val Visual result whose load measurements are summarized.
 *
 * @return `fail`, `warning`, `pass`, or an empty string when no measurements exist.
 */
const resultLoadGrade = (val: VisualResult): string => {
	const counts = loadGradeCounts(val.loadMeasurements || []);
	return counts.fail ? 'fail' : counts.warning ? 'warning' : counts.pass ? 'pass' : '';
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
	const summarySheet = book.addWorksheet('Summary');
	summarySheet.addRow(['File', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total', ...(loadEnabled ? ['Load passes', 'Load warnings', 'Load failures'] : [])]);
	for (const fileName of orderedFiles(run)) {
		const fileResults = resultsForFile(run, fileName);
		const counts = statusCounts(fileResults);
		const loadCounts = loadGradeCounts(fileResults.flatMap((result) => result.loadMeasurements || []));
		summarySheet.addRow([
			fileName,
			...VISUAL_STATUSES.map((status) => counts[status]),
			VISUAL_STATUSES.reduce((total, status) => total + counts[status], 0),
			...(loadEnabled ? [loadCounts.pass, loadCounts.warning, loadCounts.fail] : []),
		]);
	}
	styleHeader(summarySheet);
	summarySheet.columns = [{ width: 32 }, ...Array.from({ length: loadEnabled ? 9 : 6 }, () => ({ width: 14 }))];
	for (const fileName of orderedFiles(run)) {
		const base =
			[...fileName]
				.map((character) => ('\\/:*?[]'.includes(character) ? '_' : character))
				.join('')
				.replace(/^'+|'+$/g, '')
				.slice(0, 31) || 'Results';
		let sheetName = base;
		for (let suffix = 2; [...book.worksheets.map((sheet) => sheet.name.toLowerCase()), 'summary', 'projects', 'run diagnostics'].includes(sheetName.toLowerCase()); suffix++) {
			const label = ` (${suffix})`;
			sheetName = `${base.slice(0, 31 - label.length)}${label}`;
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
			statusCell.fill = { fgColor: { argb: statusStyle.fill }, pattern: 'solid', type: 'pattern' };
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
			const size = { height: Math.round(height * scale), width: Math.round(width * scale) };
			row.height = Math.ceil(size.height * 0.75) + 6;
			sheet.addImage(book.addImage({ buffer: img as unknown as ExcelJS.Image['buffer'], extension: 'png' }), { editAs: 'oneCell', ext: size, tl: { col: loadEnabled ? 12 : 11, row: row.number - 1 } });
		}
	}
	if (loadEnabled) {
		const loadSheet = book.addWorksheet('Load timings');
		loadSheet.addRow(['File', 'Test title', 'Project', 'Viewport', 'Kind', 'Measurement', 'Duration (ms)', 'Warn at (ms)', 'Fail at (ms)', 'Grade']);
		for (const result of run.results) {
			for (const measurement of result.loadMeasurements || []) {
				const row = loadSheet.addRow([
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
		loadSheet.columns = [{ width: 32 }, { width: 42 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }];
		styleHeader(loadSheet);
	}
	const projectsSheet = book.addWorksheet('Projects');
	projectsSheet.addRow(['Project', 'Configured files', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total']);
	for (const project of run.projects) {
		const counts = statusCounts(run.results.filter((result) => result.project === project.name));
		projectsSheet.addRow([project.name, project.configuredFiles.join(', '), ...VISUAL_STATUSES.map((status) => counts[status]), VISUAL_STATUSES.reduce((total, status) => total + counts[status], 0)]);
	}
	projectsSheet.columns = [{ width: 30 }, { width: 48 }, ...Array.from({ length: 6 }, () => ({ width: 14 }))];
	styleHeader(projectsSheet);
	for (const row of projectsSheet.getRows(2, projectsSheet.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	const diagnosticsSheet = book.addWorksheet('Run diagnostics');
	diagnosticsSheet.addRow(['Source', 'Message']);
	for (const diagnostic of run.runDiagnostics) diagnosticsSheet.addRow(['Terminal', diagnostic]);
	if (!run.runDiagnostics.length) diagnosticsSheet.addRow(['Run', 'No run-level diagnostics captured.']);
	diagnosticsSheet.columns = [{ width: 18 }, { width: 120 }];
	styleHeader(diagnosticsSheet);
	for (const row of diagnosticsSheet.getRows(2, diagnosticsSheet.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	book.views = [{ x: 0, y: 0, width: 19200, height: 10800, visibility: 'visible', activeTab: 0, firstSheet: 0 }];
	await book.xlsx.writeFile(file);
	await neutralizeApplicationMetadata(file);
};
