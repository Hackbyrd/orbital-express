/**
 * USER V1ExampleTask TASK
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
  V1ExampleTask
}

/**
 * Method Description
 *
 * @job = {
 *   @id - (INTEGER - REQUIRED): ID of the background job
 *   @data = {
 *     @alpha - (STRING - REQUIRED): Alpha argument description
 *     @beta - (BOOLEAN - OPTIONAL) [DEFAULT - 100]: Beta argument description
 *     @gamma - (NUMBER - OPTIONAL or REQUIRED): Cato argument description
 *     @delta - (STRING - REQUIRED): Delta argument description
 *     @zeta - (STRING - REQUIRED) [VALID - 'a', 'b']: Zeta argument description
 *   }
 * }
 *
 * Success: Return true
 *
 * !IMPORTANT: This is an important message
 * !NOTE: This is a note
 * TODO: This is a todo
 */
async function V1ExampleTask(job) {
  const schema = joi.object({
    alpha: joi.string().trim().min(1).lowercase().required().error(new Error(i18n.__('USER_V1Example_Invalid_Argument[alpha]'))),
    beta: joi.boolean().default(true).optional().error(new Error(i18n.__('USER_V1Example_Invalid_Argument[beta]'))),
    gamma: joi.number().integer().min(1).max(10).error(new Error(i18n.__('USER_V1Example_Invalid_Argument[gamma]'))),
    delta: joi.string().trim().lowercase().min(3).email().required().error(new Error(i18n.__('USER_V1Example_Invalid_Argument[delta]'))),
    zeta: joi.string().trim().valid('a', 'b').required().error(new Error(i18n.__('USER_V1Example_Invalid_Argument[zeta]')))
  }).with('alpha', 'beta') // must come together
    .xor('beta', 'gamma') // one and not the other must exists
    .or('gamma', 'delta'); // at least one must exists

  // validate
  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error));
  job.data = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  try {
    /***** DO WORK HERE *****/

    // assemble data
    const data = { key: 'value' };

    // ADD BACKGROUND JOB TO QUEUE
    const UserQueue = queue.get('UserQueue'); // grab relevent queue
    const job = await UserQueue.add('V1ExampleTask', data);

    // language translation
    // const message = i18n.__('YOUR_EMAIL_IS_MESSAGE {{email}}', { email: 'bob@example.com' });

    // SOCKET EMIT EVENT
    // const io = socket.get(); // get socket.io instance
    // io.to(`${SOCKET_ROOMS.GLOBAL}`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);
    // io.to(`${SOCKET_ROOMS.ADMIN}${'EXAMPLE_ADMIN_ID'}`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);

    // return true - this will be wrapped around in a "resolve" promise automatically because this is an async function
    return true;
  } catch (error) {
    throw error; // this will be wrapped around in a "reject" promise automatically because this is an async function
  }
} // END V1ExampleTask
