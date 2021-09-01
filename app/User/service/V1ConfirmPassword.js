/**
 * USER V1ConfirmPassword SERVICE
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL } = process.env;

// third-party
const _ = require('lodash'); // general helper methods: https://lodash.com/docs
const Op = require('sequelize').Op; // for model operator aliases like $gte, $eq
const io = require('socket.io-emitter')(REDIS_URL); // to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
const joi = require('@hapi/joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md
const Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean
const bcrypt = require('bcrypt');
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const convert = require('convert-units'); // https://www.npmjs.com/package/convert-units
const slugify = require('slugify'); // convert string to URL friendly string: https://www.npmjs.com/package/slugify
const sanitize = require("sanitize-filename"); // sanitize filename: https://www.npmjs.com/package/sanitize-filename
const passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/
const currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/
const accounting = require('accounting'); // handle outputing readable format for currency: http://openexchangerates.github.io/accounting.js/

// services
const email = require('../../../services/email');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// models
const models = require('../../../models');

// helpers
const { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');
const { randomString } = require('../../../helpers/logic');
const { PASSWORD_REGEX, PASSWORD_LENGTH_MIN } = require('../../../helpers/constants');

// queues
const UserQueue = new Queue('UserQueue', REDIS_URL);

// methods
module.exports = {
  V1ConfirmPassword
}

/**
 * Confirm password
 *
 * GET  /v1/users/confirmpassword
 * POST /v1/users/confirmpassword
 *
 * Can be logged in or logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   passwordResetToken - (STRING - REQUIRED): The password reset token to confirm new password
 *   password1 - (STRING - REQUIRED): password 1
 *   password2 - (STRING - REQUIRED): password 2
 * }
 *
 * Success: Return a user and JWT.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN
 *   400: USER_BAD_REQUEST_PASSWORDS_NOT_EQUAL
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1ConfirmPassword(req) {
  const schema = joi.object({
    passwordResetToken: joi.string().required(),
    password1: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('USER[Invalid Password Format]'))),
    password2: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('USER[Invalid Password Format]')))
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));
  req.args = value; // updated arguments with type conversion

  try {
    // grab user
    const getUser = await models.user.findOne({
      where: {
        passwordResetToken: req.args.passwordResetToken,
        passwordResetExpire: {
          [Op.gte]: new Date() // has not expired yet
        }
      }
    });

    // if user does not exists
    if (!getUser)
      return Promise.resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN));

    // check password1 and password2 equality
    if (req.args.password1 !== req.args.password2)
      return Promise.resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_PASSWORDS_NOT_EQUAL));

    // generate new password
    const newPassword = bcrypt.hashSync(req.args.password1, getUser.salt);

    // update new password
    await models.user.update({
      password: newPassword, // set to resetPassword
      passwordResetToken: null
    }, {
      fields: ['password', 'passwordResetToken'], // only these fields
      where: {
        id: getUser.id
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
