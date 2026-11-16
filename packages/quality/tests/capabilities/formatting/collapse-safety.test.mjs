import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { collapseTypesAndObjects } from '../../../dist/capabilities/formatting/lib/collapse.js';

test('collapsing launcher-like objects preserves tokens and valid syntax', () => {
	const root = mkdtempSync(join(tmpdir(), 'terra-collapse-safety-'));
	const file = join(root, 'quality-runner.mjs');
	const orig = `const repoName = 'salesphere';
const env = {
  ...process.env,
  QUALITY_RUNNER_UV_ACTIVE: '1',
};
if ((repoName === 'uni' || repoName === 'standards') && process.env.QUALITY_RUNNER_UV_ACTIVE !== '1') {
  console.log(env);
}
`;
	const tokens = text => {
		const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
		const result = [];
		for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
			if (kind !== ts.SyntaxKind.WhitespaceTrivia && kind !== ts.SyntaxKind.NewLineTrivia) result.push([kind, scanner.getTokenText()]);
		}
		return result;
	};
	try {
		writeFileSync(file, orig);
		assert.equal(collapseTypesAndObjects(file), true);
		const rewritten = readFileSync(file, 'utf8');
		assert.deepEqual(tokens(rewritten), tokens(orig));
		assert.equal(ts.createSourceFile(file, rewritten, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS).parseDiagnostics.length, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
