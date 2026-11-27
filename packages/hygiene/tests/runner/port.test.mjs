/**
 * packages/hygiene/tests/runner/port.test.mjs
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
import net from 'node:net';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('portOwners rejects non-integer and out-of-range ports before invoking lsof', () => {
	assert.deepEqual(portOwners(Number.NaN), []);
	assert.deepEqual(portOwners(-1), []);
	assert.deepEqual(portOwners(65_536), []);
});
test('acquirePort terminates an existing listener and releases the port', async () => {
	const reservation = net.createServer();
	await new Promise((resolve, reject) => reservation.listen(0, '127.0.0.1', resolve).once('error', reject));
	const address = reservation.address();
	assert.ok(address && typeof address !== 'string');
	const port = address.port;
	await new Promise((resolve, reject) => reservation.close(error => (error ? reject(error) : resolve())));
	const child = spawn(
		process.execPath,
		['--input-type=module', '-e', `import net from 'node:net'; const server = net.createServer().listen(${port}, '127.0.0.1', () => { console.log('ready'); setInterval(() => {}, 1000); });`],
		{ stdio: ['ignore', 'pipe', 'pipe'] },
	);
	try {
		await new Promise((resolve, reject) => {
			child.once('error', reject);
			child.once('exit', code => reject(new Error(`Listener exited before readiness (${code})`)));
			child.stdout.setEncoding('utf8').on('data', chunk => {
				if (chunk.includes('ready')) resolve();
			});
		});
		assert.ok(portOwners(port).includes(child.pid));
		await acquirePort(port);
		assert.deepEqual(portOwners(port), []);
	} finally {
		if (child.exitCode === null) child.kill('SIGKILL');
	}
});
