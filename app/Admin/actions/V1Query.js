/**
 * ADMIN V1Query ACTION
 */

'use strict';

// third-party node modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { LIST_STRING_REGEX } = require('../../../helpers/constants');
const { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Query
}

/**
 * Query and return admins
 *
 * GET  /v1/admins/query
 * POST /v1/admins/query
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 * 
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @active - (BOOLEAN - OPTIONAL): Whether active or not
 *   @roles - (STRING LIST - OPTIONAL): The roles of the admin (ADMIN, MANAGER, EMPLOYEE) constants.ADMIN_ROLE
 *   @email - (STRING - OPTIONAL): search for exact email
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
async function V1Query(req, res) {
  const schema = joi.object({
    active: joi.boolean().optional(),
    roles: joi.string().regex(LIST_STRING_REGEX).optional(),
    email: joi.string().email().lowercase().optional(),

    // query params
    sort: joi.string().min(1).default('id').optional(),
    page: joi.number().integer().min(1).default(1).optional(),
    limit: joi.number().integer().min(1).default(25).optional()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

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

  // convert roles string list to a format that can be used in where statement for sequelize query
  convertStringListToWhereStmt(whereStmt, req.args, [{
    name: 'roles',
    col: 'role',
    isInt: false,
  }]);

  // add the rest of the args to where statement
  Object.keys(req.args).forEach(key => {
    whereStmt[key] = req.args[key];
  });

  try {
    // get admins
    const result = await models.admin.findAndCountAll({
      where: whereStmt,
      limit: limit,
      offset: getOffset(page, limit),
      order: getOrdering(sort)
    });
  
    // return success
    return {
      status: 200,
      success: true,
      admins: result.rows, // all admins
      page: page,
      limit: limit,
      total: result.count, // the total count
      totalPages: Math.ceil(result.count / limit)
    };
  } catch (error) {
    throw error;
  }
} // END V1Query
