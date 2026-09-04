/**
 * Defines terra-shared quality scope and repository-specific domains.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/
// API
import { createQualityConfig } from '../../packages/quality/dist/config.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export default createQualityConfig({
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
