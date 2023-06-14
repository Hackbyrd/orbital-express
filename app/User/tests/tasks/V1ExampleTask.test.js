/**
 * TEST USER V1ExampleTask METHOD
 *
 * JEST CHEATSHEET: https://devhints.io/jest
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// ENV variables
const { NODE_ENV, HOSTNAME } = process.env;

// third party
const _ = require('lodash'); // general helper methods: https://lodash.com/docs
const i18n = require('i18n'); // defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files: https://github.com/mashpie/i18n-node
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/
const { faker } = require('@faker-js/faker'); // https://fakerjs.dev/api

// models
const models = require('../../../../models');

// assertion library
const request = require('supertest');

// tasks
const { V1ExampleTask } = require('../../../../app/User/tasks');

// services
const queue = require('../../../../services/queue'); // process background tasks from Queue
const socket = require('../../../../services/socket'); // require socket service to initiate socket.io
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, partnerLogin, userLogin, reset, populate } = require('../../../../helpers/tests');

// server: initialize server in the beforeAll function because it is an async function
let app = null;

// queues: add queues you will use in testing here
let UserQueue = null; // initial value, will be set in beforeEach because it is async

describe('User.V1ExampleTask', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));
  const partnerFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/partner'));
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));

  // fixtures
  let adminFix = null;
  let partnerFix = null;
  let userFix = null;

  // beforeAll: initialize app server
  beforeAll(async () => {
    try {
      app = await require('../../../../server');
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  // beforeEach: reset fixtures, establish & empty queue connections, establish socket connections and clear database, populate database with fixtures and empty queues
  beforeEach(async () => {
    // reset fixtures with fresh deep copy, must call these functions to get deep copy because we don't want modified fixtures from previous tests to affect other tests
    adminFix = adminFixFn();
    partnerFix = partnerFixFn();
    userFix = userFixFn();

    try {
      // create queue connections here
      UserQueue = queue.get('UserQueue');
      await UserQueue.empty(); // make sure queue is empty before each test runs

      await socket.get(); // create socket connection
      await reset(); // reset database
      await populate('fix1'); // populate test database with fix1 dataset
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  // afterAll: close all queue & socket connections, close database & app server connections
  afterAll(async () => {
    try {
      await queue.closeAll(); // close all queue connections
      await socket.close(); // close socket connection
      await models.db.close(); // close database connection
      app.close(); // close server connection
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  it('should test something', async () => {
    try {
      // execute tests here

      // check UserQueue to see if job was created
      // https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md
      const jobs = await UserQueue.getJobs();
      expect(jobs).toHaveLength(1); // only one job should be created
      expect(jobs[0].name).toBe('V1ExampleTask'); // the job name should be V1ExampleTask
    } catch (error) {
      console.error(error);
      throw error;
    }
  }); // END should test something
}); // END User.V1ExampleTask
