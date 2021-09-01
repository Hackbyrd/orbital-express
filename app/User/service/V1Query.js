/**
 * USER V1Query SERVICE
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

// queues
const UserQueue = new Queue('UserQueue', REDIS_URL);

// methods
module.exports = {
  V1QueryByAdmin
}

/**
 * Query and return user
 *
 * GET  /v1/users/query
 * POST /v1/users/query
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   active - (BOOLEAN - OPTIONAL): Whether active or not
 *
 *   sort - (STRING - OPTIONAL) DEFAULT id, A comma separated list of columns of a table, could have a '-' in front which means descending, ex. id,-name,date
 *   page - (NUMBER - OPTIONAL) The page number which must be greater than 0 DEFAULT 1
 *   limit - (NUMBER - OPTIONAL) The number of elements per page which must be greater than 0 DEFAULT 10
 * }
 *
 * Success: Return users.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1QueryByAdmin(req) {
  const schema = joi.object({
    active: joi.boolean().optional(),

    // query params
    sort: joi.string().min(1).default('id').optional(),
    page: joi.number().integer().min(1).default(1).optional(),
    limit: joi.number().integer().min(1).default(25).optional()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));
  req.args = value; // updated arguments with type conversion

  // grab
  const sort = req.args.sort;
  const page = req.args.page;
  const limit = req.args.limit;

  // delete so it won't show up in where statement
  delete req.args.sort;
  delete req.args.page;
  delete req.args.limit;

  // add to where statement
  const whereStmt = {};
  Object.keys(req.args).forEach(key => {
    whereStmt[key] = req.args[key];
  });

  // get users
  const result = await models.user.findAndCountAll({
    where: whereStmt,
    limit: limit,
    offset: getOffset(page, limit),
    order: getOrdering(sort)
  }).catch(err => Promise.reject(err));

  // return success
  return Promise.resolve({
    status: 200,
    success: true,
    users: result.rows, // all users
    page: page,
    limit: limit,
    total: result.count, // the total count
    totalPages: Math.ceil(result.count / limit)
  });
} // END V1QueryByAdmin
