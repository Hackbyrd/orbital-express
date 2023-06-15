/**
 * ADMIN V1TestSocket ACTION
 */

'use strict';

// services
const queue = require('../../../services/queue'); // process background tasks from Queue
const socket = require('../../../services/socket'); // require socket service to initiate socket.io to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');

// methods
module.exports = {
  V1TestSocket
}

/**
 * For testing if socket works. This is for testing purposes only via API_URL/socket
 *
 * GET  /v1/admins/testsocket
 * POST /v1/admins/testsocket
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 *
 * Must be logged out | Must be logged in | Can be both logged in or logged out
 * Roles: ['admin', 'member', 'member.ADMIN']
 *
 * req.params = {}
 * req.args = {
 * }
 *
 * Success: Return { status: 200, success: true, data: { key: 'value' }}
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1TestSocket(req, res) {
  /***** DO WORK HERE *****/
  try {
    // assemble data
    const data = { message: 'API EVENT EMITTED' };

    // ADD BACKGROUND JOB TO QUEUE
    const AdminQueue = queue.get('AdminQueue'); // grab relevent queue
    const job = await AdminQueue.add('V1TestSocketTask', data); // add new job to queue

    // SOCKET EMIT EVENT
    const io = await socket.get(); // get socket.io instance
    data.jobId = job.id;
    io.to(`${SOCKET_ROOMS.TEST}${1}`).emit(SOCKET_EVENTS.TEST_SOCKET_EVENT_ONE, data);

    // return response - this will be wrapped around in a "resolve" promise automatically because this is an async function
    return {
      status: 203,
      success: true,
      jobId: job.id,
      data: data
    };
  } catch (error) {
    // this will be wrapped around in a "reject" promise automatically because this is an async function
    throw error;
  }
} // END V1TestSocket
