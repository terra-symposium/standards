/**
 * packages/quality/src/spinner-worker.ts
 * Animates a quality check while synchronous work blocks the runner's main thread.
 */

import { writeSync } from 'node:fs';
import { workerData } from 'node:worker_threads';

const { label, sharedBuffer } = workerData as { label: string; sharedBuffer: SharedArrayBuffer };
const state = new Int32Array(sharedBuffer);
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frame = 0;

/** Draws the next spinner frame until the parent stops the check.
 *
 * @return Nothing; frames are written directly to standard error.
 */
function draw(): void {
	if (Atomics.load(state, 0)) {
		writeSync(2, '\r\u001b[2K');
		Atomics.store(state, 2, 1);
		Atomics.notify(state, 2);
		return;
	}
	writeSync(2, `\r  ${frames[frame++ % frames.length]} ${label}`);
	Atomics.store(state, 1, 1);
	Atomics.notify(state, 1);
	setTimeout(draw, 90);
}

draw();
