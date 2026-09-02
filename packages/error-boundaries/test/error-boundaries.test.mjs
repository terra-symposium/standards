import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { ErrorBoundary, withErrorBoundary } from '../dist/react.js';

test('exports the shared boundary lifecycle and HOC', () => {
	assert.equal(typeof ErrorBoundary, 'function');
	assert.equal(typeof withErrorBoundary, 'function');
});
