# `@terra-symposium/quality`

## Introduction

This package provides one consistent quality entry point for Terra Symposium repositories. A repository describes its source scope, tools, policies, and commands in one `quality.json`; the package coordinates source checks and repository commands in a predictable order.

The default is practical local development: inspect working changes and apply safe, deterministic fixes. CI can request a complete scan and warning-only behavior. Repositories remain responsible for domain-specific checks, credentials, databases, browsers, deployments, and commands that cannot run in a normal local Node process.

The package distinguishes mechanical cleanup from judgment. Formatting, documentation layout, naming changes, and tool-provided fixes can be automated where the transformation is understood. Checks requiring semantic judgment report findings for review instead of silently changing behavior. A passing run is not a security, product, or runtime guarantee.

The package supports single-package repositories, monorepos, CI, pre-commit hooks, and editor tasks. It does not require separate orchestration files for Prettier, ESLint, Knip, or TypeScript. Those tools may still use native JavaScript/TypeScript configuration when their rule sets require it.

---

## Configuration

### Installation

Install the package as a development dependency. GitHub Packages requires the scope registry and a read-capable token:

```ini
@terra-symposium:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add -D @terra-symposium/quality
npx terra-quality
```

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

### Document

- **Does:** Applies file headers, import grouping, section layout, whitespace, TSDoc shape, and the documentation policy. It can add minimal TSDoc placeholders where the policy makes that safe.
- **Terms:** “Type” means a class, enum, interface, or type alias. “Function” means a named function declaration. “Exported function” means a named function declaration with `export`. “Inline function” means an arrow function or function expression, including callbacks.
- **Configure:**

```json
{ "documentation": { "required": { "types": true, "functions": true, "exportedFunctions": true, "noInlineFunctions": false } } }
```

Each rule is independent. `functions` covers all named functions. `exportedFunctions` can cover only exported functions when `functions` is false. `noInlineFunctions` reports inline functions and asks for named declarations; it has no safe autofix. `autofix.document` controls document edits. `maintain` remains a compatibility alias for `document`.

- **Ideology:** Documentation should describe stable public intent and current signatures, not invent prose. Generated tags are a useful baseline; humans should replace placeholders at public boundaries.

### Format

- **Does:** Runs Prettier over selected files and applies canonical layout protections, including long one-line imports where configured.
- **Terms:** “Format” means syntax-preserving presentation changes, separate from semantic refactoring and lint rules.
- **Configure:** Set `tools.prettier`, `prettierPrintWidth`, and `oneLineImports`. Prettier's native configuration is discovered by Prettier.
- **Ideology:** Formatting should be deterministic, low-risk, and safe to repeat.

### Import

- **Does:** Resolves local imports using source roots, extensions, aliases, and external prefixes, then reports unresolved local modules.
- **Terms:** “External prefix” marks an intentionally external namespace. “Alias” maps an import prefix to a repository path.
- **Configure:** Set `aliases`, `externalPrefixes`, `skippedDirectories`, and `skippedFiles`. Import has no autofix because selecting the intended replacement is semantic.
- **Ideology:** Import correctness is a dependency-boundary check, not merely a style preference. Do not use external exemptions to hide broken local imports.

### Name

- **Does:** Finds naming drift and applies safe whole-word or prefix-based identifier renames. It avoids exported or conflicting symbols and preserves syntax-aware JSX cases.
- **Terms:** “Suggestion” is non-strict. “Error” fails when `--strict` is used. `--warn` reports without renaming.
- **Configure:** Use `protectedIdentifiers` for stable names. Set `autofix.name` to `false` for review-only output.
- **Ideology:** Names should be consistent where the transformation is unambiguous. Protect public API names, domain vocabulary, and intentional abbreviations.

### Forward

- **Does:** Finds call-site objects that repeat at least three properties from one source object, such as `userId: input.userId`. It recommends passing the source directly when everything is forwarded, or spreading it while retaining explicit overrides.
- **Terms:** “Forwarding” is syntactic repetition, not proof that two object types are identical. “Projection” is an intentionally narrower object made from a larger one.
- **Configure:** Toggle it with `enabledChecks.forward`. It has no autofix. It supports JavaScript and TypeScript object literals and ignores common persistence/mutation names such as `insert`, `upsert`, `update`, `set`, and `assign`.
- **Ideology:** Prefer direct forwarding when a function intentionally accepts the same object. Keep explicit projections at API, persistence, authorization, redaction, schema, and versioning boundaries. The check is advisory because syntax cannot determine those contracts safely.

