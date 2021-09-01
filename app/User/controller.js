/**
 * USER CONTROLLER
 *
 * Defines which User service methods are called based on the type of user role
 */

'use strict';

// helpers
const { errorResponse, ERROR_CODES } = require('../../services/error');

// service
const service = require('./service');

module.exports = {
  V1Login,
  V1Read,
  V1Register,
  V1Update,
  V1Query,
  V1UpdatePassword,
  V1ResetPassword,
  V1ConfirmPassword,
  V1UpdateEmail
};

/**
 * Login as user
 *
 * /v1/users/login
 *
 * Must be logged out
 * Roles: []
 */
async function V1Login(req, res, next) {
  let method = 'V1Login';

  // call correct method
  // login has to include the "res" object for passport.authenticate
  const result = await service[method](req, res).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Read and return a user
 *
 * /v1/users/read
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1Read(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1ReadByAdmin`;
  else if (req.user)
    method = `V1ReadByUser`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Register a user
 *
 * /v1/users/register
 *
 * Must be logged out
 * Roles: []
 */
async function V1Register(req, res, next) {
  let method = 'V1Register'; // which service method to use

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Update and return updated user
 *
 * /v1/users/update
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1Update(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1UpdateByAdmin`;
  else if (req.user)
    method = `V1UpdateByUser`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Query and return users
 *
 * /v1/users/query
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1Query(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1QueryByAdmin`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Update password of a user
 *
 * /v1/users/updatepassword
 *
 * Must be logged in
 * Roles: ['user']
 */
async function V1UpdatePassword(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.user)
    method = `V1UpdatePasswordByUser`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Reset password of a user
 *
 * /v1/users/resetpassword
 *
 * Must be logged out
 * Roles: []
 */
async function V1ResetPassword(req, res, next) {
  let method = 'V1ResetPassword';

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Confirm new password after resetting
 *
 * /v1/users/confirmpassword
 *
 * Can be logged in or logged out
 * Roles: []
 */
async function V1ConfirmPassword(req, res, next) {
  let method = 'V1ConfirmPassword';

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Update email of a user
 *
 * /v1/users/updateemail
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1UpdateEmail(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1UpdateEmailByAdmin`;
  else if (req.user)
    method = `V1UpdateEmailByUser`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}
