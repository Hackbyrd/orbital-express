/**
 * TEST ADMIN V1Create METHOD
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
const { faker } = require('@faker-js/faker'); // https://fakerjs.dev/api/

// models
const models = require('../../../../models');

// assertion library
const request = require('supertest');

// services
const queue = require('../../../../services/queue'); // process background tasks from Queue
const socket = require('../../../../services/socket'); // require socket service to initiate socket.io
const { errorResponse, ERROR_CODES } = require('../../../../services/error');

// helpers
const { PASSWORD_REGEX } = require('../../../../helpers/constants');
const { adminLogin, reset, populate } = require('../../../../helpers/tests');

// server: initialize server in the beforeAll function because it is an async function
let app = null;

// queues: add queues you will use in testing here
let AdminQueue = null; // initial value, will be set in beforeEach because it is async

describe('Admin.V1Create', () => {
  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));

  // fixtures
  let adminFix = null;

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/create';
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

    it('[logged-out] should fail to create admin', async () => {
      try {
        const res = await request(app).get(routeUrl);
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to create admin
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

    it('[admin] should create an admin successfully', async () => {
      const admin1 = adminFix[0];

      try {
        // login admin
        const { token } = await adminLogin(app, routeVersion, request, admin1);

        const params = {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          active: true,
          email: faker.internet.email().toLowerCase(), // lowercase
          phone: faker.phone.number('+1##########'),
          timezone: faker.location.timeZone(),
          locale: 'en',
          password1: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          password2: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(201);
        expect(res.body.admin.id).toBe(adminFix.length + 1);
        expect(res.body.admin.timezone).toBe(params.timezone);
        expect(res.body.admin.locale).toBe(params.locale);
        expect(res.body.admin.active).toBe(true);
        expect(res.body.admin.firstName).toBe(params.firstName);
        expect(res.body.admin.lastName).toBe(params.lastName);
        expect(res.body.admin.email).toBe(params.email);
        expect(res.body.admin.phone).toBe(params.phone);
        expect(typeof res.body.admin.passwordResetExpire).toBe('string');
        expect(res.body.admin.acceptedTerms).toBe(true);
        expect(res.body.admin.loginCount).toBe(0);
        expect(res.body.admin.lastLogin).toBeNull();
        expect(typeof res.body.admin.createdAt).toBe('string');
        expect(typeof res.body.admin.updatedAt).toBe('string');

        // check if admin was created
        const checkAdmin = await models.admin.findByPk(res.body.admin.id);
        expect(checkAdmin.firstName).toBe(params.firstName);
        expect(checkAdmin.lastName).toBe(params.lastName);
        expect(checkAdmin.timezone).toBe(params.timezone);
        expect(checkAdmin.locale).toBe(params.locale);
        expect(checkAdmin.active).toBe(true);
        expect(checkAdmin.name).toBe(params.name);
        expect(checkAdmin.email).toBe(params.email);
        expect(checkAdmin.phone).toBe(params.phone);
        expect(checkAdmin.passwordResetExpire).toBeDefined();
        expect(checkAdmin.acceptedTerms).toBe(true);
        expect(checkAdmin.loginCount).toBe(0);
        expect(checkAdmin.lastLogin).toBeNull();
        expect(checkAdmin.createdAt).toBeDefined();
        expect(checkAdmin.updatedAt).toBeDefined();
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
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          active: true,
          email: faker.internet.email().toLowerCase(), // lowercase
          phone: faker.phone.number('+1##########'),
          timezone: faker.location.timeZone(),
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

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, i18n.__('ADMIN[Invalid Password Format]')));
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
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          active: true,
          email: faker.internet.email().toLowerCase(), // lowercase
          phone: faker.phone.number('+1##########'),
          timezone: faker.location.timeZone(),
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

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL));
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
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          active: true,
          email: faker.internet.email().toLowerCase(), // lowercase
          phone: faker.phone.number('+1##########'),
          timezone: faker.location.timeZone(),
          locale: 'en',
          password1: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          password2: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          acceptedTerms: false
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED));
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
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          active: true,
          email: admin1.email, // admin email that exist
          phone: faker.phone.number('+1##########'),
          timezone: faker.location.timeZone(),
          locale: 'en',
          password1: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          password2: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ADMIN_ALREADY_EXISTS));
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
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          active: true,
          email: faker.internet.email().toLowerCase(), // lowercase
          phone: faker.phone.number('+1##########'),
          timezone: 'invalid-timezone', // invalid timezone
          locale: 'en',
          password1: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          password2: 'asdfGHJK1234@$', // faker.internet.password doesn't work with PASSWORD_REGEX
          acceptedTerms: true
        };

        // create admin request
        const res = await request(app)
          .post(routeUrl)
          .set('authorization', `${jwt} ${token}`)
          .send(params);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_TIMEZONE));
      } catch (error) {
        throw error;
      }
    }); // END [admin] should not create new admin if timezone is invalid
  }); // END Role: Admin
}); // END Admin.V1Create
 