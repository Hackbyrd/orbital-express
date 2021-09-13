/**
 * ADMIN BACKGROUND WORKER
 *
 * This is where we process background tasks for the Admin feature.
 * Gets exported to the top level /worker.js to be run in a worker process.
 */

'use strict';

// ENV variables
const { REDIS_URL } = process.env;

// third party node modules
const Queue = require('bull'); // process background tasks from Queue
const AdminQueue = new Queue('AdminQueue', REDIS_URL);

// services
const { queueError } = require('../../services/error');

// tasks
const tasks = require('./tasks');

// Function is called in /worker.js
// Returns an array of Queues used in this feature so we can gracefully close them in worker.js
module.exports = () => {

  // Process Admin Feature Background Tasks
  AdminQueue.process('V1ExportTask', tasks.V1ExportTask);
  AdminQueue.on('failed', async (job, error) => queueError(error, AdminQueue, job));
  AdminQueue.on('stalled', async job => queueError(new Error('Queue Stalled.'), AdminQueue, job));
  AdminQueue.on('error', async error => queueError(error, AdminQueue));

  // future tasks below

  // return array of queues to the top level worker.js to gracefully close them
  return [AdminQueue];  // return empty array [] if not using any queues in this feature
}
