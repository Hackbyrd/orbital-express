/**
 * TEST ADMIN V1Update METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// third party
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node

// server & models
const app = require('../../../../server');
const models = require('../../../../models');

// assertion library
const { expect } = require('chai');
const request = require('supertest');

// services
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { adminLogin, reset, populate } = require('../../../../helpers/tests');

describe('Admin.V1Update', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/update';
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

    it('[logged-out] should fail to update admin', async () => {
      // update request
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to update admin
  }); // END Role: Logged Out

  // Admin
  describe('Role: Admin', async () => {
    const jwt = 'jwt-admin';

    // populate database with fixtures
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[admin] should update self all fields successfully', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          timezone: 'Africa/Cairo',
          locale: 'ko',
          name: 'New name',
          phone: '+1240827485'
        }

        // update admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('admin');
        expect(res.body.admin).to.have.property('id', admin1.id);

        // find admin to see if he's updated
        const foundAdmin = await models.admin.findByPk(admin1.id);
        expect(foundAdmin.timezone).to.equal(params.timezone);
        expect(foundAdmin.locale).to.equal(params.locale);
        expect(foundAdmin.phone).to.equal(params.phone);
        expect(foundAdmin.name).to.equal(params.name);
      } catch (error) {
        throw error;
      }
    }); // END [admin] should update self all fields successfully

    it('[admin] should fail to update self if timezone is invalid', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          timezone: 'randometimezone',
        };

        // read admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_TIMEZONE));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should fail to update self if timezone is invalid
  }); // END Role: Admin
}); // END Admin.V1Update
