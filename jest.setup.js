/**************************************
 * THIS IS RUN BEFORE EVERY TEST FILE *
 **************************************/

// build-in node modules
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

// load test env
require('dotenv').config({ path: path.join(__dirname, './config/.env.test') });
// jest.mock('services/plaid');

// store dynamic database names in a file
const DATABASE_NAMES_FILE = path.join(__dirname, 'jest.database.txt');

// env variables
const { DATABASE_URL } = process.env;

// connect to psql DB
const conn = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // log here, if you want log, put in console.log
});

// split database url to get database name
const splitDatabaseURL = DATABASE_URL.split('/');

// get current database name
const currentDatabaseName = splitDatabaseURL[splitDatabaseURL.length - 1];

// create new dynamic database name
const newDatabaseName = `${currentDatabaseName}_${process.pid}_${Date.now()}`;

// replace current database name with new dynamic database name in the url
const newDatabaseURL = DATABASE_URL.replace(currentDatabaseName, newDatabaseName);

// create new dynamic database
const createDynamicDatabase = async () => {
  try {
    // Create a new test database dynamically
    await conn.query(`CREATE DATABASE "${newDatabaseName}";`);
    console.log(`✅ Created test database: ${newDatabaseName}`);

    // add new database name to database.txt file so we can drop it after tests are run
    await fs.promises.appendFile(DATABASE_NAMES_FILE, newDatabaseName + '\n');
  } catch (error) {
    console.error(`❌ Error creating database: ${newDatabaseName}`, error);
  } finally {
    await conn.close();
  }
};

// run function
module.exports = async () => {
  // create new dynamic database
  await createDynamicDatabase();

  // set new database url
  process.env.DATABASE_URL = newDatabaseURL;
};
