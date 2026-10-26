---
name: repo-file-audit
description: Aggressively audit repository files and scripts, prune dead artifacts and obsolete migrations, and enforce canonical source and configuration ownership. Use for structural cleanup, not routine edits to a few known files.
---

# Repository file audit

Treat every file as a cost that must justify its existence. A file stays only when it has one identifiable owner, one active purpose, and one canonical location. When asked to run this skill, make the clear moves, merges, and deletions; do not stop at recommendations. Work read-only only when the user explicitly asks for a report.

## Rules

### Source ownership

Apply these placements unless a framework requires a different exact path or an established public interface requires a facade:

- `src/app/` owns application bootstrapping and composition that is not a framework-owned route.
- `src/lib/` owns reusable non-visual logic, adapters, presets, algorithms, and shared types. Put the package API barrel in `src/lib/index.ts`.
- `src/components/` owns rendered UI; keep component domains below it, such as `src/components/ui/`.
- `src/hooks/` owns reusable framework hooks. Keep a hook beside its sole owning component only when it is genuinely private to that component.
- `src/styles/` owns authored stylesheets and design tokens. `src/assets/` owns imported images, fonts, and other source assets with their attribution.
- Framework routes stay at the exact path required by the framework. A public facade may remain in its named domain, but its implementation belongs to its source owner.
- Put a type beside its sole owner. Put cross-module types in `src/lib/types.ts`; do not create a second root `src/types.ts`.
- Tests mirror source ownership under the established test root. Update discovery when tests move.
- A package root `src/index.ts` may remain only as a thin public facade to `src/lib/index.ts`; put its implementation under the owning folder.
- Do not leave implementation files directly under `src/`, in catchall folders (`misc`, `common`, `helpers`, `utils`), or in duplicated domains such as `src/ui/ui/`. Record an exact framework/tool requirement for every exception.

### Delete-first pruning

- Inventory every tracked file and relevant untracked or ignored artifact. Exclude `.git` internals and dependency trees from path-by-path review, but inspect their manifests and ignore rules. Preserve all existing user changes.
- Enumerate ignored and untracked generated output directories at every depth, including nested packages; cross-check ignore rules, framework/build output settings, package exports, test setup, and deploy commands. For each output, record its owner, regeneration command, consumers, and active process use. Ignore status does not exempt it from review. Delete the output when it is not actively consumed and every supported consumer regenerates it before use; keep it when an active process needs it or regeneration is not guaranteed.
- Give every inventoried file one disposition: **keep**, **move**, **merge**, **delete**, or **blocked**. `keep` requires evidence of an active owner and correct location. “Might be useful” is not evidence.
- Delete reproducible residue by default: unreferenced `*.log` and `error.log`, generated framework caches such as `.astro/`, `*.tsbuildinfo`, and `.DS_Store`; generated build output directories such as `dist/`, a framework `outDir`, or custom names such as `site-dist/` when no active build, server, or deployment is consuming them and the owning command recreates them; and stale repository-owned temporary test directories. Before removing an output or temporary test directory, confirm no active process is using it and that its owning command recreates it.
- Delete tracked reports, snapshots, and archives when no executable consumer, active test, published contract, or retention requirement uses them. Remove documentation inventories and generated indexes that point to deleted artifacts.
- Resolve local package archives by full repository-relative path, including direct and transitive `file:` entries in manifests and lockfiles. A matching basename in another `vendor/` directory is a different archive. Delete copies with no exact active path reference after checking scripts and documentation.
- Keep user-authored content, source fixtures, legal and attribution files, publication inputs, and vendor archives referenced by a manifest or lockfile. Handle SQL migration files under the script and migration rules below; age alone is not grounds for removal. Do not delete a file merely because it is ignored or large.
- Merge files only when they have the same owner and lifecycle. Preserve unique behavior and public contracts; remove duplicate implementations instead of adding compatibility chains.

### Script and migration audit

