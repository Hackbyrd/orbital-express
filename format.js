/**
 * Formats all JS code using Prettier standards
 *
 * Run "yarn format" in command line terminal
 */

 'use strict';

 // built-in node modules
 const fs = require('fs');
 const path = require('path');

 // third-party node modules
 const prettier = require('prettier');
 const currentDir = process.cwd(); // the current directory

 // ignore these directories
 const ignoreDirectories = ['node_modules', '.git', 'redis'];

 // methods to detect weather a file is a directory or a .js file
 const isDirectory = source => fs.lstatSync(source).isDirectory();
 const isJsFile = source => fs.lstatSync(source).isFile() && source.trim().substring(source.length - 3).toLowerCase() === '.js';
 const isJsonFile = source => fs.lstatSync(source).isFile() && source.trim().substring(source.length - 5).toLowerCase() === '.json';

 // functions to get directories and js files
 const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
 const getJsFiles = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isJsFile);
 const getJsonFiles = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isJsonFile);

 // store all the directories to format
 let stack = [currentDir];

 // format the js files in the current directory and then add the new directories to the stack
 function formatDirectory(curDir, options) {
   // get all directory contents
   const directoryContents = fs.readdirSync(curDir);

   // if there are directory contents
   if (directoryContents) {
     // get all directories and JS files in this directory
     const directories = getDirectories(curDir);
     const jsFiles = getJsFiles(curDir);
     const jsonFiles = getJsonFiles(curDir);

     // add directories to stack
     for (let i = 0; i < directories.length; i++) {
       let addDir = true;
       let directory = directories[i];

       // go through the ignoreDirectories
       for (let e = 0; e < ignoreDirectories.length; e++) {
         if (directory.indexOf(ignoreDirectories[e]) >= 0) {
           addDir = false;
           break;
         }
       }

       // if not in ignore directories
       if (addDir)
         stack.push(directory);
     }

     // format js files
     for (let i = 0; i < jsFiles.length; i++) {
       const fileName = jsFiles[i];
       const originalJS = fs.readFileSync(fileName, 'utf8');
       const formattedJS = prettier.format(originalJS, options);

       // write file
       fs.writeFileSync(fileName, formattedJS, { encoding: 'utf8', flag: 'w' });
     }

     // format json files
     for (let i = 0; i < jsonFiles.length; i++) {
       const fileName = jsonFiles[i];
       const originalJson = fs.readFileSync(fileName, 'utf8');

       // USE JSON PARSER
       const formattedJson = prettier.format(originalJson, { parser: 'json' });

       // write file
       fs.writeFileSync(fileName, formattedJson, { encoding: 'utf8', flag: 'w' });
     }
   }
 }

 // load prettier configuration
 prettier.resolveConfig(process.cwd()).then(options => {
   // go through the stack
   while (stack.length)
     formatDirectory(stack.pop(), options);

   console.log('Formatting Finished.');
 });
