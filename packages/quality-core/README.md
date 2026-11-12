# @terra-symposium/standards-quality-core

Shared public contracts and source-scope utilities for Terra quality capability packages. This package is API-only; install a capability package for a CLI.

## Install

```sh
pnpm add @terra-symposium/standards-quality-core
```

## API

```ts
import { loadQualityConfig, qualityScope, createQualityAnalysis, srcFiles, nonProgramSrcFiles, workingSrcFiles } from '@terra-symposium/standards-quality-core';
```

`loadQualityConfig()` reads `quality.json` from the current repository root, or `config/quality.json` as a fallback, and resolves `root`, `configRoot`, and source roots. `createQualityAnalysis()` builds a shared TypeScript program and file cache. `srcFiles()` and `workingSrcFiles()` implement the configured and changed-file scopes used by capability CLIs. `nonProgramSrcFiles()` returns configured JS/TS-suffix candidates that the same classifier recognizes as captured text, generated bundles, or archived `.agents/personas/gems` attachments. Aggregate Quality uses that inventory to keep Knip aligned with the code scope without adding repository-specific source ignores. When `knipPackageMappings` is configured, the aggregate runner adds only package names imported by mapped source files and declared by the mapped manifest to its temporary Knip overlay. The mapping recognizes static imports, resolver calls, and stylesheet package imports; undeclared imports and unused declarations remain findings. Configured executables are also modeled in a temporary overlay, which is never written to consumer configuration files.

The package also exports `QualityCfg`, `QualityScope`, `QualityOptions`, `CapabilityOptions`, check and autofix names, config toggle helpers, source-kind helpers, and progress utilities as TypeScript declarations. It contains no aggregate phase orchestration or repository-command runner.
