/**
 * packages/hygiene/tests/checks/error-boundaries.test.mjs
 * Verifies mandatory React root boundaries and their safe automatic wrapper.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityCfg, errorBoundaryFindings, fixErrorBoundaries, qualityCheckEnabled } from '../../dist/index.js';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/
const IMPORT_ERRORBOUNDARY_AS_TERRAROOTERRORBOUNDARY_FROM_TERRA_SYMPOSIUM_ST_LTL59V = /import \{ ErrorBoundary as TerraRootErrorBoundary \} from '@terra-symposium\/boundaries\/react'/u;

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('requires error boundaries around direct React app roots', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-error-boundary-'));
	mkdirSync(join(root, 'src'));
	writeFileSync(join(root, 'src', 'main.tsx'), "import { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'], enabledChecks: { 'error-boundaries': false } });
	assert.equal(qualityCheckEnabled(cfg, 'error-boundaries'), true);
	assert.equal(errorBoundaryFindings(cfg).length, 1);
});
test('automatically wraps React roots with the shared boundary and clears the finding', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-error-boundary-fix-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.tsx');
	writeFileSync(file, "import { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.equal(fixErrorBoundaries(cfg), 1);
	assert.match(readFileSync(file, 'utf8'), IMPORT_ERRORBOUNDARY_AS_TERRAROOTERRORBOUNDARY_FROM_TERRA_SYMPOSIUM_ST_LTL59V);
	assert.match(readFileSync(file, 'utf8'), /root\.render\(<TerraRootErrorBoundary name="Application root"><App \/><\/TerraRootErrorBoundary>\)/u);
	assert.deepEqual(errorBoundaryFindings(cfg), []);
});
test('automatically wraps JavaScript createElement roots without breaking directives', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-error-boundary-js-'));
	mkdirSync(join(root, 'src'));
	const file = join(root, 'src', 'main.js');
	writeFileSync(file, "'use client';\nimport { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root'));\nroot.render(React.createElement(App));\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.js'] });
	assert.equal(fixErrorBoundaries(cfg), 1);
	const output = readFileSync(file, 'utf8');
	assert.match(output, /^'use client';\nimport \{ createRoot \}/u);
	assert.match(output, IMPORT_ERRORBOUNDARY_AS_TERRAROOTERRORBOUNDARY_FROM_TERRA_SYMPOSIUM_ST_LTL59V);
	assert.match(output, /import \{ createElement as terraCreateElement \} from 'react'/u);
	assert.match(output, /root\.render\(terraCreateElement\(TerraRootErrorBoundary, \{ name: 'Application root' \}, \(React\.createElement\(App\)\)\)\)/u);
	assert.deepEqual(errorBoundaryFindings(cfg), []);
});
test('automatically installs the shared hydration boundary in Astro configs', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-astro-boundary-'));
	const config = join(root, 'astro.config.mjs');
	writeFileSync(join(root, 'package.json'), JSON.stringify({ devDependencies: { '@terra-symposium/boundaries': '0.1.0' } }));
	const packageRoot = join(root, 'node_modules/@terra-symposium/boundaries');
	mkdirSync(join(packageRoot, 'dist/lib'), { recursive: true });
	writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ exports: { './astro-integration': './dist/lib/astro-integration.js' } }));
	writeFileSync(join(packageRoot, 'dist/lib/astro-integration.js'), 'export const terraErrorBoundaryIntegration = () => ({});\n');
	writeFileSync(config, "import { defineConfig } from 'astro/config';\nimport react from '@astrojs/react';\nexport default defineConfig({ integrations: [react()] });\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] });
	assert.equal(errorBoundaryFindings(cfg).length, 1);
	assert.equal(fixErrorBoundaries(cfg), 1);
	const output = readFileSync(config, 'utf8');
	assert.match(output, /@terra-symposium\/boundaries\/astro-integration/u);
	assert.match(output, /integrations: \[__terraErrorBoundaryIntegration\(\), react\(\)\]/u);
	assert.deepEqual(errorBoundaryFindings(cfg), []);
	assert.equal(fixErrorBoundaries(cfg), 0);
});
test('Astro integration autofix stays read-only when no installed dependency exports the integration', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-astro-boundary-missing-dependency-'));
	const config = join(root, 'astro.config.mjs');
	const orig = "import { defineConfig } from 'astro/config';\nimport react from '@astrojs/react';\nexport default defineConfig({ integrations: [react()] });\n";
	writeFileSync(join(root, 'package.json'), JSON.stringify({ devDependencies: { astro: '^5.0.0' } }));
	writeFileSync(config, orig);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] });
	assert.equal(errorBoundaryFindings(cfg).length, 1);
	assert.equal(errorBoundaryFindings(cfg)[0]?.fixable, false);
	assert.equal(fixErrorBoundaries(cfg), 0);
	assert.equal(readFileSync(config, 'utf8'), orig);
});
test('accepts an existing top-level boundary, including a local alias', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-error-boundary-existing-'));
	mkdirSync(join(root, 'src'));
	writeFileSync(
		join(root, 'src', 'main.tsx'),
		"import { ErrorBoundary as AppBoundary } from '@terra-symposium/boundaries/react';\nimport { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<AppBoundary><App /></AppBoundary>);\n",
	);
	// hygiene-ignore single-use -- Keep this test configuration named so its fixture scope is established before the check under test runs.
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(errorBoundaryFindings(cfg), []);
});
test('recognizes the Quality compatibility re-export for existing Astro configs', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-astro-boundary-compat-'));
	writeFileSync(join(root, 'package.json'), JSON.stringify({ devDependencies: { '@terra-symposium/hygiene': '2.4.5' } }));
	const packageRoot = join(root, 'node_modules/@terra-symposium/hygiene');
	mkdirSync(join(packageRoot, 'dist/lib'), { recursive: true });
	writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ exports: { './astro-integration': './dist/lib/astro-integration.js' } }));
	writeFileSync(join(packageRoot, 'dist/lib/astro-integration.js'), 'export const terraErrorBoundaryIntegration = () => ({});\n');
	writeFileSync(
		join(root, 'astro.config.mjs'),
		"import { terraErrorBoundaryIntegration } from '@terra-symposium/hygiene/astro-integration';\nexport default { integrations: [terraErrorBoundaryIntegration()] };\n",
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] });
	assert.deepEqual(errorBoundaryFindings(cfg), []);
	assert.equal(fixErrorBoundaries(cfg), 0);
});
test('recognizes the current shared integration and skips static or delegated Astro configs', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-astro-boundary-current-'));
	mkdirSync(join(root, 'astro/config'), { recursive: true });
	mkdirSync(join(root, 'docs'), { recursive: true });
	writeFileSync(join(root, 'package.json'), JSON.stringify({ devDependencies: { '@terra-symposium/standards-error-boundaries': '0.1.2' } }));
	const packageRoot = join(root, 'node_modules/@terra-symposium/standards-error-boundaries');
	mkdirSync(join(packageRoot, 'dist/lib'), { recursive: true });
	writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ exports: { './astro-integration': './dist/lib/astro-integration.js' } }));
	writeFileSync(join(packageRoot, 'dist/lib/astro-integration.js'), 'export const terraErrorBoundaryIntegration = () => ({});\n');
	writeFileSync(join(root, 'astro/astro.config.mjs'), "export { default } from './config/astro.config.mjs';\n");
	writeFileSync(
		join(root, 'astro/config/astro.config.mjs'),
		"import react from '@astrojs/react';\nimport { terraErrorBoundaryIntegration as boundary } from '@terra-symposium/standards-error-boundaries/astro-integration';\nexport default { integrations: [boundary(), react()] };\n",
	);
	writeFileSync(join(root, 'docs/astro.config.mjs'), "import starlight from '@astrojs/starlight';\nexport default { integrations: [starlight({ title: 'Docs' })] };\n");
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts', '.tsx'] });
	assert.deepEqual(errorBoundaryFindings(cfg), []);
	assert.equal(fixErrorBoundaries(cfg), 0);
});
test('runs the focused boundary command without requiring an ESLint config', () => {
	const root = mkdtempSync(join(tmpdir(), 'hygiene-error-boundary-cli-'));
	writeFileSync(join(root, 'quality.json'), JSON.stringify({ sourceRoots: ['src'], extensions: ['.tsx'] }));
	// hygiene-ignore single-use -- Keep the Quality runner URL named for the subprocess command under test.
	const runner = new URL('../../dist/lib/runner.js', import.meta.url);
	const result = spawnSync(process.execPath, [runner.pathname, 'error-boundaries', '--all'], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stderr, /React error-boundary findings \(0\)/u);
});
