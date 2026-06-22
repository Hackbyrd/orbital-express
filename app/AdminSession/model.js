/**
 * ADMIN SESSION MODEL
 *
 * Stores revocable refresh tokens for Admins. One row per active session.
 * Mirrors the UserSession pattern exactly — separate table, separate audience space.
 */

'use strict';

// third-party modules
const { v7: uuidv7 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AdminSession = sequelize.define('adminSession', {

    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: () => uuidv7(),
      primaryKey: true,
      validate: { isUUID: 7 },
    },

    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
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

  }, {
    timestamps: true,
    paranoid: false,
    freezeTableName: true,
    tableName: 'AdminSessions',

    indexes: [
      { name: 'AdminSessions_adminId_idx', fields: ['adminId'] },
      { name: 'AdminSessions_tokenHash_unique', fields: ['tokenHash'], unique: true },
    ],
  });

  AdminSession.associate = models => {
    AdminSession.belongsTo(models.admin, {
      as: 'admin',
      foreignKey: 'adminId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }; // END associate

  return AdminSession;
}; // END ADMIN SESSION MODEL
