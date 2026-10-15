---
name: efficiency
description: Measure workflow runtime and improve evidenced bottlenecks.
---

# Efficiency

Use this skill to measure commands, builds, reports, and repository workflows.
Separate observations from hypotheses.
Rank changes by expected time saved, confidence, effort, and risk.

## Workflow

1. Read repository guidance and the command's scripts or configuration.
2. Record the command, package scope, runtime, and source state.
3. Preserve existing work. Use a worktree if the command may edit files.
4. Measure the whole command and named stages when available.
5. Record input counts, warnings, errors, concurrency, and cache state.
6. Repeat matched runs when practical. Record run count and timing spread.
7. Add instrumentation only when existing output cannot locate the cost.
8. Trace the slowest stage to repeated work.
9. Check CPU, memory, and I/O before raising concurrency.
10. Keep all configured checks, warnings, and errors visible.

Do not call a run faster if it skips checks, hides warnings, suppresses errors,
or silently falls back. Inspect mutating commands before running them.
Prefer read-only modes or a disposable worktree for baseline measurements.

## Reduce Repeated Work

- Reuse inventories and parse results when inputs remain unchanged.
- Combine compatible edits to one file into a single write.
- Preserve order when an earlier fix changes later findings.
- Keep a full inventory when imports or exports cross files.
- Rebuild indexes when relevant files or configuration change.
- Never reuse results across runs without reliable cache invalidation.

For ESLint dead-code work, identify the rule behind the finding.
Run only the unused-declaration rule when its resolved configuration is known.
Keep a fail-closed path to the full command unless equivalence is proven.
Respect argument limits; batch by encoded byte size and escape literal paths.
Reuse import inventories and type baselines within each unchanged run.

Do not combine checks with different setup, order, or failure behavior.

## Parallel Work and Reports

- Model tasks as a dependency graph.
- Run independent work concurrently when resources and limits allow.
- Bound concurrency and compare total wall time; more workers may be slower.
- Delegate disjoint scopes only when coordination costs are justified.
- Use isolated worktrees for parallel changes; never overlap edits in one checkout.
- Give workers the same measurement and reporting contract.
- Keep all worker warnings and failures in the consolidated report.
- Fetch independent sources concurrently when practical.
- Record each source's duration and status before aggregating results.
- Respect access controls, API limits, credentials, and repository policy.

Use authorized local commands or APIs instead of hosted CI when equivalent.
One failed source must not hide results from the others.

## Verify and Report

For each recommendation, state the measured bottleneck and proposed change.
Include expected benefit, confidence, effort, and risk.
Prefer removing duplicate work over speculative caches or broad rewrites.
When implementing, change the smallest suitable package boundary.
Keep full diagnostics and safe fallbacks.
Compare the same command and scope with the baseline.

| Command | Before | After | Result |
| --- | --- | --- | --- |
| Exact + scope | Runs + duration | Runs or unmeasured | Counts + warnings |

Rank recommendations by benefit, confidence, effort, and risk.
State regressions and unmeasured assumptions.
