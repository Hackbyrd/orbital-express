/**
 * ADMIN V1Query SERVICE
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
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// methods
module.exports = {
  V1Query
};

/**
 * Query and return admins
 *
 * GET  /v1/admins/query
 * POST /v1/admins/query
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @active - (BOOLEAN - OPTIONAL): Whether active or not
 *
 *   @sort - (STRING - OPTIONAL) DEFAULT id, A comma separated list of columns of a table, could have a '-' in front which means descending, ex. id,-name,date
 *   @page - (NUMBER - OPTIONAL) The page number which must be greater than 0 DEFAULT 1
 *   @limit - (NUMBER - OPTIONAL) The number of elements per page which must be greater than 0 DEFAULT 10
 * }
 *
 * Success: Return admins.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Query(req) {
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

  // get admins
  const result = await models.admin.findAndCountAll({
    where: whereStmt,
    limit: limit,
    offset: getOffset(page, limit),
    order: getOrdering(sort)
  }).catch(err => Promise.reject(err));

  // return success
  return Promise.resolve({
    status: 200,
    success: true,
    admins: result.rows, // all admins
    page: page,
    limit: limit,
    total: result.count, // the total count
    totalPages: Math.ceil(result.count / limit)
  });
} // END V1Query
