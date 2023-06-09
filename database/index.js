/**
 * Connection to Database
 *
 * http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html
 * https://devcenter.heroku.com/articles/upgrading-heroku-postgres-databases#upgrading-with-pg-copy
 */

'use strict';

// env variables
const { NODE_ENV, DATABASE_URL, DB_SSL } = process.env;

// require third-party node modules
const Sequelize = require('sequelize');
const pg = require('pg');
pg.defaults.ssl = NODE_ENV === 'production' || DB_SSL === 'true' ? true : false;
pg.defaults.parseInt8 = true; // This will force Sequelize to parse the BIGINT type from DB as number in JS

// connect to psql DB
const conn = new Sequelize(DATABASE_URL, {
  // only use this if trying to connect remotely
  ssl: NODE_ENV === 'production' || DB_SSL === 'true' ? true : false,
  dialectOptions: {
    multipleStatements: true, // allows us to run multiple statements at once in a raw sequelize.query method
    decimalNumbers: true, // postgres returns string decimals, this will convert it to a decimal

    // need to put this here because: https://stackoverflow.com/questions/58965011/sequelizeconnectionerror-self-signed-certificate
    ssl: NODE_ENV === 'production' || DB_SSL === 'true' ? { required: true, rejectUnauthorized: false } : false,
    requestTimeout: 3000,
  },

  dialect: 'postgres',
  logging: false, // log here, if you want log, put in console.log
  pool: {
    max: 10,
    min: 1,
    idle: 10000,
  },
  timezone: '+00:00', // UTC time
});

// return sql connection
module.exports = conn;
