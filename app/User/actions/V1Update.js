/**
 * USER V1Update ACTION
 */

'use strict';

// third-party node modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

// services
const lang = require('../../../services/language'); // internationalization
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { isValidTimezone } = require('../../../helpers/validate');
const { LOCALES } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Update
}

/**
 * Update the logged-in user's profile.
 *
 * GET  /v1/users/update
 * POST /v1/users/update
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   @firstName - (STRING - OPTIONAL): First name (max 64 characters)
 *   @lastName - (STRING - OPTIONAL): Last name (max 64 characters)
 *   @timezone - (STRING - OPTIONAL): Timezone, e.g. 'America/New_York'
 *   @locale - (STRING - OPTIONAL): Locale
 *   @profileImageUrl - (STRING - OPTIONAL): Profile image URL
 * }
 *
 * Success: Return the updated user.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_INVALID_TIMEZONE
 *   400: USER_BAD_REQUEST_NO_UPDATES_PROVIDED
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Update(req, res) {
  const i18n = lang.getLocalI18n(); // get local i18n object - remember to set the locale based on the user e.g. i18n.setLocale(user.locale);

  const schema = joi.object({
    firstName: joi.string().trim().max(64).optional(),
    lastName: joi.string().trim().max(64).optional(),
    timezone: joi.string().trim().optional(),
    locale: joi.string().valid(...LOCALES).optional(),
    profileImageUrl: joi.string().uri().allow(null).optional()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // nothing to update
  if (Object.keys(req.args).length === 0)
    return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_NO_UPDATES_PROVIDED);

  // validate timezone if provided
  if (req.args.timezone && !isValidTimezone(req.args.timezone))
    return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_TIMEZONE);

  // start transaction
  const t = await models.db.transaction();

  try {
    // update the logged-in user
    await models.user.update(req.args, {
      where: { id: req.user.id },
      transaction: t
    });

    // get the updated user (sensitive data excluded by the default scope)
    const updatedUser = await models.user.findByPk(req.user.id, {
      attributes: {
        exclude: models.user.getSensitiveData() // remove sensitive data
      },
      transaction: t
    });

    await t.commit();

    return {
      status: 200,
      success: true,
      user: updatedUser.dataValues
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    throw error;
  }
} // END V1Update
