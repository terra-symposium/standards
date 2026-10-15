# @terra-symposium/standards-error-boundaries

Reusable React error boundaries and small Astro and Next.js error helpers for Terra Symposium applications.

## Install

```sh
pnpm add @terra-symposium/standards-error-boundaries
```

React and React DOM `>=18` are peer dependencies.

## Catch React render failures

```tsx
import { ErrorBoundary } from '@terra-symposium/standards-error-boundaries/react';

<ErrorBoundary name="Account panel" fallback={() => <section role="alert">Account details are unavailable.</section>} onError={(error, context) => reportError(error, context)} resetKey={accountId}>
	<AccountPanel accountId={accountId} />
</ErrorBoundary>;
```

The boundary also has a generic alert fallback when `fallback` is omitted. `withErrorBoundary(Component, name, onError?)` provides a wrapper for components.

React boundaries catch errors in descendant constructors, lifecycle methods, and rendering. They do not handle event handlers, most asynchronous callbacks, server-rendering failures, or errors thrown by the boundary itself. Applications own recovery UI, retry policy, and error reporting. See [React's error-boundary reference](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) for details.

## Other entry points

- `@terra-symposium/standards-error-boundaries/astro` exports status-copy helpers for 400, 401, 403, 404, 500, 502, and 503 responses.
- `@terra-symposium/standards-error-boundaries/next` exports types and `errorDigest(error)` for framework-provided route-error digests.
- The package root re-exports all entry-point APIs.

See the [package guide](https://standards-docs.netlify.app/packages/error-boundaries/) for prop behavior and usage details.
