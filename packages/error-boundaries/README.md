# Boundaries

Reusable React error boundaries and Astro and Next.js error helpers for Terra applications.

## What it does

The package exports a React render boundary, an Astro island hydration fallback, status-page copy, and a Next.js route-error digest helper. Applications own their fallback UI, telemetry, routing, and retry policy.

## Prerequisites

React and React DOM `>=18` are peer dependencies when using the React boundary.

## Get started

```sh
pnpm add @terra-symposium/boundaries
```

## Usage

Import the entry point for your framework:

```tsx
import { ErrorBoundary } from '@terra-symposium/boundaries/react';
```

```astro
---
import AstroErrorBoundary from '@terra-symposium/boundaries/astro-boundary';
---

<AstroErrorBoundary title="Workspace unavailable" description="Reload to try again.">
  <Workspace client:load />
</AstroErrorBoundary>
```

`/astro` supplies status copy for 400, 401, 403, 404, 500, 502, and 503 responses. `/next` supplies `errorDigest(error)` and route-error types. `/astro-integration` supplies the Astro integration. The package root re-exports the public APIs.

## Configuration and security

Choose fallback text and telemetry in the consuming application. Keep private error details out of user-visible fallback content.

## Development and structure

`src/components/` contains the React and Astro boundaries; `src/lib/` contains framework helpers. From the Standards repository root, install workspace dependencies before changing the package.

## Validation

```sh
pnpm --filter @terra-symposium/boundaries build
pnpm --filter @terra-symposium/boundaries test
pnpm --filter @terra-symposium/boundaries quality:all
```

## Deployment and operations

The package is published through the Standards Changesets release workflow. Applications deploy their own error pages and telemetry.

## Data, privacy, and limitations

The Astro wrapper reacts to `astro:hydration-error` after HTML has reached the browser. It cannot display a fallback for a server failure before HTML is sent. The package does not transmit telemetry.

## References

See the [boundary guide](../../docs/error-boundaries/1-react/react-boundaries.mdx) and [package API](../../docs/error-boundaries/4-packages/package-api.mdx).

## Contributing

Update the public API guide and tests when changing a framework adapter. Add a Changeset for a published behavior change.

## Credits and license

Maintained by Terra Symposium. See the repository [LICENSE](../../LICENSE).
