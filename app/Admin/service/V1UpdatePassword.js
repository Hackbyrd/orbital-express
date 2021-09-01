/**
 * ADMIN V1UpdatePassword SERVICE
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
const { checkPasswords, isValidTimezone } = require('../../../helpers/validate');
const { PASSWORD_LENGTH_MIN, PASSWORD_REGEX, LIST_INT_REGEX } = require('../../../helpers/constants');

// methods
module.exports = {
  V1UpdatePassword
};

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
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));

  // check password1 and password2 equality
  if (req.args.password1 !== req.args.password2)
    return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL));

  try {
    // validate password
    const result = await models.admin.validatePassword(req.args.password, req.admin.password);

    // if password is incorrect
    if (!result)
      return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED));

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
    return Promise.resolve({
      status: 200,
      success: true
    });
  } catch (error) {
    return Promise.reject(error);
  }
} // END V1UpdatePassword
