/**
 * packages/quality/src/lib/port.ts
 * Port acquisition utilities.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import net from 'node:net';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Lists process ids currently listening on a TCP port.
 *
 * @param port TCP port whose listening process IDs should be queried.
 *
 * @return Process IDs currently listening on the port, or an empty array when the query fails.
 */
export function portOwners(port: number): number[] {
	if (!Number.isInteger(port) || port < 0 || port > 65535) return [];
	try {
		return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' })
			.split(/\s+/)
			.filter(Boolean)
			.map(Number)
			.filter(Number.isInteger);
	} catch {
		return [];
	}
}

/**
 * Terminates listeners and waits until a TCP port can be acquired.
 *
 * @param port TCP port that must be available to the caller.
 *
 * @return A promise that resolves once the port can be bound locally.
 */
export async function acquirePort(port: number): Promise<void> {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		for (const pid of portOwners(port)) {
			try {
				process.kill(pid, 'SIGTERM');
			} catch (error) {
				if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error;
			}
		}
		if (portOwners(port).length) await delay(250);
		for (const pid of portOwners(port)) {
			try {
				process.kill(pid, 'SIGKILL');
			} catch (error) {
				if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error;
			}
		}
		try {
			await new Promise<void>((resolve, reject) => {
				const probe = net.createServer();
				probe.once('error', reject);
				probe.once('listening', () => probe.close(() => resolve()));
				probe.listen(port, '127.0.0.1');
			});
			return;
		} catch (error) {
			if (!(error instanceof Error) || !('code' in error) || error.code !== 'EADDRINUSE' || attempt === 19) throw error;
			await delay(100);
		}
	}
}
