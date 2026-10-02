import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://terra-shared-docs.netlify.app',
	integrations: [starlight({
		title: 'Terra Shared',
		description: 'Guides to Terra Shared packages, quality.json, and repository quality checks.',
		tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
		social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Terra-Symposium/terra-shared' }],
		sidebar: [
			{ label: 'Start here', items: ['index', 'getting-started'] },
			{ label: 'Quality', items: ['quality/overview', 'quality/configuration', 'quality/commands', { label: 'Checks', autogenerate: { directory: 'quality/checks' } }, 'quality/troubleshooting'] },
			{ label: 'Packages', autogenerate: { directory: 'packages' } },
			{ label: 'Contributing', items: ['contributing'] },
		],
	})],
});
