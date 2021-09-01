/**
 * All create, read, update, query, and delete helper methods go here
 */

'use strict';

// require third-party node modules
const Op = require('sequelize').Op; // get operator aliases

// require helpers
const logic = require('./logic');

// comparison operator variables that are reused
const OPERATORS = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte'];

// operators matched to sequelize operators
const SEQUELIZE_OPERATORS = {
  eq: Op.eq,
  ne: Op.ne,
  gt: Op.gt,
  lt: Op.lt,
  gte: Op.gte,
  lte: Op.lte
};

module.exports = {
  getOffset,
  getOrdering,
  convertStringListToWhereStmt,
  parseUrlQueryFilter
};

/**
 * Get Pagination Offset
 *
 * @page (NUMBER - REQUIRED): the page to return starting from page 1
 * @limit (NUMBER - REQUIRED): thow many elements are on one page starting from 1
 *
 * return offset
 */
function getOffset(page, limit) {
  return (page - 1) * limit; // offset 0 is page one
}

/**
 * Get Ordering
 *
 * @cols (STRING - REQUIRED): A comma separated list of columns of a table, could have a '-' in front which means descending, ex. id,-name,date
 * return [[col, order], ...]
 */
function getOrdering(cols) {
  const colsArr = logic.removeAllWhiteSpace(cols).split(',');
  const ordersArr = [];

  for (let i = 0; i < colsArr.length; i++) {
    let order = 'ASC';

    // check for descending
    if (colsArr[i][0] === '-') {
      colsArr[i] = colsArr[i].substring(1); // take out the '-' character
      order = 'DESC'; // make descending
    }

    // ordersArr.push({ col: colsArr[i], order: order });
    ordersArr.push([colsArr[i], order]);
  }

  return ordersArr;
}

/**
 * Generate the where statement for a string list
 * example: req.args.companyIds = '1,2,33,4' -> whereStmt = { companyId: { [Op.in]: [1,2,33,4] } }
 *
 * @whereStmt - (OBJECT - REQUIRED): the where statement to go into sequelize statement
 * @args - (OBJECT - REQUIRED): these are all the args that are passed in, args.companyIds, args.locationIds
 * @list - (ARRAY OBJECTS - REQUIRED): the list ('1,22,3,4') to convert, must delete this afterwards ['companyIds', 'locationIds']
 *   @name - 'companyIds', 'locationIds'
 *   @col - 'companyId', 'locationId'
 *   @isInt - true, false
 *
 * return updated where statement
 */
function convertStringListToWhereStmt(whereStmt, args, list) {
  list.forEach(l => {
    // if it exists
    if (args[l.name]) {
      whereStmt[l.col] = {
        [Op.in]: args[l.name].split(',').map(id => (l.isInt ? Number(id) : id))
      };
      delete args[l.name];
    }
  });

  return whereStmt;
}

/**
 * Takes in req.args and returns back the modified version of it to match sequelize.js formatting
 *
 * @args = { (OBJECT - REQUIRED): the arguments being passed into the URL after they have been converted into an object
 *   id: 1,
 *   date[gte]: '2018-01-01 00:00:00',
 *   date[eq]: '2018-01-01 00:00:00'
 * }
 *
 * return {
 *   id: 1,
 *   date: {
 *     [Op.gte] = '2018-01-01 00:00:00',
 *     [Op.eq] = '2018-01-01 00:00:00',
 *   }
 * }
 */
function parseUrlQueryFilter(args) {
  const newArgs = {};

  // go through each argument key
  Object.keys(args).forEach(argKey => {
    let hasFilter = false; // check if argument has filter

    // go through each filter
    OPERATORS.forEach(fil => {
      const idx = argKey.indexOf('[' + fil + ']');

      // if a filter exists
      if (idx > 0) {
        if (!newArgs[argKey.substring(0, idx)]) newArgs[argKey.substring(0, idx)] = {};

        newArgs[argKey.substring(0, idx)][SEQUELIZE_OPERATORS[fil]] = args[argKey];
        hasFilter = true;
      }
    });

    // if no filter was found for this argument key
    if (!hasFilter) newArgs[argKey] = args[argKey];
  });

  return newArgs;
}
