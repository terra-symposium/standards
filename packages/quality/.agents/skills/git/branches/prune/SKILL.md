---
name: pruning
description: Review and retire requested Git branches and worktrees after confirming their changes are integrated, preserved, superseded, or explicitly abandoned.
---

# Review and prune branches and worktrees

Use this skill when a user asks to review, integrate, close, or clean up branches and worktrees, whether or not a pull request exists. A branch name, namespace, age, or presence in a desktop branch list is not evidence that its work is disposable. Review changes before pruning them; do not reduce the task to deleting refs.

## Inventory and establish scope

1. Confirm the verified repository and remotes. Record the current branch and commit, working tree status, local and remote refs, stashes, and `git worktree list --porcelain`.
2. Fetch relevant remotes before judging integration or staleness. Fetching does not expose local-only refs from another checkout. Identify which exact checkout and ref namespace each result describes.
3. Enumerate only the branches in the user's requested scope. For each, identify its exact head, worktree, intended target, and associated PR if any. Verify PR author or automation metadata, base, source head, state, reviews, discussions, mergeability, and relevant checks. Never infer provenance from a name prefix or a stored local folder/worktree path.
   - To identify Jules-created PRs, inspect the authors of commits in each PR (including earlier commits when a human later updates the PR). Use GitHub's PR commit list or equivalent commit metadata and match the verified Jules bot login. The PR's current head author, head repository/owner, checkout directory, and branch name can all differ from the original contributor and are not sufficient provenance on their own.
4. Compare each branch's full unique changes with its intended target. Verify whether changes are already present, useful but unintegrated, superseded by equivalent changes, or intentionally abandoned. A similar commit message or overlapping diff is not enough proof.

## Review and preserve useful work

- Inspect the full diff and relevant surrounding code, callers, tests, configuration, and documentation. Identify actionable defects and run appropriate local quality checks. For PRs, inspect all reviews and discussion threads and distinguish required check results from unrelated failures.
- When the user explicitly asks to review and disposition a defined branch set, integrate suitable changes into the named target, close unsuitable or superseded PRs, and clean eligible refs in the same task. Follow the branch-review skill for detailed review, validation, and merge rules.
- Integrate only changes that are sound, useful, validated, and targeted clearly. Preserve unique useful work before closing or deleting its source. Respect the user's directions about relevant checks and the repository's approved merge method.
- Do not directly update a protected base branch. Use an authorized PR path when available; otherwise retain the work and report the blocker. Never rewrite shared history or bypass repository protections.
- Retain branches with unique changes, unresolved findings, failed or incomplete validation, unclear targets, open PRs, unavailable source refs, or uncertain status. A request to prune does not authorize discarding unreviewed work.

## Protect worktrees and local changes

- Keep dirty, untracked, or otherwise unaccounted work. Inspect its diff before cleanup. Preserve wanted changes in a commit, a clearly named stash, or a recoverable worktree archive before removal.
- Do not drop unrelated stashes. Do not remove a branch checked out in any worktree, and do not reset, switch, rebase, or force-remove a worktree containing unaccounted work.
- Do not remove a worktree containing initialized submodules or embedded repositories without handling those separately.
- Prefer the Codex worktree archive action for managed worktrees when available and allowed. If unavailable, use Git only after verifying that changes are clean or safely preserved.

## Remove eligible refs

1. A review alone does not authorize deletion. Delete only requested refs whose useful changes are verified as integrated, preserved elsewhere, intentionally superseded, or explicitly abandoned.
2. Do not delete an open PR's source branch or close it merely to tidy a branch list. For a closed unmerged PR, remove its branch only when closure and context show abandonment or the user explicitly authorized cleanup.
3. Confirm no worktree uses a local branch before deleting it. Delete a remote branch only when no open PR relies on it, unique changes are accounted for, the branch is in scope, and repository protection permits deletion. Never delete a protected base branch.
4. Run `git fetch --prune <remote>` to clear stale tracking refs only after the remote branch is deleted. This command does not delete live server branches. Remove review refs such as `refs/remotes/review/pr-<number>` separately because pruning another remote does not remove them.
5. Run `git worktree prune` only to clear stale metadata after verifying the worktree is no longer live; it does not remove worktree files.

## Verify and report

- Recheck working tree status, current branch and target sync, `git worktree list --porcelain`, relevant local and remote refs, and open PR usage.
- Report each branch's disposition, the useful changes preserved, checks run, refs or worktrees removed, and items retained with reasons. Distinguish local refs from remote refs and stale tracking refs. State which checkout was cleaned; deleting a remote branch does not remove a local branch in a different checkout.
- Do not claim a branch or worktree was removed until its absence is verified in the repository or remote actually changed. Report blocked or unavailable cleanup plainly.
