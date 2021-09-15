/**
 * TEST ORDER V1Read METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// ENV variables
const { NODE_ENV, REDIS_URL } = process.env;

// third party
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node
const Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/

// server & models
const app = require('../../../../server');
const models = require('../../../../models');

// assertion library
const { expect } = require('chai');
const request = require('supertest');

// services
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, userLogin, reset, populate } = require('../../../../helpers/tests');

// queues
const OrderQueue = new Queue('OrderQueue', REDIS_URL);

describe.skip('Order.V1Read', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');
  const userFix = require('../../../../test/fixtures/fix1/user');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/orders';
  const routeMethod = '/<method>';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

  // clear database
  beforeEach(async () => {
    await reset();
  });

  // Logged Out
  describe.skip('Role: Logged Out', async () => {
    // populate database with fixtures and empty queues
    beforeEach(async () => {
      await populate('fix1');
      await OrderQueue.empty();
    });

    it('[logged-out] should test something', async () => {
      try {
        // execute tests here
        
        // example code below
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
        
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should test something
  }); // END Role: Logged Out

  // Role: Admin
  describe.skip('Role: Admin', async () => {
    const jwt = 'jwt-admin';

    // populate database with fixtures and empty queues
    beforeEach(async () => {
      await populate('fix1');
      await OrderQueue.empty();
    });

    it('[admin] should test something', async () => {
      const admin1 = adminFix[0]; // grab admin from fixtures

      try {
        // execute tests here
        // example code below

        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        // request params
        const params = {
          id: 1
        };

        // execute request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        // check response
        expect(res.statusCode).to.equal(200); // 201
        expect(res.body).to.have.property('success', true);
      } catch (error) {
        throw error;
      }
    }); // END should test something
  }); // END Role: Admin

  // Role: User
  describe.skip('Role: User', async () => {
    const jwt = 'jwt-user';

    // populate database with fixtures and empty queues
    beforeEach(async () => {
      await populate('fix1');
      await OrderQueue.empty();
    });

    it('[user] should test something', async () => {
      const user1 = userFix[0]; // grab user from fixtures

      try {
        // execute tests here
        // example code below

        // login user
        const { token } = await userLogin(app, routeVersion, request, user1);

        // request params
        const params = {
          id: 1
        };

        // execute request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        // check response
        expect(res.statusCode).to.equal(200); // 201
        expect(res.body).to.have.property('success', true);
      } catch (error) {
        throw error;
      }
    }); // END should test something
  }); // END Role: User
}); // END Order.V1Read
