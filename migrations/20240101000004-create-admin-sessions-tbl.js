'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable('AdminSessions', {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,

        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'Admins', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        tokenHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        audience: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        tokenVersion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        replacedBySessionId: {
          type: DataTypes.UUID,
          allowNull: true,
          defaultValue: null,
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
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

      await queryInterface.addIndex('AdminSessions', ['adminId'], {
        name: 'AdminSessions_adminId_idx',
        transaction: t,
      });
      await queryInterface.addIndex('AdminSessions', ['tokenHash'], {
        name: 'AdminSessions_tokenHash_unique',
        unique: true,
        transaction: t,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.dropTable('AdminSessions', { transaction: t });
    });
  },
};
