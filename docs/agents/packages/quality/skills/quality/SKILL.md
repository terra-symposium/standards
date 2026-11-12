---
name: quality
description: Run and remediate configured quality checks across one or more Terra repositories, then report per-check results.
---

# Quality

Use this skill for any request to run or coordinate a repository quality sweep. The complete Cloud task prompt is the trigger sentence `Read and follow the Terra Standards Quality skill for this repository: <owner/repo>.` Replace the placeholder with the target GitHub repository; add no workflow instructions to the prompt unless the user has instructed a different branch or push policy. The task must locate and read this skill before acting; the trigger means follow every requirement below for that repository only.

## Single-repository Cloud run

1. Match the connected checkout to the requested repository by its remote and contents, not by folder name alone. Use the existing `development` branch and verify its remote and branch before work. Never create or switch to a task branch, worktree, or separate workspace. Record the Cloud environment, root, fetch/push remotes, branch, and initial working-tree status. Read applicable `AGENTS.md` files and repository instructions.
2. Prepare only the Cloud environment needed by the repository: use its pinned Node and package-manager versions, install dependencies from the existing lockfile, and provision required toolchains and test runtimes. Keep credentials in configured secret storage; never print or copy secret values. Do not change network/security settings, approve dependency build scripts, or alter tracked files just to get past setup.
3. From the repository root run exactly `pnpm run quality:all`, with no substituted checks or flags. Capture the literal command, start/end time (or elapsed time), exit code, and concise result. Preserve the complete output from every invocation and print the full quality log(s) in the final response, whether the run passes or fails; redact credentials, tokens, secret values, and other sensitive values without omitting ordinary diagnostic lines. If the script is missing, inspect the repository's documented quality workflow and add a `quality:all` script that forwards to the complete existing suite without weakening, skipping, or waiving checks; then rerun the exact command.
4. For setup failures, resolve safe environment prerequisites and rerun the exact command. For repository findings, inspect and safely fix in-scope causes, then rerun until the exact command exits 0. A nonzero result is work in progress: do not end the task, return a red final report, or accept remaining repository findings as a stopping point. Continue across context compactions and successive repair passes; preserve unrelated changes and review the diff before each commit. Stop only when the quality script itself cannot correctly run or a Cloud environment prerequisite cannot be safely resolved within the available access, after attempting safe recovery. In that case, report the exact blocker and full logs. An unsafe autofix is a reason to repair manually, not to stop. Never call a partial run green.
5. If the user directs progress commits, commit safe completed fixes between runs while continuing toward green, pushing those progress commits directly to `origin/development`. When green, commit any remaining task changes on `development` and push directly to `origin/development`. Never create or push a task branch and never force-push. If the tree is clean, create no empty commit; verify the remote commit. If the matching checkout, `development` branch, or required access is unavailable, stop without running checks or editing another repository.

## Concise task reports

Use this scaffold for every repository; keep `Error` and `Recommended fix` to one sentence each. Do not add narrative paragraphs. Include the full final quality log verbatim except for required secret redactions, even when it is long; include all exact-command attempts if the command had to be rerun.

````text
Repository: <remote-matched name> | Environment/root: <Cloud environment> / <checkout root>
Branch/status: <branch> / <initial status>
Quality: <PASS or BLOCKED> | `pnpm run quality:all` | <start–end or elapsed> | exit <code or not run>
Commit/push: <commit and verified remote, or none and why>
Error: <one sentence describing the first unresolved failure or blocker; omit when green>.
Recommended fix: <one sentence naming the concrete prerequisite or repository change; omit when green>.
Full quality log:
```text
<complete output from the exact command, with only secret values redacted>
````

```

For a missing checkout, report the searched roots and remotes in the `Error` sentence and name the environment/repository access needed in `Recommended fix`. For a setup failure, name the missing or denied runtime/dependency in `Error` and the safe environment preparation needed in `Recommended fix`. For a quality finding, name the failing gate and relevant result in `Error` and the smallest safe fix in `Recommended fix`, then continue working rather than returning that report as final. Keep command timing and exit status even when the command failed before checks began.

## Multi-repository sweeps

1. Discover the repositories in the requested scope from the current filesystem. Read each repository's `AGENTS.md` and use this skill's single-repository procedure for each. Exclude only repositories the user names.
2. Create and monitor requested Cloud tasks through Codex app task controls. Before each dispatch or resume, verify usage allowance, repository access, Cloud environment, branch, and model.
3. Give each task one repository only. Use only the Cloud trigger above; the skill directs the task to `pnpm run quality:all`, prerequisite handling, remediation, the concise report scaffold, and the default `development` commit and push.
4. Review each repository's diff and stage only task changes. As soon as its complete wrapper is green, commit that repository on `development` and push immediately to `origin/development`, unless the user instructs otherwise. Do not wait for other repositories. Keep working on the remaining tasks independently.
5. Continue through every requested repository. A nonzero check, incomplete run, missing permission, or unavailable dependency remains a cross until resolved; never report partial results as green. Report each unresolved case using one `Error` sentence and one `Recommended fix` sentence.

For single-use findings, run the repository's full-scope `quality --all --safe-fix` command once, inspect the complete batch, then run its full-scope read-only Quality command. The fixer batches only declarations classified as mechanically safe to inline. Every remaining `REVIEW` finding requires an agent-authored semantic decision. Do not suppress source findings with comments or configuration exclusions; `// terra-quality-ignore single-use` is itself a blocking finding.

Use the Cloud environment selected for each task. Direct push to `development` is the default unless the user instructs otherwise. Do not substitute local tasks or a CLI account guard for Cloud task controls.

## Multi-repository status table

For a multi-repository sweep, the final response must contain only one Markdown table: one row per repository and columns for `Environment/root`, `Command and duration`, `Quality`, `Commit`, `Push`, `Error`, `Recommended fix`, and `Full quality log`. Put the complete log for every exact-command attempt in that cell, using `<br>` between attempts if needed; redact only secret or sensitive values. Keep each error and fix to one sentence. Use `PASS` only for a verified zero exit from the exact command; otherwise use `BLOCKED` or `FAIL`. Include the literal exit code or `not run` in `Command and duration`. A missing repository is `BLOCKED`, never not-applicable or green.

Example:

| Repository | Environment/root | Command and duration | Quality | Commit | Push | Error | Recommended fix | Full quality log |
| ---------- | ---------------- | ------------------- | ------- | ------ | ---- | ----- | ---------------- | ----------------- |
| docs       | kai-macann-all / /workspace/docs | `pnpm run quality:all`; 2m; exit 0 | PASS | `abc1234` | verified | — | — | `> quality:all\n✓ Quality complete` |
| website    | kai-macann-all / /workspace/website | `pnpm run quality:all`; 17s; exit 1 | FAIL | none | none | Error: Playwright setup stopped because its pinned browser download was denied. | Recommended fix: Allow the documented browser artifact host in the Cloud environment, then rerun the exact command. | `ERR_PNPM_FETCH_403` |
```
