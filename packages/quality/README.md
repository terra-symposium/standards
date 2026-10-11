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

## Configuration and guides

- [Install and understand a run](https://terra-symposium-quality.netlify.app/packages/quality/setup/)
- [Complete `quality.json` reference](https://terra-symposium-quality.netlify.app/packages/quality/configuration/)
- [CLI and CI workflows](https://terra-symposium-quality.netlify.app/packages/quality/workflows/)
- [Check behavior and autofix limits](https://terra-symposium-quality.netlify.app/packages/quality/checks/)
- [Troubleshooting](https://terra-symposium-quality.netlify.app/packages/quality/troubleshooting/)

The installed `quality.schema.json` provides editor validation. The [test README](test/README.md) describes the package's isolated test coverage.
