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
	assert.deepEqual(
		uiComponentRecommendations(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] })).map(({ file: f, line: l, element: e, component: c, import: i, variant: v }) => ({
			file: f,
			line: l,
			element: e,
			component: c,
			importPath: i,
			variant: v,
		})),
		[
			{ file: 'src/view.tsx', line: 3, element: 'button', component: 'Button', importPath: '@/components/ui/button', variant: undefined },
			{ file: 'src/view.tsx', line: 4, element: 'input', component: 'Input', importPath: '@/components/ui/input', variant: undefined },
			{ file: 'src/view.tsx', line: 6, element: 'input', component: 'Button', importPath: '@/components/ui/button', variant: undefined },
			{ file: 'src/view.tsx', line: 7, element: 'a', component: 'ButtonLink', importPath: '@/components/ui/button', variant: undefined },
			{ file: 'src/view.tsx', line: 8, element: 'a', component: 'ButtonLink', importPath: '@/components/ui/button', variant: 'primary-underline' },
			{ file: 'src/view.tsx', line: 9, element: 'a', component: 'ButtonLink', importPath: '@/components/ui/button', variant: 'primary-underline' },
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
	assert.deepEqual(
		uiComponentRecommendations(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.astro'] })).map(({ file: f, line: l, element: e, component: c, variant: v }) => ({
			file: f,
			line: l,
			element: e,
			component: c,
			variant: v,
		})),
		[{ file: 'src/DocsLayout.astro', line: 2, element: 'a', component: 'ButtonLink', variant: 'primary-underline' }],
	);
});
test('UI recommendation rules override defaults and honor input types and ignored source paths', () => {
	const root = fixtureRoot('terra-quality-ui-recommendation-policy-');
	fixtureFile(root, 'src/view.tsx', '<><button>Use custom action</button><input type="checkbox" /></>\n');
	fixtureFile(root, 'src/ignored.tsx', '<button>Ignore this file</button>\n');
	fixtureFile(root, 'src/components/ui/button.tsx', '<button>Primitive implementation</button>\n');
	assert.deepEqual(
		uiComponentRecommendations(
			createQualityCfg({
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
			}),
		).map(({ element: e, component: c }) => ({ element: e, component: c })),
		[
			{ element: 'button', component: 'ActionButton' },
			{ element: 'input', component: 'Checkbox' },
		],
	);
});
test('ui-recommendations reports errors and fails when findings remain', async () => {
	const root = fixtureRoot('terra-quality-ui-recommendation-cli-');
	fixtureFile(root, 'src/view.tsx', '<><button>Save</button><a href="/" className="text-primary hover:underline">Home</a></>\n');
	// terra-quality-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	// terra-quality-ignore single-use -- Snapshot console.info before replacing it so cleanup restores the original logger.
	const originalInfo = console.info;
	// terra-quality-ignore single-use -- Snapshot console.error before replacing it so cleanup restores the original logger.
	const originalErr = console.error;
	const output = [];
	console.error = (...values) => output.push(values.join(' '));
	process.exitCode = 0;
	try {
		await runQualityCli(cfg, ['ui-recommendations', '--all']);
	} finally {
		console.info = originalInfo;
		console.error = originalErr;
	}
	assert.match(output.join('\n'), /\[ERROR\] src\/view\.tsx:1:\d+ <button> should use <Button>/u);
	assert.match(output.join('\n'), /\[ERROR\] src\/view\.tsx:1:\d+ <a> should use <ButtonLink variant="primary-underline">/u);
	assert.equal(process.exitCode, 1);
	process.exitCode = 0;
});
