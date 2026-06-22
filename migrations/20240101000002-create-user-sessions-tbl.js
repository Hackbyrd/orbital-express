'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable('UserSessions', {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,

        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        // SHA-256 hash of the opaque refresh token — never store the raw token
        tokenHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        // Audience identifies the client kind (user-web, user-app, etc.)
        audience: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        // Snapshot of user.tokenVersion at session creation — used to detect LogoutAll
        tokenVersion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        // Points to the session that replaced this one during rotation
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

      await queryInterface.addIndex('UserSessions', ['userId'], {
        name: 'UserSessions_userId_idx',
        transaction: t,
      });
      await queryInterface.addIndex('UserSessions', ['tokenHash'], {
        name: 'UserSessions_tokenHash_unique',
        unique: true,
        transaction: t,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.dropTable('UserSessions', { transaction: t });
    });
  },
};
