/**
 * Run the worker.js in cluster
 * This is where background jobs are run
 *
 * Bull Documentation:
 * https://github.com/OptimalBits/bull
 * https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean
 */

'use strict';

// built-in node modules
const fs = require('fs');
const os = require('os');
const path = require('path');

// third-party node modules
const throng = require('throng'); // concurrency
const Queue = require('bull'); // process background tasks from Queue

// ENV variables
const { NODE_ENV, WEB_CONCURRENCY, REDIS_URL } = process.env;
const PROCESSES = NODE_ENV === 'production' ? WEB_CONCURRENCY || os.cpus().length : 1; // number of cores

// variables
const APP_DIR = './app'; // app directory
const PROCESSOR_FILE = 'processor.js'; // the processor file name

// Store all processor routes here
const processorRoutes = [];

// check if is directory and get directories
const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
const directories = getDirectories(path.join(__dirname, APP_DIR));

// require app processor routes
directories.forEach(dir => processorRoutes.push(require(`${dir}/${PROCESSOR_FILE}`)));

// function to start app
async function startWorker(processId) {
  // Print Process Info
  console.log(`WORKER processId: ${processId}`);
  console.log(`WORKER process.pid: ${process.pid}`);
  console.log(`WORKER process.env.NODE_ENV: ${NODE_ENV}`);

  // GlobalQueue
  const GlobalQueue = new Queue('GlobalQueue', REDIS_URL);
  let QueuesArray = [GlobalQueue]; // store queues so we can gracefully shut it down

  // run all feature processors and add feature specific queues to QueuesArray
  processorRoutes.forEach(processor => {
    QueuesArray = QueuesArray.concat(processor());
  });

  // Graceful exit
  process.on('SIGTERM', async () => {
    console.log(`Closing ${QueuesArray.length} queue connection${QueuesArray.length === 1 ? '' : 's'}...`);

    // go through all queues and close them down
    for (let i = 0; i < QueuesArray.length; i++) {
      console.log(`Closing ${QueuesArray[i].name}...`);

      // close queue
      await QueuesArray[i].close().catch(err => {
        console.error(err);
        process.exit(1);
      });
    }

    console.log('All queue connections closed.');
    process.exit(0);
  });
}

// run concurrent workers
throng({
  workers: PROCESSES, // Number of workers (cpu count)
  lifetime: Infinity, // ms to keep cluster alive (Infinity)
  grace: 5000 // ms grace period after worker SIGTERM (5000)
}, startWorker);
