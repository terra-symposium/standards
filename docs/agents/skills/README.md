# Terra Skill Library

## Standards-owned skills

- [`agents`](../skills/agents/SKILL.md) — Initialize or maintain the Terra Symposium website agent context, documentation, personas, plans, and shared skills.
- [`align`](../skills/documenting/align/SKILL.md) — Iterate Gemini generated content comparing to production Docs references, to improve the generation's adherence to strict guidelines via local-only headless Chrome checks.
- [`author`](../skills/documenting/author/SKILL.md) — Author, review, preserve, restore, and visually restructure general Terra Symposium Docs leaves with the terra_docs MCP. Use for Terra, executive, development, and university documentation from verified source material or existing Docs leaves.
- [`gem`](../skills/documenting/gem/SKILL.md) — Capture, update, and verify Terra's Gemini Document Gem instructions, knowledge, and metadata through the authenticated browser session.
- [`gem-content`](../skills/documenting/gem/content/SKILL.md) — Prepare and audit the Terra Document Gem's saved instructions and persistent knowledge attachments.
- [`gem-metadata`](../skills/documenting/gem/metadata/SKILL.md) — Capture and maintain Terra Document Gem identity and editable metadata with a local audit snapshot.
- [`generation-content-authoring`](../skills/generation/authoring/SKILL.md) — Run the OpenAI Topic/Arc/Problem generation pipeline from the terminal and verify the results in Studio and the dashboard. Use when generating new content, re-running a generation spec, or checking what a generation run wrote.
- [`prune-device`](../packages/quality/skills/git/branches/prune-device/SKILL.md) — Audit Codex storage and consolidate custom skills across repositories when the user asks for device cleanup or skill deduplication.
- [`compact-files`](../packages/quality/skills/compact-files/SKILL.md) — Find and remove redundant repository folders and files, consolidate generated output, and preserve anything tracked, authored, active, or required to build or deploy.
- [`jules`](../packages/quality/skills/git/branches/jules/SKILL.md) — Bundle Jules-created pull requests into a small set of coherent PRs, carry review feedback forward, commit the verified changes, and retire superseded branches.
- [`pruning`](../packages/quality/skills/git/branches/prune/SKILL.md) — Review and retire requested Git branches and worktrees after confirming their changes are integrated, preserved, superseded, or explicitly abandoned.
- [`pr-review`](../packages/quality/skills/git/branches/review/SKILL.md) — Review and disposition requested Git branches and pull requests, fix actionable defects, and verify integration and cleanup. Report evidence, validation gaps, and retained work.
- [`atomic-commits`](../packages/quality/skills/git/commit/SKILL.md) — Split a requested working copy into dependency-ordered, reviewable Git commits with conventional imperative titles and factual bodies. Use only when the user explicitly invokes $atomic-commits or attaches this skill and asks to create commits; otherwise plan or report commit groups without committing.
- [`terra-deploy`](../packages/quality/skills/git/deploy/SKILL.md) — Deploy Terra changes safely while conserving scarce Netlify deploy capacity and verifying the actual remote runtime.
- [`semver-retcon`](../packages/quality/skills/git/history/SKILL.md) — Rewrite a repository history into a linear, semantically grouped record while preserving production behaviour, commit authorship, and release traceability.
- [`issues`](../packages/quality/skills/git/issues/audit/SKILL.md) — Audit open GitHub issues against code, history, and pull requests.
- [`issue-completion`](../packages/quality/skills/git/issues/complete/SKILL.md) — Complete clear GitHub issues in isolated, tested pull requests.
- [`npm`](../packages/quality/skills/git/npm/SKILL.md) — Handle npm package reads, installs, publishing, and access with one persistent read/write credential instead of repeated per-operation sign-in prompts.
- [`dependabot-remediation`](../packages/quality/skills/git/packages/SKILL.md) — Read a repository's Dependabot security alerts, trace them to affected dependencies, and implement and verify appropriate fixes. Use when asked to review or fix Dependabot alerts; does not publish, push, or dismiss alerts unless separately requested.
- [`hygiene`](../packages/quality/skills/hygiene/SKILL.md) — Audit repository environment, build, and security health; improve source clarity and documentation; and compact files without changing behavior.
- [`initialisation`](../packages/quality/skills/hygiene/initialisation/SKILL.md) — Set up or reconcile a repository's Husky pre-commit check and Changesets semantic version tracking when commit gates or package versioning are missing.
- [`repo-file-audit`](../packages/quality/skills/repo-file-audit/SKILL.md) — Aggressively audit repository files and scripts, prune dead artifacts and obsolete migrations, and enforce canonical source and configuration ownership. Use for structural cleanup, not routine edits to a few known files.
- [`standards`](../packages/quality/skills/standards/SKILL.md) — Apply shared Terra coding and review conventions, and measure workflow runtime when asked.
- [`daily-review`](../packages/reporting/skills/review/daily/SKILL.md) — Run the four-repository quality and maintenance review, fix actionable issues safely, and deliver verified changes through reviewed pull requests.
- [`standup`](../packages/reporting/skills/review/standup/SKILL.md) — Compare contributor activity with stated goals.
- [`terra-weekly-review`](../packages/reporting/skills/review/weekly/SKILL.md) — Review the last seven days of Terra Git activity against stated meeting goals and intern plans, then create a verified presentation grouped by contributor, with code evidence and UI screenshots when available.
- [`test`](../packages/reporting/skills/test/SKILL.md) — Coordinate Terra's test-writing, test-ordering, test-repair, and visual-report workflows with exhaustive coverage and efficient execution.
- [`cloud-playwright`](../packages/reporting/skills/test/cloud/SKILL.md) — Run Playwright suites in Terra Cloud tasks.
- [`test-fixing`](../packages/reporting/skills/test/fixing/SKILL.md) — Diagnose and repair Terra test failures at the canonical source, fixture, test, or Cloud setup boundary until the requested inventory is genuinely green.
- [`ordering`](../packages/reporting/skills/test/ordering/SKILL.md) — Plan and run Terra test suites in dependency order with efficient workers, explicit contexts, and complete coverage accounting.
- [`test-represent`](../packages/reporting/skills/test/represent/SKILL.md) — Run Terra evaluations and produce auditable Excel and PowerPoint test evidence with complete viewport and diagnostic review.
- [`test-writing`](../packages/reporting/skills/test/writing/SKILL.md) — Design and maintain exhaustive Terra tests, fixtures, contracts, and browser coverage without duplicating or weakening behavior.

## Skills owned by other repositories

- Terra Symposium Website owns Canvas collection and Sanity workflows in `website/docs/agents/skills/`. The Canvas workflow is in-app-browser-only and read-only.
- Terra Styling owns UI workflows in `styling/docs/agents/skills/ui/`.

Keep each skill at its owning repository or package. Use this file as an index only; do not copy skill bodies into the catalog.
