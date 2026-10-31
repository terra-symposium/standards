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
      "owns": ["tests/unit"]
    }
  ]
}
```

Each suite has one command. `owns` lists repository-relative test paths or suite identifiers and prevents two entries from claiming the same tests. Duplicate command, arguments, and working-directory combinations are rejected when the plan is loaded. The manifest is optional when a repository has no custom suites.

After adding the package as a development dependency, run it locally with:

```sh
pnpm exec terra-test run --manifest .terra-tests.json
```

Select custom suites with `--suites unit,contracts`; shared checks still run. Use `--shared-only` for workflows that should run the Standards checks without local suites. Public repositories can use the composite action directly from this public repository:

```yaml
- uses: Terra-Symposium/standards/packages/testing@3d782b9dfc4cc5b421ccbe395d65aacec9d8956d
  with:
    manifest: .terra-tests.json
```

Pin the action to a reviewed Standards commit SHA so workflow behavior changes only with an intentional ref update.

The Action executes one plan in one job, so repositories can expose one test check even when the plan has several suites.
