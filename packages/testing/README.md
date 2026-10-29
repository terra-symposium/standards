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

After adding the package as a development dependency, run it locally with:

```sh
pnpm exec terra-test run --manifest .terra-tests.json
```

Select custom suites with `--suites unit,contracts`; shared checks still run. Use `--shared-only` for workflows that should run the Standards checks without local suites. The GitHub Action is published as a public distribution mirror so public repositories can consume the Standards-owned implementation:

```yaml
- uses: Terra-Symposium/standards-testing@1225bf06532e68d315aa2474001a67eea1924ec5
  with:
    manifest: .terra-tests.json
```

Standards remains the source of truth for changes under `packages/testing`; update the public mirror when publishing an implementation change.

The Action executes one plan in one job, so repositories can expose one test check even when the plan has several suites.
