import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://standards-docs.netlify.app',
	redirects: {
		'/getting-started': '/packages/quality/setup/',
		'/quality/overview': '/packages/quality/',
		'/quality/configuration': '/packages/quality/configuration/',
		'/quality/commands': '/packages/quality/workflows/',
		'/quality/troubleshooting': '/packages/quality/troubleshooting/',
		'/quality/checks': '/packages/quality/#checks',
		'/quality/checks/alias': '/packages/quality/#alias',
		'/quality/checks/command': '/packages/quality/#command',
		'/quality/checks/dead-code': '/packages/quality/#dead-code',
		'/quality/checks/diff': '/packages/quality/#diff',
		'/quality/checks/document': '/packages/quality/#document',
		'/quality/checks/format': '/packages/quality/#format',
		'/quality/checks/forward': '/packages/quality/#object-forwarding',
		'/quality/checks/import': '/packages/quality/#import-validation',
		'/quality/checks/knip': '/packages/quality/#knip',
		'/quality/checks/lint': '/packages/quality/#lint',
		'/quality/checks/name': '/packages/quality/#name',
		'/quality/checks/recommend': '/packages/quality/#recommend',
		'/quality/checks/regex-dedup': '/packages/quality/#regex-deduplication',
		'/quality/checks/repeated-classes': '/packages/quality/#repeated-classes',
		'/quality/checks/security': '/packages/quality/#security',
		'/quality/checks/single-use': '/packages/quality/#single-use-declarations',
		'/quality/checks/type': '/packages/quality/#type',
		'/quality/checks/ui-patterns': '/packages/quality/#ui-patterns',
	},
	integrations: [
		starlight({
			title: 'Standards',
			description: 'Documentation for shared Terra Symposium packages, repository quality tooling, and package development.',
			sidebar: [
				{
					label: 'Packages',
					items: [
						{ label: 'Error Boundaries', link: '/packages/error-boundaries/' },
						{
							label: 'Quality',
							items: [
								{ label: 'Overview', link: '/packages/quality/' },
								{ label: 'Setup', link: '/packages/quality/setup/' },
								{ label: 'Configuration', link: '/packages/quality/configuration/' },
								{ label: 'Workflows', link: '/packages/quality/workflows/' },
								{ label: 'Troubleshooting', link: '/packages/quality/troubleshooting/' },
							],
						},
						{
							label: 'Reporting',
							items: [
								{ label: 'Overview', link: '/packages/reporting/' },
								{ label: 'Playwright', link: '/packages/reporting/playwright/' },
								{ label: 'Artifacts', link: '/packages/reporting/artifacts/' },
								{ label: 'Load testing', link: '/packages/reporting/load-testing/' },
							],
						},
					],
				},
				{ label: 'Getting Started', link: '/packages/quality/setup/' },
				{ label: 'Contributing', link: '/contributing/' },
			],
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			head: [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } }],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Terra-Symposium/standards' }],
		}),
	],
});
