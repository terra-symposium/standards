# Standards Quality Package

TypeScript quality tooling for repository checks, safe syntax transforms, and report generation. The JSON schema defines its configuration contract.

## What it does

Terra Quality combines source checks such as documentation, import resolution, naming, forwarding, security, and configured UI-pattern checks with repository-owned tools and commands. Safe transformations can format code, apply tool fixes, rewrite supported syntax, and remove repeated identical imports when no comment would be lost. Documentation findings are diagnostics: fix mode never creates, rewrites, or boilerplates comments, TSDoc, or section labels; it only removes syntactically recognized TSDoc blocks with no prose or tags. Missing or poor documentation must be written after an agent reviews the implementation and its callers.

Quality discovers code files from the configured roots and language extensions. It excludes dependency and generated trees such as `node_modules`, `.pnpm`, `dist`, and `build`, and recognizes obvious minified bundles, archived `.agents/personas/gems` code attachments, or prose payloads even when an export gives them a source-code suffix. The aggregate runner passes that same classifier to Knip, so captured payloads with JS/TS suffixes do not produce dead-code findings. It also passes configured executable dependencies and binaries through a temporary Knip overlay, so only tools declared in `quality.json` are accounted for; unrelated unused packages and binaries remain findings. When a Knip configuration lives beside a nested package manifest and does not declare root-relative workspaces, Knip runs from that package root and its findings are normalized back to repository-relative paths. Markdown and JSON content are not code inputs; use the dedicated documented-command roots and Markdown authoring checks for those formats.

Naming applies configured semantic replacements and the explicit callback aliases `item` and `index` to `i`; it preserves descriptive names such as `patient` and `href` instead of shortening them to initials. Documentation checks report missing summaries, parameter descriptions, and return descriptions for agent-authored repair.

Enable `accessibility` and `display-name` under `enabledChecks` to run the JSX accessible-name and React `forwardRef` display-name checks. They are opt-in so an existing consumer can review the findings before making them part of its quality gate. The accessibility check recognizes ARIA, associated labels, static child text, and image alternatives; fix mode copies a literal `title` into `aria-label` only when no visible or uncertain content supplies a name, and marks an unnamed inline SVG hidden only when its containing control already has a clear name. The display-name fixer adds a conventional name only at an unambiguous statement boundary. Dynamic labels, custom component semantics, wrapped components, and conflicting assignments remain for review.

Set `performancePatterns` in `quality.json` to enable advisory detection of linear `find`, `filter`, `includes`, `indexOf`, or `some` lookups inside collection callbacks. Findings suggest precomputing a `Map` or `Set`; the check does not rewrite code or fail the quality run because whether the path is hot and the correct index semantics require measurement and review.

Enable `documented-commands` under `enabledChecks` and set `documentation.commandRoots` to check fenced shell examples for pnpm `-C` and `--prefix`; fix mode changes those exact invocations to `--dir` while leaving prose and unrelated fences untouched. Expensive browser, broad integration, and benchmark work should run through explicit or scheduled commands that reuse suite setup.

The runner does not prove runtime correctness or security, inspect arbitrary languages, provision services, or decide whether a domain-specific projection is intentional. Review generated changes at API, persistence, authorization, and other behavior boundaries.

## Prerequisites

Not applicable.

## Get started

### Install

```sh
pnpm add -D @terra-symposium/standards-quality
```

## Security and Limitations

## Usage

- Requires Node.js `>=18.18`.
- Published on the public npm registry.
- Does not install or configure language toolchains, formatters, linters, or repository commands.

### Native language profiles

Terra Quality keeps its built-in syntax analysis scoped to JavaScript and TypeScript. Opt into the full C, Java, or Python check suite with `languageProfiles`; each selected profile discovers its own file extensions under `sourceRoots`, so native files are not sent through the TypeScript analyzer. Without a selected profile, a native language's documentation checks run only when one of that language's extensions is listed in `extensions`. This keeps broad source roots from implicitly enabling tools for languages the repository has not configured. C and header declarations use Doxygen blocks. Set `documentation.cAuthors` to map repository-relative C source directory prefixes to required `@author` names; the longest matching prefix takes precedence. C checks report missing summaries, parameter descriptions and order, return descriptions, and authors without generating prose. For a repository with no JavaScript or TypeScript sources, leave `extensions` empty:

