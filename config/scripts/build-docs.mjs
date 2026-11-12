#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { delimiter, dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const binDir = resolve(repoRoot, 'config/node_modules/.bin');

const docsArgs = (process.argv.includes('--dev') ? 'dev' : 'build') === 'dev' ? ['dev', '--port', '2050', '--strictPort'] : ['build'];

const result = spawnSync('docs', docsArgs, { cwd: repoRoot, env: { ...process.env, PATH: [binDir, process.env.PATH].filter(Boolean).join(delimiter) }, stdio: 'inherit' });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
