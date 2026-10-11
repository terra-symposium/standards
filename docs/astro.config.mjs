import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://terra-symposium-quality.netlify.app',
	redirects: {
		'/getting-started': '/packages/quality/setup/',
		'/quality/overview': '/packages/quality/',
		'/quality/configuration': '/packages/quality/configuration/',
		'/quality/commands': '/packages/quality/workflows/',
		'/quality/troubleshooting': '/packages/quality/troubleshooting/',
		'/quality/checks': '/packages/quality/checks/',
		'/quality/checks/alias': '/packages/quality/checks/#alias',
		'/quality/checks/command': '/packages/quality/checks/#command',
		'/quality/checks/dead-code': '/packages/quality/checks/#dead-code',
		'/quality/checks/diff': '/packages/quality/checks/#diff',
		'/quality/checks/document': '/packages/quality/checks/#document',
		'/quality/checks/format': '/packages/quality/checks/#format',
		'/quality/checks/forward': '/packages/quality/checks/#object-forwarding',
		'/quality/checks/import': '/packages/quality/checks/#import-validation',
		'/quality/checks/knip': '/packages/quality/checks/#knip',
		'/quality/checks/lint': '/packages/quality/checks/#lint',
		'/quality/checks/name': '/packages/quality/checks/#name',
		'/quality/checks/recommend': '/packages/quality/checks/#recommend',
		'/quality/checks/regex-dedup': '/packages/quality/checks/#regex-deduplication',
		'/quality/checks/repeated-classes': '/packages/quality/checks/#repeated-classes',
		'/quality/checks/security': '/packages/quality/checks/#security',
		'/quality/checks/single-use': '/packages/quality/checks/#single-use-declarations',
		'/quality/checks/type': '/packages/quality/checks/#type',
		'/quality/checks/ui-patterns': '/packages/quality/checks/#ui-patterns',
	},
	integrations: [
		starlight({
			title: 'Terra Shared',
			description: 'Documentation for shared Terra Symposium packages, repository quality tooling, and package development.',
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			head: [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } }],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Terra-Symposium/terra-shared' }],
		}),
	],
});
