/**
 * Runs the canonical quality package against terra-shared itself.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API

import { runQualityCli } from '../../packages/quality/dist/runner.js';
import config from './quality.config.mjs';

runQualityCli(config, process.argv.slice(2));
