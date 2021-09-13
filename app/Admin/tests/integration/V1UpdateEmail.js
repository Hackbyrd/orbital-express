/**
 * TEST ADMIN V1UpdateEmail METHOD
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

describe('Admin.V1UpdateEmail', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/updateemail';
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

    it('[logged-out] should fail to update email', async () => {
      // update request
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to update email
  }); // END Role: Logged Out

  // Admin
  describe('Role: Admin', async () => {
    const jwt = 'jwt-admin';

    // populate database with fixtures
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[admin] should update email successfully', async () => {
      const admin1 = adminFix[0];
      const email = 'test@example.com';

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          email: email
        };

        // read admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params)

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.have.property('success', true);

        // find admin to see if the email is updated
        const foundAdmin = await models.admin.findByPk(admin1.id);
        expect(foundAdmin.email).to.equal(params.email);
      } catch (error) {
        throw error;
      }
    }); // END [admin] should update email successfully

    it('[admin] should fail to update if new email is the same as the current email', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          email: admin1.email
        };

        // call update email
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_SAME_EMAIL));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should fail to update if new email is the same as the current email

    it('[admin] should not update email if the new email is already being used', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          name: 'Admin 3',
          active: true,
          email: 'admin-3@example.com',
          phone: '+12406206950',
          timezone: 'America/Los_Angeles',
          locale: 'en',
          password1: 'thisisapassword1F%',
          password2: 'thisisapassword1F%',
          acceptedTerms: true
        };

        // create new admin request
        const res = await request(app)
          .post(`${routeVersion}${routePrefix}/create`)
          .set('authorization', `${jwt} ${token}`)
          .send(params);
        expect(res.statusCode).to.equal(201);

        const params2 = {
          email: 'admin-3@example.com'
        };

        // update email request
        const res2 = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params2);

        expect(res2.statusCode).to.equal(400);
        expect(res2.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_EMAIL_ALREADY_TAKEN));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should not update email if the new email is already being used
  }); // END Role: Admin
}); // END Admin.V1UpdateEmail
