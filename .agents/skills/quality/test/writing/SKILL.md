---
name: test-writing
description: Design and maintain exhaustive Terra tests, fixtures, contracts, and browser coverage without duplicating or weakening behavior.
---

# Test Writing

Use when adding tests, expanding coverage, changing fixtures, or updating tests for an intentional migration.

## 1. Map the contract

For each behavior, record its owner and identify:

- user/data/security/architecture outcome and lifecycle states;
- actors, roles, tenants, and access boundaries;
- relevant data shapes, boundaries, malformed/duplicate/stale values, and concurrent changes;
- best proof layer, viewport, and required diagnostics.

Assign each material case a new test, an existing test ID, or an intentional gap. Do not add duplicates to increase counts.

## 2. Choose scope and fixture

- Use pure tests for transformations, source-contract tests for ownership/migrations, API tests for persistence/authorization, and browser tests for real user interaction/accessibility/integration.
- Add screenshots only when geometry/composition is part of the contract; use assertions for functional truth.
- Prefer named, small, run-scoped fixtures. Generate unique IDs, clean up in `finally`, and verify removal.
- Create fixture data at the boundary that owns it. Keep tests parallel-safe unless a documented shared resource requires serial execution.
- Keep time, randomness, network, and external providers deterministic or injectable where practical.
- Use accessible roles, labels, names, and stable contract attributes. Avoid positional selectors, incidental classes, and selectors broadened to hide failures.

## 3. Assert completely

Assert the observable result and important negative boundary: no unauthorized leakage, no partial mutation on invalid input, no unrelated record changes, no stale content in empty/loading states, idempotent retry, complete cleanup, and reachable readable responsive controls where relevant. Keep diagnostics clean unless the test owns them.

Use table-driven tests for equivalent cases and named tests for distinct journeys. Keep names searchable and contract-oriented; preserve dot-separated IDs and TSDoc conventions.

## 4. Maintain and validate

Place tests under the repository's test root, mirroring the source route or module and monorepo package boundary. Update `.terra-tests.json` whenever suite ownership or execution changes. Preserve the declared runner context and ensure no file is owned or executed by more than one canonical suite.

Keep registration-time fixtures before tests and runtime-only helpers after the last test under `/* HELPERS */`. Promote helpers only after real reuse.

Run the focused test while writing, then the owning domain and dependent suites. Do not add sleeps, inflate timeouts, or serialize unrelated tests to mask bad fixtures/selectors.

Before handoff confirm:

- the canonical source and route are under test;
- each material state/risk has an owner or explicit gap;
- assertions prove behavior rather than incidental text;
- fixture data is deterministic, isolated, cleaned, and parallel-safe;
- no proxy, alias, skip, weakened assertion, or unexplained timeout was introduced;
- focused and dependent validation commands are recorded.

For cross-repository ownership, journey consolidation, temporary-suite retirement, and measured viewport selection, follow the linked [ownership and viewport selection procedure](references/ownership-and-viewport-selection.md).
