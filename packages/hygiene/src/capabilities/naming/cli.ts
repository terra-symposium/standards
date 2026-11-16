#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { aliasFindings, fixNaming, namingFindings } from './index.js';
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/hygiene/core';
runCapabilityCli('naming', (c, o) => {
	if (capabilityCheckEnabled(c, 'name') && capabilityAutofixEnabled(c, 'name', o.fix)) fixNaming(c);
	if (capabilityCheckEnabled(c, 'alias') && capabilityAutofixEnabled(c, 'alias', o.fix)) aliasFindings(c, true);
	return [...(capabilityCheckEnabled(c, 'name') ? namingFindings(c) : []), ...(capabilityCheckEnabled(c, 'alias') ? aliasFindings(c) : [])];
});
