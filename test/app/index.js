/**
 * This file runs all test files in the app feature folders.
 * !Important: DO NOT EDIT THIS FILE.
 */

'use strict';

// require built-in node modules
const fs = require('fs');
const path = require('path');

// require third-party node modules
const glob = require('glob');

// variables
const APP_DIR = '../../app'; // app directory

// check if is directory and get directories
const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
const directories = getDirectories(path.join(__dirname, APP_DIR));

// go though each feature directory and run the tests
directories.forEach(d => {
  let splitArr = d.split('/');
  let featureName = splitArr[splitArr.length - 1];
  let JS_FILES = glob.sync(`app/${featureName}/tests/**/*.js`);

  // require / run all the tests
  JS_FILES.forEach(f => require(path.join('../../', f)));
});