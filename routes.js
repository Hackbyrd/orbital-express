/**
 * All routes are placed in this file
 * All urls are going to be lowercase
 * All urls will not have underscore or dashes or spaces
 */

 'use strict';

// env variables
const { API_VERSION } = process.env;

 // require built-in node modules
 const fs = require('fs');
 const path = require('path');

 // require third-party modules
 const express = require('express');
 let router = express.Router();

 // variables
 const APP_DIR = './app'; // app directory
 const ROUTE_FILE = 'routes.js'; // the route file name

 // Store all app routes here
 const appRoutes = [];

 // check if is directory and get directories
 const isDirectory = source => fs.lstatSync(source).isDirectory();
 const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
 const directories = getDirectories(path.join(__dirname, APP_DIR));

 // require app routes
 directories.forEach(dir => appRoutes.push(require(`${dir}/${ROUTE_FILE}`)));

 module.exports = passport => {
   // Welcome
   router.all('/', (req, res) => res.status(200).send(`API ${API_VERSION}} - ${req.__('GLOBAL[Language]')}`));

   // All app routes are automatically inserted here
   appRoutes.forEach(r => (router = r(passport, router)));

   // return router
   return router;
 };
