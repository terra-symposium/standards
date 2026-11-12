#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { capabilityCheckEnabled, runCapabilityCli, srcFiles } from '@terra-symposium/standards-quality-core';
import { checkImports, duplicateImportFindings } from './index.js';
runCapabilityCli('imports', (c) => (capabilityCheckEnabled(c, 'import') ? [...checkImports(c), ...duplicateImportFindings(srcFiles(c))] : []));
