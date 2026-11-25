#!/usr/bin/env node

/**
 * packages/hygiene/src/capabilities/security/cli.ts
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityCheckEnabled, runCapabilityCli } from '@terra-symposium/hygiene/core';
import { securityFindings } from './index.js';
runCapabilityCli('security', c => (capabilityCheckEnabled(c, 'security') ? securityFindings(c) : []));
