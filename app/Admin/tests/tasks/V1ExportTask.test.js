/**
 * TEST ADMIN V1ExportTask METHOD
 *
 * JEST CHEATSHEET: https://devhints.io/jest
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// third party
const _ = require('lodash'); // general helper methods: https://lodash.com/docs

// models
const models = require('../../../../models');

// assertion library
const request = require('supertest');

// services
const queue = require('../../../../services/queue'); // process background tasks from Queue
const socket = require('../../../../services/socket'); // require socket service to initiate socket.io
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, reset, populate } = require('../../../../helpers/tests');

// server: initialize server in the beforeAll function because it is an async function
let app = null;

// queues: add queues you will use in testing here
let AdminQueue = null; // initial value, will be set in beforeEach because it is async

// Skip this test. We are not finished writing this yet
describe('Admin.V1ExportTask', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // beforeAll: initialize app server
  beforeAll(async () => {
    try {
      app = await require('../../../../server');
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  // beforeEach: reset fixtures, establish & empty queue connections, establish socket connections and clear database
  beforeEach(async () => {
    // reset fixtures with fresh deep copy, must call these functions to get deep copy because we don't want modified fixtures from previous tests to affect other tests
    adminFix = adminFixFn();

    try {
      // create queue connections here
      AdminQueue = queue.get('AdminQueue');
      await AdminQueue.obliterate({ force: true }); // make sure queue is empty before each test runs

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

  it.skip('should export successfully', async () => {
    const admin1 = adminFix[0]; // get admin

    try {
      const result = await V1ExportTask({
        id: 1,
        data: {
          adminId: admin1.id
        }
      });

      expect(result).toBe(`1 - ${admin1.id}`);
    } catch (error) {
      throw error;
    }
  }); // END should export successfully
}); // END Admin.V1ExportTask
