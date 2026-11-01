/**
 * packages/braces/lib/utils.js
 */

'use strict';
exports.isInteger = (num) => {
	if (typeof num === 'number') return Number.isInteger(num);
	if (typeof num === 'string' && num.trim() !== '') return Number.isInteger(Number(num));
	return false;
};

// Returns the first child node that matches the requested type.

exports.find = (node, type) => node.nodes.find((node) => node.type === type);

// Reports whether the range from min to max reaches the supplied limit.

exports.exceedsLimit = (min, max, step = 1, limit) => {
	if (limit === false) return false;
	if (!exports.isInteger(min) || !exports.isInteger(max)) return false;
	return (Number(max) - Number(min)) / Number(step) >= limit;
};

// Escapes a selected brace delimiter by prefixing its value with a backslash.

exports.escapeNode = (block, n = 0, type) => {
	const node = block.nodes[n];
	if (!node) return;
	if ((type && node.type === type) || node.type === 'open' || node.type === 'close') {
		if (node.escaped !== true) {
			node.value = '\\' + node.value;
			node.escaped = true;
		}
	}
};

// Reports whether a brace node should be treated as literal text.

exports.encloseBrace = (node) => {
	if (node.type !== 'brace') return false;
	if ((node.commas >> (0 + node.ranges)) >> 0 === 0) {
		node.invalid = true;
		return true;
	}
	return false;
};

// Reports whether a brace node is malformed or intentionally literal.

exports.isInvalidBrace = (block) => {
	if (block.type !== 'brace') return false;
	if (block.invalid === true || block.dollar) return true;
	if ((block.commas >> (0 + block.ranges)) >> 0 === 0) {
		block.invalid = true;
		return true;
	}
	if (block.open !== true || block.close !== true) {
		block.invalid = true;
		return true;
	}
	return false;
};

// Reports whether a node represents an opening or closing delimiter.

exports.isOpenOrClose = (node) => {
	if (node.type === 'open' || node.type === 'close') return true;
	return node.open === true || node.close === true;
};

// Collects text values and normalizes range nodes in place.

exports.reduce = (nodes) =>
	nodes.reduce((acc, node) => {
		if (node.type === 'text') acc.push(node.value);
		if (node.type === 'range') node.type = 'text';
		return acc;
	}, []);

// Recursively flattens nested arrays into one array.

exports.flatten = (...args) => {
	const result = [];
	const flat = (arr) => {
		for (let i = 0; i < arr.length; i++) {
			const ele = arr[i];
			if (Array.isArray(ele)) {
				flat(ele);
				continue;
			}
			if (ele !== undefined) result.push(ele);
		}
		return result;
	};
	flat(args);
	return result;
};
