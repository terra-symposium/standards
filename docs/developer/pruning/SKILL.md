---
name: pruning
description: Prune repository files, output, refs, worktrees, Codex storage, and duplicate skills.
metadata:
  related-files: []
skill: true
---

# Pruning

Choose the scope before acting. For repository files and scripts, follow the [repository file audit](references/repository-files.md). For generated output and caches, follow the [repository output guide](references/repository-output.md). For Git branches, pull requests, and worktrees, use the Git scope below. For local Codex storage and duplicate skills, use the device scope. A request can cover several scopes; inventory and verify each separately.

## Git branches and worktrees

Use this skill when a user asks to review, integrate, close, or clean up branches and worktrees, whether or not a pull request exists. A branch name, namespace, age, or presence in a desktop branch list is not evidence that its work is disposable. Review changes before pruning them; do not reduce the task to deleting refs.

### Inventory and establish scope

1. Confirm the verified repository and remotes. Record the current branch and commit, working tree status, local and remote refs, stashes, and `git worktree list --porcelain`.
2. Fetch relevant remotes before judging integration or staleness. Fetching does not expose local-only refs from another checkout. Identify which exact checkout and ref namespace each result describes.
3. Enumerate every branch in the user's requested scope. For each, identify its exact head, worktree, intended target, and associated PR if any. Verify PR author or automation metadata, base, source head, state, reviews, discussions, mergeability, and relevant checks. Never infer provenance from a name prefix or a stored local folder/worktree path.
   - To identify Jules-created PRs, inspect the authors of commits in each PR (including earlier commits when a human later updates the PR). Use GitHub's PR commit list or equivalent commit metadata and match the verified Jules bot login. The PR's current head author, head repository/owner, checkout directory, and branch name can all differ from the original contributor and are not sufficient provenance on their own.
   - When the user says **all** or **every** branch, inventory all local branches and all live branch refs on every configured remote, not only the current/recent branches or those visible in a screenshot. Include remote-only and local-only/unpublished branches. Record every in-scope ref and its exact tip in a disposition table. Exclude only the named target, verified default/protected branches, and refs the user explicitly leaves out. If another checkout may contain local-only branches, inspect its branch list too or state that checkout as an inventory limit.
4. Compare each branch's full unique changes with its intended target. Verify whether changes are already present, useful but unintegrated, superseded by equivalent changes, or intentionally abandoned. Use ancestry and commit/diff comparisons; a similar commit message or overlapping diff is not enough proof.

### Review and preserve useful work

- Inspect the full diff and relevant surrounding code, callers, tests, configuration, and documentation. Identify actionable defects and run appropriate local quality checks. For PRs, inspect all reviews and discussion threads and distinguish required check results from unrelated failures.
- When the user explicitly asks to merge/prune all branches into a named target, disposition every in-scope branch in the same task. For each tip not already included, inspect its unique changes and merge all compatible, useful work into the target; do not stop after reviewing only the current branch, recent branches, or screenshot-visible entries. Prefer preserving branch history when the branch is compatible. If an old branch is partly superseded or conflicts with newer target code, carry forward its remaining useful changes without restoring obsolete files or behavior, then verify those changes are present in the target. Follow the branch-review skill for detailed review, validation, and merge rules.
- Treat already-contained branches as integrated, but still account for their exact tips before pruning. A stale name, age, namespace, missing remote-tracking ref, or absence from a desktop branch menu is not a disposition.
- Integrate only changes that are sound, useful, validated, and targeted clearly. Preserve unique useful work before closing or deleting its source. Respect the user's directions about relevant checks and the repository's approved merge method.
- Do not directly update a protected base branch. Use an authorized PR path when available; otherwise retain the work and report the blocker. Never rewrite shared history or bypass repository protections.
- Retain branches with unique work that could not be safely preserved, unresolved merge conflicts/findings, failed or incomplete required validation, unclear targets, unavailable source refs, or uncertain status.
- For an explicit merge-and-prune request, an open PR does not remove its source branch from scope. Use the approved PR merge path when its base is the user's named target. If its base differs, integrate the source into the named target, verify the source tip is included, then close the now-superseded PR before deleting the source ref. Preserve the branch and report a blocker if its work was not preserved or repository protection prevents the requested disposition. Do not post PR comments unless the user asks.

### Protect worktrees and local changes

An audit or plan-only request stops after inventory and a disposition plan. Do not archive or remove a Git or Codex worktree until cleanup is authorized.

Keep dirty, untracked, or otherwise unaccounted work. Inspect its diff before cleanup. Preserve wanted changes in a commit, a clearly named stash, or a recoverable worktree archive before removal.

Do not drop unrelated stashes. Do not remove a branch checked out in any worktree, and do not reset, switch, rebase, or force-remove a worktree containing unaccounted work.

Do not remove a worktree containing initialized submodules or embedded repositories without handling those separately.

Prefer the Codex worktree archive action for managed worktrees when available and allowed. If unavailable, use Git only after verifying that changes are clean or safely preserved.

### Remove eligible refs

