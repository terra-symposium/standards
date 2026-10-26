# Standards

Standards is a pnpm workspace of reusable packages maintained for Terra Symposium applications. It provides repository quality tooling, React error-boundary helpers, and test-evidence reporting.

## Packages

| Package                                                                                                | Purpose                                                                                               | Runtime requirements                                                         |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`@terra-symposium/standards-quality`](https://www.npmjs.com/package/@terra-symposium/standards-quality)                   | Configurable JavaScript and TypeScript quality checks, safe maintenance, and the `terra-quality` CLI. | Node.js `>=18.18`                                                            |
| [`@terra-symposium/standards-error-boundaries`](https://www.npmjs.com/package/@terra-symposium/standards-error-boundaries) | React error boundaries plus status-copy and route-error helpers.                                      | React and React DOM `>=18`                                                   |
| [`@terra-symposium/standards-reporting`](https://www.npmjs.com/package/@terra-symposium/standards-reporting)               | Responsive Playwright evidence, diagnostics, spreadsheets, slideshows, and load timings.              | Node.js `>=18.18`; `@playwright/test >=1.52.0 <2` for Playwright integration |

All three packages are configured for public npm publication. Consumers install them from npm without a Terra registry token. The CI release workflow uses the repository's `NPM_TOKEN` secret to publish versions.

## Documentation

Read the [Standards documentation](https://standards-docs.netlify.app/) for setup guides, configuration references, package APIs, and contribution instructions. The site source lives in [`docs/`](docs/).

## Install a package

Install only the package your application uses:

```sh
# Terra Quality
pnpm add -D @terra-symposium/standards-quality

# React boundary helpers
pnpm add @terra-symposium/standards-error-boundaries

# Playwright reporting
pnpm add -D @terra-symposium/standards-reporting @playwright/test
```

For Terra Quality, add a `quality.json` in the repository root and start with:

```json
{
	"$schema": "./node_modules/@terra-symposium/standards-quality/quality.schema.json",
	"sourceRoots": ["src"],
	"extensions": [".js", ".jsx", ".ts", ".tsx"],
	"enabledChecks": {
		"format": false,
		"lint": false,
		"knip": false,
		"dead-code": false
	}
}
```

Then run `pnpm exec terra-quality`. See the [quality setup guide](https://standards-docs.netlify.app/packages/quality/setup/) for the full workflow.

## Develop this repository

Use Node.js `22.19.0` and pnpm `10.30.3` to match CI. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm quality:all
```

Work on or preview the documentation site with:

```sh
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

Package changes use [Changesets](https://github.com/changesets/changesets). Add a changeset for a publishable package change with `pnpm changeset`; documentation-only changes do not require a package version bump. Pull requests and pushes to `main` run the repository quality workflow. The release workflow versions and publishes packages after changesets are merged.

## Project boundaries

These packages provide reusable primitives. Each consuming repository remains responsible for its application-specific source paths, framework integration, fallback UI, credentials, services, deployment policy, and domain tests.


## Skills

### `@terra-symposium/standards-quality`

- [`hygiene`](../../packages/quality/.agents/skills/hygiene/SKILL.md) (`environment-hardening`) — Audit repository health, improve source clarity and documentation, and compact files without changing behavior.
- [`file-tree`](../../packages/quality/.agents/skills/file-tree/SKILL.md) (`repo-file-audit`) — Aggressively prune dead files, enforce canonical source ownership, and collapse redundant configuration.
- [`git/atomic-commits`](../../packages/quality/.agents/skills/git/commit/SKILL.md) (`atomic-commits`) — Split a requested working copy into dependency-ordered, reviewable Git commits with conventional imperative titles and factual bodies. Use only when the user explicitly invokes $atomic-commits or attaches this skill and asks to create commits; otherwise plan or report commit groups without committing.
- [`git/dependabot-remediation`](../../packages/quality/.agents/skills/git/packages/SKILL.md) (`dependabot-remediation`) — Read a repository's Dependabot security alerts, trace them to affected dependencies, and implement and verify appropriate fixes. Use when asked to review or fix Dependabot alerts; does not publish, push, or dismiss alerts unless separately requested.
- [`git/deploying`](../../packages/quality/.agents/skills/git/deploy/SKILL.md) (`terra-deploy`) — Deploy Terra changes safely while conserving scarce Netlify deploy capacity and verifying the actual remote runtime.
- [`git/issue-completion`](../../packages/quality/.agents/skills/git/issues/complete/SKILL.md) (`issue-completion`) — Complete clear GitHub issues in isolated, tested pull requests.
- [`git/issues`](../../packages/quality/.agents/skills/git/issues/audit/SKILL.md) (`issues`) — Audit open GitHub issues against code, history, and pull requests.
- [`git/jules`](../../packages/quality/.agents/skills/git/branches/jules/SKILL.md) (`jules`) — Bundle Jules-created pull requests into a small set of coherent PRs, carry review feedback forward, commit the verified changes, and retire superseded branches.
- [`git/pr-review`](../../packages/quality/.agents/skills/git/branches/review/SKILL.md) (`pr-review`) — Review and disposition requested Git branches and pull requests, fix actionable defects, and verify integration and cleanup. Report evidence, validation gaps, and retained work.
- [`git/pruning`](../../packages/quality/.agents/skills/git/branches/prune/SKILL.md) (`pruning`) — Review and retire requested Git branches and worktrees after confirming their changes are integrated, preserved, superseded, or explicitly abandoned.
- [`git/semver-retcon`](../../packages/quality/.agents/skills/git/history/SKILL.md) (`semver-retcon`) — Rewrite a repository history into a linear, semantically grouped record while preserving production behaviour, commit authorship, and release traceability.
- [`standards`](../../packages/quality/.agents/skills/standards/SKILL.md) (`standards`) — Apply shared Terra coding and review conventions.

### `@terra-symposium/standards-reporting`

- [`test/cloud`](../../packages/reporting/.agents/skills/test/cloud/SKILL.md) (`cloud-playwright`) — Run Playwright suites in Terra Cloud tasks.
- [`test`](../../packages/reporting/.agents/skills/test/SKILL.md) (`test`) — Coordinate Terra's test-writing, test-ordering, test-repair, and visual-report workflows with exhaustive coverage and efficient execution.
- [`test/fixing`](../../packages/reporting/.agents/skills/test/fixing/SKILL.md) (`test-fixing`) — Diagnose and repair Terra test failures at the canonical source, fixture, test, or Cloud setup boundary until the requested inventory is genuinely green.
- [`test/ordering`](../../packages/reporting/.agents/skills/test/ordering/SKILL.md) (`ordering`) — Plan and run Terra test suites in dependency order with efficient workers, explicit contexts, and complete coverage accounting.
- [`test/represent`](../../packages/reporting/.agents/skills/test/represent/SKILL.md) (`test-represent`) — Run Terra evaluations and produce auditable Excel and PowerPoint test evidence with complete viewport and diagnostic review.
- [`test/writing`](../../packages/reporting/.agents/skills/test/writing/SKILL.md) (`test-writing`) — Design and maintain exhaustive Terra tests, fixtures, contracts, and browser coverage without duplicating or weakening behavior.
- [`review/daily`](../../packages/reporting/.agents/skills/review/daily/SKILL.md) (`daily-review`) — Run the four-repository quality and maintenance review, fix actionable issues safely, and deliver verified changes through reviewed pull requests.
- [`review/weekly`](../../packages/reporting/.agents/skills/review/weekly/SKILL.md) (`terra-weekly-review`) — Review the last seven days of Terra Git activity against stated meeting goals and intern plans, then create a verified presentation grouped by contributor, with code evidence and UI screenshots when available.
- [`review/standup`](../../packages/reporting/.agents/skills/review/standup/SKILL.md) (`standup`) — Compare contributor activity with stated goals.

Keep each skill in its owning repository. Update the relevant repository catalog when moving or adding skills, then regenerate the Standards browser with `node docs/scripts/generate-skills.mjs` when a Standards package skill changes.
