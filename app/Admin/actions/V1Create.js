/**
 * ADMIN V1Create ACTION
 */

'use strict';

// third-party node modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = socket;

// helpers
const { isValidTimezone } = require('../../../helpers/validate');
const { PASSWORD_LENGTH_MIN, PASSWORD_REGEX, ADMIN_ROLES, ADMIN_ROLE } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Create
}

/**
 * Create an admin
 *
 * GET  /v1/admins/create
 * POST /v1/admins/create
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.params = {}
 * req.args = {
 *   @firstName - (STRING - REQUIRED): The first name of the new admin
 *   @lastName - (STRING - REQUIRED): The first name of the new admin
 *   @active - (BOOLEAN - REQUIRED): Whether admin is active or not
 *   @role - (STRING - REQUIRED) [Default - ADMIN]: The role of the admin (ADMIN, MANAGER, EMPLOYEE) constants.ADMIN_ROLE
 *   @email - (STRING - REQUIRED): The email of the admin,
 *   @phone - (STRING - REQUIRED): The phone of the admin,
 *   @timezone - (STRING - REQUIRED): The timezone of the admin,
 *   @locale - (STRING - REQUIRED): The language of the user
 *   @password1 - (STRING - REQUIRED): The unhashed password1 of the admin
 *   @password2 - (STRING - REQUIRED): The unhashed password2 of the admin
 *   @acceptedTerms - (BOOLEAN - REQUIRED): Whether terms is accepted or not
 * }
 *
 * Success: Return an admin
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED
 *   400: ADMIN_BAD_REQUEST_ADMIN_ALREADY_EXISTS
 *   400: ADMIN_BAD_REQUEST_INVALID_TIMEZONE
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Create(req, res) {
  const schema = joi.object({
    firstName: joi.string().trim().min(1).required(),
    lastName: joi.string().trim().min(1).required(),
    active: joi.boolean().required(),
    role: joi.string().uppercase().valid(...ADMIN_ROLES).default(ADMIN_ROLE.ADMIN).optional(),
    email: joi.string().trim().lowercase().min(3).email().required(),
    phone: joi.string().trim().required(),
    timezone: joi.string().min(1).required(),
    locale: joi.string().min(1).required(),
    password1: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[invalid_password_format]'))),
    password2: joi.string().min(PASSWORD_LENGTH_MIN).regex(PASSWORD_REGEX).required().error(new Error(req.__('ADMIN[invalid_password_format]'))),
    acceptedTerms: joi.boolean().required()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // check passwords
  if (req.args.password1 !== req.args.password2)
    return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL);

  // set password
  req.args.password = req.args.password1;

  // check terms of service
  if (!req.args.acceptedTerms)
    return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED);

  // TODO: verify phone number

  // create database transactions
  const t = await models.db.transaction(); // https://sequelize.org/master/manual/transactions.html

  try {

    // check if admin email already exists
    const duplicateAdmin = await models.admin.findOne({
      where: {
        email: req.args.email
      }
    }, { transaction: t });

    // check duplicate admin user
    if (duplicateAdmin) {
      await t.rollback(); // must rollback since we are returning
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ADMIN_ALREADY_EXISTS);
    }

    // check timezone
    if (!isValidTimezone(req.args.timezone)) {
      await t.rollback(); // must rollback since we are returning
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_TIMEZONE);
    }

    // create admin
    const newAdmin = await models.admin.create({
      timezone: req.args.timezone,
      locale: req.args.locale,
      firstName: req.args.firstName,
      lastName: req.args.lastName,
      active: req.args.active,
      email: req.args.email,
      phone: req.args.phone,
      password: req.args.password,
      acceptedTerms: req.args.acceptedTerms
    }, { transaction: t });

    // grab admin without sensitive data
    const findAdmin = await models.admin.findByPk(newAdmin.id, {
      attributes: {
        exclude: models.admin.getSensitiveData() // remove sensitive data
      },
      transaction: t
    }); // END grab partner without sensitive data

    // SOCKET EMIT EVENT
    const io = await socket.get(); // to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
    const data = { admin: findAdmin };
    io.to(`${SOCKET_ROOMS.GLOBAL}`).emit(SOCKET_EVENTS.ADMIN_CREATED, data);
    io.to(`${SOCKET_ROOMS.ADMIN}${findAdmin.id}`).emit(SOCKET_EVENTS.ADMIN_CREATED, data);

    // commit transaction
    await t.commit();

    // return
    return {
      status: 201,
      success: true,
      admin: findAdmin
    };
  } catch (error) {
    // rollback anything that was created if error
    await t.rollback();
    throw error;
  }
} // END V1Create
