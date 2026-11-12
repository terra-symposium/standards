---
name: quality
description: Run and repair a repository's exact full quality gate until it is green, with complete logs.
---

# Quality

Trigger: **Read and follow the Terra Standards Quality skill for `<owner/repository>`.** If the Cloud skill catalog does not expose this file, resolve it from the Standards repository's current default branch. Respect the requested repository, exclusions, and execution environment.

## Coordinator mode

Create one Codex Cloud chat per repository through Codex app task controls. Before each dispatch or resume, check the connected account's remaining usage and confirm the repository, Cloud environment, branch, and model. Stop if the allowance or repository access is unavailable. Never substitute a local task for Cloud.

Track each task independently until its exact gate exits 0. A nonzero result from repository findings is work in progress, not a final result; continue through repair passes and context compactions. A repository on hold or explicitly skipped is not a green result.

## Single-repository worker mode

Work on the named repository only. Do not start additional chats from a worker task.

1. Read the repository's `AGENTS.md`, README guidance, and quality configuration. Confirm the checkout, remote, branch, and working-tree state before editing.
   Confirm the repository-pinned Node and pnpm versions, installed dependencies, and any required Rust toolchain or components; repair missing environment prerequisites without changing project checks or weakening dependency build approvals.
2. Run the exact command `pnpm run quality:all` in the repository root, capturing its entire stdout and stderr with its exit code. If the script is missing, add a safe root wrapper for the repository's full configured Terra Quality gate, then rerun the exact command.
3. Treat every nonzero exit caused by repository findings as unfinished work. Inspect the findings, fix them in their owning source files, and preserve behavior, public contracts, existing work, checker rules, thresholds, and waivers. Do not hide, disable, or weaken checks.
4. After each coherent repair batch, rerun the exact `pnpm run quality:all` and review the complete output. Repeat without an attempt limit until it exits 0; continue through context compactions and long runs. Run any additional tests, type checks, builds, or validation named by repository instructions. Never report a red run as a final result or accept red findings as a stopping point.
5. Review each diff and stage only task files. If the user directs progress commits, commit safe completed fixes between runs while continuing toward green. Once green, commit any remaining task changes and push directly to the repository's existing development integration branch (use its default branch only when no development branch exists); never create a task branch. Never force-push; verify the destination branch, remote SHA, and worktree status.
6. The only reasons to stop before green are: (a) the quality script is missing or demonstrably cannot correctly execute or report after safe repair, or (b) a required Cloud environment prerequisite cannot be safely resolved with available access. For either case, show the exact failing command, evidence, and full log. Ordinary repository findings, a long run, context compaction, or an unsafe autofix are not blockers; repair source findings manually where safe. Never label a started, partial, or red run green.

## Final output

Report the repository, branch, exact `pnpm run quality:all` exit code, additional check results, commit SHA, push result, and remaining tree status. **Print the FULL stdout and stderr log of the final quality run in the response whether it succeeds or fails; a link, summary, excerpt, or collapsed placeholder is insufficient.** Preserve the raw log as an artifact when possible.

Only for a demonstrated script or environment blocker, write exactly one sentence identifying the error and one sentence recommending the next fix. Include the full log after those sentences. Do not return a red final report for ordinary repository findings, and never call a partial, skipped, or blocked run green.
