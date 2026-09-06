import { execFileSync } from 'node:child_process';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

/** Lists process ids currently listening on a TCP port. */
export function portOwners(port: number): number[] {
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

/** Terminates listeners and waits until a TCP port can be acquired. */
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
