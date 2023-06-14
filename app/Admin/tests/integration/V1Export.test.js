/**
 * TEST ADMIN V1Export METHOD
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

// services
const queue = require('../../../../services/queue'); // process background tasks from Queue
const socket = require('../../../../services/socket'); // require socket service to initiate socket.io
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, partnerLogin, userLogin, reset, populate } = require('../../../../helpers/tests');

// queues
const AdminQueue = new Queue('AdminQueue', REDIS_URL);

describe('Admin.V1Export', async () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/export';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

  // clear database
  beforeEach(async () => {
    // reset fixtures with fresh deep copy, must call these functions to get deep copy because we don't want modified fixtures from previous tests to affect other tests
    adminFix = adminFixFn();

    try {
      // create queue connections here
      AdminQueue = queue.get('AdminQueue');
      await AdminQueue.empty(); // make sure queue is empty before each test runs

      await socket.get(); // create socket connection
      await reset(); // reset database
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  // Logged Out
  describe('Role: Logged Out', async () => {
    // populate database with fixtures and empty queues
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[logged-out] should fail to export admin', async () => {
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to export admin
  }); // END Role: Logged Out

  // Role: Admin
  describe('Role: Admin', async () => {
    const jwt = 'jwt-admin';

    // populate database with fixtures and empty queues
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[admin] should export successfully', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        // params
        const params = {
          id: admin1.id
        };

        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params)

        expect(res.statusCode).toBe(203);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('jobId');

        // get number of jobs
        const jobCountResult = await AdminQueue.getJobCounts();
        expect(jobCountResult.waiting).toBe(1);

        // check if job is there
        const job = await AdminQueue.getJob(res.body.jobId);
        expect(job).to.be.an('object');
      } catch (error) {
        throw error;
      }
    }); // END [admin] should export successfully
  }); // END Role: Admin
}); // END Admin.V1Export