### Lint

- **Does:** Runs ESLint over selected files and propagates its exit status. Default fix mode passes ESLint's fix option.
- **Terms:** “Lint” means repository-configured static rules supplied by ESLint. The quality package coordinates ESLint; it does not define its rule set.
- **Configure:** Set `tools.eslint` and optional `lintRoots`. Use `enabledChecks.lint` and `autofix.lint` to control execution and edits.
- **Ideology:** Lint should catch repeatable defects. Rules requiring product or security judgment should not receive broad automatic edits.

### Knip

- **Does:** Runs Knip for unused files, exports, dependencies, and reachability checks, propagating its status when enabled.
- **Terms:** “Unused” means unreachable according to Knip's entry points and project model; it does not automatically mean semantically unnecessary.
- **Configure:** Set `tools.knip` and `autofix.knip` for supported Knip fixes. A separate Knip JSON file is not required for invocation. Disable Knip when entry-point metadata is incomplete.
- **Ideology:** Dead-code cleanup should be evidence-led. Review generated files, dynamic imports, plugins, and framework conventions before deletion.

### Type

- **Does:** Runs configured source and project TypeScript checks.
- **Terms:** “Source type check” uses files selected by the runner. “Project type check” runs the configured TypeScript project and may inspect files beyond working changes.
- **Configure:** Set `tools.tsc`, `tsconfig`, `typecheckRoots`, and `typecheckExtensions`. Type has no autofix.
- **Ideology:** Types should make invalid states difficult to represent without replacing runtime validation at untrusted boundaries.

### Recommend

- **Does:** Runs repository-specific advisory commands after primary checks. Output is visible, but their statuses do not fail the run.
- **Terms:** “Recommendation” is intentionally non-blocking and suits migration hints, cleanup reports, and architectural suggestions.
- **Configure:** Declare `recommendationCommands` and toggle them with `enabledRecommendations`. Any edits performed by such a command are its own documented contract.
- **Ideology:** Advice should be visible without making exploratory cleanup block delivery.

### Command

- **Does:** Runs arbitrary repository commands, commonly `build` and `test`, and propagates their statuses. It does not guess how to limit them to changed files.
- **Terms:** “Configured command” is a repository-owned process, not a built-in algorithm.
- **Configure:** Declare `qualityCommands` with a unique `name`, executable `command`, and optional string `args`. Use `enabledCommands` for individual switches and `enabledChecks.command` for the category.
- **Ideology:** The runner coordinates repository truth without assuming every repository builds or tests the same way. Keep commands deterministic and explicit about required services or credentials.

### Diff

- **Does:** Runs `git diff --check` to catch whitespace errors in the current Git worktree.
- **Terms:** “Diff” is worktree hygiene, not semantic review.
- **Configure:** Toggle it with `enabledChecks.diff`. It has no autofix and requires Git. Disable it for source archives or environments without a Git worktree.
- **Ideology:** Small textual defects should be caught cheaply, but this is not a complete review or generated-artifact validation.

### Security

- **Does:** Reports committed or root-level environment files, environment-file loaders, secret-shaped environment access in configured client roots, disallowed imports, forbidden terms, and process-environment access outside configured runtime roots.
- **Terms:** “Client root” and “runtime root” are repository paths supplied by configuration; the package does not assume a framework or deployment provider.
- **Configure:** Use `security.forbiddenTerms`, `security.forbiddenImports`, `security.clientRoots`, and `security.allowProcessEnvRoots`. Run `terra-quality security`.
- **Ideology:** Security checks should provide conservative, portable guardrails without pretending to understand every application’s trust model.

### Repeated classes, regexes, and UI patterns

- **Does:** `repeated-classes` reports repeated static class strings, `regex-dedup` reports exact duplicate regular-expression sources, and `ui-patterns` reports configurable UI patterns that should use shared primitives.
- **Configure:** Set `repeatedClasses`, `regexDedup`, and `uiPatterns` in `quality.json`; all three checks accept repository-relative extensions, exclusions, and thresholds.
- **Ideology:** Generic checks report evidence and let each repository decide which repetition or pattern is intentional.

## Context limits

The package supports Node.js `>=18.18`, JavaScript/TypeScript extensions understood by the configured tools, local files, monorepos, CI, and normal Git worktrees. It does not parse arbitrary languages, inspect runtime behavior, prove security properties, install external tools, supply cloud services, or infer the semantics of a projection or test command. Generated, virtual, symlinked, or framework-specific files outside configured roots must be handled explicitly by repository configuration and native tools.
