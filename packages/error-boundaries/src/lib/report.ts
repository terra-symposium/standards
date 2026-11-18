/** Structured client-side failure reporting shared by React and Astro boundaries. */

export type BoundaryReport = {
	site: string;
	delivery?: 'email';
	category: 'render';
	component: string;
	route: string;
	message: string;
	stack?: string;
};

export type BoundaryReportingConfig = { endpoint: string; site: string; delivery?: 'http' | 'email' };

declare global {
	interface Window {
		__terraBoundaryReporting?: BoundaryReportingConfig;
	}
}

/** Resolves only after the configured receiver has accepted the report. */
export async function reportBoundaryError(error: unknown, component: string): Promise<boolean> {
	if (typeof window === 'undefined') return false;
	const config = window.__terraBoundaryReporting;
	if (!config?.endpoint || !config.site) return false;
	const detail = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
	const report: BoundaryReport = {
		site: config.site,
		category: 'render',
		component,
		route: window.location.pathname,
		message: detail.message.slice(0, 500),
		...(config.delivery === 'email' ? { delivery: 'email' as const } : {}),
		...(detail.stack ? { stack: detail.stack.slice(0, 4000) } : {}),
	};
	try {
		const response = await fetch(config.endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(report),
			keepalive: true,
		});
		return response.ok;
	} catch {
		return false;
	}
}
