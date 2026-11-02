---
name: atomic-commits
description: Split a requested working copy into dependency-ordered, reviewable Git commits with conventional imperative titles and factual bodies. Use only when the user explicitly invokes $atomic-commits or attaches this skill and asks to create commits; otherwise plan or report commit groups without committing.
---

# Atomic Commits

Use only when the user explicitly authorizes commits. Otherwise, propose the groups without staging or committing.

## Workflow

1. **Inspect state**
   - Read `git status --short`, staged and unstaged diffs, current branch, and divergence from its upstream.
   - Treat staged, unstaged, and untracked files as separate evidence; preserve unrelated work.
2. **Update safely**
   - Never make task changes directly on `main` or `development`; use a dedicated `automation/<agent>/<area>-<change>` branch by default.
   - If behind, protect local work including untracked files, then fast-forward. If diverged, protect work before merging and resolve against current architecture.
   - Restore and verify protected work before dropping the temporary stash.
   - Do not discard, reset, or overwrite local changes.
3. **Plan groups**
   - Group independently reviewable behavior in dependency order.
   - Keep implementation, direct tests, and required documentation together. Keep unrelated cleanup separate.
   - Check each group with `git diff --check` and the narrowest relevant validation.
4. **Commit deliberately**
   - Stage exact files or hunks; never use `git add -A` or reset unrelated changes.
   - Review the staged diff before each commit.
   - Use `type(scope): imperative summary`. The body states the observable change and validation; omit filler.
5. **Review boundary**
   - Push task work to the dedicated branch and create the corresponding GitHub PR for review.
   - Do not push task commits directly to protected branches or merge the PR.
6. **Report**
   - Show the resulting commits, `git status --short`, and any unrelated remaining changes.
   - Identify checks blocked by pre-existing work rather than hiding them.
