/**
 * packages/quality/test/source-automation.test.mjs
 * Verifies conservative JSX accessible-name and React display-name automation.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { accessibilityFindings, createQualityCfg, displayNameFindings, fixAccessibleNames, fixDisplayNames, qualityCheckEnabled } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../support/fixtures.mjs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Creates a quality config scoped to one JSX fixture. */
function fixtureConfig(source) {
	const root = fixtureRoot('terra-quality-accessibility-');
	fixtureFile(root, 'src/view.tsx', source);
	return { root, cfg: createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] }) };
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('accessible names recognize ARIA, labels, static text, and image alternatives', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<button aria-label="Close" />
	<button aria-labelledby="closeText" />
	<span id="closeText">Close</span>
	<button>Save</button>
	<button><span>Close</span></button>
	<button>{'Save'}</button>
	<label htmlFor="email">Email <span>address</span></label>
	<input id="email" />
	<label><span>Notes</span><textarea /></label>
	<a href="/next">Next</a>
	<area href="/map" alt="Section" />
	<input type="image" alt="Search" />
	<button><img src="close.svg" alt="Close" /></button>
	<button><svg aria-label="Expand"><path /></svg></button>
	<div role="button">Open</div>
	<input type="submit" />
</>;
`);
	assert.deepEqual(accessibilityFindings(cfg), []);
});

test('new default-path checks require an explicit rollout toggle', () => {
	const root = fixtureRoot('terra-quality-check-rollout-');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.equal(qualityCheckEnabled(cfg, 'accessibility'), false);
	assert.equal(qualityCheckEnabled(cfg, 'display-name'), false);
	assert.equal(qualityCheckEnabled(cfg, 'documented-commands'), false);
	const enabled = createQualityCfg({ ...cfg, enabledChecks: { accessibility: true, 'display-name': true, 'documented-commands': true } });
	assert.equal(qualityCheckEnabled(enabled, 'accessibility'), true);
	assert.equal(qualityCheckEnabled(enabled, 'display-name'), true);
	assert.equal(qualityCheckEnabled(enabled, 'documented-commands'), true);
});

test('aria-labelledby requires a literal reference with source-evident content', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<button aria-labelledby="missing" />
	<button aria-labelledby="empty" />
	<span id="empty">{'   '}</span>
	<button aria-labelledby="dynamic" />
	<span id="dynamic">{label}</span>
	<button aria-labelledby="duplicate" />
	<span id="duplicate"></span>
	<span id="duplicate">Maybe</span>
	<button aria-labelledby="component" />
	<DisplayLabel id="component" />
	<button aria-labelledby="custom-element" />
	<custom-label id="custom-element" />
	<button aria-labelledby="known missing" />
	<span id="known">Save</span>
	<button aria-labelledby="known" />
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ element }) => element),
		['<button>', '<button>'],
	);
});

test('findings are limited to unnamed visible native and explicitly role-based controls', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<button />
	<input id="email" />
	<a href="/next" />
	<div role="switch" />
	<custom-button />
	<Button />
	<button hidden />
	<div aria-hidden="true"><button /></div>
	<input type="hidden" />
	<button>{label}</button>
	<button><Icon /></button>
	<button aria-label={label} />
	<button title={dynamicTitle} />
	<a>Not a link</a>
</>;
`);
	const findings = accessibilityFindings(cfg);
	assert.deepEqual(
		findings.map(({ element, fixable }) => [element, fixable]),
		[
			['<button>', false],
			['<input>', false],
			['<a>', false],
			['<div>[role="switch"]', false],
		],
	);
	assert.ok(findings.every(({ message }) => message.includes('add static text')));
});

test('progress values and aria-valuetext do not substitute for a progressbar accessible name', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<progress value={0.5}>50%</progress>
	<div role="progressbar" aria-valuenow="50" aria-valuetext="Halfway" />
	<progress aria-label="Upload progress" value={0.5} />
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ element }) => element),
		['<progress>', '<div>[role="progressbar"]'],
	);
});

