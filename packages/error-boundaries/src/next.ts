/**
 * packages/error-boundaries/src/next.ts
 * Shared error helpers for Next.js route boundaries.
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Next.js route error with the optional framework-provided diagnostic digest. */
export type NextRouteError = Error & { digest?: string };
/** Props used by a Next.js route error component that can retry rendering. */
export type NextRouteErrorProps = { error: NextRouteError; reset: () => void };

/*//////////////////////////////////////////////////
FUNCTIONS
//////////////////////////////////////////////////*/

/**
 * Returns the framework-provided digest without exposing an error message as a public identifier.
 *
 * @param err Route error whose framework digest should be read.
 *
 * @return The framework digest, when present, without exposing the error message.
 */
export function errorDigest(err: NextRouteError): string | undefined {
	return err.digest;
}
