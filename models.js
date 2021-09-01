/**
 * Aggregate all models in app directory to create global models object
 */

'use strict';

// require built-in node modules
const fs = require('fs');
const path = require('path');

// require custom modules
const Sequelize = require('sequelize');
const conn = require('./database'); // grab db connection

// variables
const APP_DIR = './app'; // app directory
const MODEL_FILE = 'model.js'; // the model file name

// STORE ALL MODELS HERE
const models = {};

// check if is directory and get directories
const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
const directories = getDirectories(path.join(__dirname, APP_DIR));

// add each model to models object
directories.forEach(dir => {
  fs.readdirSync(dir).filter(file => file === MODEL_FILE).forEach(file => {
    // DEPRECATED: Sequelize V5 and lower - let model = conn.import(path.join(dir, file));

    // Sequelize V6
    // https://stackoverflow.com/questions/62917111/sequelize-import-is-not-a-function

    // read model file
    let model = require(path.join(dir, file))(conn, Sequelize.DataTypes)
    models[model.name] = model;
  });
});

// add all associations AKA foreign key relationships
Object.keys(models).forEach(modelName => {
  if ('associate' in models[modelName])
    models[modelName].associate(models);
});

// attach database connection to models
models.db = conn;
module.exports = models;
