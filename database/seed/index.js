/**
 * Insert seed data into database
 *
 * Run 'yarn seed <SET> <ENV>'
 * Ex. 'yarn seed set2 development'
 * Default SET = set1
 * Default ENV = development
 */

'use strict';

// built-in
const fs = require('fs');
const path = require('path');

// set environment
process.env.NODE_ENV = process.argv[3] || 'development';

// load env if development
if (process.env.NODE_ENV === 'development')
  require('dotenv').config({ path: path.join(__dirname, '../../config/.env.development') });

// third-party
const async = require('async');
const _ = require('lodash');

// require models
const models = require('../../models'); // grab db connection

// the order in which to create tables and add fixture data
const seq = require('../sequence');

// grab dataset
const dataset = process.argv[2] || 'set1';

// seed the database
(async () => {
  try {
    await models.db.sync({ force: true });

    let fixtures = []; // store array of fixture arrays
    let files = []; // file names that coorespond to the fixtures

    // turn off foreign key restrictions
    await models.db.query('SET CONSTRAINTS ALL DEFERRED');

    // folder path to seed fixtures
    let fixturesFolderPath = path.join(__dirname, dataset);

    // get data to insert
    fs.readdirSync(fixturesFolderPath)
    .filter(file => file.indexOf('.js') >= 0 ) // only js files
    .forEach(file => {
      const data = require(path.join(fixturesFolderPath, file));
      fixtures.push(data);
      files.push(file.replace('.js', '')); // remove '.js'
    });

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

    console.log(`\n✅ Seed ${dataset} Data Added Succesfully!\n`)
    process.exit(0);
  } catch (error) {
    console.log(error);
    throw error;
  }
})();