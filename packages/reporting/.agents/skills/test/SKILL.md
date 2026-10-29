---
name: test
description: Coordinate Terra's test-writing, test-ordering, test-repair, and visual-report workflows with exhaustive coverage and efficient execution.
---

# Test

Use for work that creates, expands, orders, repairs, evaluates, or represents Terra test coverage. Route to the narrowest child skill:

1. `test/writing` — add or redesign tests, fixtures, contracts, selectors, or coverage.
2. `test/ordering` — choose commands, dependency order, workers, environments, and rerun scope.
3. `test/fixing` — classify failures and repair the appropriate test, fixture, or infrastructure boundary.
4. `test/represent` — produce, inspect, and report workbook and PowerPoint evidence.

For requests spanning modes, work in that order. Evaluation uses `ordering` then `represent`; “keep fixing until green” uses `fixing`, then `represent` when visual or browser coverage applies.

This family is the canonical owner of test-policy guidance: this skill routes work, `writing` owns scenario design and evidence selection, and `ordering` owns run selection and execution. Follow [`references/test-structure-and-responsive-evidence.md`](references/test-structure-and-responsive-evidence.md) for ownership, consolidation, retirement, viewport selection, and programmatic evidence.

## Test hierarchy

Mirror the source and route tree beneath the test root, and assign each behavior one authoritative owner. Use the root `.terra-tests.json` as the canonical suite and test-file ownership manifest where supported; do not maintain a competing inventory. Keep runner-specific files separate only when the execution boundary requires it. Follow the linked reference for the migration map and ownership checks.

## Coverage contract

Map each material behavior to an observable assertion or a documented gap. Track:

- behavior/route and risk: correctness, authorization, integrity, security, accessibility, responsive layout, diagnostics, or performance;
- lifecycle states that apply: initial, valid, invalid, loading, empty, partial, success, failure, retry, cleanup;
- proof context: source, unit/integration, public/authenticated browser, mutation fixture, or deployed target;
- viewport for rendered behavior and fixture owner/isolation/cleanup.

Exhaustiveness means each material state and risk has an owner at the cheapest reliable layer, not merely many assertions.

## Choose the layer

1. The cheapest reliable layer that proves the contract, from unit or source checks through integration and browser coverage.
2. Unit/fast integration for transformations, validation, ranking, state changes, and errors.
3. API/fixture integration for persistence, authorization, and cross-module contracts.
4. Browser tests for visible behavior, navigation, accessibility, diagnostics, and real integration seams.
5. Responsive visual runs for composition, geometry, wrapping, overflow, and scenario-relevant breakpoint behavior. Select and declare viewports per scenario from source rules and measured layout risk; see the linked reference.
6. Workbook/PowerPoint evidence for auditability, never as a replacement for assertions.

Avoid duplicating lower-level contracts in expensive browser tests unless they prove an additional user or integration boundary. Add source-contract tests when they provide the cheapest reliable proof, not as a blanket prerequisite for every change. Assert observable outcomes rather than incidental implementation details.