test('title fixes copy only literal titles from controls with no visible or uncertain label', () => {
	const { root, cfg } = fixtureConfig(`
const view = <>
	<button title="Close" />
	<button title={'Open panel'} aria-label="" />
	<button title="Save">Save</button>
	<button title="Dynamic">{label}</button>
	<button title="Uncertain"><Icon /></button>
	<button title="Decorative"><svg aria-hidden="true"><path /></svg></button>
	<label htmlFor="search">Search</label>
	<input id="search" title="Search" />
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ fixable }) => fixable),
		[true, true, true],
	);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 3 });
	const fixed = fixtureText(root, 'src/view.tsx');
	assert.match(fixed, /<button title="Close" aria-label="Close" \/>/);
	assert.match(fixed, /<button title=\{'Open panel'\} aria-label=\{'Open panel'\} \/>/);
	assert.match(fixed, /title="Decorative" aria-label="Decorative"/);
	assert.match(fixed, /<button title="Save">Save<\/button>/);
	assert.match(fixed, /<button title="Dynamic">\{label\}<\/button>/);
	assert.match(fixed, /<button title="Uncertain"><Icon \/><\/button>/);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 0 });
});

test('decorative SVG fixes require an already named control and leave informative icons alone', () => {
	const { root, cfg } = fixtureConfig(`
const view = <>
	<button aria-label="Close"><svg><path /></svg></button>
	<button>Save <span><svg viewBox="0 0 10 10"><path /></svg></span></button>
	<button aria-label="Play"><svg role="img" aria-label="Play preview"><path /></svg></button>
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ element, fixable }) => [element, fixable]),
		[
			['<svg>', true],
			['<svg>', true],
		],
	);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 2 });
	const fixed = fixtureText(root, 'src/view.tsx');
	assert.equal((fixed.match(/aria-hidden="true"/g) ?? []).length, 2);
	assert.match(fixed, /role="img" aria-label="Play preview"/);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 0 });
});

test('malformed JSX is reported without edits', () => {
	const { root, cfg } = fixtureConfig('<button title="Save" aria-label=>');
	const before = fixtureText(root, 'src/view.tsx');
	assert.deepEqual(accessibilityFindings(cfg), []);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 0 });
	assert.equal(fixtureText(root, 'src/view.tsx'), before);
});

test('displayName findings report direct forwardRef components and ignore wrapped forms', () => {
	const root = fixtureRoot('terra-quality-display-name-findings-');
	fixtureFile(
		root,
		'src/components.tsx',
		`const Missing = forwardRef<HTMLButtonElement, Props>((props, ref) => <button ref={ref} {...props} />);\nconst AlsoMissing = React.forwardRef((props, ref) => <button ref={ref} {...props} />);\nconst Wrapped = memo(forwardRef((props, ref) => <button ref={ref} {...props} />));\nconst Existing = React.forwardRef(() => null);\nExisting.displayName = 'Existing';\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(displayNameFindings(cfg), [
		{ file: 'src/components.tsx', line: 1, column: 7, component: 'Missing', recommendation: "add Missing.displayName = 'Missing'" },
		{ file: 'src/components.tsx', line: 2, column: 7, component: 'AlsoMissing', recommendation: "add AlsoMissing.displayName = 'AlsoMissing'" },
	]);
	assert.equal(fixtureText(root, 'src/components.tsx').includes("Missing.displayName = 'Missing'"), false);
});

test('displayName autofix is idempotent and preserves conflicting assignments', () => {
	const root = fixtureRoot('terra-quality-display-name-fix-');
	fixtureFile(
		root,
		'src/components.tsx',
		`const First = forwardRef(() => null);\nconst Existing = forwardRef(() => null);\nExisting.displayName = 'SpecializedName';\nconst Inline = forwardRef(() => null); const Other = React.forwardRef(() => null);\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 1, skipped: 3 });
	assert.match(fixtureText(root, 'src/components.tsx'), /First\.displayName = 'First'/);
	assert.match(fixtureText(root, 'src/components.tsx'), /Existing\.displayName = 'SpecializedName'/);
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 0, skipped: 3 });
});

test('displayName assignments resolve within lexical scope when component names repeat', () => {
	const root = fixtureRoot('terra-quality-display-name-scopes-');
	fixtureFile(
		root,
		'src/components.tsx',
		`function first() {\n\tconst Button = forwardRef(() => null);\n\tButton.displayName = 'Button';\n}\nfunction second() {\n\tconst Button = forwardRef(() => null);\n}\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(
		displayNameFindings(cfg).map(({ component, line }) => ({ component, line })),
		[{ component: 'Button', line: 6 }],
	);
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 1, skipped: 0 });
	assert.match(fixtureText(root, 'src/components.tsx'), /function second\(\) \{\n\tconst Button = forwardRef\(\(\) => null\);\n\tButton\.displayName = 'Button';/);
	assert.deepEqual(displayNameFindings(cfg), []);
});

test('displayName fixer leaves malformed source untouched', () => {
	const root = fixtureRoot('terra-quality-display-name-malformed-');
	fixtureFile(root, 'src/components.tsx', 'const Broken = forwardRef(() => <button>');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	const before = fixtureText(root, 'src/components.tsx');
	assert.deepEqual(displayNameFindings(cfg), []);
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 0, skipped: 0 });
	assert.equal(fixtureText(root, 'src/components.tsx'), before);
});
