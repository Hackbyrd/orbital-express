'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable('Admins', {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,

        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'admin',
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
        email: {
          type: DataTypes.STRING,
          allowNull: false,
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

      await queryInterface.addIndex('Admins', ['email'], {
        name: 'Admins_email_unique',
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('Admins', ['role'], {
        name: 'Admins_role_idx',
        transaction: t,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.dropTable('Admins', { transaction: t });
    });
  },
};
