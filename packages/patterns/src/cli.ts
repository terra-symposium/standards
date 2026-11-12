#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityAutofixEnabled, capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/standards-quality-core';
import { fixRegexDedup, fixRepeatedClasses, performancePatternFindings, regexFindings, repeatedClassFindings, runTailwindCanonical, uiPatternFindings } from './index.js';
runCapabilityCli('patterns', async (c, o) => {
	if (capabilityCheckEnabled(c, 'repeated-classes') && capabilityAutofixEnabled(c, 'repeatedClasses', o.fix)) fixRepeatedClasses(c);
	if (capabilityCheckEnabled(c, 'regex-dedup') && capabilityAutofixEnabled(c, 'regexDedup', o.fix)) fixRegexDedup(c);
	let tailwindFindings: { message: string }[] = [];
	if (c.tailwindCanonical && capabilityCheckEnabled(c, 'tailwind-canonical')) {
		try {
			await runTailwindCanonical(c, capabilityAutofixEnabled(c, 'tailwindCanonical', o.fix), { quiet: true });
		} catch (err) {
			tailwindFindings = [{ message: err instanceof Error ? err.message : String(err) }];
		}
	}
	return [
		...tailwindFindings,
		...(capabilityCheckEnabled(c, 'performance-patterns') ? performancePatternFindings(c) : []),
		...(capabilityCheckEnabled(c, 'repeated-classes') ? repeatedClassFindings(c) : []),
		...(capabilityCheckEnabled(c, 'regex-dedup') ? regexFindings(c) : []),
		...(capabilityCheckEnabled(c, 'ui-patterns') ? uiPatternFindings(c) : []),
	];
});
