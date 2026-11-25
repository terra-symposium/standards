# Terra Symposium Standards

Terra Symposium Standards gives project teams shared tools and guidance for reliable development.

This workspace publishes [Hygiene](packages/hygiene/README.md),
[Boundaries](packages/error-boundaries/README.md), [Reporting](packages/reporting/README.md), and
[Testing](packages/testing/README.md). Hygiene provides the repository checker and focused APIs
through one package with named subpath exports. The other packages provide React error boundaries,
Playwright evidence, and test orchestration.

## Get started

Use Node.js 22.19.0 and pnpm 10.30.3 for workspace development. Individual package runtime
requirements are documented in their READMEs.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm run test
```

## Usage

Install only the packages a consuming project needs:

```sh
pnpm add -D @terra-symposium/hygiene
pnpm add @terra-symposium/boundaries
pnpm add -D @terra-symposium/reporting @playwright/test
pnpm add -D @terra-symposium/testing
```

Hygiene runs on changed and untracked files by default. Use `--all` for the configured full scope
and `--warn` for a read-only run:

```sh
pnpm exec hygiene
pnpm exec hygiene quality --all
pnpm exec hygiene quality --all --warn
```

See the
[Hygiene setup guide](https://standards-docs.netlify.app/hygiene/0-getting-started/overview/) for
configuration and the [package migration guide](docs/hygiene/5-operations/migration.mdx) for the
former `standards-*` names.

## Configuration

Each consumer owns its `quality.json`, native tool settings, application policy, credentials, and
test services. Keep secrets in the consuming environment; do not put values in package configuration
or documentation. The
[configuration reference](https://standards-docs.netlify.app/hygiene/0-getting-started/overview/)
describes available checks and autofixes.

## Validation

| Command                | Checks                        |
| ---------------------- | ----------------------------- |
| `pnpm run quality`     | Changed and untracked files   |
| `pnpm run quality:all` | Full configured Hygiene scope |
| `pnpm run test`        | Project test suite            |
| `pnpm run build`       | Build output                  |
| `pnpm run docs:build`  | Documentation build           |

Hygiene can apply safe fixes; review the diff before committing. No separate browser or Playwright
test command is defined here. Historical development standards and commenting notes are consolidated
in [the development guidance](docs/developer/recovered-standards.md).

## Contributing

`packages/` contains publishable code. `config/` contains workspace scripts and tool settings.
`docs/` contains the site and agent guidance. `tests/` contains the shared test plan and integration
coverage. Generated output belongs in `dist/`.

Start the documentation site with `pnpm run docs`; build static output with `pnpm run docs:build`.
The [agent skills](.agents/README.md) provide task-specific repository workflows.

`pnpm run verify` runs Hygiene, tests, build, and the docs build in sequence. Hygiene applies
supported safe fixes by default, so review its diff before committing.

Read [Contribute to Standards](docs/contributing/0-workspace/getting-started.mdx). Update public
APIs, package READMEs, and site guidance together when a contract changes.

Open a pull request against `development` and review the results of
[`quality.yml`](.github/workflows/quality.yml) before merging. Keep unrelated changes out of the
pull request.

## Documentation

Published package changes use Changesets and the development-branch release workflow. The
documentation site is built from `docs/`. See the
[release guide](docs/contributing/3-releases/package-release.mdx) for versioning and publication.

The packages do not provision application credentials, external tools, databases, or browser
services. A successful static Hygiene run does not establish runtime correctness; run the consuming
project's builds and functional tests separately.

- [Standards documentation](https://standards-docs.netlify.app/)
- [Hygiene package map](docs/hygiene/1-packages/package-map.mdx)
- [Test plan](config/tests.json)

## License

Maintained by Terra Symposium. See [LICENSE](LICENSE) for license terms.
