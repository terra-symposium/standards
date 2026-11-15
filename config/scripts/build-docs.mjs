#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { delimiter, dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const docsPackageRoot = resolve(repoRoot, 'config/node_modules/@terra-symposium/docs');
const docsPackage = JSON.parse(readFileSync(resolve(docsPackageRoot, 'package.json'), 'utf8'));
if (docsPackage.version !== '0.4.14') throw new Error(`The Docs renderer patch targets 0.4.14; installed version is ${docsPackage.version}.`);
if (!readFileSync(resolve(docsPackageRoot, 'dist/lib/components/blocks.js'), 'utf8').includes("import { NodesBlock } from './terra/editor/docs/_Nodes.js';")) {
	const patch = spawnSync('patch', ['--batch', '--forward', '-p1'], {
		cwd: docsPackageRoot,
		input: readFileSync(resolve(repoRoot, 'config/patches/@terra-symposium__docs@0.4.14.patch')),
		encoding: 'utf8',
	});
	if (patch.status !== 0) throw new Error(`Could not apply Docs renderer patch: ${patch.stderr || patch.stdout}`);
}

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
