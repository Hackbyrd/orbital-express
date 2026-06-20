/**
 * USER V1Register ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// third-party node modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/

// services
const lang = require('../../../services/language'); // internationalization
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { createAccessToken, parseDurationMs, resolveClient, resolvePlatform, getTokenAudience } = require('../../../helpers/logic');
const { issueSession } = require('../../../helpers/session');
const { isValidTimezone } = require('../../../helpers/validate');
const { LOCALE, LOCALES, PASSWORD_REGEX } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Register
}

/**
 * Register a new user with email + password — then log them in (access token + refresh session).
 *
 * GET  /v1/users/register
 * POST /v1/users/register
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 *
 * Must be logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @email - (STRING - REQUIRED): The email of the new user (unique, case-insensitive)
 *   @password - (STRING - REQUIRED): The unhashed password (min 12 chars, mixed case, number, special)
 *   @firstName - (STRING - OPTIONAL): First name (max 64 characters)
 *   @lastName - (STRING - OPTIONAL): Last name (max 64 characters)
 *   @timezone - (STRING - OPTIONAL): Timezone, e.g. 'America/New_York' (default 'UTC')
 *   @locale - (STRING - OPTIONAL): Locale (default 'en')
 * }
 *
 * Success: Return the new user, a short-lived access token, and a refresh token (also set as an httpOnly cookie).
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_USER_ALREADY_EXISTS
 *   400: USER_BAD_REQUEST_INVALID_TIMEZONE
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Register(req, res) {
  const i18n = lang.getLocalI18n(); // get local i18n object - remember to set the locale based on the user e.g. i18n.setLocale(user.locale);

  const schema = joi.object({
    email: joi.string().trim().email().lowercase().required(),
    password: joi.string().regex(PASSWORD_REGEX).required(),
    firstName: joi.string().trim().max(64).allow('').default(''),
    lastName: joi.string().trim().max(64).allow('').default(''),
    timezone: joi.string().trim().default('UTC'),
    locale: joi.string().valid(...LOCALES).default(LOCALE.EN)
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // validate timezone
  if (!isValidTimezone(req.args.timezone))
    return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_TIMEZONE);

  // create transaction
  const t = await models.db.transaction();

  try {
    // check if a user with this email already exists (include soft-deleted to avoid unique-constraint surprises)
    const existingUser = await models.user.findOne({
      where: { email: req.args.email },
      paranoid: false,
      transaction: t
    });

    if (existingUser) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_USER_ALREADY_EXISTS);
    }

    // create the user — the model's beforeCreate hook generates the salt and hashes the password
    const newUser = await models.user.create({
      email: req.args.email,
      password: req.args.password,
      firstName: req.args.firstName,
      lastName: req.args.lastName,
      timezone: req.args.timezone,
      locale: req.args.locale,
      isActive: true
    }, { transaction: t });

    await t.commit();

    // re-fetch without sensitive data (default scope excludes salt/password/tokens)
    const safeUser = await models.user.findByPk(newUser.id);

    // log the new user in immediately: mint an access token + create a refresh-token session
    const client = resolveClient(req);
    const platform = resolvePlatform(req);
    const token = createAccessToken(safeUser, getTokenAudience('user', client), 'user');

    const { rawRefreshToken } = await issueSession({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      ownerId: safeUser.id,
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

    // return success (201 — a new user resource was created)
    return {
      status: 201,
      success: true,
      token: token, // short-lived access token (send in Authorization: jwt-user <token>)
      refreshToken: rawRefreshToken, // for mobile clients that can't use cookies
      user: safeUser.dataValues
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    // this will be wrapped around in a "reject" promise automatically because this is an async function
    throw error;
  }
} // END V1Register
