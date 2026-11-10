# Error Boundaries

Shared error-page copy and adapters for React, Next.js route boundaries, and Astro status responses.

## What it does

Not applicable.

## Prerequisites

Not applicable.

## Get started

### Install
```sh
pnpm add @terra-symposium/standards-error-boundaries
```

From `standards/main/`, run `pnpm install`, then `pnpm --filter @terra-symposium/standards-error-boundaries build`. Validate adapter changes with `pnpm --filter @terra-symposium/standards-error-boundaries test`.

## Usage

### Catch React render failures
```tsx
import { ErrorBoundary } from '@terra-symposium/standards-error-boundaries/react';

## Structure

- See [src](src/), [package.json](package.json), and `test/`.

## References

### Catch Astro island hydration failures
Wrap hydrated islands in the shared Astro boundary to show a static fallback if a client module fails before React can render:

```astro
---
import AstroErrorBoundary from '@terra-symposium/standards-error-boundaries/astro-boundary';
---

<AstroErrorBoundary title="Workspace unavailable" description="Reload to try the workspace again.">
	<Workspace client:load />
</AstroErrorBoundary>
```

The Astro wrapper listens for Astro's cancelable `astro:hydration-error` event and reveals its fallback without depending on the failed island's JavaScript. It complements the React `ErrorBoundary`; it cannot render a fallback if the server fails before sending HTML.

### Other entry points

`@terra-symposium/standards-error-boundaries/astro` exports status-copy helpers for 400, 401, 403,
404, 500, 502, and 503 responses.

`@terra-symposium/standards-error-boundaries/astro-boundary` exports the reusable static Astro
island guard.

`@terra-symposium/standards-error-boundaries/next` exports types and `errorDigest(error)` for
framework-provided route-error digests.

- The package root re-exports all entry-point APIs.

See the [package guide](https://standards-docs.netlify.app/packages/error-boundaries/) for prop behavior and usage details.

## Configuration and security

Not applicable.

## Development and structure

Not applicable.

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
