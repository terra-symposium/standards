# Quality Package Tests

Node test fixtures for the quality package’s checks, reports, runner, and source transforms. These are package tests, not the Standards-wide test manifest.

## What it does

Not applicable.

## Prerequisites

Not applicable.

## Get started

Not applicable.

## Usage

### One discovery path

`pnpm run test` runs `node --test`. Node discovers the test files recursively under this directory exactly once. The folders below separate checks, transforms, runner behavior, and reports; shared fixture helpers live outside discovery in `support/fixtures.mjs`.

From `standards/main/`, run `pnpm --filter @terra-symposium/standards-quality test` to validate quality package tests.

### Dead-code output contract

Dead-code is one static-quality group with two explicit stages:

**Safe fixes:** Knip import consumers; ESLint unused declarations; single-use declaration/reference
scans and candidate classification; apply only proven rewrites.

**Verification:** Knip unused-file/export/dependency reachability; final ESLint and single-use
findings; TypeScript safety checks for proposed edits.

**Manual findings:** stable file/line/rule/name order; all findings are errors. Continue every
configured check before returning failure.

`checks/`, `reports/`, `runner/`, and `transforms/` group focused Node tests; `source-automation.test.mjs` covers source automation.

### Test organization

Node discovers the current subtests from their source files, so this guide describes the coverage areas without duplicating a count or a generated test-name catalog.

- `checks/` covers documentation diagnostics, source discovery, imports, patterns, and security.
- `transforms/` covers formatting, naming, object forwarding, and single-use analysis/fixes.
- `runner/` covers configuration, command dispatch, progress reporting, safe-fix behavior, and end-to-end quality flows.
- `reports/` covers GitHub, history, and Node reporter output.
- `source-automation.test.mjs` covers reusable source-level automations.

Documentation tests treat missing or blank comment prose as findings. Fix mode preserves source comments and never invents summaries, parameter descriptions, file headers, or section labels; agents author those comments after reviewing the implementation.
