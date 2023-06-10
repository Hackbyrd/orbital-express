/**
 * Queue Service for Background Jobs
 *
 * We need to make a wrapper around queues because there is no way to close connections safely
 *
 * Bull: https://optimalbits.github.io/bull/
 * Bull Reference: https://github.com/OptimalBits/bull/blob/41ec58ef2233074fc1403d448270cd2122741fe1/REFERENCE.md
 *
 * TODO: TEST
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL, REDISCLOUD_URL } = process.env;

// third-party
const Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean

// Store all queues here
const QUEUES = {};

// export functions
module.exports = {
  // variables
  QUEUES, // access to all queues

  // methods
  get,
  closeAll
};

/**
 * Return a queue, create if does not exists yet
 *
 * @name - (STRING - REQUIRED): The name of the queue
 *
 * return: a queue
 */
function get(name) {
  if (!QUEUES[name])
    QUEUES[name] = new Queue(name, REDIS_URL || REDISCLOUD_URL);

  return QUEUES[name];
} // END get

/**
 * Close all queues
 *
 * return: true/false
 */
async function closeAll() {
  return new Promise(async (resolve, reject) => {
    try {
      // grab list of queue names
      const queueNames = Object.keys(QUEUES);

      // only print this if not in test environment
      if (NODE_ENV !== 'test') {
        console.log(`Closing ${queueNames.length} queue connection${queueNames.length === 1 ? '' : 's'}...`);
      }

      // close all queues
      for (let i = 0; i < queueNames.length; i++) {
        const q = QUEUES[queueNames[i]]; // grab a queue

        // only print this if not in test environment
        if (NODE_ENV !== 'test') {
          console.log(`Closing ${q.name}...`);
        }

        // gracefully disconnect
        await q.client.disconnect();
        await q.close();
        
        // only print this if not in test environment
        if (NODE_ENV !== 'test') {
          console.log(`${q.name} closed!`);
        }
      }

      // only print this if not in test environment
      if (NODE_ENV !== 'test') {
        console.log('All queues connections closed!');
      }
      return resolve(true);
    } catch (error) {
      return reject(error);
    }
  });
} // END closeAll
