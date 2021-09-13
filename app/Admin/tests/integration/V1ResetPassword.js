/**
 * TEST ADMIN V1ResetPassword METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// ENV variables
const { ADMIN_WEB_HOST } = process.env;

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
const { reset, populate } = require('../../../../helpers/tests');

describe('Admin.V1ResetPassword', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // url of the api method we are testing
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/resetpassword';
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

    it('[logged-out] should call reset password successfully', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: admin1.email
      };

      try {
        // send reset request
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('message', 'An email has been sent to ' + params.email + '. Please check your email to confirm your new password change.');

        // check if resetPassword, passwordResetToken, passwordResetExpire are there
        const foundAdmin = await models.admin.findByPk(admin1.id);
        expect(foundAdmin.passwordResetToken).to.be.a('string').with.lengthOf.at.least(64);
        expect(foundAdmin.passwordResetExpire).to.not.be.null;

        // check reset link
        expect(res.body).to.have.property('resetLink', `${ADMIN_WEB_HOST}/confirm-password?passwordResetToken=${foundAdmin.passwordResetToken}`);
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should call reset password successfully

    it('[logged-out] should fail to call reset password because email does not exist', async () => {
      const admin1 = adminFix[0];

      const params = {
        email: 'noemail@email.com',
      };

      try {
        // send reset request
        const res = await request(app)
          .post(routeUrl)
          .send(params);

        expect(res.statusCode).to.equal(400);
        expect(res.body).to.deep.equal(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST));
      } catch (error) {
        throw error;
      }
    }); // END [logged-out] should fail to call reset password because email does not exist
  }); // END Role: Logged Out
}); // END Admin.V1ResetPassword
