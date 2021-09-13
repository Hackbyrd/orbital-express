/**
 * TEST ADMIN V1Create METHOD
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

describe('Admin.V1Create', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/create';
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

    it('[logged-out] should fail to create admin', async () => {
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to create admin
  }); // END Role: Logged Out

  // Admin
  describe('Role: Admin', async () => {
    const jwt = 'jwt-admin';

    // populate database with fixtures
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[admin] should create an admin successfully', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          name: 'Jonathan Chen',
          active: true,
          email: 'new-admin@example.com',
          phone: '+12406206950',
          timezone: 'America/Los_Angeles',
          locale: 'en',
          password1: 'thisisapassword1F%',
          password2: 'thisisapassword1F%',
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(201);
        expect(res.body.admin.id).to.equal(adminFix.length + 1);
        expect(res.body.admin.timezone).to.equal(params.timezone);
        expect(res.body.admin.locale).to.equal(params.locale);
        expect(res.body.admin.active).to.be.true;
        expect(res.body.admin.name).to.equal(params.name);
        expect(res.body.admin.email).to.equal(params.email);
        expect(res.body.admin.phone).to.equal(params.phone);
        expect(res.body.admin.passwordResetExpire).to.be.a('string');
        expect(res.body.admin.acceptedTerms).to.be.true;
        expect(res.body.admin.loginCount).to.equal(0);
        expect(res.body.admin.lastLogin).to.be.null;
        expect(res.body.admin.createdAt).to.be.a('string');
        expect(res.body.admin.updatedAt).to.be.a('string');

        // check if admin was created
        const checkAdmin = await models.admin.findByPk(res.body.admin.id);
        expect(checkAdmin.name).to.equal(params.name);
        expect(checkAdmin.timezone).to.equal(params.timezone);
        expect(checkAdmin.locale).to.equal(params.locale);
        expect(checkAdmin.active).to.be.true;
        expect(checkAdmin.name).to.equal(params.name);
        expect(checkAdmin.email).to.equal(params.email);
        expect(checkAdmin.phone).to.equal(params.phone);
        expect(checkAdmin.passwordResetExpire).to.not.be.null;
        expect(checkAdmin.acceptedTerms).to.be.true;
        expect(checkAdmin.loginCount).to.equal(0);
        expect(checkAdmin.lastLogin).to.be.null;
        expect(checkAdmin.createdAt).to.not.be.null;
        expect(checkAdmin.updatedAt).to.not.be.null;
      } catch (error) {
        throw error;
      }
    }); // END [admin] should create an admin successfully

    it('[admin] should not create new admin if passwords format is invalid', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          name: 'Jonathan Chen',
          active: true,
          email: 'new-admin@example.com',
          phone: '+12406206950',
          timezone: 'America/Los_Angeles',
          locale: 'en',
          password1: 'thisisapassword',
          password2: 'thisisapassword',
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, i18n.__('ADMIN[Invalid Password Format]')));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should not create new admin if passwords format is invalid

    it('[admin] should not create new admin if passwords are not the same', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          name: 'Jonathan Chen',
          active: true,
          email: 'new-admin@example.com',
          phone: '+12406206950',
          timezone: 'America/Los_Angeles',
          locale: 'en',
          password1: 'thisisapassword1F%',
          password2: 'thisisapassword2F%',
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should not create new admin if passwords are not the same

    it('[admin] should not create new admin if acceptedTerms is false', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          name: 'Jonathan Chen',
          active: true,
          email: 'new-admin@example.com',
          phone: '+12406206950',
          timezone: 'America/Los_Angeles',
          locale: 'en',
          password1: 'thisisapassword1F%',
          password2: 'thisisapassword1F%',
          acceptedTerms: false
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should not create new admin if acceptedTerms is false

    it('[admin] should not create new admin if email already exists', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          name: 'Jonathan Chen',
          active: true,
          email: admin1.email,
          phone: '+12406206950',
          timezone: 'America/Los_Angeles',
          locale: 'en',
          password1: 'thisisapassword1F%',
          password2: 'thisisapassword1F%',
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ADMIN_ALREADY_EXISTS));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should not create new admin if email already exists

    it('[admin] should not create new admin if timezone is invalid', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          name: 'Jonathan Chen',
          active: true,
          email: 'new-admin@example.com',
          phone: '+12406206950',
          timezone: 'invalid-timezone',
          locale: 'en',
          password1: 'thisisapassword1F%',
          password2: 'thisisapassword1F%',
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_TIMEZONE));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should not create new admin if timezone is invalid
  }); // END Role: Admin
}); // END Admin.V1Create
