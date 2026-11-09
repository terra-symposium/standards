---
name: quality
description: Run a repository's full quality workflow, repair findings, and commit that repository as soon as its own checks are green.
---

# Quality

Use this skill when asked to run, repair, or complete code quality across one or more repositories.

## Work repository by repository

- Treat each repository as an independent quality and commit unit, even when several repositories are being reviewed in parallel or in separate chats.
- Inspect the current checkout, branch, working tree, repository instructions, and declared quality workflow before editing. Preserve unrelated changes, existing stashes, and worktrees.
- Run the repository's full declared quality workflow and relevant tests. Fix real findings at their source; keep assertions, coverage, timing budgets, and analyzer scope intact.
- Do not hide failures with broad ignores, suppressed diagnostics, weaker assertions, skipped tests, or fabricated configuration. Do not access secrets or change production settings.
- A repository is green only when all required configured checks and tests pass and no unresolved in-scope quality findings remain. Report warnings, unavailable checks, and external blockers plainly; an incomplete or blocked run is not green.

## Repair configuration problems

- Fix configuration failures at their source, then rerun the affected check and full workflow. If quality setup is missing, install the workflow defined by Terra standards; never weaken checks or change production settings or secrets.
- If blocked, report only the failing check/error, the blocker and concrete remedy, then how you will verify it. Mark the repository blocked, not green.

Example:

- Before: “The environment appears runnable, but task creation has stalled. This may relate to account credits, Cloud provisioning, or a session issue. An owner may need to investigate the environment and restore access before I can continue.”
- After: “Blocked: `create_thread` timed out. Workspace owner: restore Cloud task capacity; I’ll retry chat creation and verify the run starts.”

## Commit policy

- **Commit a repository's task changes as soon as that repository reaches green. Do not wait for the other repositories in a multi-repository task.**
- Before committing, review that repository's diff and status. Stage only task-related changes; exclude unrelated work, caches, generated artifacts, credentials, and secret files.
- Follow the repository's branch and commit conventions. Create a local commit and verify its hash and clean/remaining status.
- **After a repository reaches green and its task changes are committed, push that commit from Cloud to the matching verified remote branch so it is available to the user's desktop checkout.** Fetch the remote first and confirm the target branch still has the expected starting commit. Use a normal fast-forward push; never force-push. If the remote advanced, rebase or otherwise integrate only when safe, rerun the full workflow, then push. If the update cannot be integrated safely or permissions reject the push, keep the local commit and report the exact blocker.
- Do not merge, release, or deploy. The user has explicitly authorized branch pushes as part of this workflow; do not ask for separate approval.
- If a repository is not green, leave its task changes uncommitted and continue useful work on other repositories. A blocker in one repository must not delay commits for repositories that are already green.

## Reporting

Track results per repository: branch and base commit, checks run, pass/fail/block status, task files changed, and commit hash when green and committed. Distinguish a committed repository from one whose changes are only in a working tree or stash. Do not describe the overall multi-repository task as green while any in-scope repository remains incomplete or blocked.

## Multi-repository requests

- For a request to run quality across multiple repositories, follow the Terra Standards root-level `$all-repos` skill at `.agents/skills/all-repos/SKILL.md`. Its required helper, `.agents/skills/all-repos/scripts/create-repo-chats.mjs`, must be run once with this file passed as `--skill-file`, the selected Cloud environment, and every in-scope repository root. It discovers each repository and provisions all tasks in one parallel batch. Do not create the same tasks individually outside the helper. If a prior batch already created some chats, resume them and provision only missing repositories. For a single repository, follow this skill directly.
- The all-repositories coordinator owns discovery and task dispatch; this skill owns each repository's quality checks, repairs, commit, and push requirements.

### Required final output

- For a multi-repository sweep, the final response must be **only one Markdown table**: one row per in-scope repository and one column per required check. Use `✓` for passed and `✗` for failed, blocked, or not run. Include repository and outcome metadata (branch/base, commit, push result, or blocker) in the first column or additional metadata columns; do not add prose outside the table.
- Each cell names its check and shows the mark, for example `✓ quality:all` or `✗ build (EROFS)`. Use `✗` for checks that could not run. Never use a dash or blank cell to imply a pass. A repository is overall green only if every required check cell is `✓` and its task changes are committed.

Example (the columns are the required checks declared by these example repositories):

| Repo                           | Format | Lint | Typecheck | Tests     | Build     | Overall      |
| ------------------------------ | ------ | ---- | --------- | --------- | --------- | ------------ |
| `sample-web` / commit `def456` | ✓      | ✓    | ✓         | ✓         | ✓         | ✓            |
| `sample-api`                   | ✓      | ✓    | ✗ not run | ✗ not run | ✗ blocked | ✗ incomplete |
