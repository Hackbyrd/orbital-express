/**
 * Postgres Service
 * Dynamically Generate New Test Database
 *
 * THIS CODE MUST RUN BEFORE the test database connection is made because we need to dynmically generate the test database since we are running tests in parallel
 *
 * https://node-postgres.com/
 */

'use strict';

// ENV variables
const { NODE_ENV, DATABASE_URL, DATABASE_URL_TEST } = process.env;

// helpers
const logic = require('../helpers/logic');

// models
const models = require('../models')();

// require and set up pg
const Sequelize = require('sequelize');
const { Client } = require('pg');
const pgClient = new Client(DATABASE_URL_TEST);
const newDatabaseName = logic.randomString({ len: 16 });

module.exports = {
  createDatabase,
  dropDatabase
};

/**
 * Creates a new database with a dynamically generated name
 */
function createDatabase(done) {
  // connect to test database
  pgClient
    .connect()
    .then(() => {
      // create new database
      return pgClient.query(`CREATE DATABASE "${newDatabaseName}";`);
    })
    // .then(result => {
    //   return models.db.close();
    // })
    .then(result => {
      // update DATABASE_URL
      process.env.DATABASE_URL = DATABASE_URL + `${newDatabaseName}`;

      // reconnect to new database
      models.db = new Sequelize(process.env.DATABASE_URL, {
        // only use this if trying to connect remotely
        ssl: NODE_ENV === 'production' ? true : false,
        dialectOptions: {
          ssl: NODE_ENV === 'production' ? true : false
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

      done();
    })
    .catch(err => done(err));
}

// disconnect and drop database
function dropDatabase(done) {
  // close existing connection
  models.db
    .close()
    .then(() => {
      pgClient.end();
      done();
    })
    .catch(err => done(err));

  // close existing connection
  // models.db.close().then(() => {
  //   // drop the dynamically created database
  //   return pgClient.query(`DROP DATABASE "${newDatabaseName}";`)
  // }).then(result => {
  //   // end connection
  //   pgClient.end();
  //   done();
  // }).catch(err => done(err));
}
