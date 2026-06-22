/**
 * USER SESSION MODEL
 *
 * Stores revocable refresh tokens for Users. One row per active session.
 * The raw refresh token is never stored — only its SHA-256 hash (tokenHash).
 *
 * Rotation: when a refresh token is used, the old session is soft-replaced
 * (replacedBySessionId set) and a new session is created. If a replaced token
 * is replayed, all sessions for that user are revoked (reuse detection).
 */

'use strict';

// third-party modules
const { v7: uuidv7 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('userSession', {

    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: () => uuidv7(),
      primaryKey: true,
      validate: { isUUID: 7 },
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    // SHA-256 hash of the opaque refresh token — never store the raw token
    tokenHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Identifies the client kind: user-web, user-app, etc.
    audience: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Snapshot of user.tokenVersion at session creation.
    // If user.tokenVersion has been bumped (LogoutAll), this session is invalid.
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // UUID of the session that replaced this one during rotation
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
    paranoid: false, // hard-delete old sessions; revokedAt handles soft state
    freezeTableName: true,
    tableName: 'UserSessions',

    indexes: [
      { name: 'UserSessions_userId_idx', fields: ['userId'] },
      { name: 'UserSessions_tokenHash_unique', fields: ['tokenHash'], unique: true },
    ],
  });

  UserSession.associate = models => {
    UserSession.belongsTo(models.user, {
      as: 'user',
      foreignKey: 'userId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }; // END associate

  return UserSession;
}; // END USER SESSION MODEL
