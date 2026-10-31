# Terra Standards Testing

`@terra-symposium/standards-testing` always runs Standards-owned shared checks first, then runs any repository-specific suites. The shared checks include linear-history validation. Repositories keep only their custom test files and commands; shared test logic and duplicate-suite validation stay in Standards.

## Test plan

Add `.terra-tests.json` at the repository root:

```json
{
  "version": 1,
  "suites": [
    {
      "name": "unit",
      "command": "pnpm",
      "args": ["run", "test:unit"],
      "owns": ["tests/unit/**/*.test.ts"]
    }
  ]
}
```

Each suite has one command. `owns` is required and lists repository-relative file globs for the test files that command executes. The runner expands these globs against files in `test` or `tests` directories and `*.test.*` or `*.spec.*` files, rejecting files claimed by multiple suites or left out of every suite. Duplicate command, arguments, and working-directory combinations are also rejected when the plan is loaded. The manifest is optional when a repository has no custom suites.

Keep this root manifest as the canonical ordered mapping of suite commands and file ownership; do not repeat the suite inventory in another runner or documentation list. Within those files, place each assertion with the source module, route, or domain it proves. When reorganizing tests, map each old file and case to its new owner and mark it as moved, merged, or retired; a retired assertion needs a reason and a surviving proof or an explicit coverage gap.

After adding the package as a development dependency, run it locally with:

```sh
pnpm exec terra-test run --manifest .terra-tests.json
```

Select custom suites with `--suites unit,contracts`; shared checks still run. Use `--shared-only` for workflows that should run the Standards checks without local suites. The GitHub Action is published as a public distribution mirror so public repositories can consume the Standards-owned implementation:

```yaml
- uses: Terra-Symposium/standards/packages/testing@3f9b31323d3617d6b565770880865ec7cf1a9704
  with:
    manifest: .terra-tests.json
```

For responsive Playwright coverage, declare `PW_VIEWPORTS` from the layout risk in each scenario and record the selected names and dimensions in the report. Include widths around relevant breakpoints; use all configured viewports for broad responsive coverage. Reports should distinguish the selected inventory from the full configured inventory.

Standards remains the source of truth for changes under `packages/testing`; update the public mirror when publishing an implementation change.

The Action executes one plan in one job, so repositories can expose one test check even when the plan has several suites.