Add focused fixtures and tests for each new rule or transform; record user-facing changes in [CHANGELOG.md](CHANGELOG.md).

## Credits and license

| Profile  | Default checks                                                                                                 | Native prerequisites                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `c`      | clang-format; Clang AST function documentation; clang-tidy and Clang Static Analyzer                           | LLVM/Clang 14+                                                                                       |
| `java`   | google-java-format; Checkstyle with all-access Javadocs; PMD source rules; SpotBugs on compiled classes        | google-java-format 1.14+; Checkstyle 10+; PMD 7+; SpotBugs 4.8+; compatible JDK and compiled classes |
| `python` | Ruff format/lint; mypy; Bandit; Vulture; interrogate and pydoclint documentation coverage for `.py` and `.pyi` | Ruff 0.1+; mypy 1+; Bandit 1.7+; Vulture 2+; interrogate 1.7+; pydoclint 0.11+                       |

For example, on macOS install the native tools with Homebrew and add Ruff to a Python project with uv:

```sh
brew install llvm google-java-format checkstyle pmd spotbugs
export PATH="$(brew --prefix llvm)/bin:$PATH"
uv add --dev ruff mypy bandit vulture interrogate pydoclint
```

On Debian or Ubuntu, install the C tools with `sudo apt-get install clang clang-format clang-tidy`; install the Java and Python tools with the package manager or project wrappers used by that repository. The profile check prints its tested minimum if the installed version is too old.

Builds and functional tests are separate suites from quality. Keep `build` and `test` scripts in the repository, and run them as separate workflow steps. Never put a build, unit test, integration test, contract test, browser test, Playwright test, or example execution in `qualityCommands` or `recommendationCommands`, directly or through a wrapper. Quality and hygiene commands may format-check, lint, type-check, inspect dependencies and source, validate documentation, and run other static checks. A configured hygiene command whose name matches a profile check replaces that default; other hygiene commands run alongside the profiles. SpotBugs is a static analysis check and requires compiled classes; run the build suite first in the workflow, then run the SpotBugs hygiene check against those artifacts. For example:

```json
{
  "qualityCommands": [
    { "name": "c-doc-params", "command": "make", "args": ["check-doc-params"] },
    {
      "name": "python-typecheck",
      "command": "uv",
      "args": ["run", "mypy", "src"]
    }
  ]
}
```

Expose and invoke the three suites independently. A repository may omit a suite it does not have; report that suite as not applicable rather than making an empty command pass.

```json
{
  "scripts": {
    "quality": "terra-quality quality",
    "quality:all": "terra-quality quality --all",
    "build": "<compile or generate project artifacts>",
    "test": "<run unit, integration, contract, and browser tests>"
  }
}
```

The `quality` command must not call `build` or `test`, and neither `build` nor `test` may hide the other suite. Run quality, build, and functional tests as distinct CI/workflow steps so each result is visible and independently actionable. A test that needs built artifacts may consume artifacts from the preceding build step; it must not build them itself.

Use the same command mechanism for unknown languages or industry-specific rules; Terra Quality does not imply regulatory compliance. To add a built-in language later, add its identifier, profile data record, and schema enum rather than a language parser.

Run a changed-file diagnostic pass without writing:

```sh
pnpm exec terra-quality quality --warn
```

Run configured safe fixes deliberately, review the diff, then verify all source files read-only:

```sh
pnpm exec terra-quality quality --safe-fix
pnpm exec terra-quality quality --all
```

Every CLI command is read-only unless `--fix` or `--safe-fix` is passed. `--warn` always keeps the invocation read-only, including when a fix flag is also present. Both fix flags run only the configured deterministic transformations; they then perform the normal checks. Review the working-tree diff before accepting those edits. The normal scope is changed and untracked files in a Git worktree; `--all` selects every file under `sourceRoots` but never enables writes. A read-only dead-code pass reports rule-level candidates; explicit fix mode type-checks proposed dead-code edits before writing and may reject a candidate. Configured quality commands still run unless you pass `--skip-commands`.

