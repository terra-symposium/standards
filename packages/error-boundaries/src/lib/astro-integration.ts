/**
 * packages/error-boundaries/src/lib/astro-integration.ts
 * Installs a visible page-local fallback for Astro island hydration failures.
 */

/*//////////////////////////////////////////////////
FUNCTIONS
//////////////////////////////////////////////////*/

/**
 * Adds a shared accessible fallback before Astro starts hydrating any page islands.
 *
 * @param reporting Optional endpoint and site used to report hydration failures.
 *
 * @return An Astro integration that handles each failed island without replacing the page.
 */
export function terraErrorBoundaryIntegration(reporting?: { endpoint: string; site: string; delivery?: 'http' | 'email' }) {
	if (reporting && (!reporting.endpoint || !reporting.site)) throw new Error('Error boundary reporting requires an endpoint and site.');
	return {
		name: '@terra-symposium/boundaries',
		hooks: {
			'astro:config:setup': ({ injectScript }: { injectScript: (stage: 'before-hydration', content: string) => void }) => {
				if (reporting) injectScript('before-hydration', `window.__terraBoundaryReporting = ${JSON.stringify(reporting)};`);
				injectScript(
					'before-hydration',
					`(() => {
	if (window.__terraHydrationBoundaryInstalled) return;
	window.__terraHydrationBoundaryInstalled = true;
	document.addEventListener('astro:hydration-error', (event) => {
		if (event.defaultPrevented) return;
		const island = event.target;
		if (!(island instanceof HTMLElement) || !island.isConnected) return;
		event.preventDefault();
		island.hidden = true;
		const fallback = document.createElement('section');
		fallback.setAttribute('role', 'alert');
		fallback.setAttribute('data-terra-hydration-fallback', '');
		fallback.style.cssText = 'box-sizing:border-box;max-width:42rem;margin:3rem auto;padding:1.5rem;color:var(--foreground,#171717);background:var(--background,#fff);border:1px solid var(--border,#d1d5db);border-radius:.75rem;font:inherit';
		const heading = document.createElement('h1');
		heading.textContent = 'Interactive section could not load';
		heading.style.cssText = 'margin:0 0 .5rem;font-size:1.25rem;font-weight:600';
		const message = document.createElement('p');
		message.textContent = 'The rest of this page is still available. Reload to try this section again.';
		const reload = document.createElement('a');
		reload.href = window.location.href;
		reload.textContent = 'Reload page';
		reload.style.cssText = 'color:var(--primary,#2563eb);text-decoration:underline;text-underline-offset:.2em';
		fallback.append(heading, message, reload);
		island.insertAdjacentElement('afterend', fallback);
		console.error('[Terra error boundary] island hydration failed', event.detail?.error);
		const config = window.__terraBoundaryReporting;
		if (config?.endpoint && config.site) {
			const error = event.detail?.error;
			void fetch(config.endpoint, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ site: config.site, ...(config.delivery === 'email' ? { delivery: 'email' } : {}), category: 'render', component: 'AstroIsland', route: location.pathname, message: String(error?.message ?? error ?? 'Hydration failed').slice(0, 500), stack: String(error?.stack ?? '').slice(0, 4000) }),
				keepalive: true,
			}).then((response) => {
				if (response.ok) message.textContent = 'The error was recorded. Reload to try this section again.';
			}).catch(() => {});
		}
	});
})();`,
				);
			},
		},
	};
}
