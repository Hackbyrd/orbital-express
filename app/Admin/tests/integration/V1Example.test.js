/**
 * TEST ADMIN V1Example METHOD
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
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/
const currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/

// models
const models = require('../../../../models');

// assertion library
const request = require('supertest');

// services
const queue = require('../../../../services/queue'); // process background tasks from Queue
const socket = require('../../../../services/socket'); // require socket service to initiate socket.io
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, partnerLogin, userLogin, reset, populate } = require('../../../../helpers/tests');

// server: initialize server in the beforeAll function because it is an async function
let app = null;

// queues: add queues you will use in testing here
let AdminQueue = null; // initial value, will be set in beforeEach because it is async

describe('Admin.V1Example', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));
  const partnerFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/partner'));
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));

  // fixtures
  let adminFix = null;
  let partnerFix = null;
  let userFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/<INSERT_METHOD>';
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
    partnerFix = partnerFixFn();
    userFix = userFixFn();

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

    it('[logged-out] should test something', async () => {
      try {
        // execute tests here

        // example code below
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));

      } catch (error) {
        console.error(error);
        throw error;
      }
    }); // END [logged-out] should test something
  }); // END Role: Logged Out

  // Role: Admin
  describe('Role: Admin', () => {
    const jwt = 'jwt-admin';

    // populate database with fixtures and empty queues
    beforeEach(async () => {
      try {
        await populate('fix1'); // populate test database with fix1 dataset
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    it('[admin] should test something', async () => {
      const admin1 = adminFix[0]; // grab admin from fixtures

      try {
        // execute tests here
        // example code below

        // login admin
        const { token } = await adminLogin(app, request, admin1);

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
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }); // END should test something
  }); // END Role: Admin

  // Role: Partner
  describe('Role: Partner', () => {
    const jwt = 'jwt-partner';

    // populate database with fixtures and empty queues
    beforeEach(async () => {
      try {
        await populate('fix1'); // populate test database with fix1 dataset
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    it('[partner] should test something', async () => {
      const partner1 = partnerFix[0]; // grab partner from fixtures

      try {
        // execute tests here
        // example code below

        // login partner
        const { token } = await partnerLogin(app, request, partner1);

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
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }); // END should test something
  }); // END Role: Partner

  // Role: User
  describe('Role: User', () => {
    const jwt = 'jwt-user';

    // populate database with fixtures and empty queues
    beforeEach(async () => {
      try {
        await populate('fix1'); // populate test database with fix1 dataset
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    it('[user] should test something', async () => {
      const user1 = userFix[0]; // grab user from fixtures

      try {
        // execute tests here
        // example code below

        // login user
        const { token } = await userLogin(app, request, user1);

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
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }); // END should test something
  }); // END Role: User
}); // END Admin.V1Example
