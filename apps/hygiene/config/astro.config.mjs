import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/standards-error-boundaries/astro-integration';
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

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export default defineConfig({ outDir: fileURLToPath(new URL('../../../dist/apps/hygiene/', import.meta.url)), integrations: [__terraErrorBoundaryIntegration(), react()] });
