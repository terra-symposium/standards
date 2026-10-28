/**
 * packages/quality/test/runner/port.test.mjs
 * Verifies that port acquisition releases existing listeners safely.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { acquirePort, portOwners } from '../../dist/lib/port.js';
import { spawn } from 'node:child_process';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('portOwners rejects non-integer and out-of-range ports before invoking lsof', () => {
	assert.deepEqual(portOwners(Number.NaN), []);
	assert.deepEqual(portOwners(-1), []);
	assert.deepEqual(portOwners(65_536), []);
});
test('acquirePort terminates an existing listener and releases the port', async () => {
	const port = 47_654;
	const child = spawn(process.execPath, ['--input-type=module', '-e', `import net from 'node:net'; net.createServer().listen(${port}, '127.0.0.1'); setInterval(() => {}, 1000);`]);
	for (let attempt = 0; attempt < 20 && !portOwners(port).includes(child.pid); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 100));
	assert.ok(portOwners(port).includes(child.pid));
	await acquirePort(port);
	assert.deepEqual(portOwners(port), []);
	child.kill('SIGKILL');
});
