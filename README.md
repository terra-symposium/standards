# Terra Symposium Standards

A pnpm workspace and npm publisher for Terra's shared quality, error-boundary, testing, and reporting packages, with a documentation site for using them.

## Getting started

The workspace requires Node.js and pnpm 10.30.3. From the repository root, install dependencies and start the documentation site:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

`pnpm docs:dev` starts the standards documentation site. `pnpm test` builds the workspace packages and runs the shared test manifest.

The published packages are:

- `@terra-symposium/standards-quality`: repository checks and maintenance tools.
- `@terra-symposium/standards-error-boundaries`: React error boundaries.
- `@terra-symposium/standards-testing`: shared CI checks and test execution.
- `@terra-symposium/standards-reporting`: Playwright evidence reporting.

### Commands

From the repository root, run `pnpm quality` and `pnpm test`.

## Security and Limitations

`.env.example` documents configuration names, not secret values. Keep credentials in the approved secret store; do not commit local environment files or tokens.

## Structure

`packages/` contains the four publishable packages; `docs/` contains the standards site and agent guidance. `.terra-tests.json` defines the shared test inventory; root scripts build packages and run quality checks.

## References

- [Shared test manifest](.terra-tests.json)
- [Workspace manifest](pnpm-workspace.yaml)
- [Environment variable names](.env.example)
- [Quality package docs](packages/quality/README.md)
- [Testing package docs](packages/testing/README.md)
- [Reporting package docs](packages/reporting/README.md)

## Contributing

Use a changeset for package-facing changes and follow the package contribution guidance.

## Credits and license

No root license file is present. Check each package's license declaration before reuse.
