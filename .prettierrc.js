/**
 * Prettier.js
 *
 * Style configuration for application
 * Docs: https://prettier.io/docs/en/options.html
 */

 module.exports = {
  parser: 'babel', // js parser
  printWidth: 160, // Specify the line length that the printer will wrap on.
  tabWidth: 2, // Specify the number of spaces per indentation-level.
  useTabs: false, // Indent lines with tabs instead of spaces.
  semi: true, // Print semicolons at the ends of statements.
  singleQuote: true, // Use single quotes instead of double quotes.
  quoteProps: 'as-needed', // Change when properties (keys / names) in objects are quoted.
  trailingComma: 'none', // Print trailing commas wherever possible when multi-line. (A single-line array, for example, never gets trailing commas.)
  bracketSpacing: true, // Print spaces between brackets in object literals.
  arrowParens: 'avoid', // Include parentheses around a sole arrow function parameter.
  endOfLine: 'lf' // Line Feed only (\n), common on Linux and macOS as well as inside git repos
};
