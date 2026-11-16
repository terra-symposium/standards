#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { delimiter, dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const result = spawnSync(
	'docs',
	process.argv.includes('--dev') ? ['dev', '--port', '2050', '--strictPort', ...process.argv.slice(2).filter(argument => argument !== '--dev' && argument !== '--')] : ['build'],
	{
		cwd: repoRoot,
		env: { ...process.env, PATH: [resolve(repoRoot, 'config/node_modules/.bin'), process.env.PATH].filter(Boolean).join(delimiter) },
		stdio: 'inherit',
	},
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
