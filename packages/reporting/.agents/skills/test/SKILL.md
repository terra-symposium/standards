---
name: test
description: Coordinate Terra's test-writing, test-ordering, test-repair, and visual-report workflows with exhaustive coverage and efficient execution.
---

# Test

Use for work that creates, expands, orders, repairs, evaluates, or represents Terra test coverage. Route to the narrowest child skill:

For repository-wide restructuring or responsive suite design, read [test ownership and viewport selection](references/ownership-and-viewport-policy.md) before choosing files or projects.

1. `test/writing` — add or redesign tests, fixtures, contracts, selectors, or coverage.
2. `test/ordering` — choose commands, dependency order, workers, environments, and rerun scope.
3. `test/fixing` — classify failures and repair the appropriate test, fixture, or infrastructure boundary.
4. `test/represent` — produce, inspect, and report workbook and PowerPoint evidence.

For requests spanning modes, work in that order. Evaluation uses `ordering` then `represent`; “keep fixing until green” uses `fixing`, then `represent` when visual or browser coverage applies.

## Test hierarchy

Keep repository tests under `tests/`, grouped by the product area and source route they prove. Treat `tests/suites.json` as the explicit inventory and execution order; add or move every test there and run `pnpm run test:hierarchy`. Use `.test.*` for Node and `.spec.ts` for Playwright. Keep shared support in `tests/scripts/test/support/` and domain-only support beside its owning suite.

## Coverage contract

Map each material behavior to an observable assertion or a documented gap. Track:

- behavior/route and risk: correctness, authorization, integrity, security, accessibility, responsive layout, diagnostics, or performance;
- lifecycle states that apply: initial, valid, invalid, loading, empty, partial, success, failure, retry, cleanup;
- proof context: source, unit/integration, public/authenticated browser, mutation fixture, or deployed target;
- viewport for rendered behavior and fixture owner/isolation/cleanup.

Exhaustiveness means each material state and risk has an owner at the cheapest reliable layer, not merely many assertions.

## Choose the layer

1. Source/architecture contracts for ownership, inventories, security boundaries, and forbidden legacy paths.
2. Unit/fast integration for transformations, validation, ranking, state changes, and errors.
3. API/fixture integration for persistence, authorization, and cross-module contracts.
4. Browser tests for visible behavior, navigation, accessibility, diagnostics, and real integration seams.
5. Responsive visual runs for composition, geometry, wrapping, overflow, and breakpoint behavior.
6. Workbook/PowerPoint evidence for auditability, never as a replacement for assertions.

Avoid duplicating lower-level contracts in expensive browser tests unless they prove an additional user or integration boundary. Assert observable outcomes rather than incidental implementation details.
