import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://terra-symposium-quality.netlify.app',
	integrations: [starlight({
		title: 'Terra Shared',
		description: 'Guides to Terra Shared packages, quality.json, and repository quality checks.',
		tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
		head: [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } }],
		social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Terra-Symposium/terra-shared' }],
		sidebar: [
			{ label: 'Start here', items: ['index', 'getting-started'] },
			{ label: 'Quality', items: ['quality/overview', 'quality/configuration', 'quality/commands', 'quality/checks', 'quality/troubleshooting'] },
			{ label: 'Packages', autogenerate: { directory: 'packages' } },
			{ label: 'Contributing', items: ['contributing'] },
		],
	})],
});
