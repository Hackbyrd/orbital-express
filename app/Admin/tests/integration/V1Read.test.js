/**
 * TEST ADMIN V1Read METHOD
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
const i18n = require('../../../../services/language').getLocalI18n(); // defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files:
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, reset, populate } = require('../../../../helpers/tests');

// server: initialize server in the beforeAll function because it is an async function
let app = null;

// queues: add queues you will use in testing here
let AdminQueue = null; // initial value, will be set in beforeEach because it is async

describe('Admin.V1Read', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/read';
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
      await AdminQueue.obliterate({ force: true }); // make sure queue is empty before each test runs

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

    it('[logged-out] should fail to read admin', async () => {
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to read admin
  }); // END Role: Logged Out

  // Admin
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

    it('[admin] should read self successfully', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        // read admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('admin');
        expect(res.body.admin).toHaveProperty('id', admin1.id);
      } catch (error) {
        throw error;
      }
    }); // END [admin] should read self successfully

    it('[admin] should read another admin successfully', async () => {
      const admin1 = adminFix[0];
      const admin2 = adminFix[1];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        // params
        const params = {
          id: admin2.id
        };

        // read admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params)

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('admin');
        expect(res.body.admin).toHaveProperty('id', admin2.id);
      } catch (error) {
        throw error;
      }
    }); // END [admin] should read another admin successfully

    it('[admin] should fail to read admin if admin does not exist', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          id: 100000
        };

        // read admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should fail to read admin if admin does not exist
  }); // END Role: Admin
}); // END Admin.V1Read
