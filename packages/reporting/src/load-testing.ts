/**
 * packages/reporting/src/load-testing.ts
 * Load timing configuration and grading helpers.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { LOAD_GRADES } from './core.js';

// TYPES
import type { LoadBudget, LoadBudgetOverride, LoadGrade, LoadMeasurement, LoadMeasurementInput, LoadTestingConfig } from './core.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Default warning and failure thresholds used when a repo does not override them. */
export const DEFAULT_LOAD_BUDGET: LoadBudget = { warnMs: 2000, failMs: 5000 };

/** Fully normalized load testing settings. */
export type NormalizedLoadTestingConfig = {
	enabled: boolean;
	defaultBudget: LoadBudget;
	testBudgets: Readonly<Record<string, LoadBudgetOverride>>;
	operationBudgets: Readonly<Record<string, LoadBudgetOverride>>;
	root?: string;
};

/** Optional inputs that have higher precedence than quality.json values. */
export type LoadTestingOverrides = LoadTestingConfig;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Validates one partial budget and returns a fresh object.
 * @param value Candidate budget from quality.json or test code.
 * @param label Location used in configuration errors.
 * @returns A validated partial budget.
 */
const budgetOverride = (value: unknown, label: string): LoadBudgetOverride => {
	if (!isRecord(value)) throw new Error(`${label} must be an object with optional warnMs and failMs numbers.`);
	const output: LoadBudgetOverride = {};
	for (const key of ['warnMs', 'failMs'] as const) {
		if (value[key] === undefined) continue;
		if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0) throw new Error(`${label}.${key} must be a finite non-negative number.`);
		output[key] = value[key];
	}
	return output;
};

/**
 * Validates and copies a partial budget supplied by a test helper.
 * @param value Candidate partial threshold override.
 * @returns A validated partial budget.
 */
export const validateLoadBudgetOverride = (value: LoadBudgetOverride): LoadBudgetOverride => {
	const result = budgetOverride(value, 'load budget override');
	if (result.warnMs !== undefined && result.failMs !== undefined && result.failMs <= result.warnMs) throw new Error('load budget override.failMs must be greater than warnMs.');
	return result;
};

/**
 * Validates a named budget map.
 * @param value Candidate map from configuration.
 * @param label Location used in configuration errors.
 * @returns A validated map keyed by test identity or measurement name.
 */
const budgetMap = (value: unknown, label: string): Record<string, LoadBudgetOverride> => {
	if (value === undefined) return {};
	if (!isRecord(value)) throw new Error(`${label} must be an object keyed by test identity or measurement name.`);
	return Object.fromEntries(Object.entries(value).map(([key, budget]) => [key, budgetOverride(budget, `${label}.${key}`)]));
};

/**
 * Checks that a complete budget has an ordered warning/failure boundary.
 * @param value Budget to validate.
 * @param label Location used in configuration errors.
 * @returns The validated budget.
 */
const completeBudget = (value: LoadBudget, label: string): LoadBudget => {
	if (value.failMs <= value.warnMs) throw new Error(`${label}.failMs must be greater than warnMs.`);
	return value;
};

/**
 * Normalizes raw settings and applies explicit options over quality.json settings.
 * @param raw Values read from quality.json.
 * @param overrides Explicit reporting options with higher precedence.
 * @returns Validated settings with defaults applied.
 */
export const normalizeLoadTestingConfig = (raw: LoadTestingConfig = {}, overrides: LoadTestingOverrides = {}): NormalizedLoadTestingConfig => {
	const rawDefault = budgetOverride(raw.defaultBudget ?? {}, 'loadTesting.defaultBudget');
	const optionDefault = budgetOverride(overrides.defaultBudget ?? {}, 'loadTesting options.defaultBudget');
	const defaultBudget = completeBudget(
		{
			failMs: optionDefault.failMs ?? rawDefault.failMs ?? DEFAULT_LOAD_BUDGET.failMs,
			warnMs: optionDefault.warnMs ?? rawDefault.warnMs ?? DEFAULT_LOAD_BUDGET.warnMs,
		},
		'loadTesting.defaultBudget',
	);
	const mergeMaps = (base: Record<string, LoadBudgetOverride>, additional: Record<string, LoadBudgetOverride>): Record<string, LoadBudgetOverride> => {
		const merged: Record<string, LoadBudgetOverride> = { ...base };
		for (const [key, value] of Object.entries(additional)) merged[key] = { ...merged[key], ...value };
		return merged;
	};
	const testBudgets = mergeMaps(budgetMap(raw.testBudgets, 'loadTesting.testBudgets'), budgetMap(overrides.testBudgets, 'loadTesting options.testBudgets'));
	const operationBudgets = mergeMaps(budgetMap(raw.operationBudgets, 'loadTesting.operationBudgets'), budgetMap(overrides.operationBudgets, 'loadTesting options.operationBudgets'));
	for (const [key, value] of Object.entries(testBudgets)) completeBudget({ ...defaultBudget, ...value }, `loadTesting.testBudgets.${key}`);
	for (const [key, value] of Object.entries(operationBudgets)) completeBudget({ ...defaultBudget, ...value }, `loadTesting.operationBudgets.${key}`);
	const enabled = overrides.enabled ?? raw.enabled ?? true;
	if (typeof enabled !== 'boolean') throw new Error('loadTesting.enabled must be a boolean.');
	return {
		enabled,
		defaultBudget,
		testBudgets,
		operationBudgets,
	};
};

