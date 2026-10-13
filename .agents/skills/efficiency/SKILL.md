---
name: efficiency
description: Measure package and repository workflow runtime, identify evidenced bottlenecks, and recommend or implement safe speed improvements when requested.
---

# Efficiency

Use this skill when a package command, quality pipeline, build, report, or multi-repository workflow needs a measured performance audit. Separate observed costs from hypotheses and rank recommendations by expected time saved, confidence, implementation effort, and regression risk.

## Measure before proposing changes

1. Identify the exact command, package scope, runtime, and current source state. Read repository guidance and the command's scripts/configuration first. Preserve existing work; use an isolated worktree when a command can mutate files.
2. Capture a reproducible baseline. Record wall time for the whole command and each named stage where available, input counts (files, packages, API calls), warnings/errors, concurrency, and cold versus warm state. Repeat matched measurements when practical and record the run count and spread; distinguish stable gains from normal timing noise. Use shell timing or built-in progress/report output; add temporary instrumentation only when existing output cannot locate the cost.
3. Trace the slowest stage to the repeated work that causes it: process launches, filesystem walks, parsing/type-program creation, network calls, serial dependencies, repeated scans, or oversized output. Check CPU, memory, and I/O contention before increasing concurrency.
4. Keep the run's complete result visible. A faster command that skips configured checks, hides warnings, suppresses errors, or silently falls back is not an improvement.

If the configured command mutates source, inspect its fix behavior and repository status before running it. Prefer an existing read-only/warn mode or a disposable worktree for baseline measurement.

## Quality and source-analysis pipelines

Look for multiple whole-repository passes that revisit the same files. Where checks share an input inventory or parse result, reuse it within one run. Where a stage makes several safe edits to one file, combine them into one read/parse/edit/write cycle. Preserve ordering when an earlier fix changes what a later detector can discover.

For ESLint-backed dead-code work, first determine which rule supplies the finding. If only an unused-declaration rule is needed, evaluate that configured rule with the resolved parser/plugin/settings instead of rerunning every lint rule in repeated batches. Keep a fail-closed path to the repository's full configured command whenever the focused configuration cannot be proven equivalent. Respect process argument limits and batch by encoded byte size; escape literal file paths when passed as patterns. Reuse import-consumer inventories and type baselines once per run when their inputs remain unchanged.

After safe edits, recheck only changed files for newly exposed cascaded findings when dependency analysis says that is complete. Retain one full initial inventory when cross-file imports or exports matter. Rebuild expensive type or import indexes once per run and share them between fixers; invalidate or rebuild when relevant files/configuration change. Never reuse stale results across runs without a reliable cache key and invalidation rule.

Prefer one measured sweep with multiple compatible findings per file over a sequence of tool launches. Do not merge checks whose semantics, configuration, ordering, or failure behavior differ merely to reduce the displayed number of stages.

## Reporting and parallel work

Model the workflow as a dependency graph. Run independent package checks, report sources, or repository audits concurrently when they do not contend for the same scarce CPU, memory, disk, credentials, or rate limit. Use bounded concurrency and compare total wall time; more workers can make the workflow slower.

For multi-repository or package-level work, delegate independent scopes to subagents when setup and coordination cost is justified. Give each agent a disjoint repository/package or read-only audit, the same measurement contract, and a concise result format: command and scope, baseline duration, stage timings, findings, evidence, and proposed change. Do not delegate overlapping edits to a shared checkout. Use isolated worktrees for parallel changes, then consolidate results once and preserve each worker's warnings and failures.

Reports should fetch independent local or API sources concurrently where practical, apply bounded request concurrency, and preserve per-source timing and failure status. Aggregate only after all sources settle so one failure does not erase successful findings. Avoid requiring hosted CI or GitHub Actions when the same authorized data can be measured through local commands, GitHub CLI/API, or another available interface. Respect access controls, API limits, and repository policy.

## Recommend and verify

For every recommendation, state the measured bottleneck, proposed change, expected benefit, confidence, effort, and risk. Prioritize fewer redundant scans/processes and reuse of stable per-run work before speculative caching or broad rewrites. If asked to implement, change the smallest appropriate package boundary, retain complete diagnostics and safe fallbacks, and compare the same command and scope against the baseline.

Report results in this shape:

| Command and scope | Baseline (runs and spread) | After (runs and spread) | Result counts and warnings |
| --- | --- | --- | --- |
| Exact command | Duration and input count | Duration and input count, or not measured | Findings, failures, and warnings |

Follow with the measured bottleneck and ranked recommendations or implemented changes, each with expected benefit, confidence, effort, and risk. State material regressions and unmeasured assumptions.
