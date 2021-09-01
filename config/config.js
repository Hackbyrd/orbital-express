/**
 *  This file is for setting up the database connection based on the correct enviroment
 */

'use strict';

const path = require('path');
const { NODE_ENV } = process.env;

// if undefined or development, default to development
if (NODE_ENV === undefined || NODE_ENV === 'development')
  require('dotenv').config({ path: path.join(__dirname, '.env.development') });
// if test
else if (NODE_ENV === 'test')
  require('dotenv').config({ path: path.join(__dirname, '.env.test') });

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      decimalNumbers: true // postgres returns string decimals, this will convert it to a decimal
    }
  },

  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      decimalNumbers: true // postgres returns string decimals, this will convert it to a decimal
    }
  },

  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',

    // https://github.com/sequelize/cli/issues/154
    ssl: true,
    dialectOptions: {
      decimalNumbers: true, // postgres returns string decimals, this will convert it to a decimal
      ssl: {
        require: true
      }
    }
  }
};
