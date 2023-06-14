'use strict';

// require helpers
const constants = require('../helpers/constants');
const { randomString } = require('../helpers/logic');

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.createTable('Admins', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

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

      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: constants.ADMIN_ROLE.ADMIN
      },
  
      firstName: {
        type: DataTypes.STRING,
        allowNull: false
      },
  
      lastName: {
        type: DataTypes.STRING,
        allowNull: false
      },
  
      // The unique email of the admin user
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
  
      // The unique phone of the admin user
      phone: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
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
  
      // emails 
      emailConfirmed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
  
      emailConfirmationCode: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
  
      emailConfirmationCodeExpire: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      },
  
      emailConfirmationCodeAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
  
      resetEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
  
      // phone
      phoneConfirmed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
  
      phoneConfirmationCode: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
  
      phoneConfirmationCodeExpire: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      },
  
      phoneConfirmationCodeAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
  
      resetPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
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
          isDate: true,
        },
      },

      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },

      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Admins');
  },
};
