/**
 * USER BACKGROUND WORKER
 *
 * This is where we process background tasks for the User feature.
 * Gets exported to the top level /worker.js to be run in a worker process.
 */

'use strict';

// services
const queue = require('../../services/queue'); // process background tasks from Queue
const { queueError } = require('../../services/error');

// tasks
const tasks = require('./tasks');

// Function is called in /worker.js
module.exports = () => {

  // Process User Feature Background Tasks. Example below
  // const UserQueue = queue.get('UserQueue');
  // UserQueue.process('V1ExampleTask', tasks.V1ExampleTask);
  // UserQueue.on('failed', async (job, error) => queueError(error, UserQueue, job));
  // UserQueue.on('stalled', async job => queueError(new Error('Queue Stalled.'), UserQueue, job));
  // UserQueue.on('error', async error => queueError(error, UserQueue));

  // Add future tasks below

} // End worker.js
