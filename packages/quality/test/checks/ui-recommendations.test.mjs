/**
 * packages/quality/test/checks/ui-recommendations.test.mjs
 * Verifies AST-based, on-demand recommendations for native JSX controls.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityCfg, runQualityCli, uiComponentRecommendations } from '../../dist/index.js';
import { fixtureFile, fixtureRoot } from '../../support/fixtures.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('UI recommendations report native controls and shared text links with source positions and variants', () => {
	const root = fixtureRoot('terra-quality-ui-recommendations-');
	fixtureFile(
		root,
		'src/view.tsx',
		[
			'export const View = () => (',
			'  <section>',
			'    <button type="submit">Save</button>',
			'    <input aria-label="Search" />',
			'    <input type="checkbox" />',
			'    <input type="submit" value="Save" />',
			'    <a href="/docs" class="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground no-underline hover:bg-secondary">Docs</a>',
			'    <a href="/help" className="text-primary underline underline-offset-4">Help</a>',
			'    <a href="/docs" className="text-primary underline-offset-4 hover:underline">Docs text link</a>',
			'    <a href="/plain">Plain link</a>',
			'    <Button>Shared action</Button>',
			'  </section>',
			');',
		].join('\n'),
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });

	assert.deepEqual(
		uiComponentRecommendations(cfg).map(({ file, line, element, component, import: importPath, variant }) => ({ file, line, element, component, importPath, variant })),
		[
			{ file: 'src/view.tsx', line: 3, element: 'button', component: 'Button', importPath: '@/components/ui/button', variant: undefined },
			{ file: 'src/view.tsx', line: 4, element: 'input', component: 'Input', importPath: '@/components/ui/input', variant: undefined },
			{ file: 'src/view.tsx', line: 6, element: 'input', component: 'Button', importPath: '@/components/ui/button', variant: undefined },
			{ file: 'src/view.tsx', line: 7, element: 'a', component: 'ButtonLink', importPath: '@/components/ui/button', variant: undefined },
			{ file: 'src/view.tsx', line: 8, element: 'a', component: 'ButtonLink', importPath: '@/components/ui/button', variant: 'primary-underline' },
			{ file: 'src/view.tsx', line: 9, element: 'a', component: 'ButtonLink', importPath: '@/components/ui/button', variant: 'primary-link' },
		],
	);
});

test('UI recommendations scan Astro markup and recognize the docs sidebar ButtonLink opportunity', () => {
	const root = fixtureRoot('terra-quality-ui-recommendation-astro-');
	fixtureFile(
		root,
		'src/DocsLayout.astro',
		'<footer>\n\t<a href="/" class="text-xs text-primary no-underline hover:underline hover:decoration-2 hover:underline-offset-[0.2em]">\n\t\tBack to Playlist Atlas\n\t</a>\n</footer>\n',
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.astro'] });

	assert.deepEqual(
		uiComponentRecommendations(cfg).map(({ file, line, element, component, variant }) => ({ file, line, element, component, variant })),
		[{ file: 'src/DocsLayout.astro', line: 2, element: 'a', component: 'ButtonLink', variant: 'primary-link' }],
	);
});

test('UI recommendation rules override defaults and honor input types and ignored source paths', () => {
	const root = fixtureRoot('terra-quality-ui-recommendation-policy-');
	fixtureFile(root, 'src/view.tsx', '<><button>Use custom action</button><input type="checkbox" /></>\n');
	fixtureFile(root, 'src/ignored.tsx', '<button>Ignore this file</button>\n');
	fixtureFile(root, 'src/components/ui/button.tsx', '<button>Primitive implementation</button>\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.tsx'],
		uiRecommendations: {
			rules: [
				{ element: 'button', component: 'ActionButton', import: '@/components/ui/action-button' },
				{ element: 'input', component: 'Checkbox', import: '@/components/ui/checkbox', types: ['checkbox'] },
			],
			ignoredFiles: ['src/ignored.tsx'],
			ignoredDirectories: ['src/components/ui'],
		},
	});

	assert.deepEqual(
		uiComponentRecommendations(cfg).map(({ element, component }) => ({ element, component })),
		[
			{ element: 'button', component: 'ActionButton' },
			{ element: 'input', component: 'Checkbox' },
		],
	);
});

test('ui-recommendations is an on-demand advisory CLI command that does not fail on findings', async () => {
	const root = fixtureRoot('terra-quality-ui-recommendation-cli-');
	fixtureFile(root, 'src/view.tsx', '<><button>Save</button><a href="/" className="text-primary hover:underline">Home</a></>\n');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	const originalInfo = console.info;
	const output = [];
	console.info = (...values) => output.push(values.join(' '));
	process.exitCode = 0;
	try {
		await runQualityCli(cfg, ['ui-recommendations', '--all']);
	} finally {
		console.info = originalInfo;
	}

	assert.match(output.join('\n'), /src\/view\.tsx:1:\d+ <button> → <Button>/u);
	assert.match(output.join('\n'), /src\/view\.tsx:1:\d+ <a> → <ButtonLink variant="primary-link">/u);
	assert.equal(process.exitCode, 0);
	process.exitCode = 0;
});
