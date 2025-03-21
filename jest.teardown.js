/*************************************
 * THIS IS RUN AFTER EVERY TEST FILE *
 *************************************/

// build-in node modules
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

// load test env
require('dotenv').config({ path: path.join(__dirname, './config/.env.test') });

const dropDynamicDatabase = async () => {
  // env variables
  // the DATABASE_URL is the dynamic database url that was created for the test
  const { DATABASE_URL } = process.env;

  // store dynamic database names in a file
  const DATABASE_NAMES_FILE = path.join(__dirname, 'jest.database.txt');

  // read dynamic database names from file
  const dynamicDatabaseNames = await fs.promises.readFile(DATABASE_NAMES_FILE, 'utf8');

  // split dynamic database names by newline
  const dynamicDatabaseNamesArray = dynamicDatabaseNames.split('\n');

  // connect to psql DB using the original database url so we can drop the dynamic database
  const conn = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // log here, if you want log, put in console.log
  });

  try {
    // Loop through all dynamically created databases and drop them
    for (let i = 0; i < dynamicDatabaseNamesArray.length; i++) {
      const databaseName = dynamicDatabaseNamesArray[i];

      // if the database name is not empty, drop it
      if (databaseName.trim() !== '') {
        console.log(`🗑️ Dropping test database: ${databaseName}`);
        await conn.query(`DROP DATABASE IF EXISTS "${databaseName}";`);
      }
    }

    // delete jest.database.txt
    await fs.promises.unlink(DATABASE_NAMES_FILE);
  } catch (error) {
    console.error(`❌ Error dropping database!`, error);
  } finally {
    await conn.close();
  }
};

module.exports = async () => {
  await dropDynamicDatabase();
};
