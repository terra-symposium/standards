---
name: prune-device
description: Prune Codex storage and deduplicate custom skills across repositories when the user asks for device cleanup.
---

# Prune Device

Use this skill when the user asks to reduce local Codex storage, inspect Codex archives, deduplicate skills across repositories, or move personal skills into repository ownership. Do not apply it to ordinary repository cleanup.

## Set the cleanup boundary

1. Confirm the user’s intended scope from the request and current conversation. Treat explicit exclusions and vendor-preservation choices as binding.
2. Inventory only relevant user-home paths, Codex-managed storage, and the named repository roots. Resolve each repository with Git rather than assuming that a directory is a repository.
3. Classify each candidate as repository-owned content, personal skill, archived copy, vendor-managed asset, rebuildable cache, recoverable work, or application state. Do not treat every file named `SKILL.md` as user-owned.
4. Record repository status before editing. Preserve unrelated staged, unstaged, untracked, ignored, and worktree state.

Keep Codex, ChatGPT, Dia, Warp, Raycast, and plugin-managed skills and assets when the user asks to preserve vendor-managed content. Keep credentials, settings, databases and write-ahead logs. Do not inspect or print secret values. Never delete database files manually.

## Consolidate skills

1. Inventory custom `SKILL.md` files across the requested repositories and personal skill locations. Exclude `.git`, `node_modules`, generated dependency trees, and vendor-managed skill bundles from the custom-skill comparison; inventory those separately when needed to honor the preservation boundary.
2. Find exact duplicates with content hashes. Find likely overlaps by comparing names, descriptions, triggers, workflows, and supporting resources. Similar subject matter alone is not duplication.
3. Choose one canonical owner using current repository guidance and the workflow’s source-of-truth boundary. Keep related but distinct skills separate.
4. Before removing a copy, compare its instructions, UI metadata, references, scripts, examples, and other support files with the canonical skill. Merge unique, current guidance and repair links or callers. Prefer moving a unique personal skill into its owning repository over deleting it.
5. Remove redundant personal or archived copies only within the user-authorized scope. Never remove vendor-managed copies to make an inventory appear repo-only. A user’s “no skills outside repositories” rule applies to personal skills, with explicitly preserved vendor-managed assets as the exception.
6. Update the owning repository’s catalogs and regenerate generated catalogs with the repository’s documented command. Confirm every catalog link and skill reference resolves.

## Reduce Codex storage

1. Measure candidate directories before cleanup. Separate archived transcripts, recent sessions, managed worktrees, rebuildable caches, plugin assets, Git bundles, test evidence, and application state.
2. Permanently delete only archived threads the user authorized for deletion. Use Codex’s supported thread/session delete control; do not unlink rollout files directly while Codex may index them. Keep active or recent threads unless the user explicitly includes them. Verify the archived-thread inventory and transcript files afterward.
3. Clear rebuildable caches only after Codex is closed. Do not close the user’s active Codex session to perform cleanup. Preserve plugin-managed assets unless they are confirmed rebuildable and within the user’s requested scope.
4. Remove managed worktrees through Codex’s worktree archive flow so dirty work is saved in its recoverable snapshot. If the owning thread is unavailable and the Codex control cannot attach the checkout, do not discard dirty work: inspect tracked, staged, untracked, and needed ignored files; make a recoverable Git stash or equivalent snapshot; record its object ID and base commit; then remove the worktree with Git only after it is clean. Remove a clean worktree without force and verify it is gone.
5. Keep Git bundles until each saved tip is verified in another recovery source or the user explicitly abandons it. A missing local branch or unmatched remote branch name is not proof that its contents are disposable.
6. Delete old test evidence only when it is clearly generated, outside repository source, and covered by the user’s cleanup request. Do not remove recent session logs, databases, credentials, or settings as generic cleanup.

## Verify and report

- Verify Codex reports the targeted threads deleted and their rollout files are absent.
- Re-measure candidate directories and available filesystem space. Distinguish files removed from disk space actually reclaimed.
- Re-scan repository-owned skills for exact duplicates and duplicate names, check known near-duplicates, and validate catalog links and references.
- Run `git diff --check` for changed repositories. Do not add or run tests unless the user asks.
- Report completed deletions, preserved recovery material, remaining caches or bundles, dirty-state snapshots, validation results, and any cleanup blocked by the active app or unavailable Codex controls.
