/**
 * ADMIN MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 */

'use strict';

// require custom node modules
const constants = require('../../helpers/constants'); // grab format helper functions

// helpers
const bcrypt = require('bcrypt');
const { randomString } = require('../../helpers/logic');

// sensitive data that should be be seen by any admins
const sensitiveData = ['salt', 'password', 'passwordResetToken'];

module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('admin', {
    // All foreign keys are added in associations

    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC'
    },

    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en'
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // The unique email of the user
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },

    // The unique phone of the user
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },

    // salt should be randomly generate
    salt: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      defaultValue: randomString({ len: 128, uppercase: true, numbers: true, special: true })
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // A token to help facilitate changing passwords
    passwordResetToken: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      defaultValue: null
    },

    // When the new password will expire
    passwordResetExpire: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },

    // Whether user has accepted terms or not
    acceptedTerms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    // The number of times the user has logged in
    loginCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true
      }
    },

    // The last time the user has logged in
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      validate: {
        isDate: true
      }
    },

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      validate: {
        isDate: true
      }
    }
  }, {
    timestamps: true, // allows sequelize to create timestamps automatically
    freezeTableName: true, // allows sequelize to pluralize the model name
    tableName: 'Admins', // define table name, must be PascalCase!
    hooks: {
      beforeValidate(admin, options) {
        // remove all white space
        if (typeof admin.phone === 'string')
          admin.phone = admin.phone.replace(/ /g, '');
      },

      beforeCreate(admin, options) {
        // generate the salt
        admin.salt = bcrypt.genSaltSync(10);
        admin.password = bcrypt.hashSync(admin.password, admin.salt);
      }
    },
    indexes: []
  });

  // association
  Admin.associate = models => {};

  // sensitive data method
  Admin.getSensitiveData = () => {
    return sensitiveData;
  };

  // check if valid password
  Admin.validatePassword = async (password, secret) => {
    return new Promise((resolve, reject) => {
      // compare both, result is either true or false
      bcrypt.compare(password, secret, async (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });
  };

  return Admin;
};
