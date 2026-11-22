# Repository output and caches

Use this alongside the [Quality hygiene scope](../../quality/references/hygiene.md) when the task is to reduce repository clutter. For an execution request, inspect every repository in scope and finish by deleting, moving, or merging safe candidates. For an audit or plan request, stop at a reviewable inventory and proposed changes.

## 1. Establish scope and safety

Read repository instructions and inspect Git status before editing. Preserve existing user changes. Never edit skills installed under a user home directory; skill changes belong only in a tracked code repository.

Inventory directories and large files while pruning `node_modules`, `.git`, package caches, and other dependency stores from the walk. Include ignored and hidden paths. For each candidate, check whether Git tracks it, find references in scripts/configuration/deployment, identify its owning generator, and confirm that generator recreates it.

Check active build, preview, development, and deployment processes before deleting or moving generated output. Keep any directory a running process is using. Never delete authored content, source assets, lockfiles, credentials, user data, or a directory whose ownership is unclear. Resolve `.astro` and other cache symlinks before classifying them; inspect the target, active processes, generator, and consumers before proposing deletion.

## 2. Consolidate and prune

Prefer one documented output location per site. Move output configuration, build scripts, deploy settings, ignore rules, and documentation together. If a repository already uses `dist/` for a library or application, put the independent site under a named child such as `dist/docs/`; never overwrite or clear the parent output to remove a child site.

Remove duplicate, superseded, or stale generated outputs once the canonical generator has built successfully and no active process is using the old path. Remove reproducible caches such as `.astro/`, `.netlify/`, `.vercel/`, coverage output, and TypeScript build metadata when they are idle. Preserve package build directories that scripts, exports, or deployment consume. Do not delete `node_modules`, vendored source, or tracked files as generic cleanup.

Search for references to every moved or deleted path before and after cleanup. Update all callers and deployment destinations. Remove obsolete ignore rules and replace them with the canonical output rule.

## 3. Verify and report

Run the owning build for each changed site and check that routes and assets land under the canonical output. Confirm removed outputs are ignored or absent, no tracked source was deleted, and no references to obsolete locations remain. Keep the new output available for inspection unless the user asked to remove generated output entirely.

Report paths consolidated, generated directories removed, directories retained because an active process or package needs them, and any remaining candidates that could not be safely classified.
