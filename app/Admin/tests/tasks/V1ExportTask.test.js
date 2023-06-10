/**
 * TEST ADMIN V1ExportTask METHOD
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
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/

// server & models
const app = require('../../../../server');
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

// queues: add queues you will use in testing here
let AdminQueue = null; // initial value, will be set in beforeEach because it is async

describe('Admin.V1ExportTask', async () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // clear database, populate database with fixtures and empty queues
  beforeEach(async () => {
    // reset fixtures with fresh deep copy, must call these functions to get deep copy because we don't want modified fixtures from previous tests to affect other tests
    adminFix = adminFixFn();

    try {
      // create queue connections here
      AdminQueue = queue.get('AdminQueue');
      await UserQueue.empty(); // make sure queue is empty before each test runs

      await socket.get(); // create socket connection
      await reset(); // reset database
      await populate('fix1'); // populate test database with fix1 dataset
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  // must close all queue connections and database connection
  afterAll(async () => {
    try {
      await queue.closeAll(); // close all queue connections
      await socket.close(); // close socket connection
      await models.db.close(); // close database connection
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  it('should export successfully', async () => {
    const admin1 = adminFix[0]; // get admin

    try {
      const result = await V1ExportTask({
        id: 1,
        data: {
          adminId: admin1.id
        }
      });

      expect(result).to.equal(`1 - ${admin1.id}`);
    }catch (error) {
      throw error;
    }
  }); // END should export successfully
}); // END Admin.V1ExportTask
