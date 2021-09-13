/**
 * TEST ADMIN V1ConfirmPassword METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// third party
const moment = require('moment-timezone');
const i18n = require('i18n');
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
const { reset, populate } = require('../../../../helpers/tests');

describe('Admin.V1ConfirmPassword', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/confirmpassword';
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

        expect(res.statusCode).to.equal(200);

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

        expect(res2.statusCode).to.equal(200);
        expect(res2.body).to.have.property('success', true);

        // get updated admin
        const updatedAdmin = await models.admin.findByPk(admin1.id);
        const resetPassword = bcrypt.hashSync(params2.password1, updatedAdmin.salt);

        expect(updatedAdmin.password).to.equal(resetPassword);
        expect(updatedAdmin.passwordResetToken).to.be.null;
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

        expect(res.statusCode).to.equal(200);

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

        expect(res2.statusCode).to.equal(400);
        expect(res2.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN));
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

        expect(res.statusCode).to.equal(200);

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

        expect(res2.statusCode).to.equal(400);
        expect(res2.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN));
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

        expect(res.statusCode).to.equal(200);

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

        expect(res2.statusCode).to.equal(400);
        expect(res2.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL));
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

        expect(res.statusCode).to.equal(200);

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

        expect(res2.statusCode).to.equal(400);
        expect(res2.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, i18n.__('ADMIN[Invalid Password Format]')));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to call confirm password if password1 and password2 have an invalid password format
  }); // END Role: Logged Out
}); // END Admin.V1ConfirmPassword
