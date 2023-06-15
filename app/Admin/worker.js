/**
 * ADMIN BACKGROUND WORKER
 *
 * This is where we process background tasks for the Admin feature.
 * Gets exported to the top level /worker.js to be run in a worker process.
 */

'use strict';

// third party node modules
const queue = require('../../services/queue'); // the queue service for background jobs
const AdminQueue = queue.get('AdminQueue');

// services
const { queueError } = require('../../services/error');

// tasks
const tasks = require('./tasks');

// Function is called in /worker.js
// Returns an array of Queues used in this feature so we can gracefully close them in worker.js
module.exports = () => {

  // Process Admin Feature Background Tasks
  AdminQueue.process('V1ExportTask', tasks.V1ExportTask);
  AdminQueue.process('V1TestSocketTask', tasks.V1TestSocketTask);
  AdminQueue.on('failed', async (job, error) => queueError(error, AdminQueue, job));
  AdminQueue.on('stalled', async job => queueError(new Error('Queue Stalled.'), AdminQueue, job));
  AdminQueue.on('error', async error => queueError(error, AdminQueue));

  // future tasks below
}