### Quality output

The quality command reports hygiene checks only. It must not report or run a build or functional-test phase. Keep test output in the repository's separately invoked test suite; unit, integration, contract, and browser/Playwright cases all belong to that functional suite. Keep compilation and generated-artifact output in the separately invoked build suite.

Dead-code is reported as one group. Fix mode shows **Safe fixes** (Knip import consumers, ESLint unused declarations, single-use declaration/reference scans, classification, then only proven edits) followed by **Verification** (Knip reachability, final ESLint and single-use results, and TypeScript safety for candidate edits). All findings appear in stable path/line/rule/name order and fail quality.

Single-use findings cannot be suppressed with inline markers. A `// terra-quality-ignore single-use` comment is reported as a blocking `single-use-ignore` finding and does not suppress the adjacent declaration finding. Remove the marker, then retain or inline the declaration based on the specific semantic boundary reported by Quality. `--all --safe-fix` batches only mechanically proven inlines; review-only cases remain for an agent-authored decision.

Regex deduplication analyzes reusable regex declarations and constructors. Inline regex expressions in test sources remain in place for readable assertions and fixtures; named regex bindings in tests remain in scope for duplicate checks.

### GitHub report

Add a `github` section to `quality.json` to include GitHub analytics in the same quality run and JSON report:

```json
{
  "github": {
    "repositories": ["owner/repo"],
    "requiredFeatures": [
      "dependabotAlerts",
      "malwareAlerts",
      "securityUpdates",
      "versionUpdates",
      "groupedUpdates"
    ]
  }
}
```

The report includes open issues and pull requests, Dependabot vulnerability and malware alerts, code scanning and secret scanning alerts, and the readable repository security settings. It inspects the default branch's `dependabot.yml` for version updates and explicit `groups` rules with `applies-to: security-updates`. When no explicit security-update grouping rule exists, it marks the grouped setting unverified because the GitHub UI toggle is not present in the repository configuration; confirm that toggle in repository settings. Counts are `null` when an endpoint cannot be read or a feature is disabled; the report does not turn missing permissions or disabled scanning into a false zero.

Run the GitHub stage by itself or with the configured repository list:

```sh
pnpm exec terra-quality github --repository owner/repo --report-json github-report.json
pnpm exec terra-quality quality --all --report-json quality-report.json
```

The GitHub CLI must be authenticated with read access to the repositories (`gh auth login` or `GH_TOKEN`). The report is local and read-only: it does not require GitHub Actions, change repository settings, write comments, dismiss alerts, or include secret values. Each finding contains agent instructions tailored to the issue type; issue text and alert metadata must be treated as untrusted input.

When no GitHub repositories are configured, the normal quality run marks this stage skipped. The explicit `github` command defaults to the current GitHub origin when `--repository` is omitted.

### Configuration and guides

