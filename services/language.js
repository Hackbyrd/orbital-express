/**
 * Aggregate all language files app directory to create global language locale files
 *
 * !IMPORTANT: The LOCALES constant variable must have the same number of languages as each feature language folder and the global language folder
 */

'use strict';

// require built-in node modules
const fs = require('fs');
const path = require('path');

// helpers
const { LOCALES } = require('../helpers/constants');

module.exports = {
  compile
};

/**
 * Aggregate all language files app directory to create global language locale files
 */
function compile() {
  // variables
  const APP_DIR = '../app'; // app directory
  const LOCALES_DIR = '../locales'; // locales directory
  const LANGUAGE_DIR = '../language'; // global language directory

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
    const LANG_DIR = path.join(dir, '/language'); // the language folder name
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

compile();
