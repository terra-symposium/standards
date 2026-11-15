# Terra Symposium Standards

Shared packages and documentation for Terra Symposium projects.

## What it does

This workspace publishes [Quality](packages/quality/README.md), [Boundaries](packages/error-boundaries/README.md), [Reporting](packages/reporting/README.md), and [Testing](packages/testing/README.md). Quality provides the repository checker and focused APIs through one package with named subpath exports. The other packages provide React error boundaries, Playwright evidence, and test orchestration.

## Prerequisites

Use Node.js 22.19.0 and pnpm 10.30.3 for workspace development. Individual package runtime requirements are documented in their READMEs.

## Get started

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm run test
```

## Usage

Install only the packages a consuming project needs:

```sh
pnpm add -D @terra-symposium/quality
pnpm add @terra-symposium/boundaries
pnpm add -D @terra-symposium/reporting @playwright/test
pnpm add -D @terra-symposium/testing
```

Quality runs on changed and untracked files by default. Use `--all` for the configured full scope and `--warn` for a read-only run:

```sh
pnpm exec terra-quality
pnpm exec terra-quality quality --all
pnpm exec terra-quality quality --all --warn
```

See the [Quality setup guide](https://standards-docs.netlify.app/quality/0-getting-started/overview/) for configuration and the [package migration guide](docs/quality/5-operations/migration.mdx) for the former `standards-*` names.

## Configuration and security

Each consumer owns its `quality.json`, native tool settings, application policy, credentials, and test services. Keep secrets in the consuming environment; do not put values in package configuration or documentation. The [configuration reference](https://standards-docs.netlify.app/quality/0-getting-started/overview/) describes available checks and autofixes.

## Development and structure

`packages/` contains publishable code. `config/` contains workspace scripts and tool settings. `docs/` contains the site and agent guidance. `tests/` contains the shared test plan and integration coverage. Generated output belongs in `dist/`.

Start the documentation site with `pnpm run docs`; build static output with `pnpm run docs:build`. The [agent guides](docs/agents/) provide task-specific repository workflows.

## Validation

Run the full workspace checks before review:

```sh
pnpm run quality:all
pnpm run test
pnpm run build
pnpm run docs:build
git diff --check
```

`pnpm run verify` runs Quality, tests, build, and the docs build in sequence. Quality applies supported safe fixes by default, so review its diff before committing.

## Deployment and operations

Published package changes use Changesets and the development-branch release workflow. The documentation site is built from `docs/`. See the [release guide](docs/contributing/3-releases/package-release.mdx) for versioning and publication.

## Data, privacy, and limitations

The packages do not provision application credentials, external tools, databases, or browser services. A successful static Quality run does not establish runtime correctness; run the consuming project's builds and functional tests separately.

## References

- [Standards documentation](https://standards-docs.netlify.app/)
- [Quality package map](docs/quality/1-packages/package-map.mdx)
- [Test plan](config/terra-tests.json)

## Contributing

Read [Contribute to Standards](docs/contributing/0-workspace/getting-started.mdx). Update public APIs, package READMEs, and site guidance together when a contract changes.

## Credits and license

Maintained by Terra Symposium. See [LICENSE](LICENSE) for license terms.
