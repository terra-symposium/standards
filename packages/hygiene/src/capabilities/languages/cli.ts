#!/usr/bin/env node

/**
 * packages/hygiene/src/capabilities/languages/cli.ts
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { runCapabilityCli } from '@terra-symposium/hygiene/core';
import { runLanguageChecks } from './index.js';
runCapabilityCli('language-checks', (c, o) => runLanguageChecks(c, o));
