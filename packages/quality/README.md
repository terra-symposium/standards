# Quality

One package for Terra's repository checks, safe autofixes, focused APIs, and quality reports.

## What it does

`@terra-symposium/quality` runs configured source checks, installed tools, and repository-specific static commands in a fixed order. It scans changed and untracked files by default or the full configured scope with `--all`. Normal runs apply supported safe fixes; `--warn` is read-only. Remaining findings fail the command.

The package combines the former aggregate, core, reports, and focused check packages. Builds and functional tests remain separate commands in each consuming repository.

## Prerequisites

Node.js `>=18.18`. Install any enabled external tools, such as Prettier, ESLint, Knip, or TypeScript, in the consuming repository and keep their native configuration there.

## Get started

```sh
pnpm add -D @terra-symposium/quality
```

Create `quality.json` at the repository root. A file at `config/quality.json` is also discovered:

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

Run the changed-file workflow, then review its edits:

```sh
pnpm exec terra-quality
git diff --check
git diff
```

## Usage

| Command                                        | Scope                       | Writes safe fixes? |
| ---------------------------------------------- | --------------------------- | ------------------ |
| `pnpm exec terra-quality`                      | Changed and untracked files | Yes                |
| `pnpm exec terra-quality quality --all`        | Full configured scope       | Yes                |
| `pnpm exec terra-quality quality --all --warn` | Full configured scope       | No                 |

Focused capabilities are API subpaths of the same installation:

| Import                                   | Responsibility                              | CLI bin                 |
| ---------------------------------------- | ------------------------------------------- | ----------------------- |
| `@terra-symposium/quality/core`          | Shared config, source scope, and contracts  | API only                |
| `@terra-symposium/quality/documentation` | JSDoc, TSDoc, Doxygen, and command examples | `terra-documentation`   |
| `@terra-symposium/quality/formatting`    | Source layout and Prettier integration      | `terra-formatting`      |
| `@terra-symposium/quality/imports`       | Import resolution and duplicates            | `terra-imports`         |
| `@terra-symposium/quality/languages`     | Optional C, Java, and Python profiles       | `terra-language-checks` |
| `@terra-symposium/quality/naming`        | Identifier and alias naming                 | `terra-naming`          |
| `@terra-symposium/quality/patterns`      | Performance and repository patterns         | `terra-patterns`        |
| `@terra-symposium/quality/refactoring`   | Forwarding, single-use, and dead code       | `terra-refactoring`     |
| `@terra-symposium/quality/reports`       | GitHub and history reports, test reporters  | `terra-quality-reports` |
| `@terra-symposium/quality/security`      | Source-security findings                    | `terra-security`        |
| `@terra-symposium/quality/ui`            | Accessibility, display names, and UI rules  | `terra-ui-quality`      |

The root also exports compatibility entry points, including `/cli`, `/object-forwarding`, `/single-use`, and `/port`. All published subpaths have TypeScript declarations. The package installs the `terra-quality` and `terra-quality-dev` bins alongside the focused bins.

## Configuration and security

`quality.json` selects source roots, extensions, checks, autofixes, tool paths, and repository commands. The installed `quality.schema.json` validates it. Put static checks with no native equivalent in `qualityCommands`; keep builds, tests, browser work, and example execution in separate scripts. Never put credentials or secret values in the config or Quality reports.

For a declaration whose identity, evaluation timing, or saved state must remain, place `// terra-quality-ignore single-use -- <concrete reason>` immediately before that declaration or its attached TSDoc. It exempts only that declaration's single-use finding; missing or detached reasons fail Quality. Other checks remain active.

The React and Astro error-boundary check is mandatory. React runtime integrations import `@terra-symposium/boundaries/react`.

## Development and structure

`src/capabilities/` owns the focused checks and shared core; `src/lib/` owns aggregate orchestration and compatibility exports. The runner uses a shared classifier for generated output, dependency trees, minified bundles, and archived prose payloads, including when invoking Knip. It does not treat Markdown or JSON as JavaScript or TypeScript source.

`terra-quality-dev` acquires a local development port before starting a configured server. It may terminate an existing listener on that port, so use it only for ports owned by the local development workflow.

## Validation

From the Standards repository root:

```sh
pnpm --filter @terra-symposium/quality build
pnpm --filter @terra-symposium/quality test
pnpm --filter @terra-symposium/quality quality:all
```

In a consumer, run `quality:all`, its build, and its functional tests separately. Review autofix diffs before committing. A green Quality run establishes that configured static checks passed; it does not prove runtime behavior or visual quality.

## Deployment and operations

Publish through the Standards Changesets workflow. Inspect the packed tarball, exported subpaths, declarations, bins, and schema before release. Existing `standards-*` package identities are deprecated; use the [migration guide](../../docs/quality/5-operations/migration.mdx) to choose the corresponding subpath.

## Data, privacy, and limitations

The optional GitHub report is read-only and requires authenticated GitHub CLI access. Unavailable endpoints are reported as unknown, never as zero findings. Source checks cannot prove application security or replace browser, integration, and domain tests. Performance-pattern findings are advisory and require measurement before changing an algorithm.

## References

See the [setup and configuration guide](../../docs/quality/0-getting-started/overview.mdx), [package map](../../docs/quality/1-packages/package-map.mdx), [check reference](../../docs/quality/3-checks/check-reference.mdx), and [troubleshooting](../../docs/quality/5-operations/troubleshooting.mdx).

## Contributing

Add focused positive and negative fixtures for a new check or transform. Preserve source syntax and rollback behavior, document the public contract, and add a Changeset for a published change. See the [test README](tests/README.md).

## Credits and license

Maintained by Terra Symposium. See the repository [LICENSE](../../LICENSE).