- Inventory `package.json` `scripts` and `bin` entries, shell/Node/Python scripts, SQL files, generators, one-off tools, hooks, and commands embedded in CI or deployment configuration. Record each entry's owner, exact invocation path, and lifecycle.
- Build the invocation graph before deleting anything. Follow package-script aliases, workspace commands, imports and child-process calls, `pre*`/`post*` lifecycle hooks, Git hooks, CI workflows, deployment/scheduler config, docs/runbooks, tool-specific discovery globs, and generated indexes. Check dynamic command construction where names or paths are assembled at runtime.
- Record each script's exact path, owner, caller/discovery mechanism, lifecycle, disposition, and evidence. For each migration also record the runner, ledger/checksum behavior, and baseline or replay role.
- A script's presence in a manifest or generated inventory does not prove that it is needed. Keep a script only when an executable caller, framework discovery rule, or documented operator/recovery role owns it. A hypothetical external caller is not evidence and does not block removal; only a verifiable supported contract does. If no owner exists after the full search, delete the script and its dead package alias, wrapper, docs, inventory, or generated reference.
- Audit every package manifest scripts and bin entry separately. Keep distinct developer and release tasks that the package actually supports, such as its required dev/build/test/check lifecycle. Delete pass-throughs, stale deployment names, one-off commands with no current role, and duplicate aliases. For commands with identical effective behavior, keep the name used by an executable in-repository caller. If documentation only mentions a redundant alias, update it to the canonical name and delete the alias unless the docs explicitly promise compatibility or a supported external interface. With no executable caller or explicit compatibility promise, keep one short canonical name and update examples. Do not preserve an alias merely because it is callable from a terminal.
- Treat source maps and exhaustive file inventories as path indexes, not proof of execution or ownership. They must be updated when a path is removed, but their generated listing alone cannot save an orphaned script.
- Do not retain scripts just because they are old, hand-written, or once useful. Delete a one-off migration, backfill, conversion, or repair script only when a ledger, baseline, runbook, or maintained result record proves its purpose completed and no replay, recovery, audit, fixture, or operator workflow consumes it. Age and filename are not completion evidence. Preserve an active rollback or disaster-recovery script only when its runbook or supported recovery path names it.
- Treat ordered SQL migrations as executable history. Identify the configured runner, discovery path and order, checksum/ledger behavior, baselines, and supported fresh-install/restore paths before disposition. Do not execute scripts, migrations, DDL, or database status commands that can mutate data or connect to a production database during this audit.
- Delete an unapplied migration only when repository evidence proves it was abandoned and no runner, application, fixture, deployment, or operator documentation references it. Delete superseded applied migrations only after a canonical squash/baseline replaces them and repository metadata proves supported targets are beyond the removed history. If the runner still expects a file/checksum/order, preserve it. If applied/baselined status cannot be established without an external database or an unsafe operation, mark it **blocked** and name the missing evidence.
- When removing migration history, update the runner manifest, canonical baseline, local fixtures, package scripts, docs, checksums, and generated inventories together. Never edit a ledger or checksum merely to conceal a deleted migration.

### Configuration minimum

- Keep at most one committed `.env.example` at the repository root when manual environment setup needs a template. In a monorepo, group variables by app in that one file. Keep zero templates when a repository has no manual environment inputs or a managed provider is already the canonical setup.
- Move existing app-level examples to the root, merge their variable names and non-secret placeholders, then update every setup guide and script. Never copy real secret values into the template.
- Configure ignore rules to allow only the root `.env.example`; remove nested example exceptions after consolidation.
- Never read, print, or delete ignored private `.env*` files, browser storage, or credentials. Inspect only paths and, when necessary, variable names. Preserve them as local user state.
- Keep provider project locators, deployment manifests, schemas, and tool configs separate when they have distinct readers. Do not combine different responsibilities just to lower the file count.
- For each tool and scope, retain one active configuration. Prove which duplicate is loaded from tool behavior, manifests, or direct references; update references and delete the obsolete file. Keep multiple lockfiles only for genuinely independent package roots with their own manifests.

## Workflow

1. Confirm the repository root, local instructions, branch, and working-tree status. Do not reset, commit, or overwrite existing changes.
2. Build a complete path inventory, including the source tree, configuration, generated artifacts, and relevant ignored files. Check import graphs, package exports, the script invocation graph, migration runner/ledger, globs, routes, tests, docs, publication manifests, and in-scope consumers.
3. Record exact dispositions and evidence. A deterministic ownership or pruning rule makes the corresponding move or deletion mandatory when implementation is requested. Use **blocked** only for a named live consumer, framework constraint, public contract, user-owned data, or unresolved retention rule.
4. Apply moves, merges, and deletions. Update all direct, dynamic, documented, and generated references in the same change. Preserve public import names with one explicit facade/export only when a current consumer needs it.
5. Search for old paths, script names, and config references. Run `git diff --check` and the requested narrow static validation. Do not run repository test suites or execute scripts/migrations unless the user asked for that verification.

## Completion

The task is complete only when:

- Every inventoried file has an exact disposition and every unblocked move, merge, or deletion is applied.
- Source ownership is canonical, each repository needing manual environment setup has one root template, and no unexplained duplicate or generated residue remains.
- Every retained script has a caller or named operator/recovery role; every removed migration is proven abandoned or replaced by a supported baseline, and unresolved migration state is reported as blocked.
- Imports, exports, scripts, routes, test discovery, docs, manifests, and consumers reference the final paths. Searches for removed paths return no live references.
- Report exact moved, merged, and deleted paths; before/after structure; checks run; preserved working-tree state; and any blocked files with the evidence preventing removal. Never substitute a percentage for file dispositions.
