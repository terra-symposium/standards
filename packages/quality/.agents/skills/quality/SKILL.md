---
name: quality
description: Run the exact full quality gate for a repository and report its complete log.
---

# Quality

Trigger: **Read and follow the Terra Standards Quality skill for `<owner/repository>`.** Resolve this file from the Standards repository's current `origin/development` when the Cloud skill catalog does not expose it. Respect the requested repository, exclusions, and execution environment.

## Coordinator mode

Create one Codex Cloud chat per repository through Codex app task controls. Before each dispatch or resume, check the connected account's remaining usage and confirm the repository, Cloud environment, branch, and model. Stop if the allowance or repository access is unavailable. Never substitute a local task for Cloud.

Track each task independently. Keep fixing repositories with actionable failures; report a blocker only after attempting the available recovery paths. A repository on hold or explicitly skipped is not a green result.

## Single-repository worker mode

Work on the named repository only. Do not start additional chats from a worker task.

1. Read the repository's `AGENTS.md`, README guidance, and quality configuration. Confirm the checkout, remote, branch, and working-tree state before editing.
2. Run the exact command `pnpm run quality:all` in the repository root, capturing its entire stdout and stderr with its exit code. If the script is missing, add a safe root wrapper for the repository's full configured Terra Quality gate, then rerun the exact command.
3. Fix findings in their owning source files. Preserve behavior, public contracts, existing work, checker rules, thresholds, and waivers. Do not hide, disable, or weaken checks.
4. Re-run `pnpm run quality:all` after each coherent fix batch. Then run any additional required tests, type checks, builds, or validation steps named by the repository's instructions.
5. When all configured checks are green, review the complete diff, stage only task files, commit, and push normally to the matching branch if the user authorized pushing. Never force-push. Verify the pushed SHA and remaining worktree status before moving on.
6. If a check is blocked by an environment or access failure, attempt a safe local recovery and report the exact failing command and evidence if it remains unresolved. Do not label a started or partial run as green.

## Final output

Report the repository, branch, exact `pnpm run quality:all` exit code, additional check results, commit SHA, push result, and remaining tree status. **Print the FULL stdout and stderr log of the final quality run in the response whether it succeeds or fails; a link, summary, excerpt, or collapsed placeholder is insufficient.** Preserve the raw log as an artifact when possible.

For a failure, write exactly one sentence identifying the error and one sentence recommending the next fix. Include the full log after those sentences. Never call a partial, skipped, or blocked run green.
