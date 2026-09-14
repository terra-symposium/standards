/**
 * packages/quality/test/support.mjs
 * Small, isolated fixture helpers shared by the quality-package tests.
 * Every fixture is created beneath the operating system's temporary directory.
 * Tests therefore exercise real filesystem and process boundaries without
 * modifying the Terra Shared checkout or relying on one test's files.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates a unique temporary repository fixture root.
 *
 * @param prefix Prefix used to identify the fixture in a failed test report.
 *
 * @return Absolute path to the new fixture root.
 */
export function fixtureRoot(prefix = 'terra-quality-test-') {
	return mkdtempSync(join(tmpdir(), prefix));
}

/**
 * Writes a fixture file, creating all parent directories first.
 *
 * @param root Fixture root used to resolve the relative path.
 * @param relativePath Repository-relative file path to write.
 * @param content File content to write.
 * @param mode Optional filesystem mode, used for executable command fixtures.
 *
 * @return Absolute path to the written file.
 */
export function fixtureFile(root, relativePath, content, mode) {
	const file = join(root, relativePath);
	mkdirSync(join(file, '..'), { recursive: true });
	writeFileSync(file, content);
	if (mode !== undefined) chmodSync(file, mode);
	return file;
}

/**
 * Reads a fixture file as UTF-8 text.
 *
 * @param root Fixture root used to resolve the relative path.
 * @param relativePath Repository-relative file path to read.
 *
 * @return File content.
 */
export function fixtureText(root, relativePath) {
	return readFileSync(join(root, relativePath), 'utf8');
}

/**
 * Resets the process exit status after a test intentionally exercises a
 * failing quality command.
 *
 * @return Nothing.
 */
export function resetExitCode() {
	process.exitCode = 0;
}
