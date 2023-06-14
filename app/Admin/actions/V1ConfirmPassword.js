/**
 * ADMIN V1ConfirmPassword ACTION
 */

'use strict';

// third-party
const Op = require('sequelize').Op; // for model operator aliases like $gte, $eq
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md
const bcrypt = require('bcrypt');

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { PASSWORD_REGEX, PASSWORD_LENGTH_MIN } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1ConfirmPassword
}

/**
 * Confirm password
 *
 * GET  /v1/admins/confirmpassword
 * POST /v1/admins/confirmpassword
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 * 
 * Can be logged in or logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @passwordResetToken - (STRING - REQUIRED): The password reset token to confirm new password
 *   @password1 - (STRING - REQUIRED): password 1
 *   @password2 - (STRING - REQUIRED): password 2
 * }
 *
 * Success: Return a admin and JWT.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN
 *   400: ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1ConfirmPassword(req, res) {
  const schema = joi.object({
    passwordResetToken: joi.string().required(),
    password1: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[Invalid Password Format]'))),
    password2: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[Invalid Password Format]')))
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  try {
    // grab admin
    const getAdmin = await models.admin.findOne({
      where: {
        passwordResetToken: req.args.passwordResetToken,
        passwordResetExpire: {
          [Op.gte]: new Date() // has not expired yet
        }
      }
    });

    // if admin does not exists
    if (!getAdmin)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN);

    // check password1 and password2 equality
    if (req.args.password1 !== req.args.password2)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL);

    // generate new password
    const newPassword = bcrypt.hashSync(req.args.password1, getAdmin.salt);

    // update new password
    await models.admin.update({
      password: newPassword, // set to resetPassword
      passwordResetToken: null
    }, {
      fields: ['password', 'passwordResetToken'], // only these fields
      where: {
        id: getAdmin.id
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
} // END V1ConfirmPassword
