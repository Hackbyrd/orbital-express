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

// Extract database components from URL for dynamic database creation
const parseDbUrl = (url) => {
  const dbUrlRegex = /postgres:\/\/([^:]+)(?::([^@]+))?@([^:]+):(\d+)\/([^?]+)/;
  const match = url.match(dbUrlRegex);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  return {
    user: match[1],
    password: match[2] || '',
    host: match[3],
    port: match[4],
    database: match[5]
  };
};

// Function to create a dynamic database connection
let conn = null;
const getDatabaseConnection = (uniqueSuffix = '') => {
  if (NODE_ENV === 'test' && uniqueSuffix) {
    const dbInfo = parseDbUrl(DATABASE_URL);
    const dynamicDbName = `${dbInfo.database}_${uniqueSuffix}`;
    const dynamicDbUrl = `postgres://${dbInfo.user}${dbInfo.password ? ':' + dbInfo.password : ''}@${dbInfo.host}:${dbInfo.port}/${dynamicDbName}`;
    
    return new Sequelize(dynamicDbUrl, {
      ssl: NODE_ENV === 'production' || DB_SSL === 'true' ? true : false,
      dialectOptions: {
        multipleStatements: true,
        decimalNumbers: true,
        ssl: NODE_ENV === 'production' || DB_SSL === 'true' ? { required: true, rejectUnauthorized: false } : false,
        requestTimeout: 3000,
      },
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 10,
        min: 1,
        idle: 10000,
      },
      timezone: '+00:00', // UTC time
    });
  }
  
  // For non-test environments or when no unique suffix is provided, use the default connection
  if (!conn) {
    conn = new Sequelize(DATABASE_URL, {
      ssl: NODE_ENV === 'production' || DB_SSL === 'true' ? true : false,
      dialectOptions: {
        multipleStatements: true,
        decimalNumbers: true,
        ssl: NODE_ENV === 'production' || DB_SSL === 'true' ? { required: true, rejectUnauthorized: false } : false,
        requestTimeout: 3000,
      },
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 10,
        min: 1,
        idle: 10000,
      },
      timezone: '+00:00', // UTC time
    });
  }
  
  return conn;
};

// return the database connection creator
module.exports = getDatabaseConnection;
