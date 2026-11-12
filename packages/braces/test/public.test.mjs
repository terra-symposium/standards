import assert from 'node:assert/strict';
import test from 'node:test';
import braces from '../index.js';

test('braces compiles alternatives through its utility functions', () => {
	assert.deepEqual(braces('{a,b}'), ['(a|b)']);
});

test('braces expands numeric ranges and enforces the configured limit', () => {
	assert.deepEqual(braces('{1..3}', { expand: true }), ['1', '2', '3']);
	assert.throws(() => braces('{1..3}', { expand: true, rangeLimit: 2 }), RangeError);
});

test('braces preserves nested alternatives', () => {
	assert.deepEqual(braces('a/{b,{1..2}}', { expand: true }), ['a/b', 'a/1', 'a/2']);
});

test('braces accepts the configured maximum nesting depth and rejects the next level', () => {
	for (const [name, open, close] of [
		['braces', '{', '}'],
		['parentheses', '(', ')'],
	]) {
		const pattern = (depth) => `${open.repeat(depth)}x${close.repeat(depth)}`;
		assert.doesNotThrow(() => braces.parse(pattern(100)), `${name} at the maximum depth`);
		assert.throws(() => braces.parse(pattern(101)), { name: 'SyntaxError', message: /max depth \(100\)/u }, `${name} above the maximum depth`);
	}
});

test('all string entrypoints apply the nesting limit before recursive processing', () => {
	const pattern = `{${'('.repeat(101)}x${')'.repeat(101)}}`;
	for (const [name, run] of [
		['default', (input) => braces(input)],
		['create', (input) => braces.create(input)],
		['parse', (input) => braces.parse(input)],
		['stringify', (input) => braces.stringify(input)],
		['compile', (input) => braces.compile(input)],
		['expand', (input) => braces.expand(input)],
		['expand option', (input) => braces(input, { expand: true })],
	]) {
		assert.throws(() => run(pattern), { name: 'SyntaxError', message: /max depth \(100\)/u }, name);
	}
});

test('custom nesting limits may narrow but cannot raise the parser safety cap', () => {
	const pattern = (depth) => `${'{'.repeat(depth)}x${'}'.repeat(depth)}`;
	assert.doesNotThrow(() => braces.parse(pattern(4), { maxDepth: 4 }));
	assert.throws(() => braces.parse(pattern(5), { maxDepth: 4 }), { name: 'SyntaxError' });
	assert.throws(() => braces.parse(pattern(101), { maxDepth: 1000 }), { name: 'SyntaxError', message: /max depth \(100\)/u });
});
