# @terra-symposium/standards-quality-core

Shared public contracts and source-scope utilities for Terra quality capability packages. This package is API-only; install a capability package for a CLI.

## Install

```sh
pnpm add @terra-symposium/standards-quality-core
```

## API

```ts
import { loadQualityConfig, qualityScope, createQualityAnalysis, srcFiles, workingSrcFiles } from '@terra-symposium/standards-quality-core';
```

`loadQualityConfig()` reads `quality.json` from the current repository root, or `config/quality.json` as a fallback, and resolves `root`, `configRoot`, and source roots. `createQualityAnalysis()` builds a shared TypeScript program and file cache. `srcFiles()` and `workingSrcFiles()` implement the configured and changed-file scopes used by capability CLIs.

The package also exports `QualityCfg`, `QualityScope`, `QualityOptions`, `CapabilityOptions`, check and autofix names, config toggle helpers, source-kind helpers, and progress utilities as TypeScript declarations. It contains no aggregate phase orchestration or repository-command runner.
