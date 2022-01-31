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

 // the file to compile
 const MAILER_FILE = 'index.ejs';

 // check if is directory and get directories
 const isDirectory = source => fs.lstatSync(source).isDirectory();
 const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);

 // Compile and generate a preview of all the templates in global mailers folder and feature folders
 async function compile() {
   // compile feature folders
   const appDir = path.join(__dirname, '../app');
   const featureFolders = getDirectories(appDir);

   // go through and compile mailer for each feature folder
   for (let i = 0; i < featureFolders.length; i++) {
     const featureFolderMailerDir = path.join(featureFolders[i], 'mailers')

     // compile
     await compileMailer(featureFolderMailerDir);
   }

   // compile the global mailers folder
   await compileMailer(__dirname);
 }

 // Compile and generate a preview of all the templates
 async function compileMailer(dirname) {
   const directories = getDirectories(dirname);

     // go through each email and render preview
     for (let i = 0; i < directories.length; i++) {
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
