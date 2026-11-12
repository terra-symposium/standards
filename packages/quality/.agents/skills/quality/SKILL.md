---
name: quality
description: Run and repair a repository's exact full quality gate until it is green, with complete logs.
---

# Quality

Trigger: **Read and follow the Terra Standards Quality skill for `<owner/repository>`.** Resolve this file from the Standards repository's current `origin/development` when the Cloud skill catalog does not expose it. Respect the requested repository, exclusions, and execution environment.

## Coordinator mode

Create one Codex Cloud chat per repository through Codex app task controls. Before each dispatch or resume, check the connected account's remaining usage and confirm the repository, Cloud environment, branch, and model. Stop if the allowance or repository access is unavailable. Never substitute a local task for Cloud.

Track each task independently until its exact gate exits 0. A nonzero result from repository findings is work in progress, not a final result; continue through repair passes and context compactions. A repository on hold or explicitly skipped is not a green result.

## Single-repository worker mode

Work on the named repository only. Do not start additional chats from a worker task.

1. Read the repository's `AGENTS.md`, README guidance, and quality configuration. Confirm the checkout, remote, branch, and working-tree state before editing.
   Confirm the repository-pinned Node and pnpm versions, installed dependencies, and any required Rust toolchain or components; repair missing environment prerequisites without changing project checks or weakening dependency build approvals.
2. Run the exact command `pnpm run quality:all` in the repository root, capturing its entire stdout and stderr with its exit code. If the script is missing, add a safe root wrapper for the repository's full configured Terra Quality gate, then rerun the exact command.
3. Fix findings in their owning source files. Preserve behavior, public contracts, existing work, checker rules, thresholds, and waivers. Do not hide, disable, or weaken checks.
4. Re-run `pnpm run quality:all` after each coherent fix batch. A red source finding does not end the task: inspect its cause, make the next safe repair, and repeat until the exact command exits 0. Continue through context compactions. Run any additional tests, type checks, builds, or validation named by repository instructions.
5. Review each diff and stage only task files. If the user directs progress commits, commit safe completed fixes between runs while continuing toward green. Once green, commit any remaining task changes and push directly to `origin/development`; never create or push a task branch. Never force-push; verify the remote SHA and worktree status.
6. Stop short of green only when the quality script itself cannot correctly execute or report, or a required Cloud environment prerequisite cannot be safely resolved with available access, after attempting safe recovery. Show the exact failing command, evidence, and full log. Do not treat ordinary repository findings, a long run, or an unsafe autofix as a blocker; repair source findings manually where safe. Never label a started, partial, or red run green.

## Final output

Report the repository, branch, exact `pnpm run quality:all` exit code, additional check results, commit SHA, push result, and remaining tree status. **Print the FULL stdout and stderr log of the final quality run in the response whether it succeeds or fails; a link, summary, excerpt, or collapsed placeholder is insufficient.** Preserve the raw log as an artifact when possible.

Only for a demonstrated script or environment blocker, write exactly one sentence identifying the error and one sentence recommending the next fix. Include the full log after those sentences. Do not return a red final report for ordinary repository findings, and never call a partial, skipped, or blocked run green.
