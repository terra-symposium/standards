/**
 * Lints all maintained JavaScript and TypeScript package sources.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API

import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config({ ignores: ['**/dist/**', '**/node_modules/**'] }, { languageOptions: { globals: globals.node } }, eslint.configs.recommended, ...tseslint.configs.recommended);
