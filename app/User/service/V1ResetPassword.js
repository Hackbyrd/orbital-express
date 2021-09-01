/**
 * USER V1ResetPassword SERVICE
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL, USER_CLIENT_HOST } = process.env;

// third-party
const _ = require('lodash'); // general helper methods: https://lodash.com/docs
const Op = require('sequelize').Op; // for model operator aliases like $gte, $eq
const io = require('socket.io-emitter')(REDIS_URL); // to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
const joi = require('@hapi/joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md
const Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean
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
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// queues
const UserQueue = new Queue('UserQueue', REDIS_URL);

// methods
module.exports = {
  V1ResetPassword
}

/**
 * Reset Password
 *
 * GET  /v1/users/resetpassword
 * POST /v1/users/resetpassword
 *
 * Must be logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   email - (STRING - REQUIRED): The email of the user
 * }
 *
 * Success: Return true
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1ResetPassword(req) {
  const schema = joi.object({
    email: joi.string().trim().lowercase().min(3).email().required(),
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));

  // grab user with this email
  try {
    const findUser = await models.user.findOne({
      where: {
        email: req.args.email
      }
    });

    // if user cannot be found
    if (!findUser)
      return Promise.resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST));

    // preparing for reset
    const passwordResetToken = randomString();
    const passwordResetExpire = moment.tz('UTC').add(6, 'hours'); // add 6 hours from now

    // update user
    await models.user.update({
      passwordResetToken: passwordResetToken,
      passwordResetExpire: passwordResetExpire
    }, {
      fields: ['passwordResetToken', 'passwordResetExpire'], // only these fields
      where: {
        email: req.args.email
      }
    });

    const resetLink = `${USER_CLIENT_HOST}/confirm-password?passwordResetToken=${passwordResetToken}`; // create URL using front end url

    // send confirmation email
    const result = await email.send({
      from: email.emails.support.address,
      name: email.emails.support.name,
      subject: 'Your password has been changed. Please confirm.',
      template: 'UserResetPassword',
      tos: [req.args.email],
      ccs: null,
      bccs: null,
      args: {
        resetPasswordConfirmationLink: resetLink,
        expires: '6 hours'
      }
    });

    // return success
    return Promise.resolve({
      status: 200,
      success: true,
      message: 'An email has been sent to ' + req.args.email + '. Please check your email to confirm your new password change.',
      resetLink: NODE_ENV === 'test' ? resetLink : null // only return reset link in dev and test env for testing purposes
    });
  } catch (error) {
    return Promise.reject(error);
  }
} // END V1ResetPassword
