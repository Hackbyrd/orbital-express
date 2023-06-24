/**
 * ADMIN V1Export ACTION
 */

'use strict';

// ENV variables
const {} = process.env;

// third-party
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const queue = require('../../../services/queue'); // process background tasks from Queue
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');

// helpers
const { LIST_STRING_REGEX } = require('../../../helpers/constants');

// methods
module.exports = {
  V1Export
}

/**
 * Add a job to export list of admins
 *
 * GET  /v1/admins/export
 * POST /v1/admins/export
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
 *
 *   @sort - (STRING - OPTIONAL) DEFAULT id, A comma separated list of columns of a table, could have a '-' in front which means descending, ex. id,-name,date
 * }
 *
 * Success: Export admin
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Export(req, res) {
  const schema = joi.object({
    roles: joi.string().regex(LIST_STRING_REGEX).optional(),
    email: joi.string().email().lowercase().optional(),

    // query params
    sort: joi.string().min(1).default('id').optional(),
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // updated arguments with type conversion

  try {
    // ADD BACKGROUND JOB TO QUEUE
    const AdminQueue = queue.get('AdminQueue'); // grab relevent queue
    const job = await AdminQueue.add('V1ExportTask', {
      adminId: req.args.id
    }).catch(err => Promise.reject(err));

    // return
    return {
      status: 203,
      success: true,
      jobId: job.id
    };
  } catch (error) {
    // this will be wrapped around in a "reject" promise automatically because this is an async function
    throw error;
  }
} // END V1Export
