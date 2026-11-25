#!/usr/bin/env node

/**
 * packages/hygiene/src/capabilities/documentation/cli.ts
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/hygiene/core';
import { documentationFindings, documentedCommandFindings, fixDocumentedCommands } from './index.js';
runCapabilityCli('documentation', (c, o) => {
	const cmdsEnabled = capabilityCheckEnabled(c, 'documented-commands');
	if (cmdsEnabled && capabilityAutofixEnabled(c, 'documentedCommands', o.fix) && c.documentation?.commandRoots?.length) fixDocumentedCommands(c);
	return [...(capabilityCheckEnabled(c, 'document') ? documentationFindings(c) : []), ...(cmdsEnabled && c.documentation?.commandRoots?.length ? documentedCommandFindings(c) : [])];
});
