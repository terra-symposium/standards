# Boundaries

Boundaries helps applications recover gracefully when a screen fails to render.

The package exports a React render boundary, an Astro island hydration fallback, status-page copy, and a Next.js route-error digest helper. Applications own their fallback UI, telemetry, routing, and retry policy.

## Get started

React and React DOM `>=18` are peer dependencies when using the React boundary.

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

<AstroErrorBoundary title='Workspace unavailable' description='Reload to try again.'>
	<Workspace client:load />
</AstroErrorBoundary>
```

`/astro` supplies status copy for 400, 401, 403, 404, 500, 502, and 503 responses. `/next` supplies `errorDigest(error)` and route-error types. `/astro-integration` supplies the Astro integration. The package root re-exports the public APIs.

## Configuration

Choose fallback text and telemetry in the consuming application. Keep private error details out of user-visible fallback content.

## Validation

| Command                | Checks                        |
| ---------------------- | ----------------------------- |
| `pnpm run quality:all` | Full configured Quality scope |
| `pnpm run test`        | Unit or project tests         |
| `pnpm run build`       | Build output                  |

Quality can apply safe fixes; review the diff before committing. No separate browser or Playwright test command is defined here.

## Contributing

`src/components/` contains the React and Astro boundaries; `src/lib/` contains framework helpers. From the Standards repository root, install workspace dependencies before changing the package.

Update the public API guide and tests when changing a framework adapter. Add a Changeset for a published behavior change.

Open changes through the repository pull-request workflow; see the [root README](../../README.md).

## Documentation

The package is published through the Standards Changesets release workflow. Applications deploy their own error pages and telemetry.

The Astro wrapper reacts to `astro:hydration-error` after HTML has reached the browser. It cannot display a fallback for a server failure before HTML is sent. The package does not transmit telemetry.

See the [boundary guide](../../docs/error-boundaries/1-react/react-boundaries.mdx) and [package API](../../docs/error-boundaries/4-packages/package-api.mdx).

## License

Maintained by Terra Symposium. See the repository [LICENSE](../../LICENSE).
