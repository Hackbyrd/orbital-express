/**
 * Run all cronjobs
 * https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
 * https://www.npmjs.com/package/cron
 * This is the clock process on heroku
 *
 * Important! - Should only have 1 dyno process running for this. heroku ps:scale clock=1
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL } = process.env;

// third party node modules
const CronJob = require('cron').CronJob;
const Queue = require('bull'); // process background tasks from Queue

// Print Process Info
console.log(`CLOCK process.pid: ${process.pid}`);
console.log(`CLOCK process.env.NODE_ENV: ${NODE_ENV}`);

/*****************/
/***** ADMIN *****/
/*****************/
const AdminQueue = new Queue('AdminQueue', REDIS_URL);

// Example automatically make request. Run every 1 min.
new CronJob('0 0 * * * *', () => { AdminQueue.add('V1ExportTask', { adminId: 1 }); }, null, true, 'UTC');
