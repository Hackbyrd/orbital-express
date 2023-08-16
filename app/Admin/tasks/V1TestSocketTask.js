/**
 * ADMIN V1TestSocketTask TASK
 */

'use strict';

// third-party node modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

// services
const socket = require('../../../services/socket'); // require socket service to initiate socket.io to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');
const { joiErrorsMessage } = require('../../../services/error');

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
