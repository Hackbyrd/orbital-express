/**
 * USER V1LogoutAll ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// services
const lang = require('../../../services/language'); // internationalization

// helpers
const { revokeAllSessionsForOwner } = require('../../../helpers/session');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1LogoutAll
}

/**
 * Log a user out of ALL devices/sessions.
 *
 * GET  /v1/users/logoutall
 * POST /v1/users/logoutall
 *
 * Revokes every active session for the user and bumps tokenVersion, which instantly invalidates
 * every outstanding access token (not just the current device). Clears this device's cookies too.
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {}
 *
 * Success: Return { status: 200, success: true }
 * Errors:
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1LogoutAll(req, res) {
  const i18n = lang.getLocalI18n(); // get local i18n object

  const t = await models.db.transaction();

  try {
    // revoke all sessions for this user
    await revokeAllSessionsForOwner({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      ownerId: req.user.id,
      transaction: t
    });

    // bump tokenVersion → every outstanding access token for this user is now rejected
    await models.user.increment('tokenVersion', { by: 1, where: { id: req.user.id }, transaction: t });

    await t.commit();

    // clear this device's refresh cookie (options must match V1Login)
    res.clearCookie('jwt-user-refresh', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
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
} // END V1LogoutAll
