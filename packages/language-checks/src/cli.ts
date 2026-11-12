#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { runCapabilityCli } from '@terra-symposium/standards-quality-core';
import { runLanguageChecks } from './index.js';
runCapabilityCli('language-checks', (c, o) => runLanguageChecks(c, o));
