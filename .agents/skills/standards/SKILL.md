---
name: standards
description: Apply shared Terra coding and review conventions.
---

# Standards

Use this skill to implement or review changes across Terra repositories, including the Terra Symposium website.

## Workflow

1. Read repository instructions and the relevant package or feature guidance.
2. Find the canonical source and current owner before editing.
3. Reuse established types, helpers, components, and conventions.
4. Make the smallest complete change. Preserve behavior, compatibility, and user work.
5. Prefer concise, strictly typed implementations; avoid `any`, use explicit return types where repository conventions expect them, and do not add speculative abstractions.
6. Represent repeated structures with shared data when it improves clarity, while keeping one-consumer behavior in its owning package.
7. Explain intent and constraints in comments; omit obvious narration.
8. Verify with the narrowest reliable checks and review the full diff.

## Boundaries

- Keep application logic in its owning package.
- Fix shared tooling at its source in `standards`.
- Avoid one-off consumer checks when a reusable rule belongs in shared tooling.
- Do not suppress findings without a documented reason.
- Keep secrets in approved stores. Never place credentials in source or artifacts.

## Shared quality package

`packages/quality` is the source for `@terra-symposium/standards-quality`. Change and test reusable checks here rather than copying their implementation or policy into a consumer repository.

- Add focused tests under `packages/quality/test`; exercise the public package boundary and assert autofix idempotence when relevant.
- Implement behavior under `packages/quality/src` and keep runner/config normalization, schema, package documentation, and examples aligned.
- Use the package's build and test scripts. Add a Changeset for publishable package changes; documentation-only edits do not need a version bump.
- Check consuming repositories' package manifests, lockfiles, and `quality.json` files when a published change affects them. Keep consumer configuration and domain-specific rules in the consuming repository.

## Terra Symposium website

When working in `terra-symposium-website`, read the root `README.md` and `.agents/index.md` before editing. Also read `astro/README.md`, `sanity/README.md`, or `db/README.md` when the work touches those packages.

### Local quality and code conventions

- Use `pnpm run quality` for the working changes or `pnpm run quality:all` for the configured source tree. Choose a focused quality command when the task needs one.
- Run `pnpm run maintain` after adding or renaming supported source files, or when headers and fences may drift.
- Use the Standards CLI workflow for finding triage, autofix review, complete-diff review, and reporting. Keep website-specific configuration in `quality.json`.
- When a rule should apply across Terra repositories, implement it in the shared `@terra-symposium/standards-quality` package; keep one-off website rules in this repository's configuration.
- Reuse website domain types from `@lib/types` and established local helpers.
- Use complete, minimal names and Terra filename conventions: underscore private files, uppercase components, and lowercase structural files. Follow the local comment hierarchy and section fences; document exported declarations as repository rules require.

### UI and content contracts

- Inspect the shared UI component and its supported variants before styling callers. Set the canonical `variant` prop inline and prefer named size and tone props. Keep caller `className` for layout and genuine one-off geometry; add recurring presentation to the owning component's typed variant API.
- Use the repository's Carbon icon implementation. In Astro, import icons from generated `~icons/carbon/<icon-name>` modules. Do not hand-copy Carbon SVG paths or draw imitation interface icons. Use authored SVG for original diagrams, visualizations, or illustrations. Hide decorative icons from assistive technology and name icon-only controls.
- Follow the repository's documentation layout: descriptive headings, blank lines around paragraphs, examples, and tables, and whitespace between related groups.
- For case studies, portfolio pages, awards, press, and public copy, verify dates, roles, numbers, and outcomes against primary sources where available. Attribute team outcomes to the team, distinguish simulations from live services, and preserve routes and content notices.
- When a user reports that a specific editor, route, or file still fails, verify that exact target in its real context when available. A synthetic fixture or correct-looking config alone does not prove the workflow works.

### Local runtime boundaries

- Use `pnpm run dev` or `pnpm run astro:dev` for Astro. Do not use Netlify Dev or local `.env` files.
- Use `pnpm run dev` in `sanity/` or the backend workspace for Studio.
- Do not run local `drizzle-kit studio`; database operations run only on trusted deployments.

For website tasks, report source checks separately from observed browser or runtime evidence.

## Report

Summarize changes, checks, evidence, and unresolved risks.
Separate observed results from assumptions.
