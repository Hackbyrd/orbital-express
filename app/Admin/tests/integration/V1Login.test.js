/**
 * TEST ADMIN V1Login METHOD
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
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/

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

describe('Admin.V1Login', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/login';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

  // beforeAll: initialize server
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
    // populate database with fixtures
    beforeEach(async () => {
      try {
        await populate('fix1'); // populate test database with fix1 dataset
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    it('[logged-out] should login admin successfully', async () => {
      const admin1 = adminFix[0];

      // login params
      const params = {
        email: admin1.email,
        password: admin1.password
      };

      try {
        // login admin
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe(201);
        expect(typeof res.body.token).toBe('string');
        expect(res.body.admin).not.toBeNull();

        // check if admin is updated in database
        const checkAdmin = await models.admin.findByPk(admin1.id);
        expect(checkAdmin.loginCount).toBe(1);
        expect(checkAdmin.lastLogin).not.toBeNull();
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should login admin successfully

    it('[logged-out] should fail to login admin email or password is incorrect', async () => {
      const params = {
        email: 'random@email.com',
        password: '1029384756'
      };

      try {
        // login admin
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to login admin email or password is incorrect

    it('[logged-out] should fail to login admin if account is not active', async () => {
      const admin1 = adminFix[0];

      try {
        // update admin status to false
        await models.admin.update({
          active: false
        }, {
          where: {
            id: admin1.id
          }
        });

        const params = {
          email: admin1.email,
          password: admin1.password
        };

        // login admin
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to login admin if account is not active

    it('[logged-out] should fail to login admin if account is deleted', async () => {
      const admin1 = adminFix[0];

      try {
        // set admin as deleted
        await models.admin.update({
          deletedAt: moment.tz('UTC')
        }, {
          where: {
            id: admin1.id
          }
        });

        const params = {
          email: admin1.email,
          password: admin1.password
        };

        // login admin
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DELETED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to login admin if account is deleted
  }); // END Role: Logged Out
}); // END Admin.V1Login
