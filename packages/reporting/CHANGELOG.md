# @terra-symposium/standards-reporting

## 0.6.1

### Patch Changes

- 4486044: Aggregate expected and completed screenshot coverage across sequential viewport processes that share one logical run ID.
- 27167fa: Compose existing Playwright project filters with declared viewport tags so ownership filters and viewport selection can be used together.
- 7770132: Defer screenshot-only slideshow rebuilds until the final viewport process in a shared matrix run.
- b369903: Mark screenshots from prior Playwright runs as historical in regenerated slideshow decks.

## 0.6.0

### Minor Changes

- 3375c1d: Allow Playwright scenarios to declare their selected viewport projects and supply a custom viewport catalog while preserving the existing all-viewport default.

### Patch Changes

- 59196ba: Resolve screenshot sidecar paths relative to the capture directory when regenerating a slideshow.

## 0.5.0

### Minor Changes

- d00b64a: Persist Playwright screenshots across runs and rebuild the default PowerPoint from the accumulated evidence folder.

## 0.4.0

### Minor Changes

- Add keyed screenshot capture fixtures and responsive screenshot-only slideshow output.

## 0.3.0

### Minor Changes

- Add reusable Playwright evidence fixtures and neutral spreadsheet and slideshow reporters for Terra repositories.

## 0.2.2

### Patch Changes

- Add configurable Playwright load timing budgets and reporting.

## 0.2.1

### Patch Changes

- Remove a duplicate Playwright fixture alias and sanitize control characters in evidence text.

## 0.2.0

### Minor Changes

- Add a shared responsive Playwright config helper that runs regular projects at all six default viewports, captures full-page screenshots, and produces consolidated responsive slides and spreadsheet results.
