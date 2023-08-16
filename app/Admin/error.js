/**
 * ADMIN ERROR
 *
 * For Better Client 4xx Error Handling For Admin Feature
 * Gets exported to /services/error.js and put in the global variable ERROR_CODES
 */

'use strict';

/**
 * Admin Feature Local Error Codes
 */
const LOCAL_ERROR_CODES = {
  /* Place error codes below. Remember to prepend ADMIN to the key and error value  */
  // V1Login
  ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
    error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
    status: 400,
    messages: ['ADMIN[invalid_login_credentials]']
  },

  ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE: {
    error: 'ADMIN.BAD_REQUEST_ACCOUNT_INACTIVE',
    status: 400,
    messages: ['ADMIN[admin_account_inactive]']
  },

  ADMIN_BAD_REQUEST_ACCOUNT_DELETED: {
    error: 'ADMIN.BAD_REQUEST_ACCOUNT_DELETED',
    status: 400,
    messages: ['ADMIN[admin_account_deleted]']
  },

  // V1Read
  ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST: {
    error: 'ADMIN.BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST',
    status: 400,
    messages: ['ADMIN[admin_account_does_not_exist]']
  },

  // V1Create
  ADMIN_BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED: {
    error: 'ADMIN.BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED',
    status: 400,
    messages: ['ADMIN[terms_of_service_not_accepted]']
  },

  ADMIN_BAD_REQUEST_ADMIN_ALREADY_EXISTS: {
    error: 'ADMIN.BAD_REQUEST_ADMIN_ALREADY_EXISTS',
    status: 400,
    messages: ['ADMIN[admin_already_exists]']
  },

  ADMIN_BAD_REQUEST_INVALID_TIMEZONE: {
    error: 'ADMIN.BAD_REQUEST_INVALID_TIMEZONE',
    status: 400,
    messages: ['ADMIN[invalid_time_zone]']
  },

  // V1ConfirmPassword
  ADMIN_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN: {
    error: 'ADMIN.BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN',
    status: 400,
    messages: ['ADMIN[invalid_password_reset_token]']
  },

  ADMIN_BAD_REQUEST_PASSWORDS_NOT_EQUAL: {
    error: 'ADMIN.BAD_REQUEST_PASSWORDS_NOT_EQUAL',
    status: 400,
    messages: ['ADMIN[passwords_not_equal]']
  },

  // V1UpdateEmail
  ADMIN_BAD_REQUEST_SAME_EMAIL: {
    error: 'ADMIN.BAD_REQUEST_SAME_EMAIL',
    status: 400,
    messages: ['ADMIN[same_email]']
  },

  ADMIN_BAD_REQUEST_EMAIL_ALREADY_TAKEN: {
    error: 'ADMIN.BAD_REQUEST_EMAIL_ALREADY_TAKEN',
    status: 400,
    messages: ['ADMIN[email_already_taken]']
  },

  // V1UpdatePassword
  ADMIN_BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED: {
    error: 'ADMIN.BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED',
    status: 400,
    messages: ['ADMIN[password_authentication_failed]']
  }

  // place more local error codes below
};

module.exports = LOCAL_ERROR_CODES;
