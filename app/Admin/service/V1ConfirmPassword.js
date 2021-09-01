/**
 * ADMIN V1ConfirmPassword SERVICE
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL, ADMIN_CLIENT_HOST } = process.env;

// third-party
const _ = require('lodash');
const Op = require('sequelize').Op; // for operator aliases like $gte, $eq
const io = require('socket.io-emitter')(REDIS_URL); // to emit real-time events to client
const joi = require('@hapi/joi'); // validations
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const passport = require('passport');
const currency = require('currency.js');

// services
const email = require('../../../services/email');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');
const { errorResponse, joiErrorsMessage, ERROR_CODES } = require('../../../services/error');

// models
const models = require('../../../models');

// helpers
const { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');
const { randomString, createJwtToken } = require('../../../helpers/logic');
const { isValidTimezone } = require('../../../helpers/validate');
const { PASSWORD_REGEX, PASSWORD_LENGTH_MIN } = require('../../../helpers/constants');

// methods
module.exports = {
  V1ConfirmPassword
};

/**
 * Confirm password
 *
 * GET  /v1/admins/confirmpassword
 * POST /v1/admins/confirmpassword
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
async function V1ConfirmPassword(req) {
  const schema = joi.object({
    passwordResetToken: joi.string().required(),
    password1: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[Invalid Password Format]'))),
    password2: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[Invalid Password Format]')))
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));
  req.args = value; // updated arguments with type conversion

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
      return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN));

    // check password1 and password2 equality
    if (req.args.password1 !== req.args.password2)
      return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL));

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
    return Promise.resolve({
      status: 200,
      success: true
    });
  } catch (error) {
    return Promise.reject(error);
  }
} // END confirmPassword
