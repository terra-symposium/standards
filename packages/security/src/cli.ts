#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/standards-quality-core';
import { securityFindings } from './index.js';
runCapabilityCli('security', c => (capabilityCheckEnabled(c, 'security') ? securityFindings(c) : []));
