# @terra-symposium/standards-ui-quality

Accessibility, display-name, React error-boundary, and UI component recommendation APIs.

## Install

```sh
pnpm add -D @terra-symposium/standards-ui-quality
```

The package requires Node.js `>=18.18`. It reads the repository's existing `quality.json`, falling back to `config/quality.json`; it does not introduce another configuration file. The root or config file may be selected with `--config PATH`.

## CLI

```sh
pnpm exec terra-ui-quality
pnpm exec terra-ui-quality --warn
pnpm exec terra-ui-quality --config config/quality.json --all
```

With no file arguments, the CLI checks changed and untracked source files in the Git worktree. `--all` checks the configured source roots. `--warn` is read-only and disables fixes. Findings are emitted as JSON lines; findings set a failing exit status.

## API

```ts
import { accessibilityFindings, displayNameFindings, errorBoundaryFindings, uiComponentRecommendations } from '@terra-symposium/standards-ui-quality';
```

The package root is the supported API surface and ships TypeScript declarations. The CLI is also available from the `./cli` export.

## Aggregate runner

Install `@terra-symposium/standards-quality` when you need the full ordered workflow, repository commands, combined reports, or existing `terra-quality` commands. This capability package can also run by itself for a focused integration.
