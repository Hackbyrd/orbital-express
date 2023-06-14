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
  // USER_BAD_REQUEST_ACCOUNT_INACTIVE: {
  //   error: 'USER.BAD_REQUEST_ACCOUNT_INACTIVE',
  //   status: 401,
  //   messages: ['USER[Account is not active]']
  // }
};

module.exports = LOCAL_ERROR_CODES;
