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

## Ownership and selection

Use `.terra-tests.json` as the canonical repository suite plan. Keep framework-specific selectors only where a runner needs them, and ensure aggregate scripts invoke each canonical suite once. Follow the linked [ownership and viewport selection procedure](references/ownership-and-viewport-selection.md) for source ownership, test consolidation, retirement, responsive evidence, screenshots, and completion accounting.

Mirror the source tree beneath each repository's test root, including monorepo package boundaries. Name tests after the owned route or module. Use `.test.*` for Node and `.spec.ts` for Playwright when the runners differ. Keep cross-cutting support in one shared boundary and domain-only support beside its owning tests.

## Coverage contract

Map each material behavior to an observable assertion or a documented gap. Track:

- behavior/route and risk: correctness, authorization, integrity, security, accessibility, responsive layout, diagnostics, or performance;
- lifecycle states that apply: initial, valid, invalid, loading, empty, partial, success, failure, retry, cleanup;
- proof context: source, unit/integration, public/authenticated browser, mutation fixture, or deployed target;
- viewport for rendered behavior and fixture owner/isolation/cleanup.

Exhaustiveness means each material state and risk has one authoritative owner at the cheapest reliable layer, with consumer tests proving only the integration boundary they add.

## Choose the layer

1. Source/architecture contracts for ownership, inventories, security boundaries, and forbidden legacy paths.
2. Unit/fast integration for transformations, validation, ranking, state changes, and errors.
3. API/fixture integration for persistence, authorization, and cross-module contracts.
4. Browser tests for visible behavior, navigation, accessibility, diagnostics, and real integration seams.
5. Responsive visual runs for composition, geometry, wrapping, overflow, and breakpoint behavior.
6. Workbook/PowerPoint evidence for auditability, never as a replacement for assertions.

Avoid duplicating lower-level contracts in expensive browser tests unless they prove an additional user or integration boundary. Assert observable outcomes rather than incidental implementation details.
