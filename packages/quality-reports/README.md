# @terra-symposium/standards-quality-reports

GitHub and history reports plus Node and Playwright reporter APIs.

## Install

```sh
pnpm add -D @terra-symposium/standards-quality-reports
```

The package requires Node.js `>=18.18`. It reads the repository's existing `quality.json`, falling back to `config/quality.json`; it does not introduce another configuration file. The root or config file may be selected with `--config PATH`.

## CLI

```sh
pnpm exec terra-quality-reports github --config config/quality.json
pnpm exec terra-quality-reports history --config config/quality.json --report-json history.json
```

The `github` and `history` subcommands read the shared config. `--all` and `--warn` are accepted for consistency; these report builders are read-only unless `history --report-json PATH` writes the requested report file.

## API

```ts
import { buildGitHubReport, createHistoryReport, qualityNodeReporter, QualityPlaywrightReporter } from '@terra-symposium/standards-quality-reports';
```

The package root is the supported API surface and ships TypeScript declarations. The CLI is also available from the `./cli` export.

## Aggregate runner

Install `@terra-symposium/standards-quality` when you need the full ordered workflow, repository commands, combined reports, or existing `terra-quality` commands. This capability package can also run by itself for a focused integration.
