/**
 * ADMIN V1TestSocketTask TASK
 */

'use strict';

// ENV variables
const { NODE_ENV, HOSTNAME } = process.env;

// built-in node modules
const os = require('os');
const fs = require('fs');
const path = require('path');

// third-party node modules
const _ = require('lodash'); // general helper methods: https://lodash.com/docs
const Op = require('sequelize').Op; // for model operator aliases like $gte, $eq
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md
const i18n = require('i18n'); // defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files: https://github.com/mashpie/i18n-node
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const convert = require('convert-units'); // https://www.npmjs.com/package/convert-units
const slugify = require('slugify'); // convert string to URL friendly string: https://www.npmjs.com/package/slugify
const sanitize = require("sanitize-filename"); // sanitize filename: https://www.npmjs.com/package/sanitize-filename
const passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/
const currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/
const accounting = require('accounting'); // handle outputing readable format for currency: http://openexchangerates.github.io/accounting.js/

// services
const email = require('../../../services/email'); // to send emails
const queue = require('../../../services/queue'); // process background tasks from Queue
const socket = require('../../../services/socket'); // require socket service to initiate socket.io to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');
const { randomString } = require('../../../helpers/logic');
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1TestSocketTask
}

/**
 * For testing if socket works. This is for testing purposes only via API_URL/socket
 *
 * @job = {
 *   @id - (INTEGER - REQUIRED): ID of the background job
 *   @data = {
 *     @message - (STRING - REQUIRED): Message
 *   }
 * }
 *
 * Success: Return true
 */
async function V1TestSocketTask(job) {
  const schema = joi.object({
    message: joi.string().trim().required()
  });

  // validate
  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error));
  job.data = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  try {
    /***** DO WORK HERE *****/

    // assemble data
    const data = { message: 'BACKGROUND TASK EVENT EMITTED', jobId: job.id };

    // SOCKET EMIT EVENT
    const io = await socket.get(); // get socket.io instance
    io.to(`${SOCKET_ROOMS.TEST}${1}`).emit(SOCKET_EVENTS.TEST_SOCKET_EVENT_TWO, data);

    // return true - this will be wrapped around in a "resolve" promise automatically because this is an async function
    return true;
  } catch (error) {
    throw error; // this will be wrapped around in a "reject" promise automatically because this is an async function
  }
} // END V1TestSocketTask
