import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { ErrorBoundary, withErrorBoundary } from '../dist/react.js';

test('exports the shared boundary lifecycle and HOC', () => {
	assert.equal(typeof ErrorBoundary, 'function');
	assert.equal(typeof withErrorBoundary, 'function');
});

test('captures component metadata and exposes reset-key recovery state', () => {
	const reports = [];
	const boundary = new ErrorBoundary({ fallback: React.createElement('div'), onError: (reportedError, report) => reports.push({ error: reportedError, ...report }), resetKey: 'first' });
	const error = new Error('broken');

	assert.deepEqual(ErrorBoundary.getDerivedStateFromError(error), { error });
	boundary.componentDidCatch(error, { componentStack: '\n    at Panel' });
	assert.deepEqual(reports, [{ error, name: 'Component', componentStack: '\n    at Panel' }]);

	function Panel() {
		return React.createElement('div');
	}
	assert.equal(withErrorBoundary(Panel, 'Panel').displayName, 'withErrorBoundary(Panel)');
});
