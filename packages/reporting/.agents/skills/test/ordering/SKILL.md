---
name: ordering
description: Plan and run Terra test suites in dependency order with efficient workers, explicit contexts, and complete coverage accounting.
---

# Test Ordering

Use this skill when deciding what to run, in which order, against which branch or deployment, or when a suite is expensive, stateful, or responsive.

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
7. responsive browser matrix, starting with the failing or most constrained breakpoint;
8. full configured suite and representation artifacts.

The order is a dependency graph, not a way to hide failures. If an earlier gate fails, report later gates as unexecuted or blocked. Do not skip earlier contracts because a later browser test happens to pass.

## Execution

- Use the narrowest command that answers the current question.
- Run independent source and unit suites in parallel when they do not share mutable services.
- Keep the repository's configured worker limits. Reduce workers only after a focused run demonstrates a shared service or fixture limit, and record the reason.
- Keep stateful Sanity, database, auth, and mutation projects isolated. Use serial execution only for a documented shared resource.
- Reuse one prepared authenticated state only when the owning fixture guarantees isolation and expiry handling.
- Use headless mode for ordinary regression coverage. Use headed mode only for sign-in, visual capture, or a diagnosis that needs a real browser surface.
- Run only the affected viewport first while fixing, then the adjacent breakpoints, then the declared responsive matrix. A single passing viewport is not responsive coverage.

Use the ordered `tests/suites.json` inventory and the repository's configured scripts rather than inventing alternate runners. Run `pnpm run test:hierarchy` before test execution. Common commands include:

```sh
pnpm run test:visual
pnpm exec playwright test --project=root-public tests/astro/public/public.spec.ts
pnpm run quality
pnpm run typecheck:strict
pnpm --filter terra-symposium-frontend run build
git diff --check
```

Set `PLAYWRIGHT_ASTRO_URL` for an explicit target instead of silently replacing a required context. Set `PW_VIEWPORTS` before `pnpm run test:visual`; record whether the run used `default`, a named subset, or `all`.

## Policy

After a failure, rerun the smallest reproducible test with the same project, fixture, viewport, and target. Then run the nearest adjacent viewport or dependent domain. Only after the focused result is understood should the full matrix run. Preserve the first failure and every later retry in the ledger; retries do not erase flakiness.

## Completion accounting

A run is complete only when the expected inventory matches the executed inventory, including intentional skips and setup failures. Check for:

- missing test files, projects, groups, or viewports;
- unexpected skips, retries, timeouts, and interruptions;
- browser console/page/request errors and terminal errors on passed tests;
- missing screenshots, workbook rows, slides, or diagnostics;
- fixture cleanup failures and leaked run-scoped data.

Report unexecuted contexts explicitly. Never summarize a partial matrix as “green”.

## Cross-repository ordering lessons

When a Terra-family repository has a single-page Astro shell with nested panels, mirror the route tree in the test paths rather than preserving historical feature or milestone folders. Use one file per domain inside meaningful route folders where the source tree has those boundaries (`auth/auth.test.ts`, `dashboard/conversation.test.ts`, `dashboard/customers.test.ts`, `admin/admin.test.ts`) and keep only genuine utility boundaries such as helpers, fixtures, and generated results as directories.

Keep the hierarchy inside each file: route boundary first, then page region, data flow, persistence/security contract, and responsive behavior. Historical milestone names belong in nested `describe` labels, not in paths. This keeps ownership obvious when a page or action moves and prevents stale folder names from becoming a compatibility contract.

Treat `architecture`, `integration`, `visual`, and `regression` as assertion types, not domains. Resolve each test to the canonical source owner first, then place source-contract and behavior assertions for that owner in the same domain file (`conversation.test.ts`, `forms.test.ts`, `dashboard.test.mjs`, or `ui.test.ts`) when the runner permits it. Do not create parallel `architecture-*` and feature-prefixed files for the same source module. Keep separate `.test` and `.spec` files only when Node and Playwright require different runners; otherwise prefer one file per route or source domain.

Name files from the source tree's domain or module stem, not from the historical phase that introduced the test or the mechanism being asserted. A dashboard conversation contract belongs with conversation; a dashboard shell routing contract belongs with the dashboard route; a shared variant contract belongs with the UI module. Before moving a test, compare its imports and source reads with the current `src` tree and merge duplicate ownership rather than preserving aliases.

Keep cross-cutting test infrastructure intentionally small: one shared test-support boundary may contain common fixtures, helpers, environment declarations, runner configuration, and repository-wide regression checks. Do not create separate `helpers`, `fixtures`, `support`, and `regressions` folders when they are all consumed across domains; route-owned tests still belong in their route folders, while shared files belong together under the clearly named shared boundary.

Do not discover suites by alphabetically scanning directories. Maintain an explicit ordered suite map in the runner, with architecture/source contracts before page behavior and a named route-level group for each stateful or special execution context. Run independent files together only when their fixtures and services are isolated; split a group-addressable file into its declared groups when shared state requires it.

If browser specs live beside Node tests, configure the browser runner with a root test directory plus an explicit `*.spec.ts` match. That preserves the source hierarchy without accidentally sending source-contract files through Playwright. After a reorganization, verify every moved file's relative imports, runner selector, package script, header, and documentation, then search for old paths before claiming the inventory is complete.
