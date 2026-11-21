#!/usr/bin/env node

/**
 * packages/hygiene/src/capabilities/formatting/cli.ts
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/hygiene/core';
import { runFormatting } from './index.js';
runCapabilityCli('formatting', (c, o) => {
	if (!capabilityCheckEnabled(c, 'format')) return;
	const status = runFormatting(c, { fix: capabilityAutofixEnabled(c, 'format', o.fix) });
	if (status) process.exitCode = status;
});
