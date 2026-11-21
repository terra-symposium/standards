#!/usr/bin/env node

/**
 * packages/hygiene/src/capabilities/imports/cli.ts
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityCheckEnabled, runCapabilityCli, srcFiles } from '@terra-symposium/hygiene/core';
import { checkImports, duplicateImportFindings } from './index.js';
runCapabilityCli('imports', c => (capabilityCheckEnabled(c, 'import') ? [...checkImports(c), ...duplicateImportFindings(srcFiles(c))] : []));
