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

Select custom suites with `--suites unit,contracts`; shared checks still run. Use `--shared-only` for workflows that should run the Standards checks without local suites. The same runner is available as a GitHub Action from this package directory:

```yaml
- uses: Terra-Symposium/standards/packages/testing@development
  with:
    manifest: .terra-tests.json
```

The Action executes one plan in one job, so repositories can expose one test check even when the plan has several suites.
