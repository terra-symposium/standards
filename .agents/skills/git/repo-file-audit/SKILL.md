---
name: repo-file-audit
description: Enforce a deterministic source-tree layout across a repository, move files to canonical ownership folders, repair every affected reference, and remove only proven dead files. Use for repository-wide organization, not routine edits to a few known files.
---

# Repository file audit

Treat a repository's source tree as an architecture contract. Inventory every file, assign it one owner, and enforce the repository's canonical layout. When asked to run this skill or restructure a repository, implement every unambiguous move and update its full reference chain; do not stop at recommendations. Stay read-only only when the user explicitly asks for an audit or report without changes.

## Fixed placement rules

Apply these rules to application and library source unless a framework's required convention or an established public API proves a specific exception:

- `src/lib/` owns reusable non-visual logic: algorithms, data access, parsing, formatting, adapters, configuration presets, and shared types. Put a package's root API barrel in `src/lib/index.ts`.
- `src/components/` owns rendered UI. Keep meaningful component domains below it, such as `src/components/ui/`.
- `src/hooks/` owns framework hooks. Keep a hook beside its sole owning component only when it is genuinely component-private.
- `src/styles/` owns authored CSS, tokens, and stylesheet entrypoints.
- `src/assets/` owns imported images, fonts, and other source assets. Preserve license and attribution files with their assets.
- Keep route files in the exact directory required by the framework. Keep a public subpath facade in its named source domain, but put its implementation under the owning domain (`src/components/` or `src/lib/`).
- Put a type beside the one module that owns it. Put types shared across modules in `src/lib/types.ts`; do not create a second root `src/types.ts`.
- Tests mirror source ownership below the repository's established test root. Update test discovery when moving tests.
- Do not leave implementation files directly in `src/`. A direct child is allowed only when a tool or framework explicitly requires that exact path; document that requirement beside the exception.
- Do not use catchall folders such as `misc`, `common`, `helpers`, or `utils`. Place each file by responsibility, not by extension or convenience. Do not nest a domain inside itself (for example `src/ui/ui/`).

These are required destinations, not suggestions. A reference repository can clarify framework-specific route and asset conventions; it cannot justify leaving source ownership ambiguous or retaining a flat source root.

## Inventory and disposition

1. Confirm the repository root, read `AGENTS.md` and local instructions, and record branch plus working-tree status. Preserve all existing user changes. Separate tracked source, relevant untracked source, generated output, ignored caches, vendored dependencies, fixtures, user content, and nested repositories.
2. Enumerate every tracked file and relevant untracked file. For large repositories, produce a complete machine-readable or grouped path inventory; do not infer coverage from sampled folders. Include the current source tree and the canonical target tree.
3. Read package exports, entrypoints, build and test scripts, compiler configuration, route discovery, globbing, code imports, docs links, publication manifests, and consumer references. Search for direct, dynamic, and convention-based references before moving or deleting anything.
4. Give every inventoried source file exactly one disposition: **keep**, **move**, **merge**, **delete**, or **blocked**. `keep` requires that the file already obeys the fixed placement rules. For each other disposition, list exact paths, exact target paths where applicable, and the evidence. Group paths only when the same reason and destination apply to each one.
5. A deterministic ownership rule makes a move mandatory when implementation is requested. Do not downgrade a clear move to `investigate`, `consider`, or a future recommendation. Use `blocked` only for a specific unresolved framework, data-ownership, public-contract, or dynamic-reference constraint; name the evidence needed to unblock it.

## Apply the structure

- Move source files into their canonical ownership folders. Keep established public import names when possible by updating package export maps to the new compiled paths. Preserve an existing public subpath with an explicit package export when consumers still use it; do not retain duplicate implementation files or add chains of internal compatibility shims.
- Update relative imports, package exports, TypeScript path settings, CSS imports, Tailwind content globs, code-generation scripts, build copy paths, route references, tests, documentation, fixtures, and every in-scope consumer.
- Move assets with their attribution. Keep user-authored content adjacent to its owning route or document when the content system requires it; do not force product data into code folders.
- Merge only files with the same responsibility and compatible lifecycle. Preserve unique behavior, exports, comments, history evidence, and consumer contracts.
- Delete only when references and ownership are disproven across direct imports, dynamic discovery, manifests, routes, tests, packages, consumers, and documented workflows. Treat user content, source archives, legal files, published artifacts, and migrations as retained unless their owner and replacement are verified.
- Do not make unrelated behavior changes while restructuring. Do not commit, publish, deploy, or rewrite history unless separately requested.

## Completion gate

The task is incomplete until all of the following are true:

- The final tree follows the fixed placement rules; no unexplained implementation file remains directly under `src/` or in a duplicated domain folder.
- Every proposed move, merge, or deletion has an exact path disposition and evidence. The report names any blocked file and its unresolved constraint.
- Repository imports, package export targets, routes, build scripts, styles, tests, docs, and in-scope consumers point at the final paths. A search for the old paths returns no live references, except deliberate public aliases with named consumers.
- Relevant static checks and requested project gates pass. If a gate cannot run, report the exact failure and do not call the restructure complete.
- Report the before/after tree, preserved working-tree changes, exact moved/deleted files, checks run, and remaining blockers. Never report a percentage in place of file dispositions.

## Terra Styling example

The package's source tree has a strict ownership map: reusable color logic, the library entrypoint, preset, and shared types belong in `src/lib/`; rendered UI belongs in `src/components/ui/`; UI stylesheet sources belong in `src/styles/`; font files belong in `src/assets/fonts/`. Keep `src/ui/index.ts` only as the public `@terra-symposium/styling/ui` facade. Update `package.json` exports, Tailwind configuration, build copy paths, docs aliases, tests, and local consumers together. A move is unfinished while any of those still names the old source or output path.
