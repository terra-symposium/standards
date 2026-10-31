---
name: test-writing
description: Design and maintain exhaustive Terra tests, fixtures, contracts, and browser coverage without duplicating or weakening behavior.
---

# Test Writing

Use when adding tests, expanding coverage, changing fixtures, or updating tests for an intentional migration.

Follow [`../references/test-structure-and-responsive-evidence.md`](../references/test-structure-and-responsive-evidence.md) for canonical ownership, consolidation, retirement, viewport rationale, tags, annotations, and evidence collection.

## 1. Map the contract

For cross-repository ownership, consolidation, and per-scenario viewport selection, follow [test ownership and viewport selection](../references/ownership-and-viewport-policy.md).

For each behavior, record its owner and identify:

- user/data/security/architecture outcome and lifecycle states;
- actors, roles, tenants, and access boundaries;
- relevant data shapes, boundaries, malformed/duplicate/stale values, and concurrent changes;
- best proof layer, viewport, and required diagnostics.

Assign each material case a new test, an existing test ID, or an intentional gap. Do not add duplicates to increase counts.

Resolve each assertion to one canonical source, route, or domain owner and keep its proof with that owner. Use the repository-root `.terra-tests.json` as the canonical ordered suite manifest for file ownership and execution. Before reorganizing, map every old file/case to a destination and disposition; document why an assertion is retired and identify surviving proof or an explicit coverage gap. Apply the linked reference's ownership checks.

## 2. Choose scope and fixture

- Use pure tests for transformations, source-contract tests for ownership/migrations, API tests for persistence/authorization, and browser tests for real user interaction/accessibility/integration.
- Add screenshots only when geometry/composition is part of the contract; use assertions for functional truth. Capture and report screenshots fully programmatically through the runner and shared fixtures; do not rely on manual screenshots or hand-authored evidence reports.
- Select browser viewports per scenario from the owning UI's source media rules and measured rendered behavior. Use native Playwright tags and a machine-readable `viewport-reason` annotation to record why each selected size can expose the risk; avoid blanket matrices.
- Prefer named, small, run-scoped fixtures. Generate unique IDs, clean up in `finally`, and verify removal.
- Create fixture data at the boundary that owns it. Keep tests parallel-safe unless a documented shared resource requires serial execution.
- Keep time, randomness, network, and external providers deterministic or injectable where practical.
- Use accessible roles, labels, names, and stable contract attributes. Avoid positional selectors, incidental classes, and selectors broadened to hide failures.

## 3. Assert completely

Assert the observable result and important negative boundary: no unauthorized leakage, no partial mutation on invalid input, no unrelated record changes, no stale content in empty/loading states, idempotent retry, complete cleanup, and reachable readable responsive controls where relevant. Keep diagnostics clean unless the test owns them.

Use table-driven tests for equivalent cases and named tests for distinct journeys. Keep names searchable and contract-oriented; preserve dot-separated IDs and TSDoc conventions.

## 4. Maintain and validate

Place tests under `tests/<product-domain>/` to mirror the repository source area. Update `tests/suites.json` whenever a test entry or case module moves, preserve the declared runner context, and run `pnpm run test:hierarchy` before test execution.

Keep registration-time fixtures before tests and runtime-only helpers after the last test under `/* HELPERS */`. Promote helpers only after real reuse.

Run the focused test while writing, then the owning domain and dependent suites. Do not add sleeps, inflate timeouts, or serialize unrelated tests to mask bad fixtures/selectors.

Before handoff confirm:

- the canonical source and route are under test;
- each material state/risk has an owner or explicit gap;
- assertions prove behavior rather than incidental text;
- fixture data is deterministic, isolated, cleaned, and parallel-safe;
- no proxy, alias, skip, weakened assertion, or unexplained timeout was introduced;
- focused and dependent validation commands are recorded.
- declared test and viewport selections match the executed inventory and are present in the report.
