/**
 * TEST ADMIN V1ResetPassword METHOD
 *
 * JEST CHEATSHEET: https://devhints.io/jest
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// ENV variables
const { ADMIN_WEB_HOSTNAME } = process.env;

// third party
const _ = require('lodash'); // general helper methods: https://lodash.com/docs
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node

// models
const models = require('../../../../models');

// assertion library
const request = require('supertest');

// services
const queue = require('../../../../services/queue'); // process background tasks from Queue
const socket = require('../../../../services/socket'); // require socket service to initiate socket.io
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { reset, populate } = require('../../../../helpers/tests');

// server: initialize server in the beforeAll function because it is an async function
let app = null;

// queues: add queues you will use in testing here
let AdminQueue = null; // initial value, will be set in beforeEach because it is async
let EmailQueue = null; // initial value, will be set in beforeEach because it is async

describe('Admin.V1ResetPassword', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/resetpassword';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

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
      await AdminQueue.empty(); // make sure queue is empty before each test runs

      // establish email queue connection
      EmailQueue = queue.get('EmailQueue');
      await EmailQueue.empty(); // make sure queue is empty before each test runs

      await socket.get(); // create socket connection
      await reset(); // reset database
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

  // Logged Out
  describe('Role: Logged Out', () => {
    // populate database with fixtures and empty queues
    beforeEach(async () => {
      try {
        await populate('fix1'); // populate test database with fix1 dataset
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    it('[logged-out] should call reset password successfully', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: admin1.email
      };

      try {
        // send reset request
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message', 'An email has been sent to ' + params.email + '. Please check your email to confirm your new password change.');

        // check if resetPassword, passwordResetToken, passwordResetExpire are there
        const foundAdmin = await models.admin.findByPk(admin1.id);
        expect(typeof foundAdmin.passwordResetToken).toBe('string')
        expect(foundAdmin.passwordResetToken).toHaveLength(64);
        expect(foundAdmin.passwordResetExpire).toBeDefined();

        // check reset link
        expect(res.body).toHaveProperty('resetLink', `${ADMIN_WEB_HOSTNAME}/confirm-password?passwordResetToken=${foundAdmin.passwordResetToken}`);

        // check EmailQueue to see if email job was created
        const jobs = await EmailQueue.getJobs();
        expect(jobs).toHaveLength(1); // only one job should be created
        expect(jobs[0].name).toBe('V1SendEmailTask'); // the job name should be V1SendEmailTask
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should call reset password successfully

    it('[logged-out] should fail to call reset password because email does not exist', async () => {
      const params = {
        email: 'noemail@email.com',
      };

      try {
        // send reset request
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to call reset password because email does not exist
  }); // END Role: Logged Out
}); // END Admin.V1ResetPassword
