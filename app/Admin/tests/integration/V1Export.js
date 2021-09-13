/**
 * TEST ADMIN V1Export METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// ENV variables
const { REDIS_URL } = process.env;

// third party
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node
const Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean

// server & models
const app = require('../../../../server');

// assertion library
const { expect } = require('chai');
const request = require('supertest');

// services
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, reset, populate } = require('../../../../helpers/tests');

// queues
const AdminQueue = new Queue('AdminQueue', REDIS_URL);

describe('Admin.V1Export', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/export';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

  // clear database
  beforeEach(async () => {
    await reset();
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
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
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
      await AdminQueue.empty();
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

        expect(res.statusCode).to.equal(203);
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('jobId');

        // get number of jobs
        const jobCountResult = await AdminQueue.getJobCounts();
        expect(jobCountResult.waiting).to.equal(1);

        // check if job is there
        const job = await AdminQueue.getJob(res.body.jobId);
        expect(job).to.be.an('object');
      } catch (error) {
        throw error;
      }
    }); // END [admin] should export successfully
  }); // END Role: Admin
}); // END Admin.V1Export
