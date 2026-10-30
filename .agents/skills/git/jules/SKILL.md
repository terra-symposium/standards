---
name: jules
description: Bundle Jules-created pull requests into a small set of coherent PRs, carry review feedback forward, commit the verified changes, and retire superseded branches.
---

# Jules PR Bundling

Use this skill when consolidating Jules-created pull requests. Keep every distinct change and actionable review comment accounted for while reducing the number of PRs.

## Procedure

1. **Inventory the source PRs.**
   - Confirm the target base and whether the request is to prepare bundles, merge them, or clean up branches.
   - Search every page of PR results and all relevant states. Identify Jules work from PR metadata or its creation marker, not branch-name prefixes alone.
   - Record each PR's source branch, target, status, changed files, commits, checks, reviews, and unresolved threads.
   - Inspect local and linked-worktree status. Preserve unrelated staged, unstaged, and untracked work.

2. **Plan the smallest coherent bundle set.**
   - Group PRs by feature area, shared files, dependencies, and review context.
   - Minimize the bundle count without mixing unrelated behavior or making a bundle hard to review.
   - Map every source PR and unique change to a proposed bundle. Flag overlaps, conflicts, and changes that do not fit cleanly.
   - Keep source PRs and refs available until bundle coverage is verified.

3. **Build and commit each bundle.**
   - Start each bundle branch from the current requested base, using the repository's branch naming convention.
   - Apply each unique change once. Resolve conflicts by preserving valid behavior from every source; do not merge source PRs straight into the base as a substitute for bundling.
   - Address relevant source review feedback in the bundle. Keep implementation and its direct tests together.
   - Stage only bundle changes and their direct tests or docs. Inspect the staged diff and use `type(scope): imperative summary` with a factual validation body.
   - Create local commits as needed to prepare a requested bundle. Push branches or open PRs only when requested or already authorized.
   - Run the requested or required checks when available. Report skipped, blocked, or rate-limited checks accurately; never describe them as passing.

4. **Review bundle coverage and PR feedback.**
   - Compare each bundle with its source map and confirm every unique source change is present exactly once.
   - Recheck changed files, conflicts, regressions, current base, mergeability, and required checks.
   - Read all review threads. Fix actionable feedback before merge, then reply and resolve threads only when the fix is present.
   - When requested or authorized, open one PR per bundle against the requested base. Link the source PRs and summarize included changes and validation.

5. **Merge and complete branch cleanup as part of the merge.**
   - Do not merge a bundle or source PR into `development` or `main` unless the user explicitly names that destination and authorizes merging.
   - Before merge, confirm the base is current, required checks meet the user's instruction, and no actionable review thread remains unresolved.
   - Verify the merge result and base head, then finish branch cleanup before considering the merge task complete. Once a PR is merged, delete its source branch promptly unless another open PR still uses it, the user asks to retain it, or repository protection prevents deletion. Confirm the merged changes are present in the merge or bundle first. Also remove the corresponding local `review/pr-<number>` branch and any `refs/remotes/review/pr-<number>` tracking ref once no open PR uses it; these review refs are separate from `origin/*` and are not removed by `git fetch --prune origin`. For explicitly closed unmerged PRs, delete the source branch only after confirming the closure abandons that work.
   - Discover refs through their PR metadata; Jules branches may use names such as `automation/`, `codex/`, `forge/`, or other prefixes.
   - Prefer an available branch-delete operation. Otherwise use authenticated Git, then prune stale tracking refs so desktop clients stop showing deleted remote branches. Remove stale review refs from their actual namespace (`git branch -D review/pr-<number>` for local branches, `git update-ref -d refs/remotes/review/pr-<number>` for review tracking refs) only after checking that the PR is not open and the branch is not checked out in another worktree. Never use a ref-move operation as a substitute for deletion.
   - Branch cleanup is part of completing an authorized PR merge; do not leave it as a follow-up task. Do not remove a local branch checked out by a worktree or carrying uncommitted work. Preserve its files and report the remaining local ref if it cannot be retired safely.

## Completion Report

- Report the source PR count, bundle PRs and their merge state, and the source-to-bundle coverage result.
- List any unresolved review comments, failed or skipped checks, unmerged source PRs, and branches retained for safety.
- Distinguish remote branch deletion from local branch cleanup. Claim all Jules refs are gone only after checking remote refs, local refs, and open Jules PRs.
