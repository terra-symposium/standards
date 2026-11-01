/**
 * packages/error-boundaries/src/lib/astro-integration.ts
 * Installs a visible page-local fallback for Astro island hydration failures.
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const HYDRATION_FALLBACK = `(() => {
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
	});
})();`;

/*//////////////////////////////////////////////////
FUNCTIONS
//////////////////////////////////////////////////*/

/**
 * Adds a shared accessible fallback before Astro starts hydrating any page islands.
 *
 * @return An Astro integration that handles each failed island without replacing the page.
 */
export function terraErrorBoundaryIntegration() {
	return {
		name: '@terra-symposium/standards-error-boundaries',
		hooks: {
			'astro:config:setup': ({ injectScript }: { injectScript: (stage: 'before-hydration', content: string) => void }) => {
				injectScript('before-hydration', HYDRATION_FALLBACK);
			},
		},
	};
}
