# Test structure and responsive evidence

Use this reference when reorganizing a repository's test inventory or selecting browser viewports. The goal is one authoritative owner for each behavior, with the least expensive reliable proof and no duplicated execution.

## Assign ownership from the source tree

1. Inventory production source and routes, test files, runners, fixtures, package scripts, CI commands, consumers, and available duration data before moving or removing tests.
2. Mirror the current source tree beneath each test root, including monorepo package and project boundaries. Name files for the owning source module, route, or domain, not for a milestone or assertion style.
3. Give each behavior one authoritative test owner. A consumer test should cover only the integration boundary that consumer adds. Reusable components belong to their package; applications cover composition and product-specific behavior; demos cover only demo-specific behavior.
4. Keep separate files when the runner, role, initial state, service isolation, or failure-recovery boundary requires independent execution. Otherwise consolidate sister files into a coherent owner file and remove import-only aggregators.
5. Merge browser cases when they share a journey, fixture, role, and page setup. Use named Playwright steps for observable transitions such as create, edit, save, reload, duplicate, and delete. Keep authorization boundaries, persistence, accessibility, and independent failure recovery as distinct assertions or tests where an early failure would hide unrelated behavior.
6. Use unit or API tests for pure transformations and validation. Use real components, accessible controls, and public entrypoints for browser behavior; do not substitute source-text checks for observable interactions.

Before migration, build a case-level map: existing file/case, source owner, observable assertion, execution layer, dependencies, duration, destination scenario, and disposition. Every assertion must map to a retained scenario or an explicit deletion reason. Retire an assertion only when its proof is redundant, temporary, or obsolete; document the reason and the surviving proof or accepted coverage gap.

Use the repository's canonical test manifest (for Terra repositories, `.terra-tests.json`) for suite commands and file ownership. Do not keep duplicate registries in scripts or prose. Expand ownership patterns during validation and require every discovered test file to be owned exactly once. Aggregate scripts and CI should invoke each canonical suite once. Share startup and authentication where isolation permits, parallelize independent work, and serialize only proven shared mutable resources. Run readiness assertions instead of sleeps or network-idle waits; choose operation-specific timeouts.

## Choose viewports for each scenario

For each browser scenario, inspect the component's source media/container queries and measure the rendered UI in a real browser. Identify the failure mode a size can expose: wrapping, overflow, hidden controls, navigation changes, placement, keyboard reachability, or altered interaction. Record the relevant source rule or measured transition, the selected viewport names and dimensions, and why each size adds coverage.

Declare only the scenario's meaningful viewport combinations using native Playwright tags and a `viewport-reason` annotation. Selection must happen during collection, with no runtime skips. If a transition changes behavior, cover the affected interaction immediately below, at, and above the measured threshold; add narrow or wide extremes only when they expose another risk. Run layout-independent logic once at the canonical desktop size. Do not multiply every test by a standard viewport catalog or require six breakpoints without scenario evidence. Explain any extra viewport run.

The reporting helper may retain a legacy default for unmigrated consumers. Migrated suites declare their own selections through the supported catalog/configuration, and the runner must execute exactly those declared combinations. Report expected and executed test/viewport combinations so omissions are visible.

## Keep evidence programmatic and resumable

Capture screenshots from the test run with stable scenario and step identities. Persist each capture and its metadata to the repository's configured output folder as it is produced, so an interrupted run, rerun subsection, or repeated viewport can be reconciled without agent intervention. Generate screenshots, workbooks, and screenshot-only PowerPoints through the shared Reporting package. PowerPoints used as visual evidence contain captured test screenshots; they are not manually assembled from summaries.

Distinguish current-run captures from historical captures. A folder-based report may combine valid captures from completed subsets, but it must label expected versus executed combinations and preserve interruption or retry state. Historical captures for retired cases or viewports must not count as current coverage. A report is not proof that a test passed: pair it with runner results, retries, skips, diagnostics, and cleanup outcomes.

## Validate and measure the migration

Compare the same environment and cache conditions before and after: startup/build time, browser sessions, collected scenarios, viewport combinations, slow fixtures, and total runtime. Validate moved imports, test collection, manifest ownership, duplicate execution, focused behavior, and the complete declared inventory. Run relevant type, build, quality, and diff checks. Record assertion retirements and confirm expected and executed inventories match with no unexplained skips, retries, or cleanup leaks.
