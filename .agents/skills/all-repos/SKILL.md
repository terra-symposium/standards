---
name: all-repos
description: Coordinate a requested workflow across multiple repositories.
metadata:
  related-files: []
---

# Multi-repository work

Use this skill for an explicit repository set or an “all repos” request. Inventory actual Git repositories under the requested roots, record exclusions, and use one workspace and branch context per repository. Read each repository’s instructions and apply the task-specific skill or workflow there. Preserve unrelated work.

Choose the execution environment from the user’s request. For local work, use the existing checkouts or suitable managed worktrees. For a Cloud run, fetch the connected Codex usage allowance first, then verify the current repository, environment, branch, and task through Codex app controls before dispatch; do not simulate Cloud locally.

Track each repository’s starting branch and status, its exact applicable gate (`quality:all`, `verify`, or the repository's equivalent), the command and exit result, after-run status and diff, publication state when requested, and blockers. Report every in-scope repository separately with this evidence. Do not call the sweep complete while an in-scope repository remains unverified or blocked. Before running a command that can write, such as `quality:all`, capture the current worktree state in that repository and inspect its script and fix behavior. Run a confirmed read-only mode when the task is an audit; when fixes are authorized, review the diff before continuing to the next repository.
