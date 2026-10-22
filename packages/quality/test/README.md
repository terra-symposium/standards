# Quality package test contract

The suite exercises the public package boundary from `dist/index.js` with isolated temporary repositories. It does not depend on the Standards checkout, installed application dependencies, or the current Git worktree. Command checks use executable fixtures that record arguments, so behavior can be tested without running each real formatter, linter, compiler, or repository build.

## One discovery path

`pnpm test` runs `node --test`. Node discovers the test files recursively under this directory exactly once. The folders below separate checks, transforms, runner behavior, and reports; shared fixture helpers live outside discovery in `support/fixtures.mjs`.

Tests selected by a repository's `quality:all` command are grouped in this order: **Unit / Contract → Integration → Browser / Cloud → Other tests**. Each selected command gets a suite bar. Node and Playwright also report individual cases through the shared 24-cell progress display. Node keeps a single live line open while test files are still being discovered, then finalizes with the runner's exact summary count when available. Unknown runners show only suite progress, with no guessed case total.

## Dead-code output contract

Dead-code is one static-quality group with two explicit stages:

- **Safe fixes:** Knip import consumers; ESLint unused declarations; single-use declaration/reference scans and candidate classification; apply only proven rewrites.
- **Verification:** Knip unused-file/export/dependency reachability; final ESLint and single-use findings; TypeScript safety checks for proposed edits.
- **Manual findings:** stable file/line/rule/name order; blocking warnings by default; `warningsAsErrors: false` is the explicit opt-out. Continue every configured check before returning failure. Print: “Resolve each manual finding one by one, in the order listed, before committing.”

```text
Before                         After
=== dead-code/knip-fix ===      STATIC QUALITY
...                               Dead code
=== dead-code/knip ===             Safe fixes      [████████████░░░░░░░░░░░░] 3/5
...                               Verification    [████████████████████████] passed
=== imports ===                  Imports         ✓ clean
  ✓ clean                         Git diff        ✓ passed
  ✓ clean
=== diff ===                    TESTS [████████░░░░░░░░░░░░] 1/3 suites
=== diff ===                      Unit / Contract · quality-contracts
                                    Cases [████████████████████████] 5/5 ✓ passed
```

## Coverage areas

| Folder       | Area                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `checks`     | Source discovery, imports, patterns, security, and documentation requirements/maintenance.                      |
| `transforms` | Type/object and conditional collapsing, naming/aliases, object forwarding, and single-use analysis/fixes.       |
| `runner`     | Configuration, CLI/phase dispatch, dead-code coordination, progress, formatter/typecheck boundaries, and ports. |
| `reports`    | Node/Playwright test progress, GitHub analytics, and history reports.                                           |

## Complete subtest inventory

Each bullet is one top-level `node:test` case. Nested assertions remain within their owning contract case. The inventory contains **217 cases**.

### Checks (36)

#### `documentation.test.mjs` (17)

- documentation policy independently reports types, exported functions, and inline functions
- documentation findings detect missing tags on one-line TSDoc attached to an exported function
- documentation findings warn for detached TSDoc and accept declaration and file-header comments
- documentation description audit accepts TSDoc attached to a type member
- documentation findings recognize the props scaffold for destructured parameters
- documentation description audits report missing prose while accepting documented tags and optional tags
- documentation description audit continues after nested template expressions and ignores comment-shaped string content
- documentation audits recognize a BOM and shebang before a generated file header
- documentSrcFile inserts empty scaffolds only for missing required declarations and is idempotent
- maintainSrcFile leaves unsupported files untouched and protectLongImports is selective and idempotent
- maintainSrcFile keeps the path and human description in one valid header block
- maintainSrcFile prefixes a prose-only leading header with the canonical path
- final comment cleanup removes detached TSDoc and generated grouping comments only
- maintenance preserves custom populated sections and cleanup removes only empty headings
- maintainSrcFile deduplicates repeated type imports across maintenance runs
- duplicate import audit reports repeated type bindings with their later source location
- maintainSrcFile heals orphaned duplicate header fragments and merges adjacent descriptions

#### `files.test.mjs` (4)

- source discovery handles nested roots, include roots, direct files, and files created during a run
- Test and spec files are included in quality source discovery when their extensions are configured
- working-tree discovery includes modified and untracked sources but excludes ignored files
- path utilities distinguish files, directories, missing paths, and repository-relative display names

#### `imports.test.mjs` (2)

- import validation resolves relative, aliased, index, asset, export, dynamic, and require imports
- import validation respects external prefixes, explicit unsupported extensions, and missing index targets

