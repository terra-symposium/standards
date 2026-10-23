import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

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
  vite: { plugins: [tailwindcss()] },
  integrations: [react(), mdx()],
});
