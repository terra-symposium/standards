# Testing

A manifest-driven CLI and GitHub Action for ordered, repository-owned test suites.

## What it does

The `terra-test` runner executes Standards shared checks and the suites declared in a repository test plan. It checks that each test file has one owning suite and rejects duplicate suite commands.

## Prerequisites

Node.js `>=20`. The runner invokes the tools named in the consumer's manifest; install them in that repository.

## Get started

```sh
pnpm add -D @terra-symposium/testing
```

Create `config/terra-tests.json`:

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
pnpm exec terra-test run --manifest config/terra-tests.json
```

`--suites unit,contracts` selects named local suites while retaining shared checks. `--shared-only` runs Standards checks without local suites. The runner discovers `config/terra-tests.json`, then `tests/terra-tests.json`, then legacy `.terra-tests.json` when no manifest is specified. A repository with no custom suites may omit the manifest.

## Configuration and security

Each suite declares one command and an `owns` list of repository-relative test globs. Review commands and working directories before running a plan from an unfamiliar repository. Do not place secrets in the manifest.

## Development and structure

`src/` owns the CLI and public API. `action.yml` exposes the GitHub Action. Standards is the source of truth; update the public Action mirror when publishing an implementation change.

## Validation

```sh
pnpm --filter @terra-symposium/testing build
pnpm --filter @terra-symposium/testing test
pnpm --filter @terra-symposium/testing quality:all
```

## Deployment and operations

Publish the npm package through the Standards Changesets workflow. Pin the Action to a reviewed commit SHA in consumer workflows and pass its `manifest` input. The Action runs one plan in one job.

## Data, privacy, and limitations

The runner executes the configured commands and does not provide their credentials, browsers, databases, or other services. Its ownership check maps test files to suites; it does not prove assertion quality.

## References

See [test plans and ownership](../../docs/testing/0-getting-started/test-plan.mdx) and [CI integration](../../docs/testing/1-ci/ci-integration.mdx).

## Contributing

Keep the manifest as the single suite inventory. When reorganizing tests, account for moved, merged, or retired assertions and update the guide. Add a Changeset for a published behavior change.

## Credits and license

Apache-2.0. See the repository [LICENSE](../../LICENSE).
