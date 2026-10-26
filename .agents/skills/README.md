# Terra Skill Library

This directory is the catalog; skills live beside the package they support. Docs workflows live in `docs/.agents/skills/`, repository quality workflows live in `packages/quality/.agents/skills/`, and testing, review, and standup workflows live in `packages/reporting/.agents/skills/`. UI skills live in the Terra Styling repository, and Sanity skills live in the Terra Symposium website repository. The Standards Skills browser indexes the Docs, Quality, and Reporting package skills.

## `@terra-symposium/docs`

- [`agents`](../../docs/.agents/skills/agents/SKILL.md) — Initialize or maintain the Terra Symposium website agent context, documentation, personas, plans, and shared skills.
- [`documenting/align`](../../docs/.agents/skills/documenting/align/SKILL.md) — Iterate Gemini generated content against production Docs references using local-only headless Chrome checks.
- [`documenting/author`](../../docs/.agents/skills/documenting/author/SKILL.md) — Author and maintain general Terra Symposium Docs leaves from verified source material.
- [`documenting/canvas-scraping`](../../docs/.agents/skills/documenting/canvas-scraping/SKILL.md) — Collect Canvas course content and separate lecture transcripts into verified local exports.
- [`documenting/gem`](../../docs/.agents/skills/documenting/gem/SKILL.md) — Capture, update, and verify Terra's Gemini Document Gem through the authenticated browser session.
- [`documenting/gem/content`](../../docs/.agents/skills/documenting/gem/content/SKILL.md) — Prepare and audit the Gem's saved instructions and persistent knowledge.
- [`documenting/gem/metadata`](../../docs/.agents/skills/documenting/gem/metadata/SKILL.md) — Capture and maintain Gem identity and editable metadata.
- [`generation/authoring`](../../docs/.agents/skills/generation/authoring/SKILL.md) — Run and verify the OpenAI Topic, Arc, and Problem generation pipeline.

## `@terra-symposium/standards-quality`

- [`hygiene`](../../packages/quality/.agents/skills/hygiene/SKILL.md) — Audit repository health, improve source clarity and documentation, and compact files without changing behavior.
- [`file-tree`](../../packages/quality/.agents/skills/file-tree/SKILL.md) — Aggressively audit files, scripts, and migrations; prune dead artifacts and enforce canonical ownership.
- [`git/branches/jules`](../../packages/quality/.agents/skills/git/branches/jules/SKILL.md) — Bundle Jules-created pull requests into coherent changes.
- [`git/branches/prune`](../../packages/quality/.agents/skills/git/branches/prune/SKILL.md) — Review and retire branches and worktrees after checking their changes.
- [`git/branches/review`](../../packages/quality/.agents/skills/git/branches/review/SKILL.md) — Review and disposition requested Git branches and pull requests.
- [`git/commit`](../../packages/quality/.agents/skills/git/commit/SKILL.md) — Split a requested working copy into reviewable Git commits.
- [`git/deploy`](../../packages/quality/.agents/skills/git/deploy/SKILL.md) — Deploy Terra changes and verify the remote runtime.
- [`git/history`](../../packages/quality/.agents/skills/git/history/SKILL.md) — Rewrite repository history while preserving production behavior and traceability.
- [`git/issues/audit`](../../packages/quality/.agents/skills/git/issues/audit/SKILL.md) — Audit open GitHub issues against code, history, and pull requests.
- [`git/issues/complete`](../../packages/quality/.agents/skills/git/issues/complete/SKILL.md) — Complete clear GitHub issues in isolated pull requests.
- [`git/packages`](../../packages/quality/.agents/skills/git/packages/SKILL.md) — Review and remediate Dependabot alerts.
- [`standards`](../../packages/quality/.agents/skills/standards/SKILL.md) — Apply shared Terra coding and review conventions.

## `@terra-symposium/standards-reporting`

- [`test`](../../packages/reporting/.agents/skills/test/SKILL.md) — Coordinate test writing, ordering, repair, evaluation, and reporting workflows.
- [`test/cloud`](../../packages/reporting/.agents/skills/test/cloud/SKILL.md) — Run Playwright suites in Terra Cloud tasks.
- [`test/fixing`](../../packages/reporting/.agents/skills/test/fixing/SKILL.md) — Diagnose and repair Terra test failures.
- [`test/ordering`](../../packages/reporting/.agents/skills/test/ordering/SKILL.md) — Plan and run test suites in dependency order.
- [`test/represent`](../../packages/reporting/.agents/skills/test/represent/SKILL.md) — Produce auditable Excel and PowerPoint test evidence.
- [`test/writing`](../../packages/reporting/.agents/skills/test/writing/SKILL.md) — Design and maintain exhaustive Terra tests and fixtures.
- [`review/daily`](../../packages/reporting/.agents/skills/review/daily/SKILL.md) — Run the four-repository quality and maintenance review.
- [`review/standup`](../../packages/reporting/.agents/skills/review/standup/SKILL.md) — Compare contributor activity with stated goals.
- [`review/weekly`](../../packages/reporting/.agents/skills/review/weekly/SKILL.md) — Review Terra Git activity against meeting goals and create the weekly contributor deck.

Keep each skill in its owning repository. Update the relevant repository catalog when moving or adding skills, then regenerate the Standards browser with `node docs/scripts/generate-skills.mjs` when a Standards package skill changes.
