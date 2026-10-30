# @terra-symposium/standards-reporting

Reusable responsive Playwright diagnostics and evidence reports for Terra Symposium repositories.

## Install

```sh
pnpm add -D @terra-symposium/standards-reporting @playwright/test
```

The package requires Node.js `>=18.18` and has an `@playwright/test >=1.52.0 <2` peer dependency. Spreadsheet, slideshow, and image-processing dependencies are installed with the package.

## Configure responsive projects

```ts
import { defineConfig } from '@playwright/test';
import { withResponsivePlaywright } from '@terra-symposium/standards-reporting/viewports';

export default withResponsivePlaywright(
	defineConfig({
		projects: [{ name: 'web', testMatch: '**/*.spec.ts' }],
	}),
	{
		singleRunProjects: ['manual-browser-capture'],
	},
);
```

By default, regular projects run at the six shared viewport sizes. Set `PW_VIEWPORTS=mobile,lg` to select a subset. Setup projects and names listed in `singleRunProjects` run once. The helper enables full-page screenshots and the shared reporter.

A timestamped directory under `test-results/visual` contains the workbook, slideshow, and copied screenshots. Each Playwright result screenshot and keyed visual capture is also stored with metadata under `test-results/visual/screenshots`. Repeated test/viewport captures replace their previous file, and each new slideshow is rebuilt from the whole folder, so interrupted and subset runs retain earlier evidence. The run marker records the current test and viewport inventory across processes in the same logical run; captures outside that inventory, from older runs, or from legacy folders are visibly labeled `HISTORICAL CAPTURE` and never counted as current coverage. The Playwright output directory defaults to `test-results/playwright-output`.

## More capabilities

- Import `diagnosticsTest` from `/playwright` to attach browser console, page, and request failures.
- Import `loadTest` to measure named operations and capture page-navigation timings. It reads `loadTesting` from `quality.json` by default.
- Import `visualTest` to call `visuals.capture(key)` anywhere inside a Playwright test. Matching keys are grouped across responsive projects. The reporter writes `report.pptx` as screenshot-backed responsive slides by default; set `screenshotOnlySlideshow: false` to use the diagnostic review slideshow instead.
- Import `writeScreenshotSlideshowFromDirectory` from `/slideshow` to rebuild a screenshot deck from persisted evidence without running Playwright. It reads one capture directory or a nested folder of repository capture directories, prefixes nested sources in the slide titles, and selects the newest capture when a scenario/viewport was repeated. Omit run IDs to include partial and historical captures, pass `currentRunId` for one run, or pass `currentRunIdsBySource` to select one run per nested repository folder.
- Use `/spreadsheet` and `/slideshow` to write artifacts from normalized results without using the Playwright reporter.
- Use `/core`, `/viewports`, and `/load-testing` for shared types and helpers.

The repository remains responsible for test scenarios, authentication, browser setup, CI uploads, and retention. See the [reporting guide](https://standards-docs.netlify.app/packages/reporting/) for complete options and output details.
