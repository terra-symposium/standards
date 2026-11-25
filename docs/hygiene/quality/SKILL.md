---
name: quality
description: Run Quality, audit repository hygiene, and repair source safely.
metadata:
  related-files:
    - config/quality.json
skill: true
---

# Quality

Use this skill for local Quality checks and fixes. For repository health, source documentation, and compaction, follow the [hygiene scope](references/hygiene.md). For explicitly requested Cloud work, follow the [Cloud scope](references/cloud.md). Apply only the guidance relevant to the requested work.

Read any repository `AGENTS.md`, `quality.json`, package scripts, and installed Quality documentation first. Record its remote, branch, worktree status, selected scope, and existing edits before running any command. Before a normal fixing run, take a read-only `--warn` baseline with the same script, scope, and other arguments planned for the fixing run; record the selected-file inventory. Save the pre-run patch and contents of already dirty and untracked files so post-run edits can be attributed to Quality without losing user work. Compare the baseline and those snapshots with the post-run state.

## Sync before scheduled Desktop hygiene

For the scheduled Desktop-wide hygiene run, use the user's sync-first policy before any Quality inspection that can write. Rediscover repositories under `/Users/kaimacann/Desktop` each run, and establish each repository's full branch, status, and worktree baseline first. The user has explicitly authorized discarding staged and unstaged tracked changes and non-ignored untracked files for this run: record their exact paths, then discard only those changes. Do not remove ignored files or dependencies, branches, or pre-existing worktrees.

Before Hygiene, synchronize every existing checked-out branch under each repository, including branches in pre-existing worktrees. For each branch, record its exact upstream remote/ref, fetch it, and compare local and remote commits. Fast-forward when there are no local-only commits. When both local and upstream have unique commits, merge the verified upstream into the local branch so published local commits retain their identities and the result can be pushed normally. Resolve conflicts only when their intended combined behavior is clear and consistent with the current architecture. Preserve meaningful local commits; do not rebase published commits, skip, reset, or replace them merely to make the branch clean. Run focused checks for conflict resolutions, push normally without force, and confirm the remote contains the integrated result. If a checked-out branch has no verifiable upstream, a conflict is ambiguous, checks fail, or fetch, integration, or push fails, stop Hygiene for that repository and record the exact blocker while continuing with other repositories. Do not run Hygiene for a repository until all of its existing checked-out branches are synchronized successfully.

Then select the publication branch for the Hygiene run: use `origin/development` when it exists; otherwise verify and use the remote default branch. Fetch that exact branch. If it is not already checked out, create the unique Hygiene worktree from the fetched publication ref and pull it fast-forward-only before any writing check. Record the publication base and clean status separately from source-branch synchronization.

Run fixes only in a fresh, run-specific worktree based on the synchronized publication branch. Keep the source checkout and any pre-existing worktrees intact apart from the explicitly authorized working-change discard above. Record the sync and push result separately from Quality findings and checks.

Run the repository's exact `quality:all` script for a full scan, or `quality` for changed and untracked files. Capture the complete output and exit code. Keep builds and functional tests separate. For a failure, identify the owning source or configuration, make the smallest behavior-preserving repair, review the diff, and rerun the affected check and the original command. Do not disable a check, change its thresholds, or treat an incomplete or failing run as green.

Quality may apply safe fixes. `--warn` prevents writes but can return zero even with findings, so read the full findings rather than relying on its exit code. Review every resulting edit, especially around public APIs, evaluation order, stored values, and syntax. Use `--warn` when a read-only inspection is needed. A `// hygiene-ignore single-use -- <reason>` comment is permitted only for the specific declaration when inlining would change behavior or a documented API boundary; follow the installed Quality version's directive syntax and keep the concrete reason beside that declaration.

Follow the user's requested execution environment, branch, commit, and push policy. Do not commit or publish solely because a Quality run succeeds. Report commands, scope, exit codes, findings, repairs, verification, and any access or environment blockers separately.
