/**
 * USER ERROR
 *
 * For Better Client 4xx Error Handling For User Feature
 * Gets exported to /services/error.js and put in the global variable ERROR_CODES
 */

'use strict';

/**
 * User Feature Local Error Codes
 */
const LOCAL_ERROR_CODES = {
  /* Place error codes below. Remember to prepend USER to the key and error value  */

  // V1Register
  USER_BAD_REQUEST_USER_ALREADY_EXISTS: {
    error: 'USER.BAD_REQUEST_USER_ALREADY_EXISTS',
    status: 400,
    messages: ['USER[user_already_exists]']
  },

  USER_BAD_REQUEST_INVALID_TIMEZONE: {
    error: 'USER.BAD_REQUEST_INVALID_TIMEZONE',
    status: 400,
    messages: ['USER[invalid_timezone]']
  },

  // V1Login
  USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
    error: 'USER.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
    status: 400,
    messages: ['USER[invalid_login_credentials]']
  },

  USER_BAD_REQUEST_ACCOUNT_INACTIVE: {
    error: 'USER.BAD_REQUEST_ACCOUNT_INACTIVE',
    status: 400,
    messages: ['USER[user_account_inactive]']
  },

  USER_BAD_REQUEST_ACCOUNT_DELETED: {
    error: 'USER.BAD_REQUEST_ACCOUNT_DELETED',
    status: 400,
    messages: ['USER[user_account_deleted]']
  },

  // V1Refresh
  USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN: {
    error: 'USER.UNAUTHORIZED_INVALID_REFRESH_TOKEN',
    status: 401,
    messages: ['USER[invalid_refresh_token]']
  },

  // V1Read
  USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST: {
    error: 'USER.BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST',
    status: 400,
    messages: ['USER[account_does_not_exist]']
  },

  // V1Update
  USER_BAD_REQUEST_NO_UPDATES_PROVIDED: {
    error: 'USER.BAD_REQUEST_NO_UPDATES_PROVIDED',
    status: 400,
    messages: ['USER[no_updates_provided]']
  }
};

module.exports = LOCAL_ERROR_CODES;
