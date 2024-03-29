/**
 * ADMIN V1Update ACTION
 */

'use strict';

// third-party
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = socket;

// helpers
const { isValidTimezone } = require('../../../helpers/validate');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Update
}

/**
 * Update and return updated admin
 *
 * GET  /v1/admins/update
 * POST /v1/admins/update
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 * 
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @timezone - (STRING - OPTIONAL): the timezone of the admin
 *   @locale - (STRING - OPTIONAL): The language of the user
 *   @active - (BOOLEAN - OPTIONAL): The active status of the admin
 *   @firstName - (STRING - OPTIONAL): the first name of the admin
 *   @lastName - (STRING - OPTIONAL): the last name of the admin
 * }
 *
 * Success: Return updated admin.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_INVALID_TIMEZONE
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Update(req, res) {
  const schema = joi.object({
    timezone: joi.string().trim().optional(),
    locale: joi.string().trim().optional(),
    active: joi.boolean().optional(),
    firstName: joi.string().trim().optional(),
    lastName: joi.string().trim().optional(),
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // check timezone
  if (req.args.timezone && !isValidTimezone(req.args.timezone))
    return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_TIMEZONE);

  try {
    // update admin
    await models.admin.update(req.args, {
      where: {
        id: req.admin.id
      }
    });

    // grab admin but exclude sensitive data
    const findAdmin = await models.admin.findByPk(req.admin.id, {
      attributes: {
        exclude: models.admin.getSensitiveData() // remove sensitive data
      }
    });

    // SOCKET EMIT EVENT
    const io = await socket.get(); // to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
    const data = { admin: findAdmin };
    io.to(`${SOCKET_ROOMS.GLOBAL}`).emit(SOCKET_EVENTS.ADMIN_UPDATED, data);
    io.to(`${SOCKET_ROOMS.ADMIN}${findAdmin.id}`).emit(SOCKET_EVENTS.ADMIN_UPDATED, data);

    return {
      status: 200,
      success: true,
      admin: findAdmin.dataValues
    };
  } catch (error) {
    throw error;
  }
} // END V1Update
