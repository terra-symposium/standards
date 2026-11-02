# Error Boundaries

Shared error-page copy and adapters for React, Next.js route boundaries, and Astro status responses.

## Getting started

### Commands

From `standards/main/`, run `pnpm install`, then `pnpm --filter @terra-symposium/standards-error-boundaries build`. Validate adapter changes with `pnpm --filter @terra-symposium/standards-error-boundaries test`.

## Security and Limitations

These helpers provide copy and adapter components; framework routing and error lifecycle behavior remain the host app’s responsibility.

## Structure

- See [src](src/), [package.json](package.json), and `test/`.

## References

See the [public exports](src/index.ts), [manifest](package.json), and [adapter tests](test/).

## Contributing

Add regression coverage for each affected framework adapter under `test/`.

## Credits and license

No package license is declared in its manifest and no root license is present; ask maintainers before reuse.
