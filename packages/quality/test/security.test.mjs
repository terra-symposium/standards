/**
 * packages/quality/test/security.test.mjs
 * Verifies environment visibility, forbidden source patterns, client secret
 * boundaries, dotenv loading, and runtime process-environment exceptions.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityCfg, securityFindings } from '../dist/index.js';
import { execFileSync } from 'node:child_process';
import { fixtureFile, fixtureRoot } from './support.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('security checks detect environment files, forbidden terms/imports, client secrets, dotenv, and process-boundary violations', () => {
	const root = fixtureRoot('terra-quality-security-');
	fixtureFile(root, '.env.local', 'TOKEN=visible\n');
	fixtureFile(root, 'src/client/view.ts', `import 'forbidden-package';\nconst token = import.meta.env.PUBLIC_TOKEN;\nconst password = 'not a real secret';\n`);
	fixtureFile(root, 'src/server/view.ts', `import 'safe-package';\nconst token = process.env.TOKEN;\nconst loaded = dotenv.config();\nvoid [token, loaded];\n`);
	fixtureFile(root, 'src/runtime/view.ts', 'const token = process.env.TOKEN;\nvoid token;\n');
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['src'],
		extensions: ['.ts'],
		security: { forbiddenTerms: ['password'], forbiddenImports: ['forbidden-package'], clientRoots: ['src/client'], allowProcessEnvRoots: ['src/runtime'] },
	});
	const findings = securityFindings(cfg);
	assert.deepEqual(
		findings.map((f) => f.message),
		[
			'environment files must not be committed',
			'forbidden term matches /password/i',
			'forbidden import forbidden-package',
			'client source references a secret-shaped environment value',
			'environment-file loading is forbidden',
			'process.env access is outside an allowed runtime root',
		],
	);
	assert.deepEqual(
		findings.map((f) => f.file),
		['.env.local', 'src/client/view.ts', 'src/client/view.ts', 'src/client/view.ts', 'src/server/view.ts', 'src/server/view.ts'],
	);
});
test('security checks honor tracked visibility and runtime-root exceptions in a Git worktree', () => {
	const root = fixtureRoot('terra-quality-security-git-');
	fixtureFile(root, '.gitignore', '.env*\n');
	fixtureFile(root, '.env.ignored', 'TOKEN=ignored\n');
	fixtureFile(root, '.env.committed', 'TOKEN=committed\n');
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '.gitignore'], { cwd: root });
	execFileSync('git', ['add', '-f', '.env.committed'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=quality-test', '-c', 'user.email=quality@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.ts'], security: {} });
	assert.deepEqual(securityFindings(cfg), [{ file: '.env.committed', message: 'environment files must not be committed' }]);
});
