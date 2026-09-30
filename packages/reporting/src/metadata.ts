/**
 * packages/reporting/src/metadata.ts
 * Neutral metadata helpers for Open XML spreadsheet and slideshow artifacts.
 */

import fs from 'node:fs/promises';
import JSZip from 'jszip';

/** Replaces library-generated application labels with neutral evidence metadata. */
export const neutralizeApplicationMetadata = async (file: string): Promise<void> => {
	const archive = await JSZip.loadAsync(await fs.readFile(file));
	const applicationProperties = archive.file('docProps/app.xml');
	if (!applicationProperties) return;
	const xml = await applicationProperties.async('string');
	archive.file(
		'docProps/app.xml',
		xml.replace(/<Application>[^<]*<\/Application>/, '<Application>Test evidence reporter</Application>').replace(/<Company>[^<]*<\/Company>/, '<Company>Test evidence</Company>'),
	);
	await fs.writeFile(file, await archive.generateAsync({ type: 'nodebuffer' }));
};
