# Standards

Standards is a pnpm workspace of reusable packages maintained for Terra Symposium applications. It provides repository quality tooling, React error-boundary helpers, and test-evidence reporting.

## Packages

| Package                                                                                                | Purpose                                                                                               | Runtime requirements                                                         |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`@terra-symposium/standards-quality`](https://www.npmjs.com/package/@terra-symposium/standards-quality)                   | Configurable JavaScript and TypeScript quality checks, safe maintenance, and the `terra-quality` CLI. | Node.js `>=18.18`                                                            |
| [`@terra-symposium/standards-error-boundaries`](https://www.npmjs.com/package/@terra-symposium/standards-error-boundaries) | React error boundaries plus status-copy and route-error helpers.                                      | React and React DOM `>=18`                                                   |
| [`@terra-symposium/standards-reporting`](https://www.npmjs.com/package/@terra-symposium/standards-reporting)               | Responsive Playwright evidence, diagnostics, spreadsheets, slideshows, and load timings.              | Node.js `>=18.18`; `@playwright/test >=1.52.0 <2` for Playwright integration |

All three packages are configured for public npm publication. Consumers install them from npm without a Terra registry token. The CI release workflow uses the repository's `NPM_TOKEN` secret to publish versions.

## Documentation

Read the [Standards documentation](https://standards-docs.netlify.app/) for setup guides, configuration references, package APIs, and contribution instructions. The site source lives in [`docs/`](docs/).

## Install a package

Install only the package your application uses:

```sh
# Terra Quality
pnpm add -D @terra-symposium/standards-quality

# React boundary helpers
pnpm add @terra-symposium/standards-error-boundaries

# Playwright reporting
pnpm add -D @terra-symposium/standards-reporting @playwright/test
```

For Terra Quality, add a `quality.json` in the repository root and start with:

```json
{
	"$schema": "./node_modules/@terra-symposium/standards-quality/quality.schema.json",
	"sourceRoots": ["src"],
	"extensions": [".js", ".jsx", ".ts", ".tsx"],
	"enabledChecks": {
		"format": false,
		"lint": false,
		"knip": false,
		"dead-code": false
	}
}
```

Then run `pnpm exec terra-quality`. See the [quality setup guide](https://standards-docs.netlify.app/packages/quality/setup/) for the full workflow.

## Develop this repository

Use Node.js `22.19.0` and pnpm `10.30.3` to match CI. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm quality:all
```

Work on or preview the documentation site with:

```sh
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

Package changes use [Changesets](https://github.com/changesets/changesets). Add a changeset for a publishable package change with `pnpm changeset`; documentation-only changes do not require a package version bump. Pull requests and pushes to `main` run the repository quality workflow. The release workflow versions and publishes packages after changesets are merged.

## Project boundaries

These packages provide reusable primitives. Each consuming repository remains responsible for its application-specific source paths, framework integration, fallback UI, credentials, services, deployment policy, and domain tests.
