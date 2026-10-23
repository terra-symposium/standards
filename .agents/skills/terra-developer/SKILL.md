---
name: terra-developer
description: Apply Terra Symposium-specific repository setup, code, UI, and environment rules when implementing or reviewing this website.
---

# Terra Developer

This is a repository-specific extension of the shared `standards` skill. Use `standards` for cross-repository implementation and review conventions; this skill contains only Terra Symposium paths, commands, and local contracts.

## Start here

Read `README.md` and `.agents/index.md` before editing. Also read `astro/README.md`, `sanity/README.md`, or `db/README.md` when relevant.

## Local quality commands

- Run `pnpm run quality` for the working changes or `pnpm run quality:all` for the configured source tree. Use a focused quality command when the task needs one.
- Run `pnpm run maintain` after adding or renaming supported source files, or when headers and fences may drift.
- Use the Standards CLI workflow guide for finding triage, autofix review, complete-diff review, and reporting. Keep website-specific configuration in `quality.json`.
- When a rule should apply across Terra repositories, follow the shared `standards` skill and change `@terra-symposium/standards-quality` in Standards. Keep one-off website rules in this repository.

## Terra code conventions

- Reuse website domain types from `@lib/types` and established local helpers.
- Use complete, minimal names and Terra filename conventions: underscore private files, uppercase components, lowercase structural files.
- Follow the local comment hierarchy and section fences. Document exported declarations as repository rules require.

## UI contracts

- Inspect the shared UI component and its supported variants before styling callers. Set the canonical `variant` prop inline; prefer named size and tone props. Keep caller `className` for layout and genuine one-off geometry, not repeated presentation. Add recurring presentation to the owning component's typed variant API.
- Use the repository's Carbon icon implementation. In Astro, import icons from generated `~icons/carbon/<icon-name>` modules. Do not hand-copy Carbon SVG paths or draw imitation interface icons. Use authored SVG for original diagrams, visualizations, or illustrations. Hide decorative icons from assistive technology and name icon-only controls.
- Follow the repository's documentation layout: descriptive headings, blank lines around paragraphs, examples, and tables, and whitespace between related groups.
- For case studies, portfolio pages, awards, press, and public copy, verify dates, roles, numbers, and outcomes against primary sources where available. Attribute team outcomes to the team, distinguish simulations from live services, and preserve routes and content notices.
- When a user reports a specific editor, route, or file still fails, verify that exact target in its real context when available. A synthetic fixture or correct-looking config alone does not prove the workflow works.

## Local runtime boundaries

- Use `pnpm run dev` or `pnpm run astro:dev` for Astro. Do not use Netlify Dev or local `.env` files.
- Use `pnpm run dev` in `sanity/` or the backend workspace for Studio.
- Do not run local `drizzle-kit studio`; database operations run only on trusted deployments.

## Handoff

For website tasks, separate source checks from observed browser/runtime evidence.