#### `patterns.test.mjs` (11)

- repeated-class detection normalizes whitespace and ignores dynamic and one-word values
- UI pattern detection applies configured extensions to all matching files
- regex deduplication inventories literals and RegExp constructors across configured source files
- repeated-class fixer creates deterministic file-local CLASSES constants and leaves dynamic/HTML sources alone
- regex fixer deduplicates stateless literals and preserves fresh stateful instances through factories
- shared regex registry rewrites TypeScript and MJS literals and constructors with relative namespace imports
- shared regex export allocation avoids names already owned by the registry
- shared regex fixer leaves a duplicate group advisory when any consumer is CommonJS
- shared regex fixer does not overwrite an unowned registry or partially rewrite consumers
- Tailwind canonical diagnostics support missing configuration, missing stylesheets, skipped v4 packages, fixes, and nested stylesheet loading
- Tailwind canonical diagnostics cleanly skip a package without the unstable v4 API

#### `security.test.mjs` (2)

- security checks detect environment files, forbidden terms/imports, client secrets, dotenv, and process-boundary violations
- security checks honor tracked visibility and runtime-root exceptions in a Git worktree

### Transforms (49)

#### `collapse.test.mjs` (1)

- collapseTypesAndObjects preserves JSX-bearing objects and unsupported files while handling JavaScript-family extensions

#### `inline-if.test.mjs` (2)

- collapseInlineIfs collapses eligible one-statement blocks, preserves indentation and else syntax, and is idempotent
- collapseInlineIfs preserves the historical nested-if else owner and runtime behavior

#### `naming.test.mjs` (13)

- naming maps are immutable and identifier tokenisation preserves separators, acronyms, and numbers
- callback aliases shorten only configured idioms and choose deterministic fallbacks on collision
- renameId shortens category, intelligence, and other configured words without touching substrings
- protected path and filename predicates handle generated folders, declaration files, route conventions, and Windows separators
- declaration predicates distinguish repository-owned declarations, public contracts, parameter properties, and owning scopes
- callback declaration APIs classify inline helper, collection, and event-handler callbacks
- alias analysis keeps only stable local identifier and type aliases
- alias autofix replaces references and shorthand properties, supports the shared analysis overload, and is idempotent
- alias analysis preserves property snapshots and mutable roots
- alias autofix skips bindings shadowed at any replacement reference
- alias analysis preserves transitive value chains and still removes independent aliases
- alias analysis preserves chains whose target is shadowed, including type aliases
- naming findings use shared analysis, report severity by replacement kind, and preserve protected declarations

#### `object-forwarding.test.mjs` (3)

- object forwarding does not promote shape-changing whole-object rewrites
- object forwarding accepts a shared analysis cache without reporting ambiguous projections
- object forwarding fixer removes only exact properties already covered by a preceding spread

#### `single-use.test.mjs` (30)

- single-use functions with attached prose require review and remain unchanged
- inlining keeps attached comments for constants and types
- single-use analysis blocks function inlining and preserves attached TSDoc
- single-use analysis blocks hook calls and other effectful initializers
- single-use agent actions name the actual unsafe boundary without irrelevant React guidance
- single-use analysis classifies pure data, runtime boundaries, callable declarations, large values, and type consumers
- single-use analysis counts cross-file consumers but ignores import syntax itself and honors include roots
- single-use type fixing inlines exported aliases and interfaces with one consumer
- single-use type fixing preserves grouped imports when several bindings are inlined
- single-use type analysis distinguishes same-named declarations by resolved symbol
- single-use type fixing substitutes generic alias and interface arguments
- single-use type fixing expands generic references through namespace imports
- single-use fixing inlines only primitive constants and leaves object identity intact
- single-use fixing leaves typed variables that depend on imported types intact
- single-use fixing leaves nested object identities behind for review
- single-use analysis does not move awaited initializers into callback bodies
- single-use fixing retains module values until a nested component has moved
- single-use fixing preserves exported functions consumed by Astro frontmatter
- single-use analysis preserves an aliased export consumed by Astro frontmatter and markup
- unused Astro import syntax is not a framework consumer
- single-use analysis includes exports unless an external framework consumer is configured
- package entry exports are preserved without exempting private declarations in the same module
- single-use fixing never removes a multi-use explicit-any compatibility alias
- single-use scope includes every configured directory and reports manual cases explicitly
- single-use analysis includes candidates in every configured directory
- single-use fixer does not treat an export specifier as a local consumer
- single-use analysis ignores destructuring bindings as declaration consumers
- single-use analysis keeps cross-file closures and write-target values intact
- single-use fixing retains object values referenced through typeof
- single-use fixer reports functions in call, JSX, and type-query positions for review

