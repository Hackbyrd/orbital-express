/**
 * Compile the language files into the locales directory
 *
 * "yarn lang" runs this script
 */

// services
const language = require('../services/language.js');

// compile language files
language.compile();
