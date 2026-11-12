/**
 * packages/naming/test/public.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as api from '../dist/index.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
test('public API exports the capability contract', () => {
	assert.ok('namingFindings' in api, 'exports namingFindings');
	assert.ok('aliasFindings' in api, 'exports aliasFindings');
	assert.ok('fixNaming' in api, 'exports fixNaming');
	assert.ok('renameId' in api, 'exports renameId');
});
test('standalone CLI exposes shared help', () => {
	const script = new URL('../dist/cli.js', import.meta.url);
	const result = spawnSync(process.execPath, [script.pathname, '--help'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Usage:/);
});
test('capability package does not depend on the aggregate runner', () => {
	const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	assert.equal(Object.hasOwn(manifest.dependencies ?? {}, '@terra-symposium/standards-quality'), false);
});
test('naming fixes are safe and idempotent', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-naming-package-'));
	try {
		mkdirSync(join(root, 'src'));
		const file = join(root, 'src/main.ts');
		writeFileSync(file, 'const administrator = "ok";\nconsole.log(administrator);\n');
		const cfg = { root, sourceRoots: [join(root, 'src')], extensions: ['.ts'] };
		assert.equal(api.namingFindings(cfg).length, 1);
		assert.equal(api.fixNaming(cfg), 1);
		assert.match(readFileSync(file, 'utf8'), /const admin = "ok"/u);
		assert.equal(api.namingFindings(cfg).length, 0);
		assert.equal(api.fixNaming(cfg), 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('naming checks ignore Markdown prose in a full-repository source scope', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-naming-markdown-scope-'));
	try {
		mkdirSync(join(root, 'src'));
		const markdown = join(root, 'README.md');
		const rust = join(root, 'src/constants.rs');
		const cSource = join(root, 'src/native.c');
		const cHeader = join(root, 'src/media.h');
		const code = join(root, 'src/main.ts');
		const prose = 'The repository documents expressions, extensions, and command behavior.\n';
		writeFileSync(markdown, prose);
		writeFileSync(rust, 'const administrator: i32 = 1;\n');
		writeFileSync(cSource, 'int f(void) { return (size_t)((const unsigned char *)end - p); }\nint g(void) { return strtod((const char *)value, &end); }\n');
		writeFileSync(cHeader, 'typedef struct RcImage { int width; int height; } RcImage;\n');
		writeFileSync(code, 'const repository = "ok";\nvoid repository;\n');
		const cfg = { root, sourceRoots: [root], extensions: ['.c', '.h', '.md', '.json', '.rs', '.ts'] };
		assert.deepEqual(
			api.namingFindings(cfg).map(({ file, name, suggestion }) => ({ file, name, suggestion })),
			[{ file: 'src/main.ts', name: 'repository', suggestion: 'repo' }],
		);
		assert.equal(api.fixNaming(cfg), 1);
		assert.equal(readFileSync(markdown, 'utf8'), prose);
		assert.match(readFileSync(code, 'utf8'), /const repo = "ok"/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('parameter shortening preserves free identifiers in default initializers', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-naming-parameter-default-collision-'));
	try {
		mkdirSync(join(root, 'src'));
		const file = join(root, 'src/main.ts');
		const original = `const lang = 'en';\nconst update = (language = lang) => language;\nvoid update;\n`;
		const safeFile = join(root, 'src/safe.ts');
		writeFileSync(file, original);
		writeFileSync(safeFile, "const settings = { lang: 'fr' };\nconst read = (language = settings.lang) => language;\nvoid read;\n");
		const cfg = { root, sourceRoots: [join(root, 'src')], extensions: ['.ts'] };
		const findings = api.namingFindings(cfg);
		const capturing = findings.find((finding) => finding.file.endsWith('main.ts'));
		const safe = findings.find((finding) => finding.file.endsWith('safe.ts'));
		assert.equal(capturing?.name, 'language');
		assert.equal(capturing?.suggestion, 'lang');
		assert.equal(capturing?.safe, false);
		assert.match(capturing?.reason ?? '', /capture the free identifier lang in this parameter's default initializer/u);
		assert.equal(safe?.name, 'language');
		assert.equal(safe?.safe, undefined);
		assert.equal(api.fixNaming(cfg), 1);
		assert.equal(readFileSync(file, 'utf8'), original);
		assert.equal(readFileSync(safeFile, 'utf8'), "const settings = { lang: 'fr' };\nconst read = (lang = settings.lang) => lang;\nvoid read;\n");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('callback shortening follows explicit aliases and preserves descriptive parameters', () => {
	assert.equal(api.renameId('item', { callback: true }), 'item');
	assert.equal(api.renameId('index', { callback: true }), 'i');
	assert.equal(api.renameId('patient', { callback: true }), 'patient');
	assert.equal(api.renameId('href', { callback: true }), 'href');
	assert.equal(api.renameId('item', { callback: true, reserved: ['i'] }), 'item');
	const root = mkdtempSync(join(tmpdir(), 'terra-naming-descriptive-callback-'));
	try {
		mkdirSync(join(root, 'src'));
		const file = join(root, 'src/main.ts');
		const original = 'const values = [{ href: "#" }];\nvalues.map((patient) => patient.href);\n';
		writeFileSync(file, original);
		const cfg = { root, sourceRoots: [join(root, 'src')], extensions: ['.ts'] };
		assert.equal(api.fixNaming(cfg), 0);
		assert.equal(readFileSync(file, 'utf8'), original);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('technical suffix replacements keep local Error and Repository names concise', () => {
	assert.equal(api.renameId('handleStatError'), 'handleStatErr');
	assert.equal(api.renameId('handleReadError'), 'handleReadErr');
	assert.equal(api.renameId('requireFromRepository'), 'requireFromRepo');
	assert.equal(api.renameId('repositoryRoot'), 'repoRoot');
	assert.equal(api.renameId('runCommand'), 'runCmd');
	assert.equal(api.renameId('relativeDirectory'), 'relativeDir');
	assert.equal(api.renameId('firstDirectoryPart'), 'firstDirPart');
	assert.equal(api.renameId('generatedEntries'), 'genEntries');
	assert.equal(api.renameId('sonnerUsesAccessibleErrorSurface'), 'sonnerUsesAccessibleErrSurface');
	assert.equal(api.renameId('normalizesApiPitchers'), 'normApiPitchers');
	assert.equal(api.renameId('compareBrightness'), 'compBrightness');
});
test('identifier replacement lookup ignores inherited object property names', () => {
	assert.equal(api.renameId('constructor'), 'constructor');
	assert.equal(api.renameId('errorConstructor'), 'errConstructor');
	assert.equal(api.renameId('errorToString'), 'errToString');
});
test('command shortening preserves authored comment bytes while renaming local bindings', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-naming-command-comment-'));
	try {
		mkdirSync(join(root, 'src'));
		const file = join(root, 'src/main.ts');
		writeFileSync(file, '// Keep this command contract verbatim.\nconst command = createCommand();\nforwardCommand(command);\n');
		const cfg = { root, sourceRoots: [join(root, 'src')], extensions: ['.ts'] };
		assert.equal(api.fixNaming(cfg), 1);
		assert.equal(readFileSync(file, 'utf8'), '// Keep this command contract verbatim.\nconst cmd = createCommand();\nforwardCommand(cmd);\n');
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