### Runner and progress (118)

#### `port.test.mjs` (2)

- portOwners rejects non-integer and out-of-range ports before invoking lsof
- acquirePort terminates an existing listener and releases the port

#### `progress.test.mjs` (1)

- progress updates always include a bar and rewrite one line even without a TTY

#### `quality.test.mjs` (61)

- consolidated quality modules expose their behavior from the public package entrypoint
- the published runtime dependency stays within the supported TypeScript API major
- documentation warnings identify missing summary and tag descriptions without generating prose
- resolves aliases and extensionless relative imports
- does not recommend shape-changing forwarding or persistence payload rewrites
- quality accepts individual changed files as scoped source roots
- reports concise-name drift without changing source
- renames requested words across casing, separators, compounds, plurals, and inflections
- does not rename substrings, protected platform names, or underscore placeholders
- does not collapse comment-only blocks before else
- collapses multiline object literals, type literals, mapped types, and interfaces
- collapse preserves comments and whitespace inside strings, templates, and regex literals
- collapse handles CRLF and ignores unsupported files and already-inline constructs
- format collapses objects before invoking Prettier
- Prettier keeps short objects and types inline while wrapping constructs over print width
- maintenance adds headers and grouped sorted imports
- maintenance sorts groups, import lines, and line contents alphabetically
- maintenance removes duplicate file headers and preserves a blank after section fences
- maintenance removes unauthorized blank lines inside functions
- maintenance groups top-level consts and types as config and functions as helpers
- maintenance does not interpret section-shaped string content as managed headers
- maintenance generates a blank TSDoc block only for helpers without existing documentation
- maintenance expands one-line TSDoc with parameter and return scaffolds
- maintenance adds missing tags to existing one-line TSDoc without imports or across custom sections
- maintenance preserves existing TSDoc prose and tag descriptions while adding missing tags
- maintenance preserves managed-looking sections in files without imports
- maintenance normalizes section, group, and line-comment whitespace without duplicate empty sections
- maintenance does not normalize section-shaped text inside templates
- format applies maintenance before Prettier and is idempotent
- protects long one-line imports from Prettier wrapping
- domain runs one configured quality command
- alias fixer preserves generic aliases and generic references
- naming supports warning-only and automatic-fix modes
- naming applies whole-word image aliases and prefix-only state aliases
- naming leaves Astro frontmatter, framework properties, and markup unchanged
- naming preserves shorthand property keys while renaming their values
- naming preserves call punctuation when expanding a shorthand parameter
- naming shortens map callback parameters and all symbol references
- naming keeps full words when no callback alias is an established idiom
- naming shortens TypeScript traversal callbacks with conflict checks
- naming chooses a free map callback alias when preferred names conflict
- naming reuses concise aliases safely across independent map scopes
- naming allows a callback alias used only in a sibling function scope
- naming preserves object keys but not positional syntax in destructured map parameters
- naming allocates distinct aliases across one destructured callback parameter
- callback renames do not alter unrelated JSDoc parameters with the same name
- naming leaves node unchanged outside configured map callbacks
- naming fix mode leaves protected component paths unchanged
- naming fixes PascalCase declarations, catch variables, and destructuring without changing property keys
- naming preserves exported contracts and configurable protected identifiers
- naming updates JSDoc parameter tags with parameter declarations
- naming preserves explicitly unused underscore parameters
- naming refuses file-level destination collisions
- naming autofix does not create a same-file collision across function scopes
- naming avoids repository helper shadowing in initializers
- naming preserves parameter properties and their constructor references
- naming keeps distinct aliases for adjacent parameters
- naming reuses aliases in sibling function scopes and updates their TSDoc
- naming ignores external types, JSX attributes, properties, and exported contracts
- naming preserves intrinsic JSX tags when component symbols are unresolved
- naming ignores declarations exported through an export list

#### `runner.test.mjs` (54)

