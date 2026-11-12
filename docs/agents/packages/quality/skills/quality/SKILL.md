---
name: quality
description: Run and remediate configured quality checks across one or more Terra repositories, then report per-check results.
---

# Quality

Use this skill for a repository quality sweep. Each repository is an independent unit: run its own configured quality wrapper or check script, fix findings, and commit it as soon as its full required suite is green.

## Multi-repository sweeps

1. Discover the repositories in the requested scope from the current filesystem. Read each repository's `AGENTS.md` and identify its own quality wrapper or check script. Exclude only repositories the user names.
2. Provision all requested Cloud tasks in one batch with [`scripts/provision-quality-chats.mjs`](scripts/provision-quality-chats.mjs). Do not create the tasks one at a time outside the script. Review `--dry-run` output when changing the scope or environment.
3. Give each task one repository only. It must follow that repository's instructions, use its configured wrapper, fix failures without waivers or skipped checks, and report the exact checks it ran.
4. Review each repository's diff and stage only task changes. As soon as its complete wrapper is green, commit that repository; push immediately when the user has authorized pushing. Do not wait for other repositories. Keep working on the remaining tasks independently.
5. Continue through every requested repository. A nonzero check, incomplete run, missing permission, or unavailable dependency remains a cross until resolved; never report partial results as green.

For single-use findings, run the repository's full-scope `quality --all --safe-fix` command once, inspect the complete batch, then run its full-scope read-only Quality command. The fixer batches only declarations classified as mechanically safe to inline. Every remaining `REVIEW` finding requires an agent-authored semantic decision. Do not suppress source findings with comments or configuration exclusions; `// terra-quality-ignore single-use` is itself a blocking finding.

The provisioner defaults to the user's `~/Desktop`, uses `kai-macann-all` as its environment selector, discovers nested Git repositories, and skips Compression. It verifies that the selected environment is available to the authenticated Codex CLI before creating any tasks. If the environment is not listed there, stop before partial provisioning and resolve the account/environment selection. Use `--push` only when the user has authorized pushing. It does not store credentials.

## Required report

The final response must contain only one Markdown table: one row per repository and one column for each configured test/check. Include `Commit` and `Push` columns in a repository sweep. Every cell must contain exactly `✓` or `✗`: use a check only for a passed check or a verified not-applicable check; use a cross for a failure, blocker, or check that did not run. If a check is not configured for one repository, verify that from its wrapper before marking it not applicable.

Example:

| Repository | Format | Lint | Types | Unit tests | Build | Commit | Push |
| ---------- | ------ | ---- | ----- | ---------- | ----- | ------ | ---- |
| docs       | ✓      | ✓    | ✓     | ✓          | ✓     | ✓      | ✓    |
| website    | ✓      | ✓    | ✓     | ✗          | ✗     | ✗      | ✗    |
