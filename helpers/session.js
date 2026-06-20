/**
 * Refresh-token SESSION helpers (shared infrastructure for all user types).
 *
 * These functions manage the opaque, server-side, revocable refresh-token sessions that back
 * the stateless access tokens. The logic (issue / find / rotate / revoke) is identical for every
 * user type — only the Sequelize session model (UserSession, AdminSession, ...) and its owner
 * foreign-key column (userId, adminId, ...) differ — so it lives here once rather than being
 * duplicated (and drifting) per type. This is security infrastructure, not business logic.
 *
 * The RAW refresh token is only ever returned to the caller (to hand to the client). Only its
 * SHA-256 hash is stored. Rotation links old→new via replacedBySessionId so a re-used (already
 * rotated) token can be detected as theft.
 */

'use strict';

// helpers
const { createRefreshToken, hashToken, getRefreshTokenExpiresAt } = require('./logic');

module.exports = {
  issueSession,
  findSessionByRawToken,
  isSessionActive,
  rotateSession,
  revokeSession,
  revokeAllSessionsForOwner
};

/**
 * Create a brand-new session row for an owner and return the raw refresh token to send to the client.
 *
 * @sessionModel - (MODEL - REQUIRED): models.userSession (or another type's session model)
 * @ownerKey - (STRING - REQUIRED): 'userId' (or another type's owner FK column)
 * @ownerId - (REQUIRED): the owner's id
 * @userAgent / @ipAddress - (OPTIONAL): captured request metadata
 * @transaction - (OPTIONAL): sequelize transaction
 *
 * return: { rawRefreshToken, session }
 */
async function issueSession({ sessionModel, ownerKey, ownerId, client, platform, userAgent, ipAddress, transaction }) {
  const rawRefreshToken = createRefreshToken();

  const session = await sessionModel.create({
    [ownerKey]: ownerId,
    refreshTokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
    client: client || 'web',
    platform: platform || 'web',
    userAgent: userAgent || null,
    ipAddress: ipAddress || null
  }, { transaction });

  return { rawRefreshToken, session };
} // END issueSession

/**
 * Look up a session by its RAW refresh token (hashes it first). Uses scope(null) so the
 * refreshTokenHash (sensitive, excluded by default scope) is available for comparison.
 *
 * return: the session instance, or null if not found / no token provided
 */
async function findSessionByRawToken({ sessionModel, rawRefreshToken, transaction }) {
  if (!rawRefreshToken)
    return null;

  return sessionModel.scope(null).findOne({
    where: { refreshTokenHash: hashToken(rawRefreshToken) },
    transaction
  });
} // END findSessionByRawToken

/**
 * A session is usable only if it has not been revoked and has not expired.
 *
 * @session - (INSTANCE - REQUIRED)
 *
 * return: BOOLEAN
 */
function isSessionActive(session) {
  if (!session)
    return false;

  return !session.revokedAt && new Date(session.expiresAt).getTime() > Date.now();
} // END isSessionActive

/**
 * Rotate a session: mint a NEW refresh token / session, and revoke the current one, linking
 * current.replacedBySessionId → new.id (the chain used for reuse detection).
 *
 * return: { rawRefreshToken, session } for the new session
 */
async function rotateSession({ sessionModel, ownerKey, currentSession, userAgent, ipAddress, transaction }) {
  const rawRefreshToken = createRefreshToken();

  const newSession = await sessionModel.create({
    [ownerKey]: currentSession[ownerKey],
    refreshTokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
    client: currentSession.client, // a rotated session keeps the same client/platform as the one it replaces
    platform: currentSession.platform,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null
  }, { transaction });

  await currentSession.update({
    revokedAt: new Date(),
    replacedBySessionId: newSession.id,
    lastUsedAt: new Date()
  }, { transaction });

  return { rawRefreshToken, session: newSession };
} // END rotateSession

/**
 * Revoke a single session (idempotent — no-op if already revoked).
 */
async function revokeSession({ session, transaction }) {
  if (session && !session.revokedAt)
    await session.update({ revokedAt: new Date() }, { transaction });
} // END revokeSession

/**
 * Revoke ALL currently-active sessions for an owner ("log out everywhere" / reuse-detection response).
 */
async function revokeAllSessionsForOwner({ sessionModel, ownerKey, ownerId, transaction }) {
  await sessionModel.update({ revokedAt: new Date() }, {
    where: { [ownerKey]: ownerId, revokedAt: null },
    transaction
  });
} // END revokeAllSessionsForOwner
