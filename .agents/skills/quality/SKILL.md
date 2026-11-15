---
name: quality
description: Run Quality, audit repository hygiene, and repair source safely.
metadata:
  related-files:
    - config/quality.json
---

# Quality

Use this skill for local Quality checks and fixes. For repository health, source
documentation, and compaction, follow the [hygiene scope](references/hygiene.md).
For explicitly requested Cloud work, follow the [Cloud scope](references/cloud.md).
Apply only the guidance relevant to the requested work.

Read any repository `AGENTS.md`, `quality.json`, package scripts, and installed
Quality documentation first. Record its remote, branch, worktree status,
selected scope, and existing edits before running any command. Before a normal
fixing run, take a read-only `--warn` baseline with the same script, scope, and
other arguments planned for the fixing run; record the selected-file inventory.
Save the pre-run patch and contents of already dirty and untracked
files so post-run edits can be attributed to Quality without losing user work.
Compare the baseline and those snapshots with the post-run state.

Run the repository's exact `quality:all` script for a full scan, or `quality` for
changed and untracked files. Capture the complete output and exit code. Keep
builds and functional tests separate. For a failure, identify the owning source
or configuration, make the smallest behavior-preserving repair, review the diff,
and rerun the affected check and the original command. Do not disable a check,
change its thresholds, or treat an incomplete or failing run as green.

Quality may apply safe fixes. `--warn` prevents writes but can return zero even
with findings, so read the full findings rather than relying on its exit code.
Review every resulting edit, especially around
public APIs, evaluation order, stored values, and syntax. Use `--warn` when a
read-only inspection is needed. A `// terra-quality-ignore single-use -- <reason>`
comment is permitted only for the specific declaration when inlining would
change behavior or a documented API boundary; follow the installed Quality
version's directive syntax and keep the concrete reason beside that declaration.

Follow the user's requested execution environment, branch, commit, and push
policy. Do not commit or publish solely because a Quality run succeeds. Report
commands, scope, exit codes, findings, repairs, verification, and any access or
environment blockers separately.
