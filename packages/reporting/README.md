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

A timestamped directory under `test-results/visual` contains the workbook, slideshow, and copied screenshots. Each Playwright result screenshot and keyed visual capture is also stored with metadata under `test-results/visual/screenshots`. Repeated test/viewport captures replace their previous file, and each new slideshow is rebuilt from the whole folder, so interrupted and subset runs retain earlier evidence. The Playwright output directory defaults to `test-results/playwright-output`.

## More capabilities

- Import `diagnosticsTest` from `/playwright` to attach browser console, page, and request failures.
- Import `loadTest` to measure named operations and capture page-navigation timings. It reads `loadTesting` from `quality.json` by default.
- Import `visualTest` to call `visuals.capture(key)` anywhere inside a Playwright test. Matching keys are grouped across responsive projects. The reporter writes `report.pptx` as image-only responsive screenshot slides by default; set `screenshotOnlySlideshow: false` to use the diagnostic review slideshow instead.
- Import `writeScreenshotSlideshowFromDirectory` from `/slideshow` to rebuild an image-only deck from persisted screenshot evidence without running Playwright.
- Use `/spreadsheet` and `/slideshow` to write artifacts from normalized results without using the Playwright reporter.
- Use `/core`, `/viewports`, and `/load-testing` for shared types and helpers.

The repository remains responsible for test scenarios, authentication, browser setup, CI uploads, and retention. See the [reporting guide](https://standards-docs.netlify.app/packages/reporting/) for complete options and output details.
