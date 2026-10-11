/**
 * packages/error-boundaries/src/next.ts
 * Shared error helpers for Next.js route boundaries.
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * Handles next route error for the quality tooling.
 * Describes the next route error data used by the quality tooling.
 */
export type NextRouteError = Error & { digest?: string };
/**
 * Handles next route error props for the quality tooling.
 * Describes the next route error props data used by the quality tooling.
 */
export type NextRouteErrorProps = { error: NextRouteError; reset: () => void };

/*//////////////////////////////////////////////////
FUNCTIONS
//////////////////////////////////////////////////*/

/**
 * Returns the framework-provided digest without exposing an error message as a public identifier.
 *
 * @param err Error value caught by the boundary handler.
 *
 * @return The errordigest result used by the caller.
 */
export function errorDigest(err: NextRouteError): string | undefined {
	return err.digest;
}
