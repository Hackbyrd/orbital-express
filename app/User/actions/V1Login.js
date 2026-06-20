/**
 * USER V1Login ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// third-party
const joi = require('joi'); // argument validator: https://hapi.dev/family/joi/
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { createAccessToken, parseDurationMs, resolveClient, resolvePlatform, getTokenAudience } = require('../../../helpers/logic');
const { issueSession } = require('../../../helpers/session');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Login
}

/**
 * Login a user — returns a short-lived access token and sets a long-lived, httpOnly refresh cookie.
 *
 * GET  /v1/users/login
 * POST /v1/users/login
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 *
 * Must be logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @email - (STRING - REQUIRED): The email of the user,
 *   @password - (STRING - REQUIRED): The unhashed password of the user
 * }
 *
 * Success: Return the user, a short-lived access token, and a refresh token (also set as an httpOnly cookie).
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS
 *   400: USER_BAD_REQUEST_ACCOUNT_INACTIVE
 *   400: USER_BAD_REQUEST_ACCOUNT_DELETED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Login(req, res) {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)  {
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  }
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // need to wrap in promise because of the passport.authenticate callback
  return new Promise((resolve, reject) => {

    // login user WITHOUT SESSION (passport session — we use our own refresh-token sessions)
    passport.authenticate('JWTUserLogin', { session: false }, async (err, user, info) => {
      if (err)
        return reject(err);

      // check if user exists
      if (!user)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));

      // return error message if user is inactive
      if (!user.isActive)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE));

      // return error message if user is deleted
      if (user.deletedAt)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DELETED));

      // update login count and last login timestamps
      try {
        await models.user.update({
          loginCount: user.loginCount + 1,
          lastLogin: moment.tz('UTC'),
          lastLoginAt: moment.tz('UTC')
        }, {
          where: {
            id: user.id
          }
        });

        // find user (without sensitive data) — includes tokenVersion for the access token
        const updatedUser = await models.user.findByPk(user.id, {
          attributes: {
            exclude: models.user.getSensitiveData() // remove sensitive data
          }
        });

        // determine the client KIND (X-Client → web|app) and platform (X-Platform → ios/android/...)
        const client = resolveClient(req);
        const platform = resolvePlatform(req);

        // create the short-lived access token (audience = this user type + client kind)
        const token = createAccessToken(updatedUser, getTokenAudience('user', client), 'user');

        // create a refresh-token session (stores only the hash + client + platform) and get the raw refresh token
        const { rawRefreshToken } = await issueSession({
          sessionModel: models.userSession,
          ownerKey: 'userId',
          ownerId: updatedUser.id,
          client,
          platform,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null
        });

        // set the refresh token as an httpOnly cookie (web). Mobile reads it from the response body.
        // NOTE: clear options in V1Logout MUST match these (Safari requires consistent cookie options).
        res.cookie('jwt-user-refresh', rawRefreshToken, {
          httpOnly: true,
          secure: NODE_ENV === 'production', // only send over HTTPS in production
          sameSite: 'strict', // refresh token only travels same-site
          path: '/',
          maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
        });

        // return success (201 — a new session resource was created)
        return resolve({
          status: 201,
          success: true,
          token: token, // short-lived access token (send in Authorization: jwt-user <token>)
          refreshToken: rawRefreshToken, // for mobile clients that can't use cookies
          user: updatedUser.dataValues
        });
      } catch (error) {
        return reject(error);
      }
    })(req, res, null);
  }); // END Promise
} // END V1Login
