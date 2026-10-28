/**
 * packages/quality/src/lib/index.ts
 * Public API for the consolidated Terra quality package.
 */

export * from './collapse.js';
export * from './files.js';
export * from './history-report.js';
export * from './github-report.js';
export * from './imports.js';
export * from './inline-if.js';
export * from './language-profiles.js';
export * from './documentation.js';
export * from './naming.js';
export { qualityNodeReporter } from './node-reporter.js';
export * from './object-forwarding.js';
export * from './port.js';
export * from './runner.js';
export * from './single-use.js';
export * from './security.js';
export * from './accessibility.js';
export * from './display-name.js';
export * from './patterns.js';
export * from './ui-recommendations.js';
export { default as QualityPlaywrightReporter } from './playwright-reporter.js';
export type { QualityPlaywrightReporterOptions } from './playwright-reporter.js';
