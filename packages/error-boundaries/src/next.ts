/**
 * packages/error-boundaries/src/next.ts
 * Shared error helpers for Next.js route boundaries.
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Helpers for reporting framework-generated Next.js route errors safely. */
export type NextRouteError = Error & { digest?: string };
/** Next.js route error shape with its optional framework digest. */
export type NextRouteErrorProps = { error: NextRouteError; reset: () => void };

/*//////////////////////////////////////////////////
FUNCTIONS
//////////////////////////////////////////////////*/

/**
 * Returns the framework-provided digest without exposing an error message as a public identifier.
 *
 * @param err Route error whose framework digest should be exposed.
 *
 * @return Framework digest when available, or `undefined` when absent.
 */
export function errorDigest(err: NextRouteError): string | undefined {
	return err.digest;
}
