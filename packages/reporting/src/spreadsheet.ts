/**
 * packages/reporting/src/spreadsheet.ts
 * Spreadsheet evidence writer for Playwright test runs.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import { diagnosticCount, orderedFiles, resultsForFile, statusCounts, statusLabel } from './core.js';
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
/**
 * Applies the shared header layout to a worksheet.
 *
 * @param sheet Worksheet whose header and columns should be styled.
 * @returns Nothing; the worksheet is mutated in place.
 */
const styleHeader = (sheet: ExcelJS.Worksheet): void => {
	sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 1 }];
	sheet.columns = [{ width: 18 }, { width: 24 }, { width: 42 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 28 }, { width: 14 }, { width: 14 }, { width: 18 }];
	sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
	sheet.getRow(1).fill = { fgColor: { argb: 'FF1F4E78' }, pattern: 'solid', type: 'pattern' };
	sheet.getRow(1).alignment = { vertical: 'middle' };
	sheet.getRow(1).height = 22;
};
/** Groups workbook operations that build the report's related sheets. */
class SpreadsheetWriter {
	private readonly book = new ExcelJS.Workbook();

	/** Applies the normalized label and matching semantic colors to a cell. */
	private styleStatus(cell: ExcelJS.Cell, status: string): void {
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
	}

	/** Adds one feature-file result sheet, including available screenshot evidence. */
	private addResultSheet(name: string, vals: readonly VisualResult[]): void {
		const sheet = this.book.addWorksheet(name);
		sheet.addRow(['Project', 'Groups', 'Test title', 'Viewport', 'Viewport size', 'Status', 'Duration (ms)', 'Retries', 'Error', 'Browser errors', 'Terminal errors', 'Evidence']);
		styleHeader(sheet);
		for (const val of vals) {
			const row = sheet.addRow([
				val.project,
				val.groups,
				val.title,
				val.viewport,
				val.viewportSize,
				statusLabel(val.status),
				val.duration,
				val.retry,
				val.error,
				diagnosticCount(val.browserErrors),
				diagnosticCount(val.terminalErrors),
				val.visual === 'Embedded' ? '' : val.visual,
			]);
			row.alignment = { vertical: 'top' };
			row.getCell(7).numFmt = '0';
			row.getCell(8).numFmt = '0';
			this.styleStatus(row.getCell(6), val.status);
			if (val.browserErrors) row.getCell(10).note = val.browserErrors;
			if (val.terminalErrors) row.getCell(11).note = val.terminalErrors;
			if (!val.screenshot || !fs.existsSync(val.screenshot)) continue;
			const img = fs.readFileSync(val.screenshot);
			const width = img.readUInt32BE(16);
			const height = img.readUInt32BE(20);
			const scale = Math.min(180 / width, 135 / height);
			const size = { height: Math.round(height * scale), width: Math.round(width * scale) };
			row.height = Math.ceil(size.height * 0.75) + 6;
			sheet.addImage(this.book.addImage({ buffer: img as unknown as ExcelJS.Image['buffer'], extension: 'png' }), { editAs: 'oneCell', ext: size, tl: { col: 11, row: row.number - 1 } });
		}
	}

	/** Adds the file-level status summary sheet. */
	private addSummary(run: ReportRun): void {
		const sheet = this.book.addWorksheet('Summary');
		sheet.addRow(['File', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total']);
		for (const file of orderedFiles(run)) {
			const counts = statusCounts(resultsForFile(run, file));
			sheet.addRow([file, ...VISUAL_STATUSES.map((s) => counts[s]), VISUAL_STATUSES.reduce((t, s) => t + counts[s], 0)]);
		}
		styleHeader(sheet);
		sheet.columns = [{ width: 32 }, ...Array.from({ length: 6 }, () => ({ width: 14 }))];
	}

	/** Adds project configuration and status totals. */
	private addProjects(run: ReportRun): void {
		const sheet = this.book.addWorksheet('Projects');
		sheet.addRow(['Project', 'Configured files', 'Passed', 'Failed', 'Timed out', 'Skipped', 'Interrupted', 'Total']);
		for (const project of run.projects) {
			const counts = statusCounts(run.results.filter((r) => r.project === project.name));
			sheet.addRow([project.name, project.configuredFiles.join(', '), ...VISUAL_STATUSES.map((s) => counts[s]), VISUAL_STATUSES.reduce((t, s) => t + counts[s], 0)]);
		}
		sheet.columns = [{ width: 30 }, { width: 48 }, ...Array.from({ length: 6 }, () => ({ width: 14 }))];
		styleHeader(sheet);
		for (const row of sheet.getRows(2, sheet.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	}

	/** Adds run-level terminal diagnostics or an explicit empty-run row. */
	private addDiagnostics(run: ReportRun): void {
		const sheet = this.book.addWorksheet('Run diagnostics');
		sheet.addRow(['Source', 'Message']);
		for (const val of run.runDiagnostics) sheet.addRow(['Terminal', val]);
		if (!run.runDiagnostics.length) sheet.addRow(['Run', 'No run-level diagnostics captured.']);
		sheet.columns = [{ width: 18 }, { width: 120 }];
		styleHeader(sheet);
		for (const row of sheet.getRows(2, sheet.rowCount) || []) row.alignment = { vertical: 'top', wrapText: true };
	}

	/** Writes the workbook, then neutralizes library-generated application metadata. */
	async write(file: string, run: ReportRun): Promise<void> {
		this.book.creator = 'Test evidence reporter';
		this.book.lastModifiedBy = 'Test evidence reporter';
		this.book.title = 'Test evidence spreadsheet';
		this.book.subject = 'Test evidence and diagnostics';
		this.book.description = 'Spreadsheet evidence from an automated test run.';
		this.addSummary(run);
		for (const fileName of orderedFiles(run)) this.addResultSheet(fileName, resultsForFile(run, fileName));
		this.addProjects(run);
		this.addDiagnostics(run);
		this.book.views = [{ x: 0, y: 0, width: 19200, height: 10800, visibility: 'visible', activeTab: 0, firstSheet: 0 }];
		await this.book.xlsx.writeFile(file);
		await neutralizeApplicationMetadata(file);
	}
}

/** Writes the neutral spreadsheet artifact for a normalized report run. */
export const writeSpreadsheet = (file: string, run: ReportRun): Promise<void> => new SpreadsheetWriter().write(file, run);
