/**
 * packages/error-boundaries/src/next.ts
 * Shared error helpers for Next.js route boundaries.
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type NextRouteError = Error & { digest?: string };
export type NextRouteErrorProps = { error: NextRouteError; reset: () => void };

/*//////////////////////////////////////////////////
FUNCTIONS
//////////////////////////////////////////////////*/

/** Returns the framework-provided digest without exposing an error message as a public identifier. */
export function errorDigest(err: NextRouteError): string | undefined {
	return err.digest;
}
