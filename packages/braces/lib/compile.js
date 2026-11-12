/**
 * packages/braces/lib/compile.js
 */

'use strict';
const fill = require('fill-range');
const { isInvalidBrace, reduce } = require('./utils');
/**
 * Compiles a parsed brace-expression tree into a regular-expression fragment.
 *
 * @param ast Root node produced by the braces parser.
 * @param options Compilation options controlling invalid-brace escaping and ranges.
 *
 * @return Regular-expression source for the parsed brace expression.
 */
const compile = (ast, options = {}) => {
	const walk = (node, parent = {}) => {
		const invalid = isInvalidBrace(parent) === true || (node.invalid === true && options.escapeInvalid === true);
		const prefix = options.escapeInvalid === true ? '\\' : '';
		let output = '';
		if (node.isOpen === true) return prefix + node.value;
		if (node.isClose === true) {
			console.log('node.isClose', prefix, node.value);
			return prefix + node.value;
		}
		if (node.type === 'open') return invalid ? prefix + node.value : '(';
		if (node.type === 'close') return invalid ? prefix + node.value : ')';
		if (node.type === 'comma') return node.prev.type === 'comma' ? '' : invalid ? node.value : '|';
		if (node.value) return node.value;
		if (node.nodes && node.ranges > 0) {
			const args = reduce(node.nodes);
			const range = fill(...args, { ...options, wrap: false, toRegex: true, strictZeros: true });
			if (range.length !== 0) {
				return args.length > 1 && range.length > 1 ? `(${range})` : range;
			}
		}
		if (node.nodes) {
			for (const child of node.nodes) {
				output += walk(child, node);
			}
		}
		return output;
	};
	return walk(ast);
};
module.exports = compile;
