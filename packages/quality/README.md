# `@terra-symposium/quality`

## Introduction

This package provides one consistent quality entry point for Terra Symposium repositories. A repository describes its source scope, tools, policies, and commands in one `quality.json`; the package coordinates source checks and repository commands in a predictable order.

The default is practical local development: inspect working changes and apply safe, deterministic fixes. CI can request a complete scan and warning-only behavior. Repositories remain responsible for domain-specific checks, credentials, databases, browsers, deployments, and commands that cannot run in a normal local Node process.

The package distinguishes mechanical cleanup from judgment. Formatting, documentation layout, naming changes, and tool-provided fixes can be automated where the transformation is understood. Checks requiring semantic judgment report findings for review instead of silently changing behavior. A passing run is not a security, product, or runtime guarantee.

The package supports single-package repositories, monorepos, CI, pre-commit hooks, and editor tasks. It does not require separate orchestration files for Prettier, ESLint, Knip, or TypeScript. Those tools may still use native JavaScript/TypeScript configuration when their rule sets require it.

---

## Configuration

### Installation

Install the package as a development dependency from the public npm registry; no registry configuration or read token is needed:

```sh
pnpm add -D @terra-symposium/quality prettier
npx terra-quality
```

The package coordinates tools but does not install them. Install each tool enabled in `quality.json` in the consuming repository. Repositories with Astro files also need `prettier-plugin-astro` and a Prettier config that registers the plugin and Astro parser:

```sh
pnpm add -D prettier-plugin-astro
```

```js
// .prettierrc.mjs
export default {
	plugins: ['prettier-plugin-astro'],
	overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
```

For React TSX projects, make sure the effective `tsconfig.json` enables JSX, usually with `"jsx": "react-jsx"`. Editors may need their TypeScript language server restarted after changing the config. The [getting-started guide](https://terra-symposium-quality.netlify.app/getting-started/) has a copy-ready setup and troubleshooting steps.

The executable loads `quality.json` from the current repository. A wrapper can call `loadQualityCfg(path)` and `runQualityCli`; no wrapper is needed for the normal case.

### File

```json
{
	"$schema": "./node_modules/@terra-symposium/quality/quality.schema.json",
	"sourceRoots": ["src"],
	"extensions": [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
	"tools": { "prettier": "prettier", "eslint": "eslint", "knip": "knip", "tsc": "tsc" },
	"documentation": {
		"required": { "types": true, "functions": true, "exportedFunctions": true, "noInlineFunctions": false }
	},
	"qualityCommands": [
		{ "name": "build", "command": "pnpm", "args": ["run", "build"] },
		{ "name": "test", "command": "pnpm", "args": ["run", "test"] }
	]
}
```

`sourceRoots` and `extensions` are required. Other paths are resolved relative to the directory containing `quality.json`; an explicit `root` is available when the file is elsewhere. Use `skippedDirectories` and `skippedFiles` for generated or intentionally unmanaged content.

### Defaults

The default `quality` command scans changed and untracked files, enables every built-in check, and enables every available autofix. `quality:all` scans every configured source file. `--warn` disables autofixes for one run. `--strict` makes naming errors fail. Use `--skip-commands` for a fast static-only pass and `--skip-recommendations` to omit advisory subprocesses; configured domains remain available through `domain`.

Every multi-item quality scan displays a visible progress bar from its first update, including when stderr is not a TTY. Updates rewrite one shared line in place instead of printing fractions or one line per update; each stage ends with a newline. `quality:all` runs quality checks, not the Node test suite; configured test commands and repository test scripts run separately and should report their own suite or test progress.

### Switches

Use `enabledChecks` to disable a built-in check. Unspecified checks are enabled:

```json
{ "enabledChecks": { "document": true, "format": true, "import": true, "name": true, "forward": true, "lint": true, "knip": true, "type": true, "recommend": true, "command": true, "diff": true } }
```

Use `autofix` for checks that can edit files. Unspecified autofixes are enabled; `--warn` overrides all of them:

```json
{ "autofix": { "document": true, "format": true, "name": true, "lint": true, "knip": true } }
```

`enabledCommands` toggles individual `qualityCommands`, such as `{ "test": false }`. `enabledRecommendations` does the same for `recommendationCommands`. Setting `command` or `recommend` to `false` disables its whole category. The package includes `quality.schema.json` for editor validation.

### Tools

`tools` names executables. The package first checks the repository's local `node_modules/.bin` and then falls back to the configured name. It does not install Prettier, ESLint, Knip, TypeScript, test runners, or build tools. Complex tool-native rules can remain in native JavaScript/TypeScript config; no separate tool JSON is required by this runner.

---

## Checks

Every check below uses the same description format: what it does, its terminology, configuration advice, and its guiding ideology.

- **Documentation:** Applies file headers, import grouping, section layout, whitespace, TSDoc shape, and the documentation policy. It can add minimal TSDoc placeholders where the policy makes that safe.
- **Formatting:** Runs Prettier over selected files and applies canonical layout protections, including long one-line imports where configured.
- **Imports:** Resolves local imports using source roots, extensions, aliases, and external prefixes; reports unresolved local modules and repeated named bindings from the same module. The full autofix workflow consolidates repeated bindings through source maintenance, while `--warn` reports them without editing.
- **Naming Conventions:** Finds naming drift and applies safe whole-word or prefix-based identifier renames. It avoids exported or conflicting symbols and preserves syntax-aware JSX cases.
- **Object Forwarding:** Finds call-site objects that repeat at least three properties from one source object, such as `userId: input.userId`. It recommends passing the source directly when everything is forwarded, or spreading it while retaining explicit overrides.
- **Linting:** Runs ESLint over selected files and propagates its exit status. Default fix mode passes ESLint's fix option.
- **Dead code:** The canonical `dead-code` workflow coordinates Knip (unused files, exports, dependencies, reachability), ESLint's unused private declarations, TypeScript single-use analysis, and detached-TSDoc detection. `quality`, `quality:all`, `dead-code`, `knip`, and `single-use` all dispatch through this same coordinator; focused command names are compatibility entry points, not separate detector implementations.
- **Typing:** Runs configured source and project TypeScript checks.
- **Recommendations:** Runs repository-specific advisory commands after primary checks. Output is visible, but their statuses do not fail the run.
- **Commands:** Runs arbitrary repository commands, commonly `build` and `test`, and propagates their statuses. It does not guess how to limit them to changed files.
- **Diff:** Runs `git diff --check` to catch whitespace errors in the current Git worktree.
- **Security:** Reports committed or root-level environment files, environment-file loaders, secret-shaped environment access in configured client roots, disallowed imports, forbidden terms, and process-environment access outside configured runtime roots.
- **Repetition:** `repeated-classes` reports repeated static class strings, `regex-dedup` reports exact duplicate regular-expression sources, and `ui-patterns` reports configurable UI patterns that should use shared primitives.

## Context limits

The package supports Node.js `>=18.18`, JavaScript/TypeScript extensions understood by the configured tools, local files, monorepos, CI, and normal Git worktrees. It does not parse arbitrary languages, inspect runtime behavior, prove security properties, install external tools, supply cloud services, or infer the semantics of a projection or test command. Generated, virtual, symlinked, or framework-specific files outside configured roots must be handled explicitly by repository configuration and native tools.
