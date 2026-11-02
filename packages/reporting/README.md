# Reporting

Reusable Playwright evidence reporting: normalizes test results, viewport data, and load grades, then writes spreadsheet and slideshow artifacts.

## Getting started

### Commands

From `standards/main/`, run `pnpm install`, then `pnpm --filter @terra-symposium/standards-reporting test` to validate the reporting package.

## Security and Limitations

Reports and generated spreadsheets can contain test evidence. Use synthetic fixtures and exclude credentials, personal data, and private customer content.

## Structure

`src/` exports reporting helpers; `test/` covers the API; `.agents/skills/` contains maintainer guidance. The package depends on Playwright and Office artifact libraries.

## References

See the [public exports](src/index.ts), [package manifest](package.json), and [tests](test/).

## Contributing

Add tests for reporting changes and document user-facing changes in [CHANGELOG.md](CHANGELOG.md).

## Credits and license

The package manifest does not declare a license and the repository has no root license; ask maintainers before reuse.
