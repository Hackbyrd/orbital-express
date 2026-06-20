/**
 * ADMIN MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 */

'use strict';

// helpers
const bcrypt = require('bcrypt');
const constants = require('../../helpers/constants');
const { randomString } = require('../../helpers/logic');

// sensitive data that should not be exposed
const sensitiveData = ['salt', 'password'];

module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('admin', {

    // All foreign keys are added in associations

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

    // salt should be randomly generated
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

    // Incremented on logout/password-change to invalidate existing refresh tokens
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    timestamps: true,

    // paranoid: soft-deletes via deletedAt instead of hard-deletes
    paranoid: true,
    freezeTableName: true,
    tableName: 'Admins', // must be PascalCase
    hooks: {
      beforeCreate(admin, options) {
        // generate the salt and hash the password
        admin.salt = bcrypt.genSaltSync(constants.PASSWORD_LENGTH_MIN);
        admin.password = bcrypt.hashSync(admin.password, admin.salt);
      }
    },
    indexes: []
  });

  // association
  Admin.associate = models => {
    Admin.hasMany(models.adminSession, {
      as: 'adminSessions',
      foreignKey: 'adminId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }; // END associate

  // sensitive data method
  Admin.getSensitiveData = () => {
    return sensitiveData;
  };

  // check if valid password
  Admin.validatePassword = async (password, secret) => {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, secret, async (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });
  };

  return Admin;
}
