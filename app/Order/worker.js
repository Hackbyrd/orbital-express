/**
 * ORDER BACKGROUND WORKER
 *
 * This is where we process background tasks for the Order feature.
 * Gets exported to the top level /worker.js to be run in a worker process.
 */

'use strict';

// ENV variables
const { REDIS_URL } = process.env;

// third party node modules
const Queue = require('bull'); // process background tasks from Queue
const OrderQueue = new Queue('OrderQueue', REDIS_URL);

// services
const { queueError } = require('../../services/error');

// tasks
const tasks = require('./tasks');

// Function is called in /worker.js
// Returns an array of Queues used in this feature so we can gracefully close them in worker.js
module.exports = () => {

  // Process Order Feature Background Tasks
  OrderQueue.process('V1ExampleTask', tasks.V1ExampleTask);
  OrderQueue.on('failed', async (job, error) => queueError(error, OrderQueue, job));
  OrderQueue.on('stalled', async job => queueError(new Error('Queue Stalled.'), OrderQueue, job));
  OrderQueue.on('error', async error => queueError(error, OrderQueue));

  // future tasks below

  // return array of queues to the top level worker.js to gracefully close them
  return [OrderQueue];  // return empty array [] if not using any queues in this feature
}
