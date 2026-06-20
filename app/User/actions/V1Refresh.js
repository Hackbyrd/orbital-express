/**
 * USER V1Refresh ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// services
const lang = require('../../../services/language'); // internationalization
const { ERROR_CODES, errorResponse } = require('../../../services/error');

// helpers
const { createAccessToken, parseDurationMs, getTokenAudience } = require('../../../helpers/logic');
const {
  findSessionByRawToken,
  isSessionActive,
  rotateSession,
  revokeSession,
  revokeAllSessionsForOwner
} = require('../../../helpers/session');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Refresh
}

/**
 * Exchange a valid refresh token for a new access token (and a rotated refresh token).
 *
 * GET  /v1/users/refresh
 * POST /v1/users/refresh
 *
 * Reads the refresh token from the httpOnly 'jwt-user-refresh' cookie (web) or req.args.refreshToken (mobile).
 * Can be called logged out (the access token is typically expired by the time you refresh).
 *
 * Rotation + reuse detection:
 *   - On success the presented refresh token is revoked and a new one is issued (rotation).
 *   - If a token that was ALREADY rotated out is presented again, that is a theft signal — ALL of the
 *     user's sessions are revoked and their tokenVersion is bumped (kills every outstanding access token).
 *
 * Must be logged out | Can be both logged in or logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @refreshToken - (STRING - OPTIONAL): the refresh token (mobile). Web sends it via the httpOnly cookie.
 * }
 *
 * Success: Return a new access token, a new refresh token (also set as an httpOnly cookie), and the user.
 * Errors:
 *   401: USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Refresh(req, res) {
  const i18n = lang.getLocalI18n(); // get local i18n object

  // read the refresh token from the cookie (web) or the request body (mobile)
  const rawRefreshToken = (req.cookies && req.cookies['jwt-user-refresh']) || (req.args && req.args.refreshToken) || null;

  if (!rawRefreshToken)
    return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);

  const t = await models.db.transaction();

  try {
    // look up the session by the token's hash
    const sessionRow = await findSessionByRawToken({
      sessionModel: models.userSession,
      rawRefreshToken,
      transaction: t
    });

    // unknown token
    if (!sessionRow) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // REUSE DETECTION: an already-rotated token (revoked + has a replacement) is being replayed → treat as theft.
    // Revoke every session for this user and bump tokenVersion so all access tokens die immediately.
    if (sessionRow.revokedAt && sessionRow.replacedBySessionId) {
      await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: sessionRow.userId, transaction: t });
      await models.user.increment('tokenVersion', { by: 1, where: { id: sessionRow.userId }, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // revoked (e.g. logged out) or expired → invalid, nothing more to do
    if (!isSessionActive(sessionRow)) {
      await revokeSession({ session: sessionRow, transaction: t }); // idempotent
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // load the owner (need tokenVersion for the new access token + active/deleted checks)
    const user = await models.user.findByPk(sessionRow.userId, {
      attributes: { exclude: models.user.getSensitiveData() },
      transaction: t
    });

    if (!user || !user.isActive || user.deletedAt) {
      await revokeSession({ session: sessionRow, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // rotate: revoke the presented session, issue a fresh one linked to it
    const { rawRefreshToken: newRawRefreshToken } = await rotateSession({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      currentSession: sessionRow,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      transaction: t
    });

    // mint a new access token (audience matches the session's original client)
    const token = createAccessToken(user, getTokenAudience('user', sessionRow.client), 'user');

    await t.commit();

    // set the rotated refresh token cookie (options MUST match V1Login / V1Logout)
    res.cookie('jwt-user-refresh', newRawRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
    });

    return {
      status: 200,
      success: true,
      token: token,
      refreshToken: newRawRefreshToken,
      user: user.dataValues
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    throw error;
  }
} // END V1Refresh
