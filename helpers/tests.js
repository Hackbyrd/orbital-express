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

module.exports = {
  login,
  adminLogin,
  userLogin,
  reset,
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
  // login request
  const response = await request(app)
    .post(`${version}/${model}/login`)
    .send({
      email: user.email,
      password: user.password
    }).catch(err => Promise.reject(err));

  return Promise.resolve({
    token: response.body.token,
    response
  });
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
 * Populates database according to the fixture set passed in
 *
 * @fixtureFolderName - (STRING - REQUIRED): The fixtures folder name so we know which fixture to populate, ex. fix1, fix2, etc...
 *
 * return the JSON web token
 */
async function populate(fixtureFolderName) {
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

    return Promise.resolve(true);
  } catch (error) {
    // turn back on foreign key restrictions
    await models.db.query('SET CONSTRAINTS ALL IMMEDIATE')
      .catch(err => Promise.reject(err));

    return Promise.reject(error);
  }
}
