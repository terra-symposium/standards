# Testing

Testing helps teams run a repository’s checks in a predictable order.

The `test-runner` runner executes Standards shared checks and the suites declared in a repository
test plan. It checks that each test file has one owning suite and rejects duplicate suite commands.

## Get started

Node.js `>=20`. The runner invokes the tools named in the consumer's manifest; install them in that
repository.

```sh
pnpm add -D @terra-symposium/testing
```

Create `config/tests.json`:

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

## Usage

Run the plan from the consuming repository root:

```sh
pnpm exec test-runner run --manifest config/tests.json
```

`--suites unit,contracts` selects named local suites while retaining shared checks. `--shared-only`
runs Standards checks without local suites. The runner prefers `config/tests.json`, then accepts legacy `config/terra-tests.json`, followed
by `tests/tests.json`, `tests/terra-tests.json`, `.tests.json`, and `.terra-tests.json` when no
manifest is specified. A repository with no custom suites may omit the manifest.

## Configuration

Each suite declares one command and an `owns` list of repository-relative test globs. Review
commands and working directories before running a plan from an unfamiliar repository. Do not place
secrets in the manifest.

## Validation

| Command                | Checks                        |
| ---------------------- | ----------------------------- |
| `pnpm run quality:all` | Full configured Quality scope |
| `pnpm run test`        | Unit or project tests         |
| `pnpm run build`       | Build output                  |

Quality can apply safe fixes; review the diff before committing. No separate browser or Playwright
test command is defined here.

## Contributing

`src/` owns the CLI and public API. `action.yml` exposes the GitHub Action. Standards is the source
of truth; update the public Action mirror when publishing an implementation change.

Keep the manifest as the single suite inventory. When reorganizing tests, account for moved, merged,
or retired assertions and update the guide. Add a Changeset for a published behavior change.

Open changes through the repository pull-request workflow; see the [root README](../../README.md).

## Documentation

Publish the npm package through the Standards Changesets workflow. Pin the Action to a reviewed
commit SHA in consumer workflows and pass its `manifest` input. The Action runs one plan in one job.

The runner executes the configured commands and does not provide their credentials, browsers,
databases, or other services. Its ownership check maps test files to suites; it does not prove
assertion quality.

See [test plans and ownership](../../docs/testing/0-getting-started/test-plan.mdx) and
[CI integration](../../docs/testing/1-ci/ci-integration.mdx).

## License

Apache-2.0. See the repository [LICENSE](../../LICENSE).
