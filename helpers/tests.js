/**
 * Helpers for tests
 */

'use strict';

// built-in
const fs = require('fs');
const path = require('path');

// require models
const models = require('../models'); // grab db connection

// the order in which to create tables and add fixture data
const seq = require('../database/sequence');

// redis client
const redisClient = require('../services/redis');

// Fixtures
const fixturesSqlObj = {}; // this is for allow us to read from the fixture sql file only ONCE and then storing the string instead of reading the file every time a test is run. Basically save the sql statement sql in memory only ONCE ever time we run the suite of tests

module.exports = {
  login,
  adminLogin,
  userLogin,
  reset,
  resetRedis,
  populateFix,
  populate
};

/**
 * Log in a user
 *
 * @app - (OBJECT - REQUIRED): The express server
 * @version - (STRING - REQUIRED): The api version
 * @request - (OBJECT - REQUIRED): The supertest request object
 * @model - (STRING - REQUIRED): 'users', 'admins', 'partners', 'drivers', etc...
 * @user - (OBJECT - REQUIRED): The user to login
 *
 * return the JSON web token
 */
async function login(app, version, request, model, user) {
  try {
    // login request
    const response = await request(app)
      .post(`${version}/${model}/login`)
      .send({
        email: user.email,
        password: user.password
      });

    // return the token and response
    return {
      token: response.body.token,
      response
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
} // END login

/**
 * Log an admin in
 *
 * @app - (OBJECT - REQUIRED): The express server
 * @version - (STRING - REQUIRED): The api version
 * @request - (OBJECT - REQUIRED): The supertest request object
 * @admin - (OBJECT - REQUIRED): The admin fixture to login
 *
 * return the JSON web token
 */
async function adminLogin(app, version, request, admin) {
  // login request
  return login(app, version, request, 'admins', admin);
}

/**
 * Log a user in
 *
 * @app - (OBJECT - REQUIRED): The express server
 * @version - (STRING - REQUIRED): The api version
 * @request - (OBJECT - REQUIRED): The supertest request object
 * @user - (OBJECT - REQUIRED): The iser fixture to login
 *
 * return the JSON web token
 */
async function userLogin(app, version, request, user) {
  // login request
  return login(app, version, request, 'users', user);
}

/**
 * Reset the test database
 *
 * Clear all fixture data, throws error automatically if there is one
 */
async function reset() {
  await models.db.authenticate();
  await models.db.sync({ force: true });
}

/**
 * Reset the redis database
 *
 * Clear all redis data
 */
async function resetRedis() {
  await redisClient.flushAll();
}

/**
 * Populates database according to the fixture set passed in. Uses js fixtures instead of .sql fixtures
 * Uses the sequence file to determine the order in which to populate the database.
 *
 * @fixtureFolderName - (STRING - REQUIRED): The fixtures folder name so we know which fixture to populate, ex. fix1, fix2, etc...
 *
 * return the JSON web token
 */
async function populateFix(fixtureFolderName) {
  let fixtures = []; // store array of fixture arrays
  let files = []; // file names that coorespond to the fixtures

  try {
    // turn off foreign key restrictions
    await models.db.query('SET CONSTRAINTS ALL DEFERRED');

    // load regular fixtures
    if (fixtureFolderName !== null) {
      // folder path to test fixtures
      const fixturesFolderPath = path.join(__dirname, '../test', 'fixtures', fixtureFolderName);

      // get data to insert
      fs.readdirSync(fixturesFolderPath)
        .filter(file => file.indexOf('.js') >= 0 ) // only js files
        .forEach(file => {
          const data = require(path.join(fixturesFolderPath, file));
          fixtures.push(data);
          files.push(file.replace('.js', '')); // remove '.js'
        });
    } // end load regular fixtures

    let idx = 0; // index
    const orderedFixtures = [];
    const orderedFiles = [];

    // order the files
    for (let i = 0; i < seq.length; i++) {
      for (let j = 0; j < files.length; j++) {
        if (seq[i] === files[j]) {
          orderedFixtures.push(fixtures[j]);
          orderedFiles.push(files[j]);
          break;
        }
      }
    }

    // reorder
    fixtures = orderedFixtures;
    files = orderedFiles;

    // populate database for each fixture
    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i];

      // bulk create
      await models[files[idx]]
        .bulkCreate(fixture, {
          validate: true,
          // hooks: true,
          individualHooks: true
        });

      const tableName = models[files[idx]].getTableName(); // grab tablename of model
      const queryText = `SELECT setval('"${tableName}_id_seq"', (SELECT MAX(id) FROM "${tableName}"));`;

      await models.db.query(queryText);
      idx++;
    }

    return true;
  } catch (error) {
    // turn back on foreign key restrictions
    await models.db.query('SET CONSTRAINTS ALL IMMEDIATE')
      .catch(err => { throw err; });

    throw error;
  }
}

/**
 * Populates database according to the fixture set passed in. This uses the .sql fixtures instead of the .js fixtures
 *
 * @fixtureName - (STRING - REQUIRED): The fixtures name so we know which fixture to populate, ex. "fix1" or "fix1.sql", "fix2" or "fix2.sql", etc...
 *
 * return true
 */
async function populate(fixtureName) {
  // add .sql if not already there
  if (fixtureName.indexOf('.sql') < 0) fixtureName = fixtureName + '.sql';

  try {
    // if we have not already stored the sql statement in memory, read the .sql file the first time and then store in memory so we don't have to read file again
    if (!fixturesSqlObj[fixtureName]) {
      // grab sql statement and then execute it
      const fixturesSqlFilePath = path.join(__dirname, '../test', 'fixtures', fixtureName);
      const sqlStatement = fs.readFileSync(fixturesSqlFilePath, { encoding: 'utf8', flag: 'r' });
      fixturesSqlObj[fixtureName] = sqlStatement; // store sql statement
    }

    // execute query
    await models.db.query(fixturesSqlObj[fixtureName]);
    return true;
  } catch (error) {
    console.log(error);
    throw error;
  }
} // END populate
