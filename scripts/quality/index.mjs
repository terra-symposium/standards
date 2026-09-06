/**
 * Runs the canonical quality package against terra-shared itself.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import config from './quality.config.mjs';
import { runQualityCli } from '../../packages/quality/dist/runner.js';
runQualityCli(config, process.argv.slice(2));
