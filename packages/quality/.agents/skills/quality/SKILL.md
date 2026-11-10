---
name: quality
description: Run and repair a repository's configured quality checks, or coordinate a parallel multi-repository quality sweep.
---

# Quality

Use this skill for an explicit repository quality sweep. Respect the requested repository scope, exclusions, and execution environment.

## Coordinator mode

For a multi-repository sweep, the bundled provisioning script is required. Run it once to create all repository tasks as one concurrent batch; do not create the chats one at a time outside the script.

From the Standards repository root, for example:

```sh
node packages/quality/.agents/skills/quality/scripts/create-quality-chats.mjs \
	--root /Users/kaimacann/Desktop \
	--env kai-macann-all \
	--skip compression \
	--skip salesphere
```

Pass every user-requested exclusion explicitly with `--skip`. `--dry-run` prints the selected repository batch without creating tasks. Do not rerun provisioning for tasks that already exist unless the user asks to start a new batch.

Track each task independently. Keep fixing repositories with actionable failures; report a blocker only after attempting the available recovery paths. A repository on hold or explicitly skipped is not a green result.

## Single-repository worker mode

The provisioning script embeds this skill and marks each task as a single-repository worker. Do not start additional chats from a worker task.

1. Read the repository's `AGENTS.md`, README guidance, and quality configuration. Confirm the checkout, remote, branch, and working-tree state before editing.
2. Use that repository's own quality wrapper or check script. Do not substitute a smaller custom checklist for the configured gate.
3. Fix findings in their owning source files. Preserve behavior, public contracts, existing work, checker rules, thresholds, and waivers. Do not hide, disable, or weaken checks.
4. Re-run the exact wrapper after each coherent fix batch. Then run any additional required tests, type checks, builds, or validation steps named by the repository's instructions.
5. When all configured checks are green, review the complete diff, stage only task files, commit, and push normally to the matching branch if the user authorized pushing. Never force-push. Verify the pushed SHA and remaining worktree status before moving on.
6. If a check is blocked by an environment or access failure, attempt a safe local recovery and report the exact failing command and evidence if it remains unresolved. Do not label a started or partial run as green.

## Final output

The final response for a batch must contain only one Markdown table, with one row for every repository in scope and one column for each configured quality check or test observed across the batch. Add `Commit` and `Push` columns so delivery is visible. Use `✓` only when the check passed and `✗` for a failed, blocked, skipped, or unrun check; add a short reason after `✗` when needed. Do not add prose before or after the table.

Example:

| Repository                     | `quality:all`        | Format               | Lint                 | Typecheck            | Tests                | Build                | Commit    | Push      |
| ------------------------------ | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- | --------- | --------- |
| `ambulance-dispatch-prototype` | ✓                    | ✓                    | ✓                    | ✓                    | ✓                    | ✓                    | ✓         | ✓         |
| `portfolio`                    | ✗ failed             | ✓                    | ✓                    | ✗ blocked            | ✓                    | ✓                    | ✗ pending | ✗ pending |
| `compression`                  | ✗ skipped by request | ✗ skipped by request | ✗ skipped by request | ✗ skipped by request | ✗ skipped by request | ✗ skipped by request | ✗ n/a     | ✗ n/a     |

For a worker task, return the same table with its single repository row. Use the exact configured command names as headers when they differ from this example.
