#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { runCapabilityCli } from '@terra-symposium/quality/core';
import { runLanguageChecks } from './index.js';
runCapabilityCli('language-checks', (c, o) => runLanguageChecks(c, o));
