# Quality package test contract

The tests in this directory exercise the public package boundary from
`dist/index.js` and use isolated temporary repositories. They do not depend on
the Standards checkout, installed application dependencies, or the current
Git worktree. Command-oriented checks use executable fixtures that record their
arguments, so formatter, linter, Knip, typecheck, recommendation, and domain
dispatch behavior can be verified without running those tools.

## Coverage contract

| Area | Contract covered |
| --- | --- |
| File discovery | Nested and additional roots, direct files, missing roots, extension and directory exclusions, cache behavior, changed/untracked/deleted/ignored Git files, and path utilities. |
| Import validation | Relative, aliased, extensionless, index, asset, export, dynamic, CommonJS, external, unsupported-extension, and missing-target imports. |
| Documentation | Required declaration policies, exported and inline functions, missing meaningful summaries and tags, optional tags, BOM/shebang headers, scaffold insertion, idempotence, section maintenance, import grouping, whitespace normalization, and long-import protection. |
| Naming and aliases | Tokenisation, compound and inflected replacements, semantic callback initials, reservation conflicts, protected framework paths and identifiers, scope/collision safety, public contracts, stable local aliases, mutable/property/element snapshot boundaries, shadow-safe shorthand replacement, generic aliases, import repair, autofix, and idempotence. |
| Formatting transforms | JavaScript-family parsing, JSX/comment/string/regex safety, CRLF handling, nested and multi-statement conditionals, object/type collapsing, unsupported files, Prettier modes, Astro filtering, and argument batching. |
| Forwarding and patterns | Object-forwarding thresholds and ignored payload methods, repeated class normalization and exclusions, UI pattern scope, regex literal/constructor deduplication, and Tailwind v4/v3/configuration/fix paths. |
| Security | Environment visibility, forbidden terms/import forms, client secret-shaped values, dotenv loading, runtime environment boundaries, and Git-tracked visibility. |
| GitHub reporting | Read-only issue and pull request counts, Dependabot and malware alerts, code/secret scanning alerts, settings/config state, null counts for unavailable endpoints, secret-value exclusion, and agent remediation instructions. |
| Single-use analysis | Pure-data/runtime/callable/large-value classification, exact consumer counts, type consumers, include roots, cross-file type inlining, selective import editing, no-op safety, and JSON/Markdown reports. |
| Runner and ports | Configuration normalization/loading, toggles, shared analysis, CLI domains, explicit commands, lint/Knip flags, recommendation policy, typecheck ownership, status propagation, formatter batching, generic check dispatch, and port acquisition/termination. |

## Fixture rules

- Every test creates a unique fixture with `fixtureRoot` and writes only beneath
  that fixture.
- Tests that intentionally set `process.exitCode` restore it with
  `resetExitCode` before returning.
- Tool behavior is asserted from recorded argument vectors and marker files,
  not from implementation details of the real tool.
- Autofixes are asserted for both their resulting text and their second-run
  no-op behavior where the operation is intended to be idempotent.
- Documentation tests distinguish structural scaffolding from prose: the
  package may insert blank TSDoc tags, but it must never generate descriptions.

Run the complete package suite from this package directory with:

```sh
pnpm build
pnpm test
```

The build is required first because tests intentionally exercise the published
`dist` entrypoint rather than importing private source modules.
