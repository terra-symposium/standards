/**
 * packages/error-boundaries/src/lib/report.ts
 */
/**
 * Structured client-side failure reporting shared by React and Astro boundaries.
 */

export type BoundaryReport = { site: string; delivery?: 'email'; category: 'render'; component: string; route: string; message: string; stack?: string };

/**
 * Receiver address, site identifier, and optional delivery method for boundary reports.
 */
export type BoundaryReportingConfig = { endpoint: string; site: string; delivery?: 'http' | 'email' };

declare global {
	/**
	 * Browser window carrying the host's boundary reporting configuration.
	 */
	interface Window {
		/**
		 * Reporting configuration installed before hydration by the host application.
		 */
		__terraBoundaryReporting?: BoundaryReportingConfig;
	}
}

/**
 * Sends a render failure to the host application's configured receiver.
 *
 * @param err Caught render failure or other thrown value.
 * @param comp Name of the component that failed.
 *
 * @return Whether the receiver accepted the report.
 */
export async function reportBoundaryError(err: unknown, comp: string): Promise<boolean> {
	if (typeof window === 'undefined') return false;
	const config = window.__terraBoundaryReporting;
	if (!config?.endpoint || !config.site) return false;
	const detail = err instanceof Error ? err : new Error(String(err ?? 'Unknown error'));
	try {
		return (
			await fetch(config.endpoint, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					site: config.site,
					category: 'render',
					component: comp,
					route: window.location.pathname,
					message: detail.message.slice(0, 500),
					...(config.delivery === 'email' ? { delivery: 'email' as const } : {}),
					...(detail.stack ? { stack: detail.stack.slice(0, 4000) } : {}),
				} satisfies BoundaryReport),
				keepalive: true,
			})
		).ok;
	} catch {
		return false;
	}
}
