/**
 * ADMIN V1ResetPassword SERVICE
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL, ADMIN_CLIENT_HOST } = process.env;

// third-party
const _ = require('lodash');
const Op = require('sequelize').Op; // for operator aliases like $gte, $eq
const io = require('socket.io-emitter')(REDIS_URL); // to emit real-time events to client
const joi = require('@hapi/joi'); // validations
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
const { checkPasswords, isValidTimezone } = require('../../../helpers/validate');
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// methods
module.exports = {
  V1ResetPassword
};

/**
 * Reset Password
 *
 * GET  /v1/admins/resetpassword
 * POST /v1/admins/resetpassword
 *
 * Must be logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @email - (STRING - REQUIRED): The email of the user
 * }
 *
 * Success: Return true
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST
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

  // grab admin with this email
  try {
    const findAdmin = await models.admin.findOne({
      where: {
        email: req.args.email
      }
    });

    // if admin cannot be found
    if (!findAdmin)
      return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST));

    // preparing for reset
    const passwordResetToken = randomString();
    const passwordResetExpire = moment.tz('UTC').add(6, 'hours'); // add 6 hours from now

    // update admin
    await models.admin.update({
      passwordResetToken: passwordResetToken,
      passwordResetExpire: passwordResetExpire
    }, {
      fields: ['passwordResetToken', 'passwordResetExpire'], // only these fields
      where: {
        email: req.args.email
      }
    });

    const resetLink = `${ADMIN_CLIENT_HOST}/confirm-password?passwordResetToken=${passwordResetToken}`; // create URL using front end url

    // send confirmation email
    const result = await email.send({
      from: email.emails.support.address,
      name: email.emails.support.name,
      subject: 'Your password has been changed. Please confirm.',
      template: 'AdminResetPassword',
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
