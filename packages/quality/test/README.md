# Quality Package Tests

Node test fixtures for the quality package’s checks, reports, runner, and source transforms. These are package tests, not the Standards-wide test manifest.

## Getting started

### Commands

From `standards/main/`, run `pnpm --filter @terra-symposium/standards-quality test` to validate quality package tests.

## Security and Limitations

- Fixtures should not contain credentials or private data.

## Structure

`checks/`, `reports/`, `runner/`, and `transforms/` group focused Node tests; `source-automation.test.mjs` covers source automation.

## References

See the parent [quality package guide](../README.md) and its [test directories](.).

## Contributing

Keep each fixture focused on the behavior under test and avoid private or credential-like values.

## Credits and license

No test-area license is declared; consult maintainers before redistributing tests or fixtures.
