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

// services
const email = require('./services/email');
const phone = require('./services/phone');
const queue = require('./services/queue'); // the queue service for background jobs
const socket = require('./services/socket'); // require socket service to initiate socket.io
const i18n = require('./services/language').getI18n(); // grab i18n after we configured it. defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files:

// ENV variables
const { NODE_ENV, WEB_CONCURRENCY } = process.env;
const PROCESSES = NODE_ENV === 'production' ? WEB_CONCURRENCY || os.cpus().length : 1; // number of cores

// variables
const APP_DIR = './app'; // app directory
const WORKER_FILE = 'worker.js'; // the worker file name

// Store all worker routes here
const workerRoutes = [];

// check if is directory and get directories
const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
const directories = getDirectories(path.join(__dirname, APP_DIR));

// require app worker routes
directories.forEach(dir => workerRoutes.push(require(`${dir}/${WORKER_FILE}`)));

// function to start app
async function startWorker(processId) {
  const models = require('./models'); // get models

  // Print Process Info
  console.log(`WORKER processId: ${processId}`);
  console.log(`WORKER process.pid: ${process.pid}`);
  console.log(`WORKER process.env.NODE_ENV: ${NODE_ENV}`);

  // to check if database connection is established
  await models.db.authenticate().catch(err => {
    console.error(err);
    process.exit(1);
  });

  // create server and initiate socket.io
  await socket.get();

  // initial GlobalQueue
  // const GlobalQueue = queue.get('GlobalQueue');

  // run all feature workers and add feature specific queues to QueuesArray
  workerRoutes.forEach(worker => worker());
  email.worker(); // run email worker
  phone.worker(); // run phone worker

  // Graceful exit
  process.on('SIGTERM', async () => {
    try {
      // close connection to queue
      await queue.closeAll();

      // close socket connections
      await socket.close();

      // close connection to database
      await models.db.close();
      console.log('Database connection closed.');

      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

// run concurrent workers
throng({
  worker: startWorker,
  workers: PROCESSES, // Number of workers (cpu count)
  lifetime: Infinity, // ms to keep cluster alive (Infinity)
  grace: 5000 // ms grace period after worker SIGTERM (5000)
});
