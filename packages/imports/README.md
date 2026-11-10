# @terra-symposium/standards-imports

Local import resolution and duplicate import findings.

## Install

```sh
pnpm add -D @terra-symposium/standards-imports
```

The package requires Node.js `>=18.18`. It reads the repository's existing `quality.json`, falling back to `config/quality.json`; it does not introduce another configuration file. The root or config file may be selected with `--config PATH`.

## CLI

```sh
pnpm exec terra-imports
pnpm exec terra-imports --warn
pnpm exec terra-imports --config config/quality.json --all
```

With no file arguments, the CLI checks changed and untracked source files in the Git worktree. `--all` checks the configured source roots. `--warn` is read-only and disables fixes. Findings are emitted as JSON lines; findings set a failing exit status.

## API

```ts
import { checkImports, duplicateImportFindings } from '@terra-symposium/standards-imports';
```

The package root is the supported API surface and ships TypeScript declarations. The CLI is also available from the `./cli` export.

## Aggregate runner

Install `@terra-symposium/standards-quality` when you need the full ordered workflow, repository commands, combined reports, or existing `terra-quality` commands. This capability package can also run by itself for a focused integration.
