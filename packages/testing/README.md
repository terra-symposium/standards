# Standards Test Runner

Manifest-driven runner and CLI for repository-owned test suites, plus a GitHub Action. A versioned manifest declares commands, working directories, and suite-owned files.

## Getting started

### Commands

From `standards/main/`, run `pnpm install`, then `pnpm --filter @terra-symposium/standards-testing test` to validate the CLI and Action package.

## Security and Limitations

The runner executes commands declared by the selected manifest. Review the manifest’s commands and working directories before running an unfamiliar plan.

## Structure

`src/index.mjs` runs a plan, `src/cli.mjs` parses `terra-test run`, and [action.yml](action.yml) exposes it as a GitHub Action.

## References

See the [CLI entry point](src/cli.mjs), [Action metadata](action.yml), and [package license declaration](package.json).

## Contributing

Keep CLI and GitHub Action behavior aligned; add regression coverage in `test/` for changes.

## Credits and license

The package manifest declares [Apache-2.0](../../packages/testing/package.json); retain that license when redistributing.
