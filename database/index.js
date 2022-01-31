/**
 * Connection to Database
 *
 * http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html
 * https://devcenter.heroku.com/articles/upgrading-heroku-postgres-databases#upgrading-with-pg-copy
 */

'use strict';

// env variables
const { NODE_ENV, DATABASE_URL } = process.env;

// require third-party node modules
const Sequelize = require('sequelize');
const pg = require('pg');
pg.defaults.ssl = (NODE_ENV === 'production' || DB_SSL === 'true') ? true : false;

// connect to psql DB
const conn = new Sequelize(DATABASE_URL, {
  // only use this if trying to connect remotely
  ssl: (NODE_ENV === 'production' || DB_SSL === 'true') ? true : false,
  dialectOptions: {
    decimalNumbers: true, // postgres returns string decimals, this will convert it to a decimal
    ssl: (NODE_ENV === 'production' || DB_SSL === 'true') ? { required: true, rejectUnauthorized: false } : false,
  },

  dialect: 'postgres',
  logging: false, // log here, if you want log, put in console.log
  pool: {
    max: 10,
    min: 1,
    idle: 10000
  },
  timezone: '+00:00' // UTC time
});

// return sql connection
module.exports = conn;
