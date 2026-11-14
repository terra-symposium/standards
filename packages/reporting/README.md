# Reporting

Reusable Playwright evidence reporting: normalizes test results, viewport data, and load grades, then writes spreadsheet and slideshow artifacts.

## What it does

Not applicable.

## Prerequisites

Not applicable.

## Get started

### Install

```sh
pnpm add -D @terra-symposium/standards-reporting @playwright/test
```

From `standards/main/`, run `pnpm install`, then `pnpm --filter @terra-symposium/standards-reporting test` to validate the reporting package.

## Usage

### Configure responsive projects

```ts
import { defineConfig } from '@playwright/test';
import { withResponsivePlaywright } from '@terra-symposium/standards-reporting/viewports';

## Structure

`src/` exports reporting helpers; `tests/` covers the API; `.agents/skills/` contains maintainer guidance. The package depends on Playwright and Office artifact libraries.

A timestamped directory under `tests/results/visual` contains the workbook, slideshow, and copied screenshots. Each Playwright result screenshot and keyed visual capture is also stored with metadata under `tests/results/visual/screenshots`. Repeated tests/viewport captures replace their previous file, and each new slideshow is rebuilt from the whole folder, so interrupted and subset runs retain earlier evidence. The run marker records the current test and viewport inventory across processes in the same logical run; captures outside that inventory, from older runs, or from legacy folders are visibly labeled `HISTORICAL CAPTURE` and never counted as current coverage. The Playwright output directory defaults to `tests/results/playwright-output`.

### More capabilities
- Import `diagnosticsTest` from `/playwright` to attach browser console, page, and request failures.

Import `loadTest` to measure named operations and capture page-navigation timings. It reads
`loadTesting` from `quality.json` by default.

Import `visualTest` to call `visuals.capture(key)` anywhere inside a Playwright test. Matching keys
are grouped across responsive projects. The reporter writes `report.pptx` as screenshot-backed
responsive slides by default; set `screenshotOnlySlideshow: false` to use the diagnostic review
slideshow instead.

Import `writeScreenshotSlideshowFromDirectory` from `/slideshow` to rebuild a screenshot deck from
persisted evidence without running Playwright. It reads one capture directory or a nested folder of
repository capture directories, prefixes nested sources in the slide titles, and selects the newest
capture when a scenario/viewport was repeated. Omit run IDs to include partial and historical
captures, pass `currentRunId` for one run, or pass one or more `currentRunIdsBySource` values to
select runs per nested repository folder.

Use `/spreadsheet` and `/slideshow` to write artifacts from normalized results without using the
Playwright reporter.

- Use `/core`, `/viewports`, and `/load-testing` for shared types and helpers.

The repository remains responsible for test scenarios, authentication, browser setup, CI uploads, and retention. See the [reporting guide](https://standards-docs.netlify.app/reporting/0-getting-started/overview/) for complete options and output details.

## Configuration and security

Not applicable.

## Development and structure

Not applicable.

## Validation

Not applicable.

## Deployment and operations

Not applicable.

## Data, privacy, and limitations

Not applicable.

## References

Not applicable.

## Contributing

Not applicable.

## Credits and license

Not applicable.
```
