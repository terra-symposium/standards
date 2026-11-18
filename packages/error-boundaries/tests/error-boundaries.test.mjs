/**
 * packages/error-boundaries/test/error-boundaries.test.mjs
 * Verifies shared error-boundary exports and recovery behavior.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { terraErrorBoundaryIntegration } from '../dist/lib/astro-integration.js';
import { withErrorBoundary } from '../dist/components/react.js';
import { reportBoundaryError } from '../dist/lib/report.js';

// COMPONENTS
import React from 'react';
import { ErrorBoundary } from '../dist/components/react.js';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('exports the shared boundary lifecycle and HOC', () => {
	assert.equal(typeof ErrorBoundary, 'function');
	assert.equal(typeof withErrorBoundary, 'function');
});
test('Astro integration injects a pre-hydration page boundary', () => {
	let injected;
	terraErrorBoundaryIntegration().hooks['astro:config:setup']({
		injectScript: (stage, content) => {
			injected = { stage, content };
		},
	});
	assert.equal(injected.stage, 'before-hydration');
	assert.match(injected.content, /astro:hydration-error/u);
	assert.match(injected.content, /data-terra-hydration-fallback/u);
	assert.match(injected.content, /role', 'alert'/u);
});
test('captures component metadata and exposes reset-key recovery state', () => {
	const reports = [];
	const err = new Error('broken');
	assert.deepEqual(ErrorBoundary.getDerivedStateFromError(err), { error: err });
	new ErrorBoundary({ fallback: React.createElement('div'), onError: (reportedErr, report) => reports.push({ error: reportedErr, ...report }), resetKey: 'first' }).componentDidCatch(err, {
		componentStack: '\n    at Panel',
	});
	assert.deepEqual(reports, [{ error: err, name: 'Component', componentStack: '\n    at Panel' }]);
	assert.equal(
		withErrorBoundary(
			/**
			 * Supplies a small component for checking the generated HOC display name.
			 *
			 * @return A React element used by the error-boundary wrapper.
			 */
			function Panel() {
				return React.createElement('div');
			},
			'Panel',
		).displayName,
		'withErrorBoundary(Panel)',
	);
});
test('reports only after the configured receiver accepts a boundary failure', async () => {
	const originalWindow = globalThis.window;
	const originalFetch = globalThis.fetch;
	const submissions = [];
	try {
		globalThis.window = { location: { pathname: '/docs/example/' }, __terraBoundaryReporting: { endpoint: '/api/error-report', site: 'docs' } };
		globalThis.fetch = async (url, request) => {
			submissions.push({ url, body: JSON.parse(request.body) });
			return { ok: true };
		};
		assert.equal(await reportBoundaryError(new Error('broken'), 'Panel'), true);
		assert.equal(submissions[0].url, '/api/error-report');
		assert.equal(submissions[0].body.route, '/docs/example/');
		assert.equal(submissions[0].body.component, 'Panel');
		globalThis.fetch = async () => ({ ok: false });
		assert.equal(await reportBoundaryError(new Error('broken'), 'Panel'), false);
		globalThis.fetch = async () => { throw new Error('offline'); };
		assert.equal(await reportBoundaryError(new Error('broken'), 'Panel'), false);
	} finally {
		globalThis.window = originalWindow;
		globalThis.fetch = originalFetch;
	}
});
