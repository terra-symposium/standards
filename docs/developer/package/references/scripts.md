# Package Scripts

Use this skill when auditing, consolidating, or adding package scripts in Terra repositories.

## Conventions

- Every package manifest has a `build` script. It must produce the package's artifact or run meaningful package-scoped validation when the package has no standalone output. Never add a no-op build.
- A Docs server starts with `pnpm run docs`, including when it is the repository's only server. An application server starts with `pnpm run dev`.
- Put each server command in the package directory that owns that server. Start a nested application from its directory, such as `cd astro && pnpm run dev` or `cd sanity && pnpm run dev`.
- Keep the owning package's server command authoritative. A root entrypoint may forward to it when repository workflows, hosting, or developer documentation use that entrypoint; Standards' root `docs` and `docs:build` are examples. Preserve those callers while consolidating scripts. A root `build` may orchestrate builds; it must not start servers.
- Preserve distinct `quality` and `quality:all` scopes and distinct `docs` (development server) and `docs:build` (static output) actions.
- Keep one canonical package script for each common action. Pass options to the underlying CLI instead of adding aliases for each option or diagnostic. Run uncommon one-off operations through their existing CLI or Node entrypoint.
- Preserve lifecycle behavior when removing `prebuild`, `pretest`, or other hooks by moving the required work into the canonical script.
- Before removing or renaming a script, search package manifests, workflows, hosting configuration, documentation, and repository-owned scripts. Update every active caller in the same change.

## Workflow

1. Inventory every repository and workspace package manifest; record its current scripts and the proposed set.
2. Identify server ownership from each package's source, workspace configuration, deployment settings, and READMEs. Do not infer ownership from a root proxy script.
3. Keep Docs launchers named `docs`, app launchers named `dev`, and build entrypoints named `build`. Leave nested server commands in their owning package.
4. Merge aliases only after tracing their arguments, environment setup, lifecycle hooks, and external callers. Preserve secret-loading and production-access boundaries.
5. Update active call sites and command documentation. Use the owning package's working directory when documenting server startup.
6. Check that every package has a meaningful `build`, each server has one authoritative owner, and no removed script remains referenced by active automation or documentation.
7. Run the changed command from each real caller's working directory: the repository root, owning package, and hosting build directory where applicable. For Docs, smoke-test `docs` and `docs:build` separately; for a build-only change, run the affected `build`. Record exit status and any unavailable external service instead of treating a static reference search as proof.

## Reporting

Report the script counts and before/after command sets per repository and package. Call out any retained alias required by a hosting provider or external automation.
