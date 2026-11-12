---
name: quality
description: Run and remediate configured quality checks across one or more Terra repositories, then report per-check results.
---

# Quality

Use this skill for any request to run or coordinate a repository quality sweep. The complete Cloud task prompt is the trigger sentence `Read and follow the Terra Standards Quality skill for this repository: <owner/repo>; push authorization: <granted|not granted>.` Replace the placeholders with the target GitHub identity and the user's explicit push authorization; add no workflow instructions to the prompt. The task must locate and read this skill before acting; the trigger means follow every requirement below for that repository only.

## Single-repository Cloud run

1. Match the connected checkout to the requested repository by its remote and contents, not by folder name alone. Record the Cloud environment, root, fetch/push remotes, branch, and initial working-tree status. Read applicable `AGENTS.md` files and repository instructions.
2. Prepare only the Cloud environment needed by the repository: use its pinned Node and package-manager versions, install dependencies from the existing lockfile, and provision required toolchains and test runtimes. Keep credentials in configured secret storage; never print or copy secret values. Do not change network/security settings, approve dependency build scripts, or alter tracked files just to get past setup.
3. From the repository root run exactly `pnpm run quality:all`, with no substituted checks or flags. Capture the literal command, start/end time (or elapsed time), exit code, and concise result. Preserve the complete output from every invocation and print the full quality log(s) in the final response, whether the run passes or fails; redact credentials, tokens, secret values, and other sensitive values without omitting ordinary diagnostic lines. If the script is missing, inspect the repository's documented quality workflow and add a `quality:all` script that forwards to the complete existing suite without weakening, skipping, or waiving checks; then rerun the exact command.
4. For setup failures, resolve safe environment prerequisites and rerun the exact command. For repository findings, inspect and safely fix in-scope causes, then rerun until the exact command exits 0. Never call a partial run green. Preserve unrelated changes.
5. When green, commit task changes and push the task branch if authorized. If the tree is clean, create no empty commit; push the existing branch when requested and verify the remote commit. If the matching checkout or required access is unavailable, stop without running checks or editing another repository.

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

For a missing checkout, report the searched roots and remotes in the `Error` sentence and name the environment/repository access needed in `Recommended fix`. For a setup failure, name the missing or denied runtime/dependency in `Error` and the safe environment preparation needed in `Recommended fix`. For a quality finding, name the failing gate and relevant result in `Error` and the smallest safe fix in `Recommended fix`. Keep command timing and exit status even when the command failed before checks began.

## Multi-repository sweeps

1. Discover the repositories in the requested scope from the current filesystem. Read each repository's `AGENTS.md` and use this skill's single-repository procedure for each. Exclude only repositories the user names.
2. Provision all requested Cloud tasks in one batch with [`scripts/provision-quality-chats.mjs`](scripts/provision-quality-chats.mjs). Do not create the tasks one at a time outside the script. Review `--dry-run` output when changing the scope or environment.
3. Give each task one repository only. Use only the Cloud trigger above; the skill directs the task to `pnpm run quality:all`, prerequisite handling, remediation, the concise report scaffold, and the explicit push authorization.
4. Review each repository's diff and stage only task changes. As soon as its complete wrapper is green, commit that repository; push immediately when the user has authorized pushing. Do not wait for other repositories. Keep working on the remaining tasks independently.
5. Continue through every requested repository. A nonzero check, incomplete run, missing permission, or unavailable dependency remains a cross until resolved; never report partial results as green. Report each unresolved case using one `Error` sentence and one `Recommended fix` sentence.

For single-use findings, run the repository's full-scope `quality --all --safe-fix` command once, inspect the complete batch, then run its full-scope read-only Quality command. The fixer batches only declarations classified as mechanically safe to inline. Every remaining `REVIEW` finding requires an agent-authored semantic decision. Do not suppress source findings with comments or configuration exclusions; `// terra-quality-ignore single-use` is itself a blocking finding.

The provisioner defaults to the user's `~/Desktop`, uses `kai-macann-all` as its environment selector, discovers nested Git repositories, and skips Compression. It verifies that the selected environment is available to the authenticated Codex CLI before creating any tasks. If the environment is not listed there, stop before partial provisioning and resolve the account/environment selection. Use `--push` only when the user has authorized pushing. It does not store credentials.

## Multi-repository status table

For a multi-repository sweep, the final response must contain only one Markdown table: one row per repository and columns for `Environment/root`, `Command and duration`, `Quality`, `Commit`, `Push`, `Error`, `Recommended fix`, and `Full quality log`. Put the complete log for every exact-command attempt in that cell, using `<br>` between attempts if needed; redact only secret or sensitive values. Keep each error and fix to one sentence. Use `PASS` only for a verified zero exit from the exact command; otherwise use `BLOCKED` or `FAIL`. Include the literal exit code or `not run` in `Command and duration`. A missing repository is `BLOCKED`, never not-applicable or green.

Example:

| Repository | Environment/root | Command and duration | Quality | Commit | Push | Error | Recommended fix | Full quality log |
| ---------- | ---------------- | ------------------- | ------- | ------ | ---- | ----- | ---------------- | ----------------- |
| docs       | kai-macann-all / /workspace/docs | `pnpm run quality:all`; 2m; exit 0 | PASS | `abc1234` | verified | — | — | `> quality:all\n✓ Quality complete` |
| website    | kai-macann-all / /workspace/website | `pnpm run quality:all`; 17s; exit 1 | FAIL | none | none | Error: Playwright setup stopped because its pinned browser download was denied. | Recommended fix: Allow the documented browser artifact host in the Cloud environment, then rerun the exact command. | `ERR_PNPM_FETCH_403` |
```
