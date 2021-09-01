/**
 * USER V1Login SERVICE
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL, USER_CLIENT_HOST } = process.env;

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
const { createJwtToken, randomString } = require('../../../helpers/logic');
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// queues
const UserQueue = new Queue('UserQueue', REDIS_URL);

// methods
module.exports = {
  V1Login
}

/**
 * Login an user
 *
 * GET  /v1/users/login
 * POST /v1/users/login
 *
 * Must be logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @email - (STRING - REQUIRED): The email of the user,
 *   @password - (STRING - REQUIRED): The unhashed password of the user
 * }
 *
 * Success: Return an user and JWT token.
 * Errors:
 *   400: USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS
 *   400: USER_BAD_REQUEST_ACCOUNT_INACTIVE
 *   400: USER_BAD_REQUEST_ACCOUNT_DELETED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Login(req, res) {
  // need to wrap in promise because of the passport.authenticate callback
  return new Promise((resolve, reject) => {

    // login user WITHOUT SESSION
    passport.authenticate('JWTUserLogin', { session: false }, async (err, user, info) => {
      if (err)
        return reject(err);

      // check if user exists
      if (!user)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));

      // return error message if user is inactive
      if (!user.active)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE));

      // return error message if user is deleted
      if (user.deletedAt)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DELETED));

      // update login count and last login
      try {
        await models.user.update({
          loginCount: user.loginCount + 1,
          lastLogin: moment.tz('UTC')
        }, {
          where: {
            id: user.id
          }
        });

        // find user
        const updatedUser = await models.user.findByPk(user.id, {
          attributes: {
            exclude: models.user.getSensitiveData() // remove sensitive data
          }
        });

        // return success
        return resolve({
          status: 201,
          success: true,
          token: createJwtToken(updatedUser, USER_CLIENT_HOST),
          user: updatedUser.dataValues
        });
      } catch (error) {
        return reject(error);
      }
    })(req, res, null);
  }); // END Promise
} // END V1Login