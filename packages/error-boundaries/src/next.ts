/**
 * packages/error-boundaries/src/next.ts
 */

export type NextRouteError = Error & { digest?: string };

export type NextRouteErrorProps = {
	error: NextRouteError;
	reset: () => void;
};

/** Returns the framework-provided digest without exposing an error message as a public identifier. */
export function errorDigest(err: NextRouteError): string | undefined {
	return err.digest;
}
