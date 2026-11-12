---
name: package-update
description: Update Terra shared packages across their Desktop repository consumers, verify each consumer, and restart affected local servers already running on the device.
---

# Terra package updates

Use this skill to roll released Terra packages such as Docs, Quality, or Styling through every consuming repository under `~/Desktop`, then refresh affected local servers that are already running on the device.

## Find package owners and consumers

1. Identify the requested package names, their owning repositories, current versions, intended versions or commits, and release state. Read the package's release guidance and verify that the target version is actually available from its configured source.
2. Inventory every Git repository below `~/Desktop`, including nested repositories. For each discovered repository, inspect `git worktree list --porcelain` and include its active worktrees even when their directories are outside `~/Desktop`. Preserve each repository's branch, worktree state, and unrelated edits. Do not change repositories that do not consume one of the requested Terra packages.
3. Search each candidate repository's manifests, workspace catalogs, overrides, and lockfiles for the package. Also search tracked source, scripts, CI/workflows, build plugins, docs, and commands for package names, version literals, registry URLs, and Git references. Follow constants and indirections to their defining values. Record direct, development, optional, and peer dependencies, plus locally linked or Git-sourced references and non-manifest pins. Include repositories whose app or documentation server consumes the package, even when the package is only used by a workspace member or a plugin/script pins its version outside a manifest.
4. Build a repository-by-package matrix before editing. Confirm every package reference's effective source and version, including references resolved through constants or build configuration. Update each through the source that owns that reference; preserve registry, Git tag/commit, and workspace installation modes unless the requested migration changes them.

## Update and verify consumers

1. If a requested package change has not been released, complete and validate its source package first. Publish only when the active request authorizes publication; follow [npm](../git/npm/SKILL.md) for npm authentication, trusted publishers, and release verification. Do not create credentials or change package access as part of a routine dependency update.
2. In every identified consumer, update all applicable manifest declarations and package-manager pins to the intended release. Use that repository's package manager and regenerate its lockfile from the repository root. Preserve peer-dependency, build-script, and workspace policies; do not hand-edit lockfile resolutions.
3. Install from the updated lockfile and run the package's quality checks plus the affected consumer's quality, type, and build checks. Use focused checks where only one workspace is affected, and record skipped checks or failures rather than reporting the repository as verified.
4. Repeat the full package-name and version-literal search after the update. Confirm no manifest, source file, script, plugin, CI workflow, command, or documentation reference remains on an older or unintended version or source. Review each diff for accidental dependency churn and preserve pre-existing changes.

## Restart existing local servers

Read [the local port assignments and acquisition guidance](../git/port/SKILL.md) before handling development servers. Include existing Docs servers and other local development servers whose repository consumes an updated package. Use current listener and process evidence; the port table is a guide, not proof that a process still belongs to a particular repository.

1. Before changing dependencies, inventory the device's running local development servers and listeners, including Docs instances. Record each server's port, process, command, and working directory where available. Do not assume the port table lists every running server.
2. Match each process to its repository and determine whether that repository is an affected consumer. Use the process command, working directory, and current Git worktree evidence together; do not infer ownership from a port number alone. Preserve this before-update inventory for comparison after installation.
3. Restart every inventoried server that belongs to an affected consumer. Use the repository's documented launcher or process manager and preserve its configured port, arguments, and environment. Stop a process gracefully after confirming its ownership; do not kill an unidentified listener or restart unrelated services.
4. Wait for each restarted service to become ready. Check its expected local URL or health route and confirm the running process uses the updated consumer checkout and lockfile. If it cannot be safely identified or restarted, leave it intact and report the exact evidence and blocker.

## Report the rollout

Summarize the package version or commit, every consumer repository updated, the checks and results for each, and each affected server's port, repository, restart result, and readiness evidence. List any consumers or servers that remain outdated or blocked. Do not commit, push, deploy, or publish unless the active request authorizes that action.
