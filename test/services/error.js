/**
 * Test error.js Service
 */

'use strict';

// build-in node modules
const path = require('path');

// third-party
const i18n = require('i18n');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../config/.env.test') });

// assertion library
const { expect } = require('chai');

// helper
const { errorResponse, joiErrorsMessage, ERROR_CODES } = require('../../services/error');

describe('services/error.js', () => {
  describe('errorResponse', function() {
    it('should create the error response JSON correctly', done => {
      const resultJSON = errorResponse(i18n, ERROR_CODES.UNAUTHORIZED);
      expect(resultJSON.success).to.be.false;
      expect(resultJSON.status).to.equal(401);
      expect(resultJSON.error).to.equal(ERROR_CODES.UNAUTHORIZED.error);
      expect(resultJSON.message).to.equal(i18n.__(ERROR_CODES.UNAUTHORIZED.messages[0]));
      done();
    }); // END should create the error response JSON correctly

    it('should create the error response JSON with custom message correctly', done => {
      const resultJSON = errorResponse(i18n, ERROR_CODES.UNAUTHORIZED, 'TEST MESSAGE');
      expect(resultJSON.success).to.be.false;
      expect(resultJSON.status).to.equal(401);
      expect(resultJSON.error).to.equal(ERROR_CODES.UNAUTHORIZED.error);
      expect(resultJSON.message).to.equal('TEST MESSAGE');
      done();
    }); // END should create the error response JSON with custom message correctly

    it('should create the error response JSON with custom message and custom status code correctly', done => {
      const resultJSON = errorResponse(i18n, ERROR_CODES.UNAUTHORIZED, 'TEST MESSAGE', 408);
      expect(resultJSON.success).to.be.false;
      expect(resultJSON.status).to.equal(408);
      expect(resultJSON.error).to.equal(ERROR_CODES.UNAUTHORIZED.error);
      expect(resultJSON.message).to.equal('TEST MESSAGE');
      done();
    }); // END should create the error response JSON with custom message and custom status code correctly
  }); // END errorResponse
}); // END services/error.js

// TODO: Test joiErrorsMessage