/**
 * Reads load settings from a repository's quality.json and applies explicit overrides.
 * Missing quality.json files preserve the shared 2s/5s defaults.
 * @param file Optional quality.json path; defaults to the current repository root.
 * @param overrides Explicit settings with higher precedence than the file.
 * @returns Validated and normalized settings.
 */
export const readLoadTestingConfig = (file = path.resolve(process.cwd(), 'quality.json'), overrides: LoadTestingOverrides = {}): NormalizedLoadTestingConfig => {
	const configFile = path.resolve(file);
	if (!fs.existsSync(configFile)) return { ...normalizeLoadTestingConfig({}, overrides), root: process.cwd() };
	let parsed: unknown;
	try {
		parsed = JSON.parse(fs.readFileSync(configFile, 'utf8'));
	} catch (err) {
		throw new Error(`Could not read load testing settings from ${configFile}: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
	}
	if (!isRecord(parsed)) throw new Error(`Quality configuration at ${configFile} must contain a JSON object.`);
	const root = typeof parsed.root === 'string' ? path.resolve(path.dirname(configFile), parsed.root) : path.dirname(configFile);
	if (parsed.loadTesting === undefined) return { ...normalizeLoadTestingConfig({}, overrides), root };
	if (!isRecord(parsed.loadTesting)) throw new Error(`loadTesting in ${configFile} must be an object.`);
	const raw = parsed.loadTesting as LoadTestingConfig;
	if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') throw new Error(`loadTesting.enabled in ${configFile} must be a boolean.`);
	return { ...normalizeLoadTestingConfig(raw, overrides), root };
};

/**
 * Creates a stable test-budget key from a repository-relative file and full title path.
 * @param file Absolute or relative test file path.
 * @param titlePath Full test title path, including describe groups.
 * @param root Repository root used to make the file portion portable.
 * @returns A stable `<file>::<title path>` identifier.
 */
export const loadTestId = (file: string, titlePath: readonly string[], root = process.cwd()): string =>
	`${path.relative(root, path.resolve(file)).split(path.sep).join('/')}::${titlePath.join(' › ')}`;

/**
 * Grades one duration against an ordered budget.
 * @param durationMs Elapsed time in milliseconds.
 * @param budget Warning and failure thresholds.
 * @returns Pass, warning, or failure grade.
 */
export const gradeLoad = (durationMs: number, budget: LoadBudget): LoadGrade => {
	if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('Load duration must be a finite non-negative number.');
	if (durationMs > budget.failMs) return LOAD_GRADES[2];
	if (durationMs > budget.warnMs) return LOAD_GRADES[1];
	return LOAD_GRADES[0];
};

/**
 * Resolves and grades one measurement using test/helper overrides, named config, and defaults.
 * @param input Raw timing measurement.
 * @param config Normalized repository timing settings.
 * @param testId Stable test key for per-test budgets.
 * @param testOverride Optional budget set directly by the test fixture.
 * @returns A normalized measurement ready for artifacts.
 */
export const gradeLoadMeasurement = (input: LoadMeasurementInput, config: NormalizedLoadTestingConfig, testId: string, testOverride?: LoadBudgetOverride): LoadMeasurement => {
	const configured = input.kind === 'test' ? config.testBudgets[testId] : config.operationBudgets[input.name];
	const budget = completeBudget(
		{
			warnMs: input.budget?.warnMs ?? (input.kind === 'test' ? testOverride?.warnMs : undefined) ?? configured?.warnMs ?? config.defaultBudget.warnMs,
			failMs: input.budget?.failMs ?? (input.kind === 'test' ? testOverride?.failMs : undefined) ?? configured?.failMs ?? config.defaultBudget.failMs,
		},
		`load budget for ${input.name}`,
	);
	return { ...input, budget, grade: gradeLoad(input.durationMs, budget) };
};

/**
 * Summarizes how many load measurements landed in each grade.
 * @param measurements Measurements to count.
 * @returns Counts including grades that did not occur.
 */
export const loadGradeCounts = (measurements: readonly Pick<LoadMeasurement, 'grade'>[]): Record<LoadGrade, number> => {
	const counts: Record<LoadGrade, number> = { fail: 0, pass: 0, warning: 0 };
	for (const item of measurements) counts[item.grade] += 1;
	return counts;
};

/**
 * Times an operation, records its duration even when it throws, and preserves its value/error.
 * @param name Stable human-readable operation name.
 * @param operation Work to time.
 * @param record Callback receiving the elapsed measurement.
 * @param budget Optional helper-level budget override.
 * @returns The operation result.
 */
export const timeLoadOperation = async <T>(name: string, operation: () => T | Promise<T>, record: (measurement: LoadMeasurementInput) => void, budget?: LoadBudgetOverride): Promise<T> => {
	if (!name.trim()) throw new Error('A named load measurement is required.');
	const validated = budget ? validateLoadBudgetOverride(budget) : undefined;
	const start = performance.now();
	try {
		return await operation();
	} finally {
		record({ name, kind: 'operation', durationMs: performance.now() - start, ...(validated ? { budget: validated } : {}) });
	}
};
