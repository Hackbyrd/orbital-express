/**
 * All validating data helpers
 *
 * TODO: Test
 */

'use strict';

// moment
const moment = require('moment-timezone');

module.exports = {
  isValidTimezone,
  isValidDate
};

/**
 * Takes in a timezone name and checks if it's valid
 *
 * @timezone - (STRING - REQUIRED): the timezone name to check
 *
 * return true or false
 */
function isValidTimezone(timezone) {
  // get all timezone names in an array
  const tzNames = moment.tz.names();
  return tzNames.indexOf(timezone) >= true;
}

/**
 * Check if a date string is valid
 *
 * @dateString (STRING - REQUIRED): The date string to check in 'YYYY-MM-DD' format
 *
 * return boolean
 *
 * TODO: TEST
 */
function isValidDate(dateString) {
  const regex = /^(19[0-9]{2}|20[0-9]{2})-(0[1-9]|1[0-2])-([0][1-9]|[12][0-9]|3[01])$/;

  if (!regex.test(dateString))
    return false;

  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(year, month - 1, day); // JS months are 0-indexed

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
