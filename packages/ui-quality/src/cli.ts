#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { accessibilityFindings, displayNameFindings, errorBoundaryFindings, fixAccessibleNames, fixDisplayNames, fixErrorBoundaries, uiComponentRecommendations } from './index.js';
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/standards-quality-core';
runCapabilityCli('ui-quality', (c, o) => {
	if (capabilityCheckEnabled(c, 'accessibility') && capabilityAutofixEnabled(c, 'accessibility', o.fix)) fixAccessibleNames(c);
	if (capabilityCheckEnabled(c, 'display-name') && capabilityAutofixEnabled(c, 'displayName', o.fix)) fixDisplayNames(c);
	if (capabilityCheckEnabled(c, 'error-boundaries') && capabilityAutofixEnabled(c, 'errorBoundaries', o.fix)) fixErrorBoundaries(c);
	return [
		...(capabilityCheckEnabled(c, 'accessibility') ? accessibilityFindings(c) : []),
		...(capabilityCheckEnabled(c, 'display-name') ? displayNameFindings(c) : []),
		...(capabilityCheckEnabled(c, 'error-boundaries') ? errorBoundaryFindings(c) : []),
		...(capabilityCheckEnabled(c, 'ui-recommendations') ? uiComponentRecommendations(c) : []),
	];
});
