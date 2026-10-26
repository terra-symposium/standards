/**
 * packages/testing/src/index.d.ts
 */

/** A named repository-owned command with explicit test-file ownership. */
export type TestSuite = { name: string; command: string; args?: string[]; cwd?: string; owns?: string[] };
/** A versioned list of repository-specific test suites. */
export type TestPlan = { version: 1; suites: TestSuite[] };
/** Aggregate result returned after shared and repository-specific checks run. */
export type TestPlanResult = { passed: number; failed: number; selected: string[] };
/**
 * Reads and validates one repository test plan.
 *
 * @param root - Repository root.
 * @param manifestPath - Repository-relative plan path.
 *
 * @returns The validated test plan, or an empty plan when the manifest is absent.
 */
export function readTestPlan(root: string, manifestPath?: string): TestPlan;
/**
 * Validates suite names, command vectors, and test ownership before any process starts.
 *
 * @param value - Parsed manifest value.
 * @param root - Repository root used to validate suite working directories.
 *
 * @returns Nothing when valid; throws when the plan is malformed.
 */
export function validateTestPlan(value: unknown, root: string): asserts value is TestPlan;
/**
 * Runs shared policy checks and the selected repository suites serially.
 *
 * @param options - Repository root, manifest selection, and optional suite filter.
 *
 * @returns Counts of passing and failing checks and the selected suite names.
 */
export function runTestPlan(options: { root: string; manifest?: string; suites?: string[]; sharedOnly?: boolean }): TestPlanResult;
