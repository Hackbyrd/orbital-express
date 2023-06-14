/**
 * TEST ADMIN V1Query METHOD
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
const i18n = require('i18n'); // defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files: https://github.com/mashpie/i18n-node

// models
const models = require('../../../../models');

// assertion library
const request = require('supertest');

// services
const queue = require('../../../../services/queue'); // process background tasks from Queue
const socket = require('../../../../services/socket'); // require socket service to initiate socket.io
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { ADMIN_ROLE } = require('../../../../helpers/constants');
const { adminLogin, reset, populate } = require('../../../../helpers/tests');

// server: initialize server in the beforeAll function because it is an async function
let app = null;

// queues: add queues you will use in testing here
let AdminQueue = null; // initial value, will be set in beforeEach because it is async

describe('Admin.V1Query', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/query';
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

    it('[logged-out] should fail to query user', async () => {
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to query user
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

    it('[admin] should query for all admins successfully', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          sort: '-id',
          page: 1,
          limit: 10
        };

        // query admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('admins');
        expect(res.body.admins.length).toBe(adminFix.length);
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('limit', params.limit);
        expect(res.body).toHaveProperty('total', adminFix.length);
      } catch (error) {
        throw error;
      }
    }); // END [admin] should query for all admins successfully

    it('[admin] should query for all admins but on multiple pages because of limit of 2', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          sort: '-id',
          page: 1,
          limit: 2
        };

        // query admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('admins');
        expect(res.body.admins.length).toBe(params.limit); // 2
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('limit', params.limit);
        expect(res.body).toHaveProperty('total', adminFix.length);
      } catch (error) {
        throw error;
      }
    }); // END [admin] should query for all admins but on multiple pages because of limit of 2

    it('[admin] should query for active admins only', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          active: true,
          sort: '-id',
          page: 1,
          limit: 10
        };

        // query admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('admins');
        expect(res.body.admins.length).toBe(4); // only 4 admins are active
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('limit', params.limit);
        expect(res.body).toHaveProperty('total', 4); // only 4 admins are active
      } catch (error) {
        throw error;
      }
    }); // END [admin] should query for active admins only

    it('[admin] should query for role: MANAGER and EMPLOYEE active admins only', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          active: true,
          roles: `${ADMIN_ROLE.MANAGER},${ADMIN_ROLE.EMPLOYEE}`, // roles list
          sort: 'id',
          page: 1,
          limit: 10
        };

        // query admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('admins');
        expect(res.body.admins.length).toBe(2); // 1 active manager admin and 1 active employee admins
        expect(res.body.admins[0]).toHaveProperty('id', 3);
        expect(res.body.admins[0]).toHaveProperty('role', ADMIN_ROLE.MANAGER);
        expect(res.body.admins[1]).toHaveProperty('id', 4);
        expect(res.body.admins[1]).toHaveProperty('role', ADMIN_ROLE.EMPLOYEE);
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('limit', params.limit);
        expect(res.body).toHaveProperty('total', 2); // 1 active manager admin and 1 active employee admins
      } catch (error) {
        throw error;
      }
    }); // END [admin] should query for role: MANAGER and EMPLOYEE active admins only

    it('[admin] should query for admins successfully but return 0 admins', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          active: false,
          roles: `${ADMIN_ROLE.ADMIN}`, // roles list
        };

        // query admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('admins');
        expect(res.body.admins.length).toBe(0);
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('limit', 25); // default
        expect(res.body).toHaveProperty('total', 0);
      } catch (error) {
        throw error;
      }
    }); // END [admin] should query for admins successfully but return 0 admins
  }); // END Role: Admin
}); // END Admin.V1Query
