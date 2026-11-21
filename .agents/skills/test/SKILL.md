---
name: test
description: Create, order, run, repair, and report Terra tests.
metadata:
  related-files:
    - config/tests.json
    - packages/hygiene/package.json
---

# Test

Use for work that creates, expands, orders, repairs, evaluates, or represents Terra test coverage. Read the relevant procedure completely before acting:

For repository-wide restructuring or responsive suite design, read [test ownership, structure, and viewport selection](references/test-structure-and-responsive-evidence.md) before choosing files or projects. This is the single migration procedure; the references below specialize it rather than defining competing test inventories.

1. [Writing](references/writing.md) — add tests, fixtures, contracts, selectors, or coverage.
2. [Ordering](references/ordering.md) — choose commands, dependency order, workers, and rerun scope.
3. [Fixing](references/fixing.md) — diagnose and repair failures at their owning boundary.
4. [Evidence](references/evidence.md) — produce and inspect workbook and PowerPoint evidence.
5. [Cloud Playwright](references/cloud-playwright.md) — run browser suites in verified Cloud tasks.

For requests spanning modes, work in that order. Evaluation uses `ordering` then `evidence`; “keep fixing until green” uses `fixing`, then `evidence` when visual or browser coverage applies.

This family is the canonical owner of test-policy guidance: this skill routes work, `writing` owns scenario design and evidence selection, and `ordering` owns run selection and execution. Follow [`references/test-structure-and-responsive-evidence.md`](references/test-structure-and-responsive-evidence.md) for ownership, consolidation, retirement, viewport selection, and programmatic evidence.

## Test hierarchy

Mirror the source and route tree beneath the test root, and assign each behavior one authoritative owner. Use the repository's `config/tests.json` as the canonical suite and test-file ownership manifest; migrate legacy manifest paths when changing a suite. Keep runner-specific files separate only when the execution boundary requires it. Before restructuring, capture the discovered files, collected cases and projects, viewport combinations, skips, and runtime. Afterward compare the same inventory and record every merged, moved, added, or retired assertion. Follow the linked reference for the migration map and ownership checks.

## Coverage contract

Map each material behavior to an observable assertion or a documented gap. Track:

- Behavior/route and risk: correctness, authorization, integrity, security, accessibility, responsive layout, diagnostics, or performance.
- Lifecycle states that apply: initial, valid, invalid, loading, empty, partial, success, failure, retry, cleanup.
- Proof context: source, unit/integration, public/authenticated browser, mutation fixture, or deployed target.
- Viewport for rendered behavior and fixture owner/isolation/cleanup.

Exhaustiveness means each material state and risk has an owner at the cheapest reliable layer, not merely many assertions. Every render function also needs a source-owned Playwright assertion; the writing reference defines how one journey can cover multiple renderers without repeating a test.

## Choose the layer

1. The cheapest reliable layer that proves the contract, from unit or source checks through integration and browser coverage.
2. Unit/fast integration for transformations, validation, ranking, state changes, and errors.
3. API/fixture integration for persistence, authorization, and cross-module contracts.
4. Browser tests for visible behavior, navigation, accessibility, diagnostics, and real integration seams.
5. Responsive visual runs for composition, geometry, wrapping, overflow, and scenario-relevant breakpoint behavior. Select and declare viewports per scenario from source rules and measured layout risk; see the linked reference.
6. Workbook/PowerPoint evidence for auditability, never as a replacement for assertions.

Avoid duplicating lower-level contracts in expensive browser tests unless they prove an additional user or integration boundary. Add source-contract tests when they provide the cheapest reliable proof, not as a blanket prerequisite for every change. Assert observable outcomes rather than incidental implementation details.

For a Quality public API test, build its package before running focused Node tests such as `node --test packages/hygiene/tests/runner/quality.test.mjs`. Verify `packages/hygiene/package.json` runtime and types exports and use an isolated package-name consumer import and type-resolution fixture; a direct `dist` import or TypeScript alias alone does not prove the published interface.
