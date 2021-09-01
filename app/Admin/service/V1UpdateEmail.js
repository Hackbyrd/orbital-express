/**
 * ADMIN V1UpdateEmail SERVICE
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

// models
const models = require('../../../models');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');
const { errorResponse, joiErrorsMessage, ERROR_CODES } = require('../../../services/error');

// helpers
const { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');
const { randomString, createJwtToken } = require('../../../helpers/logic');
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// methods
module.exports = {
  V1UpdateEmail
};

/**
 * Update email of admin
 *
 * GET  /v1/admins/updateemail
 * POST /v1/admins/updateemail
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @id - (NUMBER - OPTIONAL): The id of the admin
 *   @email - (STRING - REQUIRED): - the new email to update the current email to
 * }
 *
 * Success: Return a true.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1UpdateEmail(req) {
  const schema = joi.object({
    id: joi.number().integer().min(1).optional(),
    email: joi.string().trim().lowercase().min(3).email().required()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));
  req.args = value; // updated arguments with type conversion

  // checks if the new email is different from the existing one
  if (req.args.email === req.admin.email)
    return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_SAME_EMAIL));

  try {
    // checks if any other admin is using the new email
    const findAdmin = await models.admin.findOne({
      where: {
        email: req.args.email
      }
    });

    // email already being used
    if (findAdmin)
      return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_EMAIL_ALREADY_TAKEN));

    // update admin
    await models.admin.update({
      email: req.args.email
    }, {
      where: {
        id: req.admin.id
      }
    });

    return Promise.resolve({
      status: 200,
      success: true
    });
  } catch (error) {
    return Promise.reject(error);
  }
} // END V1UpdateEmail
