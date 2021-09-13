/**
 * TEST ADMIN V1Login METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// third party
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/

// server & models
const app = require('../../../../server');
const models = require('../../../../models');

// assertion library
const { expect } = require('chai');
const request = require('supertest');

// services
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { reset, populate } = require('../../../../helpers/tests');

describe('Admin.V1Login', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/login';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

  // clear database
  beforeEach(async () => {
    await reset();
  });

  // Logged Out
  describe('Role: Logged Out', async () => {
    // populate database with fixtures
    beforeEach(async () => {
      await populate('fix1');
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

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('token').and.to.a('string');
        expect(res.body).to.have.property('admin').and.to.not.be.null;

        // check if admin is updated in database
        const checkAdmin = await models.admin.findByPk(admin1.id);
        expect(checkAdmin.loginCount).to.equal(1);
        expect(checkAdmin.lastLogin).to.not.be.null;
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

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
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

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE));
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

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DELETED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to login admin if account is deleted
  }); // END Role: Logged Out
}); // END Admin.V1Login
