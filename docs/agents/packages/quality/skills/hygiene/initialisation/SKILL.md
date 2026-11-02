---
name: initialisation
description: Set up or reconcile a repository's Husky pre-commit check and Changesets semantic version tracking when commit gates or package versioning are missing.
---

# Initialisation

Initialize the repository's commit-time quality gate and semantic version workflow. Preserve established hooks, release tools, package boundaries, and working-tree changes.

## Inspect before changing

1. Confirm the repository root, package manager, current branch, default release branch, full Git status, workspace members, package names and versions, release workflows, existing `.husky/` hooks, `prepare` script, `core.hooksPath`, and versioning configuration.
2. Treat staged, unstaged, and untracked files as user work. Edit manifests and hooks narrowly; never reset, stash, stage, commit, push, publish, or create release tags as part of initialization.
3. If the repository already has a working hook or versioning system, preserve it. Repair only missing pieces; do not initialize over existing hooks or replace another release tool with Changesets.

## Husky pre-commit check

- For a Node repository without Husky, add a package-manager-compatible Husky dependency and a `prepare` script that invokes `husky`. Register the hook through the repository's package manager.
- Create `.husky/pre-commit` with the repository's existing, non-mutating static quality or type check. Prefer a focused command that does not run tests, contact external services, or rewrite files. If no suitable local check exists, use `git diff --cached --check`.
- Preserve every existing hook command and its safeguards. When updating an old Husky installation, remove only obsolete Husky bootstrap lines; keep the hook body intact and migrate `prepare` and dependency together.
- Do not add commit-message policy, test suites, format-on-commit, or release automation unless the user asks for those behaviors.

## Changesets version tracking

- If the repository has no established versioning convention in its package versions, release tags, changelog, or release workflows, use Changesets for Node packages. Add `@changesets/cli`, a `changeset` command, a `version-packages` command that runs `changeset version`, and `.changeset/config.json`.
- Set `baseBranch` from the repository's verified release/default branch. Preserve existing package versions and workspace definitions. Version only packages that the package manager recognizes; do not add workspace members just to make nested projects versionable.
- Configure private package versioning only when private packages are intended to receive semver updates. Keep private package tagging disabled unless the user requests release tags. Preserve the repository's public/private publish access settings.
- If a version is missing, determine a credible initial version from release tags, published versions, or an established sibling package. Ask before guessing when no reliable baseline exists.
- Do not add a publish command or release workflow as part of versioning setup. Do not run `changeset publish`, package publication, or any remote release action.

## Validate

Run the package manager's `prepare` step to register Husky; confirm the repository points Git at the Husky hook directory and the pre-commit file is executable or readable as appropriate. Run `changeset status` when existing package edits can be accounted for. If initialization is the only package change and status requires a release note, add an empty changeset rather than inventing a package bump; never use an empty changeset to cover pre-existing product changes. Inspect the final diff and run `git diff --check`. Do not run tests as part of setup.

When initializing several repositories, repeat the inspection and changes independently in each Git root. Report which repositories were already configured, initialized, or blocked, with the hook command and versioning baseline for each.
