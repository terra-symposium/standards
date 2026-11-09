/**
 * packages/braces/lib/stringify.js
 */

'use strict';
const utils = require('./utils');
module.exports = (ast, options = {}) => {
	const stringify = (node, parent = {}) => {
		let output = '';
		if (node.value) {
			if (((options.escapeInvalid && utils.isInvalidBrace(parent)) || (node.invalid === true && options.escapeInvalid === true)) && utils.isOpenOrClose(node)) {
				return '\\' + node.value;
			}
			return node.value;
		}
		if (node.value) return node.value;
		if (node.nodes) {
			for (const child of node.nodes) {
				output += stringify(child);
			}
		}
		return output;
	};
	return stringify(ast);
};
