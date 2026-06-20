/**
 * USER MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 *
 * A User is an account. Users authenticate two ways:
 *   1. email + password  (salt/password set) — also the path used by all test fixtures
 *   2. Sign in with Google (googleId set)    — salt/password may be null
 * Our own refresh-token sessions live in UserSession; the Google OAuth tokens
 * (accessToken/refreshToken/tokenExpiry) on this table are for Google API access.
 */

'use strict';

// require custom node modules
const bcrypt = require('bcrypt');
const constants = require('../../helpers/constants');

// sensitive data that should not be exposed to the client
const sensitiveData = ['salt', 'password', 'passwordResetToken', 'accessToken', 'refreshToken'];
const privateData = sensitiveData.slice();

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {

    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      validate: {
        isUUID: 4
      }
    },

    // All foreign keys are added in associations

    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC'
    },

    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: constants.LOCALE.EN
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },

    profileImageUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      // unique: true - set unique in index section
    },

    // Google subject id ('sub' claim) — the lookup key when logging in with Google.
    // Null for email/password-only users.
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      // unique: true - set unique in index section
    },

    // Google OAuth tokens (encrypted) — for Google API access
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },

    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },

    tokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },

    salt: {
      type: DataTypes.STRING,
      allowNull: false
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      // unique: true - set unique in index section
    },

    passwordResetExpire: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },

    isEmailConfirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    loginCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true
      }
    },

    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: constants.USER_ROLE.USER
    },

    onboardingCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    // incremented to instantly invalidate ALL of this user's outstanding access tokens
    // (password change, "log out everywhere", compromise). Embedded in the access token and
    // checked in the JWT strategy — a mismatch rejects the token.
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true
      }
    }
  }, {
    timestamps: true, // allows sequelize to create timestamps automatically

    // A paranoid table is one that, when told to delete a record, it will not truly delete it. Instead, a special column called deletedAt will have its value set to the timestamp of that deletion request. This means that paranoid tables perform a soft-deletion of records, instead of a hard-deletion.
    // For select (findOne, findAll etc) automatically ignore all rows when deletedAt is not null, if you really want to let the query see the soft-deleted records, you can pass the paranoid: false option to the query method
    paranoid: true,
    freezeTableName: true, // allows sequelize to pluralize the model name
    tableName: 'Users', // define table name, must be PascalCase!

    // indexes
    indexes: [
      { name: 'Users_email_unique', fields: ['email'], unique: true },
      { name: 'Users_googleId_unique', fields: ['googleId'], unique: true },
      { name: 'Users_passwordResetToken_unique', fields: ['passwordResetToken'], unique: true },
      { name: 'Users_role_idx', fields: ['role'] }
    ],

    // default scope to exclude sensitive data
    // Ex. User.scope(null).findAll() // to get everything including sensitive data
    defaultScope: {
      attributes: {
        exclude: sensitiveData,
      },
    },

    hooks: {
      // Hash on beforeValidate (NOT beforeCreate) so `salt`/`password` are populated BEFORE the
      // notNull validation runs. Guarded by changed('password') so it fires on create and on a
      // real password change, but NOT on ordinary profile updates (which would re-hash the hash).
      beforeValidate(user, options) {
        if (user.changed('password') && user.password) {
          user.salt = bcrypt.genSaltSync(constants.BCRYPT_ROUNDS);
          user.password = bcrypt.hashSync(user.password, user.salt);
        }
      }
    },
  });

  // association
  User.associate = models => {

    // User has many UserSessions (our own revocable refresh-token sessions)
    User.hasMany(models.userSession, {
      as: 'userSessions',
      foreignKey: 'userId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  } // END associate

  // sensitive data method
  User.getSensitiveData = () => {
    return sensitiveData;
  };

  // private data method
  User.getPrivateData = () => {
    return privateData;
  };

  // check if valid password
  User.validatePassword = async (password, secret) => {
    return new Promise((resolve, reject) => {
      // compare both, result is either true or false
      bcrypt.compare(password, secret, async (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });
  };

  return User;
} // END USER MODEL
