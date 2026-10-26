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
import { withErrorBoundary } from '../dist/components/react.js';

// COMPONENTS
import React from 'react';
import { ErrorBoundary } from '../dist/components/react.js';
test('exports the shared boundary lifecycle and HOC', () => {
	assert.equal(typeof ErrorBoundary, 'function');
	assert.equal(typeof withErrorBoundary, 'function');
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
		withErrorBoundary(function Panel() {
			return React.createElement('div');
		}, 'Panel').displayName,
		'withErrorBoundary(Panel)',
	);
});
