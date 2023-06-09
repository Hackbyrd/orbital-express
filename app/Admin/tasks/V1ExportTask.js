/**
 * ADMIN V1ExportTask TASK
 */

'use strict';

// third-party
const joi = require('@hapi/joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

// services
const socket = require('../../../services/socket');

// methods
module.exports = {
  V1ExportTask
}

/**
 * Export task
 *
 * @job = {
 *   @id - (INTEGER - REQUIRED): ID of the background job
 *   @data = {
 *     @adminId - (NUMBER - REQUIRED): The admin id
 *   }
 * }
 *
 * Success: Return result
 */
async function V1ExportTask(job) {
  const schema = joi.object({
    adminId: joi.number().min(1).required()
  });

  // validate
  const { error, value } = schema.validate(job.data);
  if (error)
    return Promise.resolve(new Error(joiErrorsMessage(error)));
  job.data = value; // updated arguments with type conversion

  try {
    /***** DO WORK HERE *****/
    const jobId = job.id;
    const adminId = job.data.adminId;
    const result = `${jobId} - ${adminId}`;

    const io = await socket.get(); // to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/
    const data = { message: 'updated' };
    io.to(`${socket.SOCKET_ROOMS.GLOBAL}`).emit(socket.SOCKET_EVENTS.ADMIN_UPDATED, data);
    io.to(`${socket.SOCKET_ROOMS.ADMIN}1`).emit(socket.SOCKET_EVENTS.ADMIN_UPDATED, data);

    // return
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
} // END V1ExportTask