- createQualityCfg applies defaults and resolves every repository-relative path exactly once
- CLI help exits before default quality dispatch or any configured autofix can run
- CLI version and invalid arguments never dispatch quality work
- CLI writes a versioned report with check statuses and finding counts
- repeated naming repair never appends a second import for an already-bound local name
- naming autofix never text-rewrites Astro properties or string literals
- the executable handles help without a config and rejects unknown commands before config loading
- the executable rejects linting without an ESLint flat config before running quality
- loadQualityCfg resolves a quality file root relative to the configuration file
- configuration toggles default to enabled and honor explicit category, item, CLI, and recommendation disables
- full quality orders phases, groups suites, de-duplicates invocations, and continues after a failing test
- full quality nests dead-code safe fixes and verification under static quality
- full quality keeps the supplemental TypeScript project check when extensions have no roots
- createQualityAnalysis caches all selected source text and only creates AST entries for JavaScript/TypeScript files
- runFormatter supports legacy and typed invocation forms, ignores Astro targets, and batches large scopes
- runFormatter divides large source arguments into bounded subprocess batches
- runTypecheck honors custom command ownership and does not invoke it for a scoped file-only request
- CLI domain dispatch runs enabled commands, skips disabled commands, and rejects unknown domains
- runQualityFromCfg loads JSON and reaches the same explicit domain boundary as an in-memory configuration
- runQuality honors disabled findings categories without leaking a failure status
- quality autofix fills missing TSDoc tags then reports blank prose for agent assistance
- CLI lint applies its autofix policy while the Knip audit remains read-only
- CLI lint updates progress after each ten-file ESLint batch
- quality:all reports duplicate imports read-only and consolidates them idempotently in autofix mode
- full quality routes unused-variable findings through dead-code once and honors the manual warning policy
- the fixing quality command inlines safe values without broad comment cleanup
- dead-code reports private unused functions and removes only the proven declaration
- dead-code scans the full scope once and applies same-file fixes before rescanning only changed files
- dead-code runs only the configured unused-variable rule through the local flat-config API
- dead-code CLI fails read-only for safe single-use fixes, then inlines the primitive value
- dead-code warn preview copies formatter and browser-test configs before comparing Knip findings
- dead-code CLI reports detached TSDoc as a read-only, actionable warning when configured
- dead-code removes unused private type declarations with their attached TSDoc
- dead-code removes inert unused values and reports effectful initializers as configurable agent warnings
- dead-code never removes an exported function because one nested callback parameter is unused
- dead-code fails closed when ESLint returns malformed detector output
- dead-code accepts complete ESLint reports larger than the default subprocess buffer
- dead-code retains private Knip exports beside named framework entry exports
- dead-code reports a contradictory Knip result as a non-blocking actionable warning
- dead-code warn reports manual findings with explicit autofix status and makes no source edits
- dead-code reports Astro-consumed exports when Knip disagrees without modifying them
- read-only dead-code preview copies shared support modules outside configured source roots
- dead-code reports an exported ESLint location as manual after Knip rewrites its sibling export
- dead-code passes a discovered TypeScript flat ESLint config explicitly
- dead-code preserves Astro frontmatter consumers resolved through configured TypeScript aliases
- dead-code removes only proven unused export modifiers and preserves framework contracts
- dead-code keeps an unreachable source file for explicit agent review
- dead-code preserves safe file-local fixes when TypeScript rejects another source file
- dead-code fails closed when Knip exits unsuccessfully with an empty inventory
- dead-code validates the full Knip inventory before changing any export
- dead-code fails closed when ESLint omits a configured source file
- CLI recommendation execution is opt-in per invocation and recommendation failures remain non-blocking
- CLI UI-pattern dispatch reports findings through the process exit status
- quality CLI checks and autofixes Tailwind canonical-class suggestions

### Reports (14)

#### `github-report.test.mjs` (3)

- GitHub report classifies open issues and security alerts without exposing secret values
- GitHub report keeps unavailable alert counts unknown instead of reporting zero
- github CLI writes the analytics stage and agent instructions to the quality JSON report

#### `history-report.test.mjs` (4)

- full snapshots include dates, source totals, and source-only changes across renames
- history scope includes tests and excludes generated, vendor, documentation, dependency, build and configuration files
- push deltas contain commits after the supplied base and the CLI writes schema version 1
- merge commits count source changes against their first parent

#### `node-reporter.test.mjs` (5)

- Node reporter reports nested cases once and ignores suite and child output events
- Node reporter renders an empty-run bar through the shared progress helper
- Node reporter tracks concurrent, late-discovered cases and file-scoped IDs on one bar
- Node reporter options replace inherited reporters and preserve unrelated runtime flags
- Node reporter ignores reporter API context values that are not progress writers

#### `playwright-reporter.test.mjs` (2)

- Playwright reporter counts retries once and writes terminal results in discovery order
- Playwright reporter handles an empty discovery set
