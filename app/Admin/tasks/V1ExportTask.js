/**
 * ADMIN V1ExportTask
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL } = process.env;

// third-party
const _ = require('lodash');
const Op = require('sequelize').Op; // for operator aliases like $gte, $eq
const io = require('socket.io-emitter')(REDIS_URL); // to emit real-time events to client
const joi = require('@hapi/joi'); // validations
const moment = require('moment-timezone');
const passport = require('passport');
const currency = require('currency.js');

// services
const email = require('../../../services/email');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');
const { errorResponse, joiErrorsMessage, ERROR_CODES } = require('../../../services/error');

// models
const models = require('../../../models');

// helpers
const { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');
const { randomString, createJwtToken } = require('../../../helpers/logic');
const { checkPasswords, isValidTimezone } = require('../../../helpers/validate');
const { LIST_INT_REGEX } = require('../../../helpers/constants');

// methods
module.exports = {
  V1ExportTask
}

/**
 *
 * @param {*} job
 */
async function V1ExportTask(job){
  console.log('THIS IS BEING CALLED');
  console.log(job.id);
  console.log(job.data);

  return Promise.reject(new Error('TEST ERROR'));
  // return Promise.resolve();
}
