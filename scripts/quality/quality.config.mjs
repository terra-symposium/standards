/**
 * Defines terra-shared quality scope and repository-specific domains.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createQualityCfg } from '../../packages/quality/dist/config.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export default createQualityCfg({
	root,
	sourceRoots: ['packages', 'scripts'],
	extensions: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'],
	tools: { eslint: 'eslint', knip: 'knip', prettier: 'prettier' },
	oneLineImports: true,
	prettierPrintWidth: 200,
	qualityCommands: [
		{ name: 'build', command: 'pnpm', args: ['run', 'build'] },
		{ name: 'test', command: 'pnpm', args: ['run', 'test'] },
	],
});
