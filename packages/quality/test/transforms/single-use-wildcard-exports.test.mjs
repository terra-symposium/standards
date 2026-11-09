/**
 * packages/quality/test/transforms/single-use-wildcard-exports.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityCfg, fixSingleUseDeclarations, singleUseFindings } from '../../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../../support/fixtures.mjs';
test('package wildcard exports preserve public single-use declarations', () => {
	const root = fixtureRoot('terra-quality-single-use-wildcard-export-');
	fixtureFile(root, 'src/value.ts', `export const VALUE = 'ready';\n`);
	fixtureFile(root, 'src/consumer.ts', `import { VALUE } from './value';\nexport const result = VALUE;\n`);
	fixtureFile(root, 'package.json', JSON.stringify({ exports: { './*': './dist/*.js' } }));
	fixtureFile(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { rootDir: 'src', outDir: 'dist' }, include: ['src'] }));
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'] });
	assert.equal(
		singleUseFindings(cfg).some((finding) => finding.name === 'VALUE'),
		false,
	);
	assert.equal(fixSingleUseDeclarations(cfg), 0);
	assert.match(fixtureText(root, 'src/value.ts'), /export const VALUE/);
});
