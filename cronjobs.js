/**
 * Run all cronjobs
 * https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
 * https://www.npmjs.com/package/cron
 * This is the clock process on heroku
 *
 * !Important: Should only have 1 dyno process running for this. heroku ps:scale clock=1
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// third party node modules
const CronJob = require('cron').CronJob;
const queue = require('./services/queue'); // Queue Service for Background Jobs

// Print Process Info
console.log(`CLOCK process.pid: ${process.pid}`);
console.log(`CLOCK process.env.NODE_ENV: ${NODE_ENV}`);

/*****************/
/***** ADMIN *****/
/*****************/
const AdminQueue = queue.get('AdminQueue');

// Example: run a task every minute.
// new CronJob('0 * * * * *', () => { AdminQueue.add('V1ExampleTask', {}); }, null, true, 'UTC');

// Example: run a task daily at midnight UTC (every 5 min in development).
// const dailySchedule = NODE_ENV === 'development' ? '0 */5 * * * *' : '0 0 0 * * *';
// new CronJob(dailySchedule, () => { AdminQueue.add('V1DailyMaintenanceTask', {}); }, null, true, 'UTC');

// add future cronjobs here
