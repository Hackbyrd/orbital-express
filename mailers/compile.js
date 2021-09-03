/**
 * Compile and generate a preview of all the templates
 *
 * Run this to compile:
 * compile(err => { if (err) { console.log(err); process.exit(1); } console.log('Success!'); });
 */

'use strict';

// built-in node modules
const fs = require('fs');
const path = require('path');

// third-party node modules
const ejs = require('ejs');

// Compile and generate a preview of all the templates
async function compile() {
  // the file to compile
  const MAILER_FILE = 'index.ejs';

  // check if is directory and get directories
  const isDirectory = source => fs.lstatSync(source).isDirectory();
  const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
  const directories = getDirectories(__dirname);

    // go through each email and render preview
    for (var i = 0; i < directories.length; i++) {
      const curDir = directories[i];

      // render preview.html
      await render(curDir, MAILER_FILE).catch(err => Promise.reject(err));
    }
}

// renders the ejs file
async function render(directory, file) {
  return new Promise((resolve, reject) => {
    // write html file
    ejs.renderFile(path.join(directory, file), {}, (err, rawHtml) => {
      if (err)
        return reject(err);

      // write file
      fs.writeFileSync(path.join(directory, 'preview.html'), rawHtml);
      return resolve();
    }); // END write html file
  });
}

module.exports = compile;
