# Reporting

Reporting helps teams collect useful evidence from browser tests.

Reporting normalizes Playwright results and writes review artifacts. The consuming repository owns
its scenarios, authentication, browser setup, uploads, and retention policy.

## Get started

Node.js `>=18.18` and `@playwright/test >=1.52.0 <2` for Playwright integration.

```sh
pnpm add -D @terra-symposium/reporting @playwright/test
```

## Usage

Add the responsive project helper to an existing Playwright config:

```ts
import { defineConfig } from '@playwright/test';
import { withResponsivePlaywright } from '@terra-symposium/reporting/viewports';

export default withResponsivePlaywright(defineConfig({ projects: [{ name: 'chromium' }] }), {
	outputRoot: 'tests/results/visual',
});
```

The package also exports `/playwright` for `visualTest`, `diagnosticsTest`, and `loadTest`;
`/load-testing` for timing helpers; `/spreadsheet` and `/slideshow` for artifact writers; and
`/core` for shared result types. See the
[reporting guide](../../docs/reporting/0-getting-started/overview.mdx) for options and examples.

## Configuration

`loadTest` reads `loadTesting` from `quality.json` by default. Configure Playwright authentication
and storage in the consuming repository. Review screenshots and diagnostics before sharing them
because they may contain application data.

## Validation

| Command                | Checks                        |
| ---------------------- | ----------------------------- |
| `pnpm run quality:all` | Full configured Quality scope |
| `pnpm run test`        | Unit or project tests         |
| `pnpm run build`       | Build output                  |

Quality can apply safe fixes; review the diff before committing. No separate browser or Playwright
test command is defined here.

## Contributing

`src/` owns the public helpers; `tests/` covers their behavior. Visual artifacts are written under
`tests/results/visual`; Playwright output defaults to `tests/results/playwright-output`.

Update the relevant guide and focused tests with changes to artifact formats or public helpers. Add
a Changeset for a published behavior change.

Open changes through the repository pull-request workflow; see the [root README](../../README.md).

## Documentation

The package is published through the Standards Changesets release workflow. CI must upload or retain
generated artifacts according to the consuming repository's policy.

The reporter labels captures from older or partial runs as `HISTORICAL CAPTURE`; it does not count
them as current coverage. Repeated scenario and viewport captures replace earlier files. Browser
evidence does not prove behavior outside the executed tests and viewports.

See [Playwright evidence](../../docs/reporting/2-playwright/playwright-evidence.mdx),
[artifacts](../../docs/reporting/4-artifacts/artifacts.mdx), and
[load testing](../../docs/reporting/3-load-testing/load-testing.mdx).

## License

Maintained by Terra Symposium. See the repository [LICENSE](../../LICENSE).
