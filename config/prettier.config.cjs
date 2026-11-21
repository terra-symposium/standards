/**
 * config/prettier.config.cjs
 */
/**
 * Shared formatting style for this repository.
 */
const config = { arrowParens: 'avoid', jsxSingleQuote: true, printWidth: 200, proseWrap: 'never', singleQuote: true, useTabs: true };
config.plugins = [require.resolve('prettier-plugin-astro')];
config.overrides = [{ files: ['README.md', '**/README.md'], options: { printWidth: 100, proseWrap: 'always' } }];
module.exports = config;
