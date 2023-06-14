/**
 * USER CONTROLLER
 *
 * Defines which User action methods are called based on the type of user role
 */

'use strict';

// helpers
const { errorResponse, ERROR_CODES } = require('../../services/error');

// actions
const actions = require('./actions');

module.exports = {
  V1Example
}

/**
 * Example Method
 *
 * /v1/users/example
 *
 * Must be logged out | Must be logged in | Can be both logged in or logged out
 * Roles: ['admin', 'member', 'member.ADMIN']
 */
async function V1Example(req, res, next) {
  let method = null; // which action method to use

  // Call the correct action method based on type of user of role
  if (req.admin)
    method = `V1ExampleByAdmin`;
  else if (req.partner)
    method = `V1ExampleByPartner`;
  else if (req.user)
    method = `V1ExampleByUser`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Example 
