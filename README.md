# Terra Symposium Standards

A pnpm workspace and npm publisher for Terra's shared quality, error-boundary, testing, and reporting packages, with a documentation site for using them.

## What it does

Not applicable.

## Prerequisites

Not applicable.

## Get started

Not applicable.

## Usage

### Packages

| Package                                                                                                                    | Purpose                                                                                               | Runtime requirements                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`@terra-symposium/standards-quality`](https://www.npmjs.com/package/@terra-symposium/standards-quality)                   | Configurable JavaScript and TypeScript quality checks, safe maintenance, and the `terra-quality` CLI. | Node.js `>=18.18`                                                            |
| [`@terra-symposium/standards-error-boundaries`](https://www.npmjs.com/package/@terra-symposium/standards-error-boundaries) | React error boundaries plus status-copy and route-error helpers.                                      | React and React DOM `>=18`                                                   |
| [`@terra-symposium/standards-reporting`](https://www.npmjs.com/package/@terra-symposium/standards-reporting)               | Responsive Playwright evidence, diagnostics, spreadsheets, slideshows, and load timings.              | Node.js `>=18.18`; `@playwright/test >=1.52.0 <2` for Playwright integration |
| [`@terra-symposium/standards-testing`](packages/testing/)                                                                  | Standards-owned shared CI checks plus serial execution of repository-specific test suites.            | Node.js `>=20`                                                               |

All four packages are configured for public npm publication. Consumers install them from npm without a Terra registry token. The CI release workflow uses the repository's `NPM_TOKEN` secret to publish versions.

#### Documentation

Read the [Standards documentation](https://standards-docs.netlify.app/) for setup guides, configuration references, package APIs, and contribution instructions. The site source lives in [`docs/`](docs/).

#### Installation

Install only the package your application uses:

```sh
# Terra Quality
pnpm add -D @terra-symposium/standards-quality

# React boundary helpers
pnpm add @terra-symposium/standards-error-boundaries

# Playwright reporting
pnpm add -D @terra-symposium/standards-reporting @playwright/test

# Shared CI checks and the local test-plan runner
pnpm add -D @terra-symposium/standards-testing
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

Then run `pnpm exec terra-quality`. See the [quality setup guide](https://standards-docs.netlify.app/quality/0-getting-started/setup/) for the full workflow.

### Project boundaries

These packages provide reusable primitives. Each consuming repository remains responsible for its application-specific source paths, framework integration, fallback UI, credentials, services, deployment policy, and domain tests.

### Skills

#### `@terra-symposium/standards-quality`

[`hygiene`](docs/agents/packages/quality/skills/hygiene/SKILL.md) (`environment-hardening`) — Audit
repository health, improve source clarity and documentation, and compact files without changing
behavior.

[`package-update`](docs/agents/packages/quality/skills/package-update/SKILL.md) — Update released
Terra packages across Desktop consumers, verify them, and restart affected local servers already
running on the device.

[`compact-files`](docs/agents/packages/quality/skills/compact-files/SKILL.md) (`compact-files`) —
Find and remove redundant repository folders and files, consolidate generated output, and preserve
authored or required content.

[`repo-file-audit`](docs/agents/packages/quality/skills/repo-file-audit/SKILL.md) — Aggressively
prune dead files, enforce canonical source ownership, and collapse redundant configuration.

[`git/atomic-commits`](docs/agents/packages/quality/skills/git/commit/SKILL.md) (`atomic-commits`) —
Split a requested working copy into dependency-ordered, reviewable Git commits with conventional
imperative titles and factual bodies. Use only when the user explicitly invokes $atomic-commits or
attaches this skill and asks to create commits; otherwise plan or report commit groups without
committing.

[`git/dependabot-remediation`](docs/agents/packages/quality/skills/git/packages/SKILL.md)
(`dependabot-remediation`) — Read a repository's Dependabot security alerts, trace them to affected
dependencies, and implement and verify appropriate fixes. Use when asked to review or fix Dependabot
alerts; does not publish, push, or dismiss alerts unless separately requested.

[`git/deploying`](docs/agents/packages/quality/skills/git/deploy/SKILL.md) (`terra-deploy`) — Deploy
Terra changes safely while conserving scarce Netlify deploy capacity and verifying the actual remote
runtime.

[`git/issue-completion`](docs/agents/packages/quality/skills/git/issues/complete/SKILL.md)
(`issue-completion`) — Complete clear GitHub issues in isolated, tested pull requests.

[`git/issues`](docs/agents/packages/quality/skills/git/issues/audit/SKILL.md) (`issues`) — Audit
open GitHub issues against code, history, and pull requests.

[`git/jules`](docs/agents/packages/quality/skills/git/branches/jules/SKILL.md) (`jules`) — Bundle
Jules-created pull requests into a small set of coherent PRs, carry review feedback forward, commit
the verified changes, and retire superseded branches.

[`git/npm`](docs/agents/packages/quality/skills/git/npm/SKILL.md) (`npm`) — Handle npm package
reads, installs, publishing, and access with one persistent read/write credential instead of
repeated per-operation sign-in prompts.

[`git/package-scripts`](docs/agents/packages/quality/skills/git/package-scripts/SKILL.md)
(`package-scripts`) — Standardize package scripts across Terra repositories, require meaningful
builds, and keep server launchers in their owning packages.

[`git/pr-review`](docs/agents/packages/quality/skills/git/branches/review/SKILL.md) (`pr-review`) —
Review and disposition requested Git branches and pull requests, fix actionable defects, and verify
integration and cleanup. Report evidence, validation gaps, and retained work.

[`git/pruning`](docs/agents/packages/quality/skills/git/branches/prune/SKILL.md) (`pruning`) —
Review and retire requested Git branches and worktrees after confirming their changes are
integrated, preserved, superseded, or explicitly abandoned.

[`git/prune-device`](docs/agents/packages/quality/skills/git/branches/prune-device/SKILL.md)
(`prune-device`) — Audit Codex storage and consolidate custom skills across repositories when the
user asks for device cleanup or skill deduplication.

[`git/semver-retcon`](docs/agents/packages/quality/skills/git/history/SKILL.md) (`semver-retcon`) —
Rewrite a repository history into a linear, semantically grouped record while preserving production
behaviour, commit authorship, and release traceability.

[`standards`](docs/agents/packages/quality/skills/standards/SKILL.md) (`standards`) — Apply shared
Terra coding and review conventions.

#### `@terra-symposium/standards-reporting`

[`test/cloud`](docs/agents/packages/reporting/skills/test/cloud/SKILL.md) (`cloud-playwright`) — Run
Playwright suites in Terra Cloud tasks.

[`test`](docs/agents/packages/reporting/skills/test/SKILL.md) (`test`) — Coordinate Terra's
test-writing, test-ordering, test-repair, and visual-report workflows with exhaustive coverage and
efficient execution.

[`test/fixing`](docs/agents/packages/reporting/skills/test/fixing/SKILL.md) (`test-fixing`) —
Diagnose and repair Terra test failures at the canonical source, fixture, test, or Cloud setup
boundary until the requested inventory is genuinely green.

[`test/ordering`](docs/agents/packages/reporting/skills/test/ordering/SKILL.md) (`ordering`) — Plan
and run Terra test suites in dependency order with efficient workers, explicit contexts, and
complete coverage accounting.

[`test/represent`](docs/agents/packages/reporting/skills/test/represent/SKILL.md) (`test-represent`)
— Run Terra evaluations and produce auditable Excel and PowerPoint test evidence with complete
viewport and diagnostic review.

[`test/writing`](docs/agents/packages/reporting/skills/test/writing/SKILL.md) (`test-writing`) —
Design and maintain exhaustive Terra tests, fixtures, contracts, and browser coverage without
duplicating or weakening behavior.

[`review/daily`](docs/agents/packages/reporting/skills/review/daily/SKILL.md) (`daily-review`) — Run
the four-repository quality and maintenance review, fix actionable issues safely, and deliver
verified changes through reviewed pull requests.

[`review/weekly`](docs/agents/packages/reporting/skills/review/weekly/SKILL.md)
(`terra-weekly-review`) — Review the last seven days of Terra Git activity against stated meeting
goals and intern plans, then create a verified presentation grouped by contributor, with code
evidence and UI screenshots when available.

[`review/standup`](docs/agents/packages/reporting/skills/review/standup/SKILL.md) (`standup`) —
Compare contributor activity with stated goals.

Keep each repository's complete agent tree under `docs/agents/`. The Docs site includes this tree as its Agents section and treats each `SKILL.md` as the index page for its folder.

## Configuration and security

Not applicable.

## Development and structure

### Development

Use Node.js `22.19.0` and pnpm `10.30.3` to match CI. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run test
pnpm run quality -- --all
```

Work on or preview the documentation site with:

```sh
pnpm run docs
pnpm run docs:build
pnpm exec docs preview
```

`pnpm docs:dev` starts the standards documentation site. `pnpm test` builds the workspace packages and runs the shared test manifest.

## Validation

Not applicable.

## Deployment and operations

Not applicable.

## Data, privacy, and limitations

Not applicable.

## References

Not applicable.

## Contributing

Not applicable.

## Credits and license

Not applicable.
