#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { buildGitHubReport } from './lib/github-report.js';
import { createHistoryReport, writeHistoryReport } from './lib/history-report.js';
import { loadQualityConfig } from '@terra-symposium/standards-quality-core';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
	process.stdout.write('Usage: terra-quality-reports <github|history> [--config PATH] [--all] [--warn] [--report-json PATH]\n');
	process.exit(0);
}
const configIndex = args.indexOf('--config');
const cfg = loadQualityConfig(configIndex >= 0 ? args[configIndex + 1] : undefined);
const cmd = args.find(a => a === 'github' || a === 'history');
if (configIndex >= 0 && !args[configIndex + 1]) throw new Error('--config requires a path.');
if (cmd === 'github') process.stdout.write(`${JSON.stringify(buildGitHubReport(cfg.github?.repositories ?? [], cfg.github?.requiredFeatures ?? []), null, 2)}\n`);
else if (cmd === 'history') {
	const reportIndex = args.indexOf('--report-json');
	if (reportIndex >= 0 && !args[reportIndex + 1]) throw new Error('--report-json requires a path.');
	const path = reportIndex >= 0 ? args[reportIndex + 1] : 'terra-history.json';
	const report = reportIndex >= 0 ? writeHistoryReport(cfg.root, path) : createHistoryReport(cfg.root);
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
	process.stderr.write('Usage: terra-quality-reports <github|history> [--config PATH] [--all] [--warn] [--report-json PATH]\n');
	process.exitCode = 2;
}
