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
const { LOCALES } = require('../helpers/constants');

module.exports = {
  i18nSettings,
  getI18n,
  compile,
};

/**
 * Return i18n configuration settings. Setup can be found in server.js and other tests files when needed
 */
function i18nSettings() {
  // set up language for testing. This same setup can be found in server.js and must mimic it
  return {
    locales: LOCALES, // set the languages here
    defaultLocale: LOCALES[0], // default is the first index
    queryParameter: 'lang', // query parameter to switch locale (ie. /home?lang=ch) - defaults to NULL
    cookie: 'i18n-locale', // if you change cookie name, you must also change in verifyJWTAuth res.cookie
    directory: __dirname + '/../locales'
    // objectNotation: true // hierarchical translation catalogs. To enable this feature, be sure to set objectNotation to true
  };
} // END i18nSettings

/**
 * Configure and return i18n module that already has the settings set up to be used in app server, worker server and tests
 */
function getI18n() {
  // if not configured, configure it, else skip since we don't want to do it again
  if (!configuredI18n) {
    i18n.configure(i18nSettings());
    configuredI18n = i18n;
  }

  return configuredI18n;
} // END getI18n

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
}
