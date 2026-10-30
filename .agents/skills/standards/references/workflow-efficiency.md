# Workflow efficiency

Use this guide for measured audits of commands, builds, reports, and repository workflows. Separate observed costs from hypotheses. Rank recommendations by time saved, confidence, effort, and regression risk.

## Measure before proposing changes

1. Identify the command, package scope, runtime, and source state. Read repository guidance and command scripts/config first. Preserve existing work. Use an isolated worktree for mutating commands.
2. Measure a reproducible baseline. Record total and per-stage time, input counts, warnings, and errors. Record concurrency and cold/warm state. Repeat matched runs when practical; report run count and spread. Distinguish stable gains from timing noise. Use shell timing or built-in reports. Add instrumentation only when needed.
3. Trace each slow stage to its underlying work. Check repeated launches, scans, parsing, and network calls. Also check serial dependencies and oversized output. Check CPU, memory, and I/O contention before increasing concurrency.
4. Keep the full result visible. Keep all checks, warnings, errors, and fallbacks visible.

If a command mutates source, inspect its fixes and Git status first. Prefer read-only/warn mode or a disposable worktree for measurement.

## Quality and source-analysis pipelines

Find repeated whole-repository passes. Reuse shared inventories and parse results within one run. Combine safe edits to one file into a single read/parse/write cycle. Preserve ordering when earlier fixes affect later detection.

For ESLint dead-code work, identify the rule that reports the finding. If only unused declarations matter, run that rule with resolved config. Use the full command unless focused config is proven equivalent. Respect argument limits; batch by encoded size and escape file patterns. Reuse import inventories and type baselines while their inputs stay unchanged.

After safe edits, recheck changed files when dependency analysis is complete. Keep a full initial inventory when cross-file imports/exports matter. Build expensive indexes once and share them between fixers. Invalidate them when relevant files or config change. Never reuse stale results across runs without reliable cache invalidation.

Prefer one measured sweep for compatible findings in a file. Keep checks separate when their semantics, config, order, or failure behavior differ.

## Reporting and parallel work

Model work as a dependency graph. Run independent checks concurrently when they do not compete for resources. Bound concurrency and compare wall time; more workers can be slower.

Delegate independent scopes when setup cost is justified. Give agents disjoint repos/packages or read-only audits and a shared measure plan. Ask for command, scope, baseline, stage times, findings, evidence, and proposals. Never delegate overlapping edits in one checkout. Use isolated worktrees for parallel edits; consolidate once. Preserve every worker's warnings and failures.

Fetch independent local/API sources concurrently when practical. Bound request concurrency and preserve per-source timing and failures. Aggregate after all sources settle so failures do not erase successful results. Use local or authorized GitHub data when it can replace hosted CI. Respect access controls, API limits, and repository policy.

## Recommend and verify

For each recommendation, state its bottleneck, change, benefit, confidence, effort, and risk. Prioritize fewer scans and stable per-run reuse over speculative caching. When asked to implement, change the smallest package boundary. Keep full diagnostics and safe fallbacks. Compare against the same baseline.

Report results in this shape:

| Command and scope | Baseline (runs, spread, inputs) | After (runs, spread, inputs) | Findings and warnings |
| --- | --- | --- | --- |
| Exact command | Duration and input count | Duration and input count, or not measured | Result counts, failures, and warnings |

Then list measured bottlenecks and ranked recommendations or changes. For each, state benefit, confidence, effort, and risk. Report material regressions and unmeasured assumptions.
