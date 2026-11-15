---
name: commit
description: Create reviewable Git commits when authorized.
metadata:
  related-files: []
---

# Commit

Use only when the user explicitly authorizes commits. Otherwise, propose the groups without staging or committing.

## Workflow

1. **Inspect state**

Read `git status --short`, staged and unstaged diffs, current branch, and divergence from its upstream.

- Treat staged, unstaged, and untracked files as separate evidence; preserve unrelated work.

2. **Update safely**

Use the current branch for an authorized local commit unless the user requests a
branch or the repository requires one. Create a dedicated
`automation/<agent>/<area>-<change>` branch only in those cases, after checking
whether the current worktree can be switched without disturbing unrelated edits.

Sync with an upstream only when the requested operation needs it. If behind,
protect local work including untracked files before a fast-forward. If diverged,
protect work before merging and resolve against current architecture.

- Restore and verify protected work before dropping the temporary stash.
- Do not discard, reset, or overwrite local changes.

3. **Plan groups**
   - Group independently reviewable behavior in dependency order.

Keep implementation, direct tests, and required documentation together. Keep unrelated cleanup separate.

- Check each group with `git diff --check` and the narrowest relevant validation.

4. **Commit deliberately**
   - Stage exact files or hunks; never use `git add -A` or reset unrelated changes.
   - Review the staged diff before each commit.

Use `type(scope): imperative summary`. The body states the observable change and validation; omit filler.

5. **Review boundary**
   - Stop after the local commit when that is the authorized scope. Push or open a PR
     only when the user requested those actions or the current task requires them.
   - Follow the repository's branch policy. Do not push directly to protected branches
     or merge a PR unless the task authorizes it.
6. **Report**
   - Show the resulting commits, `git status --short`, and any unrelated remaining changes.
   - Identify checks blocked by pre-existing work rather than hiding them.
