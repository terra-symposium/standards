/**
 * packages/quality/test/dev-error-boundaries.test.mjs
 * Verifies dev startup applies repository error boundaries before launch.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('development startup applies React and Astro boundaries before launching the app', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-quality-dev-boundaries-'));
	const src = join(root, 'src');
	mkdirSync(src);
	mkdirSync(join(root, 'node_modules/@terra-symposium/standards-error-boundaries/dist/lib'), { recursive: true });
	writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { '@terra-symposium/standards-error-boundaries': '^0.1.2' } }));
	writeFileSync(
		join(root, 'node_modules/@terra-symposium/standards-error-boundaries/package.json'),
		JSON.stringify({ name: '@terra-symposium/standards-error-boundaries', exports: { './astro-integration': './dist/lib/error-boundaries-astro.js' } }),
	);
	writeFileSync(join(root, 'node_modules/@terra-symposium/standards-error-boundaries/dist/lib/error-boundaries-astro.js'), 'export default {}');
	const app = join(src, 'main.tsx');
	writeFileSync(app, "import { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);\n");
	const astroConfig = join(root, 'astro.config.mjs');
	writeFileSync(astroConfig, "import { defineConfig } from 'astro/config';\nexport default defineConfig({ integrations: [] });\n");
	writeFileSync(join(root, 'quality.json'), JSON.stringify({ sourceRoots: ['src'], extensions: ['.tsx'] }));
	const server = join(root, 'fake-dev-server');
	writeFileSync(server, '#!/bin/sh\nexit 0\n');
	chmodSync(server, 0o755);
	const result = spawnSync(process.execPath, [fileURLToPath(new URL('../dist/lib/dev.js', import.meta.url)), '--port', '43891', '--', server], { cwd: root, encoding: 'utf8', timeout: 10000 });
	assert.equal(result.status, 0, result.stderr);
	assert.match(readFileSync(app, 'utf8'), /<TerraRootErrorBoundary name="Application root"><App \/><\/TerraRootErrorBoundary>/u);
	assert.match(readFileSync(astroConfig, 'utf8'), /@terra-symposium\/standards-error-boundaries\/astro-integration/u);
});
