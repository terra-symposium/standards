#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli, srcFiles } from '@terra-symposium/standards-quality-core';
import { documentSrcFile, documentationFindings, documentedCommandFindings, fixDocumentedCommands } from './index.js';
runCapabilityCli('documentation', (c, o) => {
	const files = srcFiles(c);
	const documentationEnabled = capabilityCheckEnabled(c, 'document');
	const cmdsEnabled = capabilityCheckEnabled(c, 'documented-commands');
	if (documentationEnabled && capabilityAutofixEnabled(c, 'document', o.fix)) {
		for (const file of files) if (!/\.astro$/.test(file)) documentSrcFile(c, file);
	}
	if (cmdsEnabled && capabilityAutofixEnabled(c, 'documentedCommands', o.fix) && c.documentation?.commandRoots?.length) fixDocumentedCommands(c);
	return [...(documentationEnabled ? documentationFindings(c) : []), ...(cmdsEnabled && c.documentation?.commandRoots?.length ? documentedCommandFindings(c) : [])];
});
