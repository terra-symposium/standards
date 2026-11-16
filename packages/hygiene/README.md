# Quality

Quality helps teams find and safely fix problems in their source code.

## Get started

Use Node.js 18.18 or later. Install the package and create a `quality.json` at the repository root (or under `config/`):

```sh
pnpm add -D @terra-symposium/hygiene
```

```json
{
	"$schema": "./node_modules/@terra-symposium/hygiene/quality.schema.json",
	"sourceRoots": ["src"],
	"extensions": [".js", ".jsx", ".ts", ".tsx"],
	"enabledChecks": { "format": false, "lint": false, "knip": false, "dead-code": false }
}
```

Enable external checks after installing and configuring their native tools in the consuming repository. Run Quality, then review any edits:

```sh
pnpm exec hygiene
git diff --check
git diff
```

## Usage

| Command                                        | Scope                       | Writes fixes? |
| ---------------------------------------------- | --------------------------- | ------------- |
| `pnpm exec hygiene`                      | Changed and untracked files | Yes           |
| `pnpm exec hygiene quality --all`        | All configured files        | Yes           |
| `pnpm exec hygiene quality --all --warn` | All configured files        | No            |

The package exports focused APIs under `/core`, `/reports`, `/ui`, `/languages`, `/documentation`, `/formatting`, `/imports`, `/naming`, `/patterns`, `/refactoring`, and `/security`. See the [package map](../../docs/hygiene/1-packages/package-map.mdx) for contracts and CLI bins.

## Configuration

`quality.json` selects source roots, checks, autofixes, tools, and repository-owned static commands. Keep builds and functional tests in separate scripts. Put secrets in the consuming environment, never in config or Quality reports. The React and Astro error-boundary check is mandatory.

For a specific declaration whose identity or evaluation order must remain, place a `// hygiene-ignore single-use -- <concrete reason>` comment immediately before it or its TSDoc. The exemption applies only to that declaration's single-use finding.

## Validation

| Command                | Checks                        |
| ---------------------- | ----------------------------- |
| `pnpm run quality:all` | Full configured Quality scope |
| `pnpm run test`        | Unit or project tests         |
| `pnpm run build`       | Build output                  |

Quality can apply safe fixes; review the diff before committing. No separate browser or Playwright test command is defined here.

## Contributing

`src/capabilities/` owns focused checks and core utilities; `src/lib/` owns aggregate orchestration. Add positive and negative fixtures for transforms, verify syntax and rollback behavior, and review autofix diffs. Published changes need a Changeset.

Open changes through the repository pull-request workflow; see the [root README](../../README.md).

## Documentation

- [Setup and configuration](../../docs/hygiene/0-getting-started/overview.mdx)
- [Check reference](../../docs/hygiene/3-checks/check-reference.mdx)
- [Migration from former packages](../../docs/hygiene/5-operations/migration.mdx)
- [Troubleshooting](../../docs/hygiene/5-operations/troubleshooting.mdx)

## License

See the repository [LICENSE](../../LICENSE).
