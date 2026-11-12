---
name: all-repos
description: Run a selected repository skill across a user-defined set of repositories by coordinating one isolated Cloud task per repository.
---

# All Repos

Use this skill when the user asks to apply a task across all repositories or a specified multi-repository set. This skill coordinates scope, parallel Cloud tasks, and the combined report; each repository task follows the selected skill's own workflow.

## Select scope and worker skill

- Identify the requested repository scope from the user's named Cloud environment, explicit repository list, or supplied root directories. Do not infer that a local folder contains every repository in a Cloud environment.
- Exclude only repositories the user explicitly excludes. For example, pass `--skip compression` when requested; do not skip it by default.
- Identify the worker skill the user named, such as `quality` or `hygiene` for behavior-preserving compaction. Each per-repository task must receive that skill's complete instructions and the user's task-specific goal.
- Preserve the worker skill's own rules for edits, validation, commits, pushes, and other external actions. This coordinator does not add permissions or weaken a worker skill's checks.
- For a goal with a threshold such as “find N additional changes,” treat N as a per-repository threshold unless the user says it is global. Count only distinct, valid changes within the selected skill's scope. Stop each repository when it reaches N or a complete pass finds no more valid changes; do not invent findings to reach the threshold.

## Launch one Cloud task per repository

- Verify each target repository's identity and availability in the requested Cloud environment before dispatch. Preserve one repository per task; do not share checkouts or commits.
- The required provisioning helper is `scripts/create-repo-chats.mjs` next to this skill. Run it once with the complete target set, selected Cloud environment, worker skill, and explicit exclusions. It must create every per-repository Cloud task in one parallel batch. Do not create tasks one by one outside the helper. If a previous batch created some chats, resume them and submit only missing repositories.
- Use the requested Cloud environment and the user's applicable model policy; the standing repository policy requires GPT-6 Luna for delegated Cloud tasks.
- Give every task the repository name, verified origin, initial branch and commit, worker skill, user goal or stop threshold, and the requirement to inspect the repository's own instructions and state before edits.
- Have each task continue independently through its worker skill's completion criteria. A blocked repository must not stop other tasks. Keep incomplete work uncommitted unless its worker skill directs otherwise.
- If the checkout is read-only, continue through a writable isolated clone, managed worktree, or persistent interactive terminal. If ordinary command calls do not preserve writes, keep the work in a persistent session until the required checks and worker-directed commit/push are complete.

The batch helper is `scripts/create-repo-chats.mjs` next to this skill. It discovers Git repositories under supplied roots, accepts a worker-skill file, supports explicit exclusions and a per-repository goal, and launches all targets concurrently as one batch. Do not use a concurrency limit that splits the target set into multiple submissions.

Example invocations:

```sh
node scripts/create-repo-chats.mjs \
	--env "$CODEX_CLOUD_ENVIRONMENT_ID" \
	--skill-file /path/to/quality/SKILL.md \
	--skip compression \
	/Users/kaimacann/Desktop

node scripts/create-repo-chats.mjs \
	--env "$CODEX_CLOUD_ENVIRONMENT_ID" \
	--skill-file /path/to/standards/packages/quality/.agents/skills/hygiene/SKILL.md \
	--goal "Find and apply 3 additional behavior-preserving compaction changes per repository" \
	/Users/kaimacann/Desktop
```

## Report the sweep

- Track each repository's branch and base, selected checks or goal, changes, commit and push result when required by the worker skill, and any precise blocker.
- Produce one combined Markdown table with one row per in-scope repository. Use columns for the worker skill's required checks or goal, plus commit/push or blocker metadata. Mark every result with `✓` or `✗`; do not imply success with blank cells or dashes.
- Do not report the sweep as green while any repository is incomplete or blocked. Preserve the excluded-repository list in the report.

For a quality sweep, the table uses one column per check declared by each repository's quality wrapper. For other worker skills, replace those check columns with the skill's goal or completion criteria. Example:

| Repository / branch / commit    | Typecheck | Lint | Tests | Commit      | Push | Blocker                                 |
| ------------------------------- | --------- | ---- | ----- | ----------- | ---- | --------------------------------------- |
| rma-sports / `main` / `a1b2c3d` | ✓         | ✓    | ✓     | ✓ `d4e5f6a` | ✓    | ✓ None                                  |
| website / `main` / `e7f8a9b`    | ✓         | ✗    | ✗     | ✗           | ✗    | ✗ Lint reported 2 errors; tests not run |
