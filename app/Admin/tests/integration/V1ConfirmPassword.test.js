/**
 * TEST ADMIN V1ConfirmPassword METHOD
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
const moment = require('moment-timezone');
const i18n = require('i18n'); // defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files: https://github.com/mashpie/i18n-node
const bcrypt = require('bcrypt');

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

describe('Admin.V1ConfirmPassword', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/confirmpassword';
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

    it('[logged-out] should confirm password successfully', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: admin1.email
      };

      try {
        // call reset password
        const res = await request(app)
          .post(`${routeVersion}${routePrefix}/resetpassword`)
          .send(params);

        expect(res.statusCode).toBe(200);

        // grab token
        const foundAdmin = await models.admin.findByPk(admin1.id);
        const params2 = {
          passwordResetToken: foundAdmin.passwordResetToken,
          password1: 'NEWPASSWORD1f%',
          password2: 'NEWPASSWORD1f%'
        };

        // confirm password
        const res2 = await request(app)
          .post(routeUrl)
          .send(params2);

        expect(res2.statusCode).toBe(200);
        expect(res2.body).toHaveProperty('success', true);

        // get updated admin
        const updatedAdmin = await models.admin.findByPk(admin1.id);
        const resetPassword = bcrypt.hashSync(params2.password1, updatedAdmin.salt);

        expect(updatedAdmin.password).toBe(resetPassword);
        expect(updatedAdmin.passwordResetToken).toBeNull();
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should confirm password successfully

    it('[logged-out] should fail to confirm password if token is invalid', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: admin1.email
      };

      try {
        // call reset password
        const res = await request(app)
          .post(`${routeVersion}${routePrefix}/resetpassword`)
          .send(params);

        expect(res.statusCode).toBe(200);

        // grab token
        const params2 = {
          passwordResetToken: 'gibberish',
          password1: 'NEWPASSWORD1f%',
          password2: 'NEWPASSWORD1f%'
        };

        // confirm password
        const res2 = await request(app)
          .post(routeUrl)
          .send(params2);

        expect(res2.statusCode).toBe(400);
        expect(res2.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to confirm password if token is invalid

    it('[logged-out] should fail to confirm password if token has expired', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: admin1.email
      };

      try {
        // call reset password
        const res = await request(app)
          .post(`${routeVersion}${routePrefix}/resetpassword`)
          .send(params);

        expect(res.statusCode).toBe(200);

        // grab token
        const foundAdmin = await models.admin.findByPk(admin1.id);
        const params2 = {
          passwordResetToken: foundAdmin.passwordResetToken,
          password1: 'NEWPASSWORD1f%',
          password2: 'NEWPASSWORD1f%'
        };

        // update expiration of password reset token
        await models.admin.update({
          passwordResetExpire: moment.tz('UTC').subtract('5', 'days')
        }, {
          where: {
            email: params.email
          }
        });

        // confirm password
        const res2 = await request(app)
          .post(routeUrl)
          .send(params2);

        expect(res2.statusCode).toBe(400);
        expect(res2.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to confirm password if token is invalid

    it('[logged-out] should fail to call confirm password if password1 and password2 are not the same', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: admin1.email
      };

      try {
        // call reset password
        const res = await request(app)
          .post(`${routeVersion}${routePrefix}/resetpassword`)
          .send(params);

        expect(res.statusCode).toBe(200);

        // grab token
        const foundAdmin = await models.admin.findByPk(admin1.id);
        const params2 = {
          passwordResetToken: foundAdmin.passwordResetToken,
          password1: 'NEWPASSWORD1f%',
          password2: 'NEWPASSWORD2f%'
        };

        // confirm password
        const res2 = await request(app)
          .post(routeUrl)
          .send(params2);

        expect(res2.statusCode).toBe(400);
        expect(res2.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to call confirm password because email does not exist

    it('[logged-out] should fail to call confirm password if password1 and password2 have an invalid password format', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: admin1.email
      };

      try {
        // call reset password
        const res = await request(app)
          .post(`${routeVersion}${routePrefix}/resetpassword`)
          .send(params);

        expect(res.statusCode).toBe(200);

        // grab token
        const foundAdmin = await models.admin.findByPk(admin1.id);
        const params2 = {
          passwordResetToken: foundAdmin.passwordResetToken,
          password1: 'NEWPASSWORD',
          password2: 'NEWPASSWORD'
        };

        // confirm password
        const res2 = await request(app)
          .post(routeUrl)
          .send(params2);

        expect(res2.statusCode).toBe(400);
        expect(res2.body).toEqual(errorResponse(i18n, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, i18n.__('ADMIN[Invalid Password Format]')));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to call confirm password if password1 and password2 have an invalid password format
  }); // END Role: Logged Out
}); // END Admin.V1ConfirmPassword
