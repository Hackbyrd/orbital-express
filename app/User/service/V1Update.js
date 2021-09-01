/**
 * USER V1Update SERVICE
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
const { isValidTimezone } = require('../../../helpers/validate');

// queues
const UserQueue = new Queue('UserQueue', REDIS_URL);

// methods
module.exports = {
  V1UpdateByUser
}

/**
 * Update and return updated user
 *
 * GET  /v1/users/update
 * POST /v1/users/update
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   @timezone - (STRING - OPTIONAL): the timezone of the user
 *   @locale - (STRING - OPTIONAL): The language of the user
 *   @company - (STRING - OPTIONAL): The name of the new company
 *   @firstName - (STRING - OPTIONAL): The first name of the new user
 *   @lastName - (STRING - OPTIONAL): The last name of the new user
 *   @phone - (STRING - OPTIONAL): the phone
 * }
 *
 * Success: Return a user.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_INVALID_TIMEZONE
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1UpdateByUser(req) {
  const schema = joi.object({
    timezone: joi.string().trim().optional(),
    locale: joi.string().trim().optional(),
    company: joi.string().trim().min(1).optional(),
    firstName: joi.string().trim().min(1).optional(),
    lastName: joi.string().trim().min(1).optional(),
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
    return Promise.resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_TIMEZONE));

  try {
    // update user
    await models.user.update(req.args, {
      where: {
        id: req.user.id
      }
    });

    const findUser = await models.user.findByPk(req.user.id, {
      attributes: {
        exclude: models.user.getSensitiveData() // remove sensitive data
      }
    });

    return Promise.resolve({
      status: 200,
      success: true,
      user: findUser.dataValues
    });
  } catch (error) {
    return Promise.reject(error);
  }
} // END V1UpdateByUser
