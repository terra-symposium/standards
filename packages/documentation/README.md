# @terra-symposium/standards-documentation

TSDoc/JSDoc and Doxygen analysis, empty scaffolding, and documented shell-command checks.

## Install

```sh
pnpm add -D @terra-symposium/standards-documentation
```

The package requires Node.js `>=18.18`. It reads the repository's existing `quality.json`, falling back to `config/quality.json`; it does not introduce another configuration file. The root or config file may be selected with `--config PATH`.

## CLI

```sh
pnpm exec terra-documentation
pnpm exec terra-documentation --warn
pnpm exec terra-documentation --config config/quality.json --all
```

With no file arguments, the CLI checks changed and untracked source files in the Git worktree. `--all` checks the configured source roots. `--warn` is read-only and disables fixes. Findings are emitted as JSON lines; findings set a failing exit status.

## API

```ts
import { documentationFindings, documentSrcFile, documentedCommandFindings, fixDocumentedCommands } from '@terra-symposium/standards-documentation';
```

The package root is the supported API surface and ships TypeScript declarations. The CLI is also available from the `./cli` export.

## Aggregate runner

Install `@terra-symposium/standards-quality` when you need the full ordered workflow, repository commands, combined reports, or existing `terra-quality` commands. This capability package can also run by itself for a focused integration.
