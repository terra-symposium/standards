---
name: quality
description: Run Quality, audit repository hygiene, and repair source safely.
metadata:
  related-files:
    - config/quality.json
skill: true
---

# Quality

Use this skill for local Quality checks and fixes. For repository health, source documentation, and compaction, follow the [hygiene scope](references/hygiene.md). For explicitly requested Cloud work, follow the [Cloud scope](references/cloud.md). Apply only the guidance relevant to the requested work.

Read any repository `AGENTS.md`, `quality.json`, package scripts, and installed Quality documentation first. Record its remote, branch, worktree status, selected scope, and existing edits before running any command. Before a normal fixing run, take a read-only `--warn` baseline with the same script, scope, and other arguments planned for the fixing run; record the selected-file inventory. Save the pre-run patch and contents of already dirty and untracked files so post-run edits can be attributed to Quality without losing user work. Compare the baseline and those snapshots with the post-run state.

## Multi-repository Hygiene

When the request covers multiple repositories, use the All-Repos skill for coordination and rediscover Git roots under the requested scope on every run. Detect directory and file `.git` entries, deduplicate worktrees by canonical Git common directory, and do not descend into Git metadata or generated dependency directories. Record inspected roots, exclusions with reasons, inaccessible paths, and every discovered repository. Treat a previous inventory as a baseline, never an allowlist. Work one repository at a time unless the applicable workflow explicitly permits disjoint parallel work.

### Baseline and synchronization

Before changing anything, record each repository's path, origin URL, checked-out branch, HEAD, exact upstream, ahead/behind state, relevant runtime and package-manager versions, complete staged/unstaged/untracked status, and existing worktrees. Read governing `AGENTS.md` files, installed Quality guidance, scripts, configuration, and CI. Inspect a command's write behavior before running it. Preserve pre-existing work, branches, stashes, and worktrees unless their removal is explicitly authorized. Discard recorded working changes only when the current user request explicitly authorizes that scope; do not remove ignored data or use broad cleanup commands without authorization.

Synchronize every checked-out branch, including branches in existing worktrees, before running Hygiene. Fetch its verified upstream and compare commits. Fast-forward when there are no local-only commits. When both sides have unique commits, integrate the upstream while preserving meaningful local commits and their published identities. Resolve conflicts from the current architecture and history, run focused checks, push normally, and verify the remote ref. Do not force-push, reset, skip commits, or replace history merely to make a branch clean.

For a missing upstream, inspect remote and default branches, pull-request refs and history, and patch-equivalent commits. Restore tracking only after confirming the intended lineage. Diagnose a failed fetch, integration, check, or push and try a safe recovery before reporting a blocker. Ask the user for a specific action only when credentials, authorization, or a consequential choice are required; continue independent repositories. Record unsynchronized branches and do not run Hygiene in their repository until they are reconciled.

### Isolated Hygiene run

Use `origin/development` as the publication branch when it exists; otherwise verify the remote default branch. Fetch that exact ref. Create a unique run-specific branch and worktree outside the discovery scope from the latest publication ref, then pull fast-forward-only before any writing inspection. Record its base commit and clean initial status. Never reuse a pre-existing worktree for Hygiene; remove one only with explicit authorization after preserving its work.

First run the current Quality skill's read-only `--warn` baseline with the intended scope and save its full findings. Then run the repository's exact required gate (`quality:all`, `verify`, or its documented equivalent) and relevant build, type, schema, security, and test checks prescribed by its instructions. Keep complete stdout, stderr, and exit codes for each command outside the worktree; redact secrets from reports. In particular, retain the complete `pnpm run quality:all` output when that command is configured. A zero-exit `--warn` run can still contain findings.

Inspect and classify every actionable finding before repairing it. If a repeatable, deterministic, behavior-preserving transformation can safely fix that class of finding, implement it in the owning Terra Hygiene or Quality package before hand-editing consumers. Add focused regression coverage for the rule and its unsafe boundary, then run the new fixer against the current finding and review its output. Record which findings the package fixed and which still required agent judgment. Leave semantic decisions, comments, TSDoc, and other prose agent-authored. The aim of each run is to reduce the next run's agent-authored repairs to the minimum that cannot safely be automated. Follow the package-automation retrospective in the Hygiene scope rather than adding one-off repository scripts or suppressions.

Repair remaining findings at their owning source with the smallest behavior-preserving change. Inspect every diff hunk, rerun the failing and affected checks to completion, and run the required gate again. Do not suppress findings, weaken checks, add stubs, or make unrelated dependency changes. Commit only a reviewed, complete fix that passes its required checks. If there is no actionable finding, do not create an empty commit or push.

Before publishing, fetch the target again. If it advanced, integrate it without discarding work, resolve only safe conflicts, and rerun affected checks. Push a completed commit normally to the verified publication branch and confirm the remote ref. Never claim a rejected or unsafe push succeeded.

### Cleanup and report

For every repository, use a guaranteed cleanup step after success, no findings, failure, or blocker. Preserve logs and any needed uncommitted patch outside the worktree. Verify the exact run-created path and branch, remove that worktree with Git, delete only its run-created local branch, and confirm the directory is absent. If normal removal fails, save the patch and logs, retry only for the verified worktree, and report any remaining failure. Verify the original checkout's status and worktrees afterward.

Report every repository, including blocked ones: source path and baseline, origin and upstream, synchronization and conflict resolution, isolated base/worktree, exact commands and exits, findings and repairs, final diff review, commit and push target/status, and verified cleanup. Distinguish pre-existing failures from regressions. The sweep is green only when every in-scope repository has passed its required gate, every completed fix is published, and cleanup is verified.

When a separate full browser-test phase is requested, finish the entire Hygiene sweep to green before starting it. Then use the Test skill's ordering and fixing procedures to run the repository's complete configured Playwright suite and iterate until it passes; a smoke or filtered run does not establish full-suite completion.

Quality may apply safe fixes. `--warn` prevents writes but can return zero even with findings, so read the full findings rather than relying on its exit code. Review every resulting edit, especially around public APIs, evaluation order, stored values, and syntax. Use `--warn` when a read-only inspection is needed. A `// hygiene-ignore single-use -- <reason>` comment is permitted only for the specific declaration when inlining would change behavior or a documented API boundary; follow the installed Quality version's directive syntax and keep the concrete reason beside that declaration.

Follow the user's requested execution environment, branch, commit, and push policy. Do not commit or publish solely because a Quality run succeeds. Report commands, scope, exit codes, findings, repairs, verification, and any access or environment blockers separately.

## Delegated work

Model preferences are suggestions: select the lowest-cost available model that is capable of the delegated task, name the selected model explicitly when delegating, and do not choose a costlier model when a cheaper capable model is sufficient.
