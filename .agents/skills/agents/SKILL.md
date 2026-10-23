---
name: agents
description: Initialize or maintain the Terra Symposium website agent context, documentation, personas, plans, and shared skills.
---

# Terra Website Agents

Use this skill when creating or reorganizing agent-facing files for `Terra-Symposium/terra-symposium-website`. This skill is maintained in Terra Standards; keep website source, configuration, and durable product rules in the website repository.

## Read the current project guidance

Before editing, read the website root `README.md` and `.agents/index.md`. Read `.agents/personas/README.md` before creating or changing scheduled persona prompts, `.agents/decisions/README.md` for the decision-record format, and the relevant package README for package-specific work. Inspect the live tree and existing files before creating anything.

The current `.agents/index.md` includes a snapshot from an older commit and mentions `harness-init`. The website repository does not define that initializer. Verify that an approved initializer is available in the current environment before invoking it. If it is unavailable or the snapshot is stale, refresh `.agents/index.md` from the live repository instead of preserving outdated paths or inventing a command.

## Website agent and documentation layout

Use this as a map of the current layout, then verify paths in the checkout:

| Path | Purpose |
| --- | --- |
| `.agents/index.md` | Repository-wide agent rules and links to the current source of guidance. |
| `.agents/architecture/` | Agent-facing architecture maps, such as `layers.md`. |
| `.agents/decisions/` | Existing historical decision records and their format guide. New consequential decisions belong in `docs/decisions/` as directed by `.agents/index.md`. |
| `.agents/plans/` | Active agent plans and supporting inventories. |
| `.agents/personas/` | Scheduled role prompts and their journals; `README.md` defines the shared schedule contract and role profiles. |
| `docs/architecture/`, `docs/decisions/`, `docs/implementation-plans/`, `docs/quality/`, `docs/migrations/`, `docs/releases/` | Technical documentation organized by audience and lifecycle. Reuse the closest existing document or folder. |
| Root and package `README.md` files | Setup, package ownership, and maintained instructions for that part of the repository. |

The index also mentions `.agents/debt/`, but that directory is not currently present. Create it only when the repository needs a maintained known-issues register; do not add empty placeholder folders. The website has no local `.agents/skills/` directory by design.

## Choose the right resource

- Put repository-wide agent rules and navigation in `.agents/index.md`; keep it aligned with current paths and commands.
- Put architecture maps in `.agents/architecture/`. Put a consequential, lasting decision in `docs/decisions/` using the format in `.agents/decisions/README.md`. Keep ordinary fixes in their issue or pull request.
- Put active agent work plans in `.agents/plans/`. Put durable implementation plans and technical findings in the matching `docs/implementation-plans/` or `docs/` section.
- Add a persona only for a distinct recurring role or scheduled workflow. Follow `.agents/personas/README.md`, use an existing persona as the shape, keep shared schedule rules there, and put only role-specific instructions and critical journal lessons in the persona file. Add or update its role profile in the README. New persona prompts should link to the existing `.agents/personas/README.md`, not a missing `.jules/README.md`.
- Keep skills in Terra Standards at `.agents/skills/<skill>/`; do not copy skills into the website repository. Before adding one, check whether its workflow belongs in an existing shared skill. For a new skill, follow the `skill-creator` skill, add only needed supporting files, update Terra Standards' `.agents/skills/README.md`, and regenerate the skill browser with `node docs/scripts/generate-skills.mjs`.
- Choose Markdown documentation in the repository when it is the maintained source. If the requested content belongs in Terra Docs or tsdocs, follow the relevant shared authoring workflow instead of creating a competing copy.

## Initialize or refresh agent context

1. Confirm the repository and the requested resource type. Read current project rules, nearby examples, and package guidance.
2. Reconcile documented paths with the live tree. Keep existing user content, and create only the files and directories needed for the requested work.
3. Add a short index entry or cross-link whenever a new maintained location or convention would otherwise be hard to discover. Keep shared policies in their shared README or skill; avoid copying whole instructions into each persona or document.
4. For a skill, validate its manifest and references, regenerate the skill browser, and confirm the catalog contains one canonical entry. For other resources, verify linked paths and headings against the checkout.
5. Review the scoped diff and run `git diff --check`. Report any missing initializer or unresolved ownership conflict rather than guessing.
