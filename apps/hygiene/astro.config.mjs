import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/standards-quality/astro-integration';
import config from './config/astro.config.mjs';

export default {
	...config,
	integrations: [__terraErrorBoundaryIntegration(), ...(config.integrations ?? [])],
};
