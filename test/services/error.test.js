/**
 * Test error.js Service
 *
 * JEST CHEATSHEET: https://devhints.io/jest
 */

'use strict';

// build-in node modules
const path = require('path');

// services
const i18n = require('../../services/language').getLocalI18n(); // grab i18n after we configured it

// helpers
const { LOCALES } = require('../../helpers/constants');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../config/.env.test') });

// helper
const { errorResponse, joiErrorsMessage, ERROR_CODES } = require('../../services/error');

describe('services/error.js', () => {
  describe('errorResponse', function() {
    it('should create the error response JSON correctly', done => {
      const resultJSON = errorResponse(i18n, ERROR_CODES.UNAUTHORIZED);
      expect(resultJSON.success).toBe(false);
      expect(resultJSON.status).toBe(401);
      expect(resultJSON.error).toBe(ERROR_CODES.UNAUTHORIZED.error);
      expect(resultJSON.message).toBe(i18n.__(ERROR_CODES.UNAUTHORIZED.messages[0]));
      done();
    }); // END should create the error response JSON correctly

    it('should create the error response JSON with custom message correctly', done => {
      const resultJSON = errorResponse(i18n, ERROR_CODES.UNAUTHORIZED, 'TEST MESSAGE');
      expect(resultJSON.success).toBe(false);
      expect(resultJSON.status).toBe(401);
      expect(resultJSON.error).toBe(ERROR_CODES.UNAUTHORIZED.error);
      expect(resultJSON.message).toBe('TEST MESSAGE');
      done();
    }); // END should create the error response JSON with custom message correctly

    it('should create the error response JSON with custom message and custom status code correctly', done => {
      const resultJSON = errorResponse(i18n, ERROR_CODES.UNAUTHORIZED, 'TEST MESSAGE', 408);
      expect(resultJSON.success).toBe(false);
      expect(resultJSON.status).toBe(408);
      expect(resultJSON.error).toBe(ERROR_CODES.UNAUTHORIZED.error);
      expect(resultJSON.message).toBe('TEST MESSAGE');
      done();
    }); // END should create the error response JSON with custom message and custom status code correctly
  }); // END errorResponse
}); // END services/error.js

// TODO: Test joiErrorsMessage
