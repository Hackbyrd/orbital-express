'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable('Users', {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,

        },
        timezone: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'UTC',
        },
        locale: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'en',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        firstName: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: '',
        },
        lastName: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: '',
        },
        profileImageUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: null,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        googleId: {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: null,
        },
        accessToken: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: null,
        },
        refreshToken: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: null,
        },
        tokenExpiry: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        salt: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: '',
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: '',
        },
        passwordResetToken: {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: null,
        },
        passwordResetExpire: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        isEmailConfirmed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        loginCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lastLoginAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'user',
        },
        onboardingCompleted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        tokenVersion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      }, { transaction: t });

      await queryInterface.addIndex('Users', ['email'], {
        name: 'Users_email_unique',
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('Users', ['googleId'], {
        name: 'Users_googleId_unique',
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('Users', ['passwordResetToken'], {
        name: 'Users_passwordResetToken_unique',
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('Users', ['role'], {
        name: 'Users_role_idx',
        transaction: t,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.dropTable('Users', { transaction: t });
    });
  },
};
