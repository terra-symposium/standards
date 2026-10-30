# Test ownership and viewport selection

Use this reference when moving, combining, retiring, or adding test coverage across Terra repositories. The goal is one authoritative test owner for each behavior, with the smallest reliable execution cost and enough evidence to audit what ran.

## Inventory and ownership

Before editing, snapshot each repository's branch and dirty state. Inventory source routes/modules, test files, package scripts, Playwright configs and projects, CI commands, fixtures, and current durations. For every existing assertion, record its source owner, observable behavior, execution layer, dependencies, and disposition: retained scenario, merged scenario, or deletion with a concrete reason. Keep that mapping with the migration record.

Mirror the source tree beneath each repository's test root, including monorepo package boundaries. Name files for their route, package, or module. Keep Node and Playwright files separate only when their runners or execution needs differ. Put shared support in one cross-cutting directory; keep domain-only support beside its owner.

Assign one canonical owner to each behavior:

- **Docs** owns document workspace, editor, rich-block behavior, and simulated CRUD journeys. Its browser tests use real controls and verify persistence through the deterministic demo adapter. Consumers test only the package integration they add.
- **Website** owns host authorization, Sanity operations, migrations, and website-specific adapters. It removes feature tests whose behavior is owned by Docs.
- **Styling** owns reusable components, variants, and responsive primitives. Applications own their composition, product workflows, and integration boundaries.
- **Portfolio** tests only behavior unique to portfolio demos and their host composition. Shared component behavior belongs to Styling.
- **Standards** owns quality, reporting, test-runner, and public composite-action implementation. Public consumers call `Terra-Symposium/standards` directly; do not recreate a distribution mirror.
- **RMA Sports** retains build validation. Do not add browser tests where there is no browser behavior to verify.

Treat assertion type labels such as architecture, integration, visual, and regression as descriptions of proof, not separate product domains. Move overlapping tests beside the source owner. Retain cross-repository tests only for a consumer boundary that the source package cannot prove.

## Consolidation and retirement

Merge cases when they share a user journey, initial state, fixture, authentication, and service boundary. Use native Playwright `test.step` for meaningful actions and assertions within one journey, such as create, edit, save, reload, duplicate, and delete. Keep independent tests when they need separate state, roles, security boundaries, failure recovery, or service isolation, so one failure does not hide unrelated behavior.

Move pure transformations, validation matrices, and error mapping to fast Node/API tests. Use real components, accessible controls, public entrypoints, and observable outcomes in browser tests. Do not replace behavior with source-substring checks. Remove obsolete migration/extraction wiring checks and temporary Cloud connection/schema/session smoke suites after active contracts have an owner. Run required environment preflight once outside the regression inventory; retain focused credential, authorization, destructive-operation guard, and cleanup tests.

Make `.terra-tests.json` the canonical ordered suite plan. Remove duplicate filename registries and command lists only after migrating their consumers. Ensure aggregate scripts and CI call every canonical suite once. Detect both unowned files and files owned by multiple suites. Treat aliases as the same command, not additional coverage.

## Viewports chosen per scenario

For every rendered scenario, inspect media queries, container queries, and source layout rules; then measure the actual UI in a browser. Record the chosen viewport names and dimensions, plus a short `viewport-reason`, beside the test. Use Playwright's native viewport tags and annotations. Shared group-level choices are valid only when they apply to every scenario in the group.

Run layout-independent behavior once at the canonical desktop viewport. Add responsive runs only when wrapping, overflow, visibility, navigation, control placement, or interaction changes create another failure mode. For a measured transition, test the affected interaction immediately below, at, and above its threshold, then add narrow or wide extremes only when they cover another risk. Do not multiply every journey across a generic viewport matrix.

Selection happens during test collection from the declared tags and configured viewport catalog. Do not collect every combination and mark unwanted cases skipped at runtime. Explain every additional viewport run and preserve the same scenario identity across viewports.

## Screenshots and completion evidence

Persist screenshots from each Playwright run under a run-scoped capture directory, using stable scenario and step identities. Keep captures when a run is interrupted so Reporting can build the slideshow from the folder without rerunning tests. Repeated runs of one subsection must not overwrite unrelated evidence. Generate PowerPoints and workbooks programmatically through Standards Reporting. Mark captures from previous runs as historical and keep them separate from current expected-versus-executed coverage.

For each run, compare the expected test/project/viewport combinations with the executed results. Account for every skip, retry, timeout, interruption, diagnostic, missing screenshot, and cleanup leak. Do not count blocked or intentionally unrun contexts as passing. A passing run is complete only when the declared inventory matches the actual run and there are no unexplained skips, retries, or cleanup failures.

## Validation sequence

1. Snapshot branch, dirty state, and execution context.
2. Reconcile the source-to-test ownership map and canonical suite manifest.
3. Verify moved imports, selectors, package commands, and removal of stale references.
4. Run focused tests for the changed owner and adjacent consumer boundary.
5. Run the complete declared suites in dependency order; parallelize only isolated services and fixtures.
6. Run the per-scenario responsive selections and compare exact expected/executed combinations.
7. Inspect Reporting artifacts, current versus historical captures, diagnostics, and cleanup.
8. Run applicable type, build, quality, and diff checks; commit only scoped changes.
