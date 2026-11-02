# Standards Quality Package

TypeScript quality tooling for repository checks, source maintenance transforms, and report generation. The JSON schema defines its configuration contract.

## Getting started

### Commands

From `standards/main/`, run `pnpm install`, then `pnpm --filter @terra-symposium/standards-quality test` for package tests or `pnpm quality` for the repository quality workflow.

## Security and Limitations

Some transforms write source files. Review proposed edits before applying them and use package fixtures to pin each rule’s intended behavior.

## Structure

`src/` contains the CLI, checks, and transforms; `quality.schema.json` defines config; `quality-configs/` holds presets; `test/` covers checks and reports.

## References

See the [quality schema](quality.schema.json), [package manifest](package.json), and [package tests](test/).

## Contributing

Add focused fixtures and tests for each new rule or transform; record user-facing changes in [CHANGELOG.md](CHANGELOG.md).

## Credits and license

The package manifest does not declare a license and the repository has no root license; ask maintainers before reuse.
