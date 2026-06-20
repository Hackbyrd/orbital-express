/**
 * Aggregate all language files app directory to create global language locale files
 *
 * In the actions files, you can access i18n via req.__() or res.__(). The i18n configuration is set in the server.js file
 * In non action files (tasks, services, helpers, scripts, etc...), you must require('i18n') module to use. By default, it will access the ./locales folder for the JSON language files
 *
 * !IMPORTANT: The LOCALES constant variable must have the same number of languages as each feature language folder and the global language folder
 */

'use strict';

// require built-in node modules
const fs = require('fs');
const path = require('path');

// require third-party node modules
const i18n = require('i18n'); // defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files:

// configured i18n
let configuredI18n = null;

// helpers
const { LOCALES, LOCALE } = require('../helpers/constants');

// ENV variables
const { NODE_ENV } = process.env;

module.exports = {
  i18nSettings,
  getLocalI18n,
  compile,
};

/**
 * Return i18n configuration settings. Setup can be found in server.js and other tests files when needed
 */
function i18nSettings() {
  return {
    locales: LOCALES, // set the languages here
    defaultLocale: LOCALE.EN, // default is the first index
    queryParameter: 'lang', // query parameter to switch locale (ie. /home?lang=ch) - defaults to NULL
    cookie: 'i18n-locale', // if you change cookie name, you must also change in verifyJWTAuth res.cookie
    directory: __dirname + '/../locales',
    // objectNotation: true // hierarchical translation catalogs. To enable this feature, be sure to set objectNotation to true

    // Called when a translation key is missing from the locale file.
    // Logs loudly in all environments so missing keys are never silent.
    // In test and production, throws so a missing key cannot reach users.
    missingKeyFn: (locale, value) => {
      const msg = `[i18n] MISSING TRANSLATION KEY: "${value}" for locale "${locale}"`;
      if (NODE_ENV === 'test' || NODE_ENV === 'production')
        throw new Error(msg);
      else
        console.error('\x1b[31m%s\x1b[0m', msg); // red in dev/staging
      return value; // return raw key as fallback so app does not crash
    }
  };
} // END i18nSettings

/**
 * Configure and return a new copy of i18n module with the correct settings. We do this since we don't want all users to be affected by changes. This so every time we call an action or function we get a fresh copy of this.
 */
function getLocalI18n() {
  const localI18n = {}; // local i18n object
  const settings = i18nSettings();
  settings.register = localI18n; // register the local i18n object
  i18n.configure(settings);

  return localI18n;
} // END getLocalI18n

/**
 * Aggregate all language files app directory to create global language locale files
 */
function compile() {
  // variables
  const APP_DIR = '../app'; // app directory
  const LOCALES_DIR = '../locales'; // locales directory
  const LANGUAGE_DIR = '../languages'; // global language directory

  // STORE ALL LANGUAGES HERE
  const LANGUAGES = {};

  // all language files in this directory
  const globalLanguageFiles = fs.readdirSync(path.join(__dirname, LANGUAGE_DIR));

  // go through locale files
  globalLanguageFiles.forEach(file => {
    // only locale files
    if (file.indexOf('.js') < 0)
      return;

    // store the language file
    const langFile = path.join(__dirname, LANGUAGE_DIR, file);
    LANGUAGES[file] = require(langFile);

    // delete require module cache because gulp needs to reload this module if the file changes
    delete require.cache[require.resolve(langFile)];
  });

  // check if is directory and get directories
  const isDirectory = source => fs.lstatSync(source).isDirectory();
  const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);

  // gets all feature folders
  const directories = getDirectories(path.join(__dirname, APP_DIR));

  // for each feature directory
  directories.forEach(dir => {
    const LANG_DIR = path.join(dir, '/languages'); // the language folder name

    if (!fs.existsSync(LANG_DIR)) return;

    const languageFiles = fs.readdirSync(LANG_DIR)

    // append each feature language to the global language object
    languageFiles.forEach(file => {
      // only locale files
      if (file.indexOf('.js') < 0)
        return;

      const langFile = path.join(LANG_DIR, file);

      // store the langauge file
      LANGUAGES[file] = {
        ...LANGUAGES[file],
        ...require(langFile)
      };

      // delete require module cache because gulp needs to reload this module if the file changes
      delete require.cache[require.resolve(langFile)];
    });
  });

  // convert to json and write to locales folder
  LOCALES.forEach(locale => {
    const fd = fs.openSync(path.join(__dirname, LOCALES_DIR, `${locale}.json`), 'w');
    const localeJSON = JSON.stringify(LANGUAGES[`${locale}.js`]);

    // create json file
    fs.writeSync(fd, localeJSON, 0, 'utf-8');
    fs.closeSync(fd);
  });

  // after compiling, validate all static translation keys used in the codebase exist in the default locale
  validateKeys(LANGUAGES[`${LOCALE.EN}.js`]);
} // END compile

/**
 * Scan all app JS files for static translation key calls and verify every key
 * exists in the compiled default locale. Warns in development, throws in test and production.
 *
 * Only checks static string keys — template literal keys (e.g. i18n.__(`${var}_key`)) are
 * dynamic and cannot be statically analyzed, so they are skipped.
 *
 * @compiledLocale - (OBJECT - REQUIRED): The compiled default locale key/value map
 */
function validateKeys(compiledLocale) {
  // directories to scan for translation key usage
  const SCAN_DIRS = [
    path.join(__dirname, '../app'),
    path.join(__dirname, '../services'),
    path.join(__dirname, '../helpers'),
    path.join(__dirname, '../middleware'),
  ];

  const missingKeys = []; // accumulate all missing keys before reporting

  // files to skip — the feature generator template holds i18n calls as literal
  // code strings (e.g. ${upperName}_...) that are not real keys and must not be scanned
  const EXCLUDED_FILES = new Set(['feature.js']);

  // matches a static, single/double-quoted i18n key call — skips template literals
  const KEY_REGEX = /\.__\(['"]([^'"]+)['"]/g;

  // recursively walk a directory and scan every .js file
  function scanDir(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    fs.readdirSync(dirPath).forEach(entry => {
      const fullPath = path.join(dirPath, entry);
      const stat = fs.lstatSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath); // recurse into subdirectory
      } else if (entry.endsWith('.js') && !EXCLUDED_FILES.has(entry)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const regex = new RegExp(KEY_REGEX.source, 'g'); // fresh regex instance per file (global regex has state)
        let match;

        while ((match = regex.exec(content)) !== null) {
          const key = match[1];
          if (!compiledLocale[key]) {
            const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
            missingKeys.push(`  "${key}"  →  ${relativePath}`);
          }
        }
      }
    });
  }

  SCAN_DIRS.forEach(dir => scanDir(dir));

  if (missingKeys.length > 0) {
    // deduplicate — same key may appear in multiple files
    const unique = [...new Set(missingKeys)];
    const msg = `[i18n] ${unique.length} missing translation key(s) found:\n${unique.join('\n')}`;

    if (NODE_ENV === 'test' || NODE_ENV === 'production')
      throw new Error(msg);
    else
      console.warn('\x1b[33m%s\x1b[0m', msg); // yellow warning in dev/staging
  }
} // END validateKeys
