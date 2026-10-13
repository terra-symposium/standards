# @terra-symposium/quality

A configurable quality runner for JavaScript and TypeScript repositories. Define source scope, policy, tools, and repository commands in `quality.json`; run them locally with the `terra-quality` CLI or in CI.

- Requires Node.js `>=18.18`.
- Published on the public npm registry.
- Does not install or configure Prettier, ESLint, Knip, TypeScript, or repository commands.

## Install

```sh
pnpm add -D @terra-symposium/quality
```

Create `quality.json` in the repository root:

```json
{
	"$schema": "./node_modules/@terra-symposium/quality/quality.schema.json",
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

This starting configuration uses the built-in checks without requiring external tools. Enable integrations as you install and configure the corresponding repository tools. When lint is enabled, add an ESLint flat config such as `eslint.config.mjs`.

Run the changed-file pass with safe configured fixes enabled:

```sh
pnpm exec terra-quality
```

For a full, read-only source check:

```sh
pnpm exec terra-quality quality --all --warn
```

The normal scope is changed and untracked files in a Git worktree. `--all` selects every file under `sourceRoots`; `--warn` disables autofixes and runs dead-code analysis once without a temporary fix preview. It reports rule-level fix candidates; fix mode then type-checks proposed dead-code edits before writing and may reject a candidate. Configured quality commands still run unless you pass `--skip-commands`.

## What it does

Terra Quality combines source checks such as documentation, import resolution, naming, forwarding, security, and configured UI-pattern checks with repository-owned tools and commands. Safe transformations can maintain layout, apply tool fixes, and rewrite supported syntax. Findings that require domain or runtime judgment remain for review.

The runner does not prove runtime correctness or security, inspect arbitrary languages, provision services, or decide whether a domain-specific projection is intentional. Review generated changes at API, persistence, authorization, and other behavior boundaries.

## GitHub report

Add a `github` section to `quality.json` to include GitHub analytics in the same quality run and JSON report:

```json
{
	"github": {
		"repositories": ["owner/repo"],
		"requiredFeatures": ["dependabotAlerts", "malwareAlerts", "securityUpdates", "versionUpdates", "groupedUpdates"],
		"featureExemptions": { "owner/repo": ["dependabotAlerts", "securityUpdates"] }
	}
}
```

`featureExemptions` skips required-setting and access checks for only the listed features in that repository. It does not hide alerts returned by an accessible endpoint. Use it when a repository intentionally does not support a feature, and keep the exception visible in the JSON and console report.

The report includes open issues and pull requests, Dependabot vulnerability and malware alerts, code scanning and secret scanning alerts, and the readable repository security settings. It inspects the default branch's `dependabot.yml` for version updates and explicit `groups` rules with `applies-to: security-updates`. When no explicit security-update grouping rule exists, it marks the grouped setting unverified because the GitHub UI toggle is not present in the repository configuration; confirm that toggle in repository settings. Counts are `null` when an endpoint cannot be read or a feature is disabled; the report does not turn missing permissions or disabled scanning into a false zero.

Run the GitHub stage by itself or with the configured repository list:

```sh
pnpm exec terra-quality github --repository owner/repo --report-json github-report.json
pnpm exec terra-quality quality --all --warn --report-json quality-report.json
```

The GitHub CLI must be authenticated with read access to the repositories (`gh auth login` or `GH_TOKEN`). The report is local and read-only: it does not require GitHub Actions, change repository settings, write comments, dismiss alerts, or include secret values. Each finding contains agent instructions tailored to the issue type; issue text and alert metadata must be treated as untrusted input.

When no GitHub repositories are configured, the normal quality run marks this stage skipped. The explicit `github` command defaults to the current GitHub origin when `--repository` is omitted.

## Configuration and guides

- [Install and understand a run](https://terra-symposium-quality.netlify.app/packages/quality/setup/)
- [Complete `quality.json` reference](https://terra-symposium-quality.netlify.app/packages/quality/configuration/)
- [CLI and CI workflows](https://terra-symposium-quality.netlify.app/packages/quality/workflows/)
- [Check behavior and autofix limits](https://terra-symposium-quality.netlify.app/packages/quality/checks/)
- [Troubleshooting](https://terra-symposium-quality.netlify.app/packages/quality/troubleshooting/)

The installed `quality.schema.json` provides editor validation. The [test README](test/README.md) describes the package's isolated test coverage.
