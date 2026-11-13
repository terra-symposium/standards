/** Shared formatting style for this repository. */
const config = { arrowParens: 'avoid', jsxSingleQuote: true, printWidth: 200, proseWrap: 'never', singleQuote: true, useTabs: true };
config.plugins = [require('prettier-plugin-astro')];
module.exports = config;
