---
name: ordering
description: Plan and run Terra test suites in dependency order with efficient workers, explicit contexts, and complete coverage accounting.
---

# Test Ordering

Use this skill when deciding what to run, in which order, against which branch or deployment, or when a suite is expensive, stateful, or responsive.

Follow [`../references/test-structure-and-responsive-evidence.md`](../references/test-structure-and-responsive-evidence.md) for ownership inventories, consolidation, and responsive coverage. Inspect source media rules and measure UI for each scenario; do not run a blanket viewport matrix.

## Boundary

Read the Playwright config, package scripts, test README, selected test files, fixture setup, and reporter configuration. Record:

- branch, commit, worktree, or deployment URL;
- exact command and environment/profile;
- selected projects, files, groups, workers, retries, and timeout settings;
- selected viewport names and actual dimensions;
- authentication, database, CMS, storage, and external-service prerequisites;
- expected test inventory and artifact directory.

Never switch a dirty worktree between branches. Use a separate clean worktree or an explicit deployed target when comparing refs. A missing server, expired session, or unavailable dependency is a context blocker, not a passing result.

## Dependencies

Use this order unless the repository's configuration proves a different dependency graph:

1. diff hygiene and static/source-contract checks;
2. focused unit and fast integration tests for the changed owner;
3. the owning domain suite;
4. adjacent domains that consume the changed contract;
5. public browser checks;
6. authenticated and mutation-backed browser checks;
7. browser checks at the scenario-specific viewports justified by its layout risks;
8. full configured suite and representation artifacts.

The order is a dependency graph, not a way to hide failures. If an earlier gate fails, report later gates as unexecuted or blocked. Do not skip earlier contracts because a later browser test happens to pass.

## Execution

- Use the narrowest command that answers the current question.
- Run independent source and unit suites in parallel when they do not share mutable services.
- Keep the repository's configured worker limits. Reduce workers only after a focused run demonstrates a shared service or fixture limit, and record the reason.
- Keep stateful Sanity, database, auth, and mutation projects isolated. Use serial execution only for a documented shared resource.
- Reuse one prepared authenticated state only when the owning fixture guarantees isolation and expiry handling.
- Use headless mode for ordinary regression coverage. Use headed mode only for sign-in, visual capture, or a diagnosis that needs a real browser surface.
- Run the affected viewport first while fixing, then nearby widths that exercise the same source breakpoint or measured transition. Do not expand to a blanket matrix; a single passing viewport proves only that selected scenario and size.

Use the repository's canonical manifest (Terra repositories use `.terra-tests.json`) and configured scripts rather than inventing alternate runners. Validate file ownership before execution. Common commands include:

```sh
pnpm run test:visual
pnpm exec playwright test --project=root-public tests/astro/public/public.spec.ts
pnpm run quality
pnpm run typecheck:strict
pnpm --filter terra-symposium-frontend run build
git diff --check
```

Set `PLAYWRIGHT_ASTRO_URL` for an explicit target instead of silently replacing a required context. Configure viewport selection at collection time from the scenarios' native tags and reasons. Use `PW_VIEWPORTS` only when it represents the declared selections for that run; record selected dimensions and scenario rationale. Do not select `all` by default.

## Policy

After a failure, rerun the smallest reproducible test with the same project, fixture, viewport, and target. Then run adjacent sizes required by the same source media rule or measured transition, and any dependent domain. Preserve the first failure and every later retry in the ledger; retries do not erase flakiness.

## Completion accounting

A run is complete only when the expected inventory matches the executed inventory, including intentional skips and setup failures. Check for:

- missing test files, projects, groups, or viewports;
- unexpected skips, retries, timeouts, and interruptions;
- browser console/page/request errors and terminal errors on passed tests;
- missing screenshots, workbook rows, slides, or diagnostics;
- fixture cleanup failures and leaked run-scoped data.

Report unexecuted contexts explicitly. Never summarize a partial matrix as “green”.

For detailed ownership mapping, test consolidation, file naming, viewport selection, evidence persistence, and migration validation, follow [`../references/test-structure-and-responsive-evidence.md`](../references/test-structure-and-responsive-evidence.md).