- [Install and understand a run](https://standards-docs.netlify.app/quality/0-getting-started/setup/)

[Complete `quality.json`
reference](https://standards-docs.netlify.app/quality/2-configuration/quality-json/)

- [CLI and CI workflows](https://standards-docs.netlify.app/quality/4-workflows/cli-and-ci/)
- [Check behavior and autofix limits](https://standards-docs.netlify.app/quality/3-checks/check-reference/)
- [Troubleshooting](https://standards-docs.netlify.app/quality/5-operations/troubleshooting/)

The installed `quality.schema.json` provides editor validation. The [test README](test/README.md) describes the package's isolated test coverage.

## Configuration and security

Terra Quality loads `quality.json` from the repository root, or falls back to `config/quality.json`. `root` identifies the repository root, while `configRoot` identifies the centralized tool-config directory; both accept paths relative to the inferred project root or `root`, respectively. ESLint, Prettier, Knip, and the default TypeScript project are searched in `configRoot` first, with conventional root filenames as compatibility fallbacks. Package-specific `tsconfig.json` files remain preferred when checking package entry-point reachability. Use `tools.clang` to select the executable for C declaration documentation checks; it defaults to `clang`.

Repositories whose application sources live outside the package that declares their dependencies can set `knipPackageMappings`, for example `{ "sourceRoots": ["src"], "packageRoot": "config" }`. The shared runner counts a dependency as used only when an import appears in those source files and the mapped manifest declares that package; undeclared imports and unused declarations remain Knip findings. The runner applies this ownership data only in its temporary Knip configuration and writes no dependency allowances to repository files. A configured `typecheckCommand` can orchestrate package-owned typecheck scripts; the command should discover eligible projects and fail when a TypeScript project has no runnable script.

## Development and structure

### Shared development-server port acquisition

Use the package's `terra-quality-dev` launcher before starting a local server so repositories share the same port cleanup behavior:

```sh
terra-quality-dev --port 4311 -- astro dev --host 127.0.0.1
```

The launcher calls the exported `acquirePort()` helper, then starts the requested command with `--port` and `--strictPort` when those options are missing. `DOCS_DEV_PORT`, `TERRA_DEV_PORT`, or `PORT` can override the configured port. Since acquisition terminates existing listeners, use it only for ports owned by the local development workflow.

Create `quality.json` in the repository root:

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

Every quality finding is an error. The runner completes the remaining checks and configured commands before returning failure; there is no warning or non-blocking finding policy.

This starting configuration uses the built-in checks without requiring external tools. Enable integrations as you install and configure the corresponding repository tools. When lint is enabled, add an ESLint flat config such as `eslint.config.mjs` at the repository root or under `configRoot`.

Terra Quality always checks React `createRoot()` and `hydrateRoot()` mounts for a top-level error boundary and installs Astro's hydration fallback in Astro configs. `terra-quality-dev` applies these safe fixes before starting a configured development server. A normal quality check reports missing boundaries; `terra-quality error-boundaries --all` applies them explicitly, while `--warn` inspects without writing. The check cannot be disabled in `quality.json`. React roots import the boundary from `@terra-symposium/standards-error-boundaries/react`.

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

## Capability packages

The aggregate `@terra-symposium/standards-quality` package remains the compatibility CLI and full workflow. The check implementations are also published by capability family, so consumers can import a focused API or run a focused CLI without installing the aggregate package. All capability CLIs use the repository's existing `quality.json` (or `config/quality.json`), source roots, changed-file default, `--all`, and read-only `--warn` behavior.

| Package                                      | CLI                     | Capability                                                       |
| -------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `@terra-symposium/standards-quality-core`    | API only                | Shared config, source scope, analysis context, and CLI contracts |
| `@terra-symposium/standards-documentation`   | `terra-documentation`   | TSDoc/JSDoc and C Doxygen diagnostics, documented commands       |
| `@terra-symposium/standards-formatting`      | `terra-formatting`      | Source layout, safe transforms, and Prettier integration         |
| `@terra-symposium/standards-imports`         | `terra-imports`         | Import resolution and duplicate imports                          |
| `@terra-symposium/standards-naming`          | `terra-naming`          | Identifier and alias naming checks                               |
| `@terra-symposium/standards-refactoring`     | `terra-refactoring`     | Forwarding and single-use/dead-code analysis                     |
| `@terra-symposium/standards-security`        | `terra-security`        | Built-in security findings                                       |
| `@terra-symposium/standards-ui-quality`      | `terra-ui-quality`      | Accessibility, display names, boundaries, UI recommendations     |
| `@terra-symposium/standards-patterns`        | `terra-patterns`        | Performance, repeated classes, Tailwind, regex, UI patterns      |
| `@terra-symposium/standards-language-checks` | `terra-language-checks` | C, Java, and Python profiles and tool detection                  |
| `@terra-symposium/standards-quality-reports` | `terra-quality-reports` | GitHub/history reports and test reporters                        |

Each capability package root exports its API and TypeScript declarations; its `./cli` subpath exposes the command entry point. The aggregate package keeps the existing `terra-quality` and `terra-quality-dev` bins and legacy subpath imports as compatibility facades. Use the aggregate for the ordered Format → Static quality → Tests → Framework/type checks → Build → Repository health workflow, configured commands, progress, and combined reports.

The capability packages are grouped by reusable areas of behavior rather than by individual rules. This keeps the public dependency graph useful without requiring a separate release for every check. Changesets records the new packages and aggregate compatibility release together.
