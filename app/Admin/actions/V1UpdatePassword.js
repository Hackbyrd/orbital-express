/**
 * ADMIN V1UpdatePassword ACTION
 */

'use strict';

// third-party node modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md
const bcrypt = require('bcrypt');

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { PASSWORD_LENGTH_MIN, PASSWORD_REGEX } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1UpdatePassword
}

/**
 * Update password of admin
 *
 * GET  /v1/admins/updatepassword
 * POST /v1/admins/updatepassword
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @password - (STRING - REQUIRED): the current password
 *   @password1 - (STRING - REQUIRED): password 1
 *   @password2 - (STRING - REQUIRED): password 2
 * }
 *
 * Success: Return a true.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL
 *   400: ADMIN_BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1UpdatePassword(req) {
  const schema = joi.object({
    password: joi.string().min(8).required(),
    password1: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[Invalid Password Format]'))),
    password2: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[Invalid Password Format]')))
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // check password1 and password2 equality
  if (req.args.password1 !== req.args.password2)
    return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL);

  try {
    // validate password
    const result = await models.admin.validatePassword(req.args.password, req.admin.password);

    // if password is incorrect
    if (!result)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED);

    // hash new password
    const newPassword = bcrypt.hashSync(req.args.password1, req.admin.salt);

    // update password
    await models.admin.update({
      password: newPassword
    }, {
      fields: ['password'], // only these fields
      where: {
        id: req.admin.id
      }
    });

    // return success
    return {
      status: 200,
      success: true
    };
  } catch (error) {
    throw error;
  }
} // END V1UpdatePassword
