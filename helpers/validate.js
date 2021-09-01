/**
 * All validating data helpers
 *
 * TODO: Test
 */

'use strict';

// moment
const moment = require('moment-timezone');

module.exports = {
  isValidTimezone
};

/**
 * Takes in a timezone name and checks if it's valid
 *
 * @timezone: (STRING - REQUIRED) - the timezone name to check
 *
 * return true or false
 */
function isValidTimezone(timezone) {
  // get all timezone names in an array
  const tzNames = moment.tz.names();
  return tzNames.indexOf(timezone) >= true;
}
