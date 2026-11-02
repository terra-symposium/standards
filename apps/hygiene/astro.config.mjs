/**
 * apps/hygiene/astro.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/standards-quality/astro-integration';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export default defineConfig({
	outDir: fileURLToPath(new URL('../../dist/apps/hygiene/', import.meta.url)),
	integrations: [__terraErrorBoundaryIntegration(), react()],
});
