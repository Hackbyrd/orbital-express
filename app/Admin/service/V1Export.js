/**
 * ADMIN V1Export SERVICE
 */

'use strict';

// ENV variables
const { REDIS_URL } = process.env;

// third-party
const joi = require('@hapi/joi'); // validations
const Queue = require('bull'); // add background tasks to Queue

// services
const { errorResponse, joiErrorsMessage, ERROR_CODES } = require('../../../services/error');

// methods
module.exports = {
  V1Export
};

/**
 * Export an admin
 *
 * GET  /v1/admins/export
 * POST /v1/admins/export
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @id - (NUMBER - REQUIRED): The id of the admin
 * }
 *
 * Success: Export admin
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Export(req) {
  const schema = joi.object({
    id: joi.number().integer().min(1).required()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));
  req.args = value; // updated arguments with type conversion

  const AdminQueue = new Queue('AdminQueue', REDIS_URL);
  const job = await AdminQueue.add('V1ExportTask', {
    adminId: req.args.id
  }).catch(err => Promise.reject(err));

  // return
  return Promise.resolve({
    status: 203,
    success: true,
    jobId: job.id
  });
} // END V1Export
