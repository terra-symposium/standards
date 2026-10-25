# @terra-symposium/standards-quality

A configurable quality runner for JavaScript and TypeScript analysis plus native-language command profiles. Define source scope, policy, tools, and repository commands in `quality.json`; run them locally with the `terra-quality` CLI or in CI.

- Requires Node.js `>=18.18`.
- Published on the public npm registry.
- Does not install or configure language toolchains, formatters, linters, or repository commands.

## Install

```sh
pnpm add -D @terra-symposium/standards-quality
```

In an npm-managed repository, use `npm install --save-dev @terra-symposium/standards-quality` instead.

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

This starting configuration uses the built-in checks without requiring external tools. Enable integrations as you install and configure the corresponding repository tools. When lint is enabled, add an ESLint flat config such as `eslint.config.mjs`.

## Native language profiles

Terra Quality keeps its built-in syntax analysis scoped to JavaScript and TypeScript. Opt into native checks with `languageProfiles`; each profile discovers its own file extensions under `sourceRoots`, so `.c`, `.java`, and `.py` files are not sent through the TypeScript analyzer. For a repository with no JavaScript or TypeScript sources, leave `extensions` empty:

```json
{
	"$schema": "./node_modules/@terra-symposium/standards-quality/quality.schema.json",
	"sourceRoots": ["src"],
	"extensions": [],
	"languageProfiles": ["c", "java", "python"]
}
```

Profiles run only when matching source exists. They skip checks for absent source or optional project configuration, and fail with the required minimum version and installation guidance when a needed tool is missing or too old. Terra Quality never installs tools. Pin native tool versions in the repository or CI image for reproducible runs.