1. A review alone does not authorize deletion. For an explicit merge-and-prune request, delete each requested source ref only after its useful changes are verified as integrated, preserved elsewhere, intentionally superseded, or explicitly abandoned. Do not leave eligible refs behind just because the inventory is long; report each exception by name and reason.
2. Do not delete an open PR's source branch or close it merely to tidy a branch list. For an explicit merge-and-prune request, follow the PR disposition rule above. For a closed unmerged PR, remove its branch only when closure and context show abandonment or the user explicitly authorized cleanup.
3. Confirm no worktree uses a local branch before deleting it. Delete a remote branch only when no open PR relies on it, unique changes are accounted for, the branch is in scope, and repository protection permits deletion. Never delete the named target, default branch, or any protected base branch.
4. Run `git fetch --prune <remote>` to clear stale tracking refs only after the remote branch is deleted. This command does not delete live server branches. Remove review refs such as `refs/remotes/review/pr-<number>` separately because pruning another remote does not remove them.
5. Run `git worktree prune` only to clear stale metadata after verifying the worktree is no longer live; it does not remove worktree files.

### Verify and report

Recheck working tree status, current branch and target sync, `git worktree list --porcelain`, relevant local and remote refs, and open PR usage.

Report each branch's disposition, the useful changes preserved, checks run, refs or worktrees removed, and items retained with reasons. Distinguish local refs from remote refs and stale tracking refs. State which checkout was cleaned; deleting a remote branch does not remove a local branch in a different checkout.

Do not claim a branch or worktree was removed until its absence is verified in the repository or remote actually changed. Report blocked or unavailable cleanup plainly.

## Device storage and skill copies

Use this skill when the user asks to reduce local Codex storage, inspect Codex archives, deduplicate skills across repositories, or move personal skills into repository ownership. Do not apply it to ordinary repository cleanup.

### Set the cleanup boundary

1. Confirm the user’s intended scope from the request and current conversation. Treat explicit exclusions and vendor-preservation choices as binding.
2. Inventory only relevant user-home paths, Codex-managed storage, and the named repository roots. Resolve each repository with Git rather than assuming that a directory is a repository.
3. Classify each candidate as repository-owned content, personal skill, archived copy, vendor-managed asset, rebuildable cache, recoverable work, or application state. Do not treat every file named `SKILL.md` as user-owned.
4. Record repository status before editing. Preserve unrelated staged, unstaged, untracked, ignored, and worktree state.

Keep Codex, ChatGPT, Dia, Warp, Raycast, and plugin-managed skills and assets when the user asks to preserve vendor-managed content. Keep credentials, settings, databases and write-ahead logs. Do not inspect or print secret values. Never delete database files manually.

### Consolidate skills

1. Inventory custom `SKILL.md` files across the requested repositories and personal skill locations. Exclude `.git`, `node_modules`, generated dependency trees, and vendor-managed skill bundles from the custom-skill comparison; inventory those separately when needed to honor the preservation boundary.
2. Find exact duplicates with content hashes. Find likely overlaps by comparing names, descriptions, triggers, workflows, and supporting resources. Similar subject matter alone is not duplication.
3. Choose one canonical owner using current repository guidance and the workflow’s source-of-truth boundary. Keep related but distinct skills separate.
4. Before removing a copy, compare its instructions, UI metadata, references, scripts, examples, and other support files with the canonical skill. Merge unique, current guidance and repair links or callers. Prefer moving a unique personal skill into its owning repository over deleting it.
5. Remove redundant personal or archived copies only within the user-authorized scope. Never remove vendor-managed copies to make an inventory appear repo-only. A user’s “no skills outside repositories” rule applies to personal skills, with explicitly preserved vendor-managed assets as the exception.
6. Update the owning repository’s catalogs and regenerate generated catalogs with the repository’s documented command. Confirm every catalog link and skill reference resolves.

### Reduce Codex storage

1. Measure candidate directories before cleanup. Separate archived transcripts, recent sessions, managed worktrees, rebuildable caches, plugin assets, Git bundles, test evidence, and application state.
2. Permanently delete only archived threads the user authorized for deletion. Use Codex’s supported thread/session delete control; do not unlink rollout files directly while Codex may index them. Keep active or recent threads unless the user explicitly includes them. Verify the archived-thread inventory and transcript files afterward.
3. Clear rebuildable caches only after Codex is closed. Do not close the user’s active Codex session to perform cleanup. Preserve plugin-managed assets unless they are confirmed rebuildable and within the user’s requested scope.
4. Inventory each managed worktree and record its owner, status, unique commits, and recovery plan. An audit or plan-only request stops here. For authorized cleanup, archive through Codex so dirty work has a recoverable snapshot. If the owning thread is unavailable and the Codex control cannot attach the checkout, inspect tracked, staged, untracked, and needed ignored files; make a recoverable Git stash or equivalent snapshot and record its object ID and base commit. Remove with Git only after the worktree is clean. Remove a clean worktree without force and verify it is gone.
5. Keep Git bundles until each saved tip is verified in another recovery source or the user explicitly abandons it. A missing local branch or unmatched remote branch name is not proof that its contents are disposable.
6. Delete old test evidence only when it is clearly generated, outside repository source, and covered by the user’s cleanup request. Do not remove recent session logs, databases, credentials, or settings as generic cleanup.

### Verify and report

- Verify Codex reports the targeted threads deleted and their rollout files are absent.
- Re-measure candidate directories and available filesystem space. Distinguish files removed from disk space actually reclaimed.
- Re-scan repository-owned skills for exact duplicates and duplicate names, check known near-duplicates, and validate catalog links and references.
- Run `git diff --check` for changed repositories. Do not add or run tests unless the user asks.
- Report completed deletions, preserved recovery material, remaining caches or bundles, dirty-state snapshots, validation results, and any cleanup blocked by the active app or unavailable Codex controls.
