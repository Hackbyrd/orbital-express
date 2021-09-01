/**
 * ADMIN V1Update SERVICE
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
  V1Update
};

/**
 * Update and return updated admin
 *
 * GET  /v1/admins/update
 * POST /v1/admins/update
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @timezone - (STRING - OPTIONAL): the timezone of the admin
 *   @locale - (STRING - OPTIONAL): The language of the user
 *   @name - (STRING - OPTIONAL): the name of the admin
 *   @phone - (STRING - OPTIONAL): the phone
 * }
 *
 * Success: Return a admin.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_INVALID_TIMEZONE
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Update(req) {
  const schema = joi.object({
    timezone: joi.string().trim().optional(),
    locale: joi.string().trim().optional(),
    name: joi.string().trim().optional(),
    phone: joi.string().trim().optional()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));

  // updated arguments with type conversion
  const oldArgs = req.args;
  req.args = value;

  // check timezone
  if (req.args.timezone && !isValidTimezone(req.args.timezone))
    return Promise.resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_TIMEZONE));

  try {
    // update admin
    await models.admin.update(req.args, {
      where: {
        id: req.admin.id
      }
    });

    const findAdmin = await models.admin.findByPk(req.admin.id, {
      attributes: {
        exclude: models.admin.getSensitiveData() // remove sensitive data
      }
    });

    // SOCKET EMIT EVENT
    const data = { admin: findAdmin };
    io.to(`${SOCKET_ROOMS.GLOBAL}`).emit(SOCKET_EVENTS.ADMIN_UPDATED, data);
    io.to(`${SOCKET_ROOMS.ADMIN}${findAdmin.id}`).emit(SOCKET_EVENTS.ADMIN_UPDATED, data);

    return Promise.resolve({
      status: 200,
      success: true,
      admin: findAdmin.dataValues
    });
  } catch (error) {
    return Promise.reject(error);
  }
} // END V1Update