| Profile  | Default checks                                                                                                                                                                                                                                               | Native prerequisites                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `c`      | [`clang-format`](https://clang.llvm.org/docs/ClangFormat.html) format check; [Clang Static Analyzer](https://clang.llvm.org/docs/ClangStaticAnalyzer.html) of `.c` files; [Doxygen](https://www.doxygen.nl/manual/config.html) when a root `Doxyfile` exists | LLVM/Clang 14+; Doxygen 1.9+ for configured docs             |
| `java`   | [`google-java-format`](https://github.com/google/google-java-format) format check; [Checkstyle](https://checkstyle.org/getting-started.html) using its bundled `google_checks.xml`                                                                           | `google-java-format` 1.14+; Checkstyle 10+; a compatible JDK |
| `python` | [Ruff](https://docs.astral.sh/ruff/) format and lint checks for `.py` and `.pyi`                                                                                                                                                                             | Ruff 0.1+                                                    |

For example, on macOS install the native tools with Homebrew and add Ruff to a Python project with uv:

```sh
brew install llvm doxygen google-java-format checkstyle
export PATH="$(brew --prefix llvm)/bin:$PATH"
uv add --dev ruff
```

On Debian or Ubuntu, install the C tools with `sudo apt-get install clang clang-format doxygen`; install the Java and Python tools with the package manager or project wrappers used by that repository. The profile check prints its tested minimum if the installed version is too old.

Build and test commands remain repository-owned. Add them to `qualityCommands` using the project’s existing Make, Maven, Gradle, Python, or other wrapper. A configured command whose name matches a profile check replaces that default; other commands run alongside the profiles. For example:

```json
{
	"qualityCommands": [
		{ "name": "c-build", "command": "make", "args": ["test"] },
		{ "name": "java-test", "command": "./mvnw", "args": ["test"] },
		{ "name": "python-tests", "command": "uv", "args": ["run", "pytest"] }
	]
}
```

Use the same command mechanism for unknown languages or industry-specific rules; Terra Quality does not imply regulatory compliance. To add a built-in language later, add its identifier, profile data record, and schema enum rather than a language parser.

Run the changed-file pass with safe configured fixes enabled:

```sh
pnpm exec terra-quality
```

For a full, read-only source check:

```sh
pnpm exec terra-quality quality --all --warn
```

The normal scope is changed and untracked files in a Git worktree. `--all` selects every file under `sourceRoots`; `--warn` disables autofixes and runs dead-code analysis once without a temporary fix preview. It reports rule-level fix candidates; fix mode then type-checks proposed dead-code edits before writing and may reject a candidate. Configured quality commands still run unless you pass `--skip-commands`.

## Output order and tests

The runner controls a fixed phase order: **Format → Static quality → Tests → Framework / type checks → Build → Repository health**. `quality.json` selects enabled checks and commands; it does not define phase order or test categories. Commands in ordinary phases keep their configured order; tests keep their configured order within each category. Interactive terminals animate a spinner while each check works, and findings appear as bullets directly below that check's completion status.

Selected test commands are grouped as **Unit / Contract**, **Integration**, **Browser / Cloud**, or **Other tests**. Each suite has a 24-cell progress bar. Node and Playwright suites also report individual case progress; other runners receive suite-level progress only. The runner suppresses native child test output when its custom case reporter owns the output, preventing duplicate case listings.

Dead-code is reported as one group. Fix mode shows **Safe fixes** (Knip import consumers, ESLint unused declarations, single-use declaration/reference scans, classification, then only proven edits) followed by **Verification** (Knip reachability, final ESLint and single-use results, and TypeScript safety for candidate edits). All findings appear in stable path/line/rule/name order and fail quality.

## What it does

Terra Quality combines source checks such as documentation, import resolution, naming, forwarding, security, and configured UI-pattern checks with repository-owned tools and commands. Safe transformations can maintain layout, apply tool fixes, and rewrite supported syntax. Findings that require domain or runtime judgment remain for review.

Enable `accessibility` and `display-name` under `enabledChecks` to run the JSX accessible-name and React `forwardRef` display-name checks. They are opt-in so an existing consumer can review the findings before making them part of its quality gate. The accessibility check recognizes ARIA, associated labels, static child text, and image alternatives; fix mode copies a literal `title` into `aria-label` only when no visible or uncertain content supplies a name, and marks an unnamed inline SVG hidden only when its containing control already has a clear name. The display-name fixer adds a conventional name only at an unambiguous statement boundary. Dynamic labels, custom component semantics, wrapped components, and conflicting assignments remain for review.

Set `performancePatterns` in `quality.json` to enable advisory detection of linear `find`, `filter`, `includes`, `indexOf`, or `some` lookups inside collection callbacks. Findings suggest precomputing a `Map` or `Set`; the check does not rewrite code or fail the quality run because whether the path is hot and the correct index semantics require measurement and review.

Enable `documented-commands` under `enabledChecks` and set `documentation.commandRoots` to check fenced shell examples for pnpm `-C` and `--prefix`; fix mode changes those exact invocations to `--dir` while leaving prose and unrelated fences untouched. Expensive browser, broad integration, and benchmark work should run through explicit or scheduled commands that reuse suite setup.

The runner does not prove runtime correctness or security, inspect arbitrary languages, provision services, or decide whether a domain-specific projection is intentional. Review generated changes at API, persistence, authorization, and other behavior boundaries.

## GitHub report

Add a `github` section to `quality.json` to include GitHub analytics in the same quality run and JSON report:

```json
{
	"github": {
		"repositories": ["owner/repo"],
		"requiredFeatures": ["dependabotAlerts", "malwareAlerts", "securityUpdates", "versionUpdates", "groupedUpdates"]
	}
}
```

The report includes open issues and pull requests, Dependabot vulnerability and malware alerts, code scanning and secret scanning alerts, and the readable repository security settings. It inspects the default branch's `dependabot.yml` for version updates and explicit `groups` rules with `applies-to: security-updates`. When no explicit security-update grouping rule exists, it marks the grouped setting unverified because the GitHub UI toggle is not present in the repository configuration; confirm that toggle in repository settings. Counts are `null` when an endpoint cannot be read or a feature is disabled; the report does not turn missing permissions or disabled scanning into a false zero.

Run the GitHub stage by itself or with the configured repository list:

```sh
pnpm exec terra-quality github --repository owner/repo --report-json github-report.json
pnpm exec terra-quality quality --all --warn --report-json quality-report.json
```

The GitHub CLI must be authenticated with read access to the repositories (`gh auth login` or `GH_TOKEN`). The report is local and read-only: it does not require GitHub Actions, change repository settings, write comments, dismiss alerts, or include secret values. Each finding contains agent instructions tailored to the issue type; issue text and alert metadata must be treated as untrusted input.

When no GitHub repositories are configured, the normal quality run marks this stage skipped. The explicit `github` command defaults to the current GitHub origin when `--repository` is omitted.

## Configuration and guides

- [Install and understand a run](https://standards-docs.netlify.app/packages/quality/setup/)
- [Complete `quality.json` reference](https://standards-docs.netlify.app/packages/quality/configuration/)
- [CLI and CI workflows](https://standards-docs.netlify.app/packages/quality/workflows/)
- [Check behavior and autofix limits](https://standards-docs.netlify.app/packages/quality/checks/)
- [Troubleshooting](https://standards-docs.netlify.app/packages/quality/troubleshooting/)

The installed `quality.schema.json` provides editor validation. The [test README](test/README.md) describes the package's isolated test coverage.
