/**
 * USER V1Logout ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// services
const lang = require('../../../services/language'); // internationalization

// helpers
const { findSessionByRawToken, revokeSession } = require('../../../helpers/session');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Logout
}

/**
 * Log a user out of the CURRENT session/device.
 *
 * GET  /v1/users/logout
 * POST /v1/users/logout
 *
 * Revokes the refresh-token session for the presented refresh token (cookie or body) and clears
 * the refresh cookie. Other devices/sessions are unaffected (use V1LogoutAll for those).
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   @refreshToken - (STRING - OPTIONAL): the refresh token (mobile). Web sends it via the httpOnly cookie.
 * }
 *
 * Success: Return { status: 200, success: true }
 * Errors:
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Logout(req, res) {
  const i18n = lang.getLocalI18n(); // get local i18n object

  // read the refresh token from the cookie (web) or the request body (mobile)
  const rawRefreshToken = (req.cookies && req.cookies['jwt-user-refresh']) || (req.args && req.args.refreshToken) || null;

  const t = await models.db.transaction();

  try {
    // revoke the session for the presented refresh token — only if it belongs to this user
    if (rawRefreshToken) {
      const sessionRow = await findSessionByRawToken({
        sessionModel: models.userSession,
        rawRefreshToken,
        transaction: t
      });

      if (sessionRow && sessionRow.userId === req.user.id)
        await revokeSession({ session: sessionRow, transaction: t });
    }

    await t.commit();

    // clear the refresh cookie (options must match V1Login)
    res.clearCookie('jwt-user-refresh', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    // also clear the legacy access cookie if any client still sets it
    res.clearCookie('jwt-user', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return {
      status: 200,
      success: true
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    throw error;
  }
} // END V1Logout
