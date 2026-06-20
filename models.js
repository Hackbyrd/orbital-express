/**
 * Aggregate all models in app directory to create global models object
 */

'use strict';

// require built-in node modules
const path = require('path');

// require custom modules
const Sequelize = require('sequelize');
const conn = require('./database'); // grab db connection

// STORE ALL MODELS HERE
const models = {};

const modelPaths = [
  path.join(__dirname, './app/User/model.js'),
  path.join(__dirname, './app/UserSession/model.js'),
  path.join(__dirname, './app/Admin/model.js'),
  path.join(__dirname, './app/AdminSession/model.js'),
];

// add each model to models object
modelPaths.forEach(modelPath => {
  const model = require(modelPath)(conn, Sequelize.DataTypes);
  models[model.name] = model;
});

// add all associations AKA foreign key relationships
Object.keys(models).forEach(modelName => {
  if ('associate' in models[modelName])
    models[modelName].associate(models);
});

// attach database connection to models
models.db = conn;
module.exports = models;
