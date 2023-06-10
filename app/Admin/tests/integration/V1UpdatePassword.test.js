/**
 * TEST ADMIN V1UpdatePassword METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// third party
const i18n = require('i18n'); // https://github.com/mashpie/i18n-node
const bcrypt = require('bcrypt');

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

describe('Admin.V1UpdatePassword', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/updatepassword';
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

    it('[logged-out] should fail to update password', async () => {
      // update password request
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to update password
  }); // END Role: Logged Out

  // Admin
  describe('Role: Admin', async () => {
    const jwt = 'jwt-admin';

    // populate database with fixtures
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[admin] should update password successfully', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          password: admin1.password,
          password1: 'NEWPASSWORD1f%',
          password2: 'NEWPASSWORD1f%'
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
        // check if password is new
        expect(foundAdmin.password).to.equal(bcrypt.hashSync(params.password1, foundAdmin.salt));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should update password successfully

    it('[admin] should fail to update password if password1 and password2 are not the same', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          password: admin1.password,
          password1: 'NEWPASSWORD1f%',
          password2: 'NEWPASSWORD2f%'
        };

        // call update email
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL));

        // find admin to see if the email is updated
        const foundAdmin = await models.admin.findByPk(admin1.id);
        expect(foundAdmin.password).to.equal(bcrypt.hashSync(admin1.password, foundAdmin.salt));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should fail to update password if password1 and password2 are not the same

    it('[admin] should fail to update password if original password is incorrect', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          password: 'BADPASSWORD',
          password1: 'NEWPASSWORD1f%',
          password2: 'NEWPASSWORD1f%'
        };

        // call update email
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED));

        // find admin to see if the email is updated
        const foundAdmin = await models.admin.findByPk(admin1.id);
        expect(foundAdmin.password).to.equal(bcrypt.hashSync(admin1.password, foundAdmin.salt));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should fail to update password if original password is incorrect
  }); // END Role: Admin
}); // END Admin.V1UpdatePassword
