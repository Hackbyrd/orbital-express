/**
 * ORDER ERROR
 *
 * For Better Client 4xx Error Handling For Order Feature
 * Gets exported to /services/error.js and put in the global variable ERROR_CODES
 */

'use strict';

/**
 * Order Feature Local Error Codes
 */
const LOCAL_ERROR_CODES = {
  /* Place error codes below. Remember to prepend ORDER to the key and error value  */
  // ORDER_BAD_REQUEST_ACCOUNT_INACTIVE: {
  //   error: 'ORDER.BAD_REQUEST_ACCOUNT_INACTIVE',
  //   status: 401,
  //   messages: ['ORDER[Account is not active]']
  // }
};

module.exports = LOCAL_ERROR_CODES;
