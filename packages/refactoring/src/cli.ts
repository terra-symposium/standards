#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/standards-quality-core';
import { fixObjectForwarding, fixSingleUseDeclarations, objectForwardingFindings, singleUseFindings } from './index.js';
runCapabilityCli('refactoring', (c, o) => {
	if (capabilityCheckEnabled(c, 'forward') && capabilityAutofixEnabled(c, 'forward', o.fix)) fixObjectForwarding(c);
	if (capabilityCheckEnabled(c, 'dead-code') && capabilityAutofixEnabled(c, 'dead-code', o.fix)) fixSingleUseDeclarations(c);
	return [...(capabilityCheckEnabled(c, 'forward') ? objectForwardingFindings(c) : []), ...(capabilityCheckEnabled(c, 'dead-code') ? singleUseFindings(c) : [])];
});
