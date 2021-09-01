/**
 * USER V1ExampleTask TASK
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL } = process.env;

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
const { randomString } = require('../../../helpers/logic');
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// queues
const UserQueue = new Queue('UserQueue', REDIS_URL);

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
 * Success: Return something
 *
 * !IMPORTANT: This is an important message
 * !NOTE: This is a note
 * TODO: This is a todo
 */
async function V1ExampleTask(job) {
  const schema = joi.object({
    alpha: joi.string().trim().min(1).lowercase().required().error(new Error(req.__('USER_V1Example_Invalid_Argument[alpha]'))),
    beta: joi.boolean().default(true).optional().error(new Error(req.__('USER_V1Example_Invalid_Argument[beta]'))),
    gamma: joi.number().integer().min(1).max(10).error(new Error(req.__('USER_V1Example_Invalid_Argument[gamma]'))),
    delta: joi.string().trim().lowercase().min(3).email().required().error(new Error(req.__('USER_V1Example_Invalid_Argument[delta]'))),
    zeta: joi.string().trim().valid('a', 'b').required().error(new Error(req.__('USER_V1Example_Invalid_Argument[zeta]')))
  }).with('alpha', 'beta') // must come together
    .xor('beta', 'gamma') // one and not the other must exists
    .or('gamma', 'delta'); // at least one must exists

  // validate
  const { error, value } = schema.validate(job.data);
  if (error)
    return Promise.resolve(new Error(joiErrorsMessage(error)));
  req.args = value; // updated arguments with type conversion

  try {
    /***** DO WORK HERE *****/

    // assemble data
    const data = { key: 'value' };

    // ADD BACKGROUND JOB TO QUEUE
    const job = await UserQueue.add('V1ExampleTask', data);

    // SOCKET EMIT EVENT
    io.to(`${SOCKET_ROOMS.GLOBAL}`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);
    io.to(`${SOCKET_ROOMS.ADMIN}${'_adminId_'}`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);

    // return
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
} // END V1ExampleTask
