/**
 * apps/hygiene/astro.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/standards-quality/astro-integration';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export default defineConfig({ integrations: [__terraErrorBoundaryIntegration(), react()] });
