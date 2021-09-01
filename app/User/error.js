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
  // V1Login
  USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
    error: 'USER.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
    status: 400,
    messages: ['USER[Invalid Login Credentials]']
  },

  USER_BAD_REQUEST_ACCOUNT_INACTIVE: {
    error: 'USER.BAD_REQUEST_ACCOUNT_INACTIVE',
    status: 400,
    messages: ['USER[User Account Inactive]']
  },

  USER_BAD_REQUEST_ACCOUNT_DELETED: {
    error: 'USER.BAD_REQUEST_ACCOUNT_DELETED',
    status: 400,
    messages: ['USER[User Account Deleted]']
  },

  // V1Read
  USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST: {
    error: 'USER.BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST',
    status: 400,
    messages: ['USER[User Account Does Not Exist]']
  },

  // V1Create
  USER_BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED: {
    error: 'USER.BAD_REQUEST_TERMS_OF_SERVICE_NOT_ACCEPTED',
    status: 400,
    messages: ['USER[Terms of Service Not Accepted]']
  },

  USER_BAD_REQUEST_USER_ALREADY_EXISTS: {
    error: 'USER.BAD_REQUEST_USER_ALREADY_EXISTS',
    status: 400,
    messages: ['USER[User Already Exists]']
  },

  USER_BAD_REQUEST_INVALID_TIMEZONE: {
    error: 'USER.BAD_REQUEST_INVALID_TIMEZONE',
    status: 400,
    messages: ['USER[Invalid Time Zone]']
  },

  // V1ConfirmPassword
  USER_BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN: {
    error: 'USER.BAD_REQUEST_INVALID_PASSWORD_RESET_TOKEN',
    status: 400,
    messages: ['USER[Invalid Password Reset Token]']
  },

  USER_BAD_REQUEST_PASSWORDS_NOT_EQUAL: {
    error: 'USER.BAD_REQUEST_PASSWORDS_NOT_EQUAL',
    status: 400,
    messages: ['USER[Passwords Not Equal]']
  },

  // V1UpdateEmail
  USER_BAD_REQUEST_SAME_EMAIL: {
    error: 'USER.BAD_REQUEST_SAME_EMAIL',
    status: 400,
    messages: ['USER[Same Email]']
  },

  USER_BAD_REQUEST_EMAIL_ALREADY_TAKEN: {
    error: 'USER.BAD_REQUEST_EMAIL_ALREADY_TAKEN',
    status: 400,
    messages: ['USER[Email Already Taken]']
  },

  // V1UpdatePassword
  USER_BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED: {
    error: 'USER.BAD_REQUEST_PASSWORD_AUTHENTICATION_FAILED',
    status: 400,
    messages: ['USER[Password Authentication Failed]']
  }

  /* Place error codes below. Remember to prepend USER to the key and error value  */
};

module.exports = LOCAL_ERROR_CODES;
