#!/usr/bin/env node

import { loadQualityCfg } from './config.js';
import { runQualityCli } from './runner.js';

runQualityCli(loadQualityCfg(), process.argv.slice(2));
