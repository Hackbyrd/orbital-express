/**
 * ADMIN V1Login ACTION
 */

'use strict';

// ENV variables
const { ADMIN_WEB_HOST } = process.env;

// third-party
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/

// services
const { ERROR_CODES, errorResponse } = require('../../../services/error');

// models
const models = require('../../../models');

// helpers
const { createJwtToken } = require('../../../helpers/logic');

// methods
module.exports = {
  V1Login
}

/**
 * Login an admin
 *
 * GET  /v1/admins/login
 * POST /v1/admins/login
 *
 * Must be logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @email - (STRING - REQUIRED): The email of the admin,
 *   @password - (STRING - REQUIRED): The unhashed password of the admin
 * }
 *
 * Success: Return an admin and JWT token.
 * Errors:
 *   400: ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS
 *   400: ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE
 *   400: ADMIN_BAD_REQUEST_ACCOUNT_DELETED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Login(req, res) {
  // need to wrap in promise because of the passport.authenticate callback
  return new Promise((resolve, reject) => {

    // login admin WITHOUT SESSION
    passport.authenticate('JWTAdminLogin', { session: false }, async (err, admin, info) => {
      if (err)
        return reject(err);

      // check if admin exists
      if (!admin)
        return resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));

      // return error message if admin is inactive
      if (!admin.active)
        return resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE));

      // return error message if admin is deleted
      if (admin.deletedAt)
        return resolve(errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DELETED));

      // update login count and last login
      try {
        await models.admin.update({
          loginCount: admin.loginCount + 1,
          lastLogin: moment.tz('UTC')
        }, {
          where: {
            id: admin.id
          }
        });

        // find admin
        const updatedAdmin = await models.admin.findByPk(admin.id, {
          attributes: {
            exclude: models.admin.getSensitiveData() // remove sensitive data
          }
        });

        // return success
        return resolve({
          status: 201,
          success: true,
          token: createJwtToken(updatedAdmin, ADMIN_WEB_HOST),
          admin: updatedAdmin.dataValues
        });
      } catch (error) {
        return reject(error);
      }
    })(req, res, null);
  }); // END Promise
} // END V1Login
