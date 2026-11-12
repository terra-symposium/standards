#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/standards-quality-core';
import { documentationFindings, documentedCommandFindings, fixDocumentedCommands } from './index.js';
runCapabilityCli('documentation', (c, o) => {
	const documentationEnabled = capabilityCheckEnabled(c, 'document');
	const cmdsEnabled = capabilityCheckEnabled(c, 'documented-commands');
	if (cmdsEnabled && capabilityAutofixEnabled(c, 'documentedCommands', o.fix) && c.documentation?.commandRoots?.length) fixDocumentedCommands(c);
	return [...(documentationEnabled ? documentationFindings(c) : []), ...(cmdsEnabled && c.documentation?.commandRoots?.length ? documentedCommandFindings(c) : [])];
});
