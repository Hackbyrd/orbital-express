/**
 * ADMIN CONTROLLER
 *
 * Defines which Admin service methods are called based on the type of user role
 */

'use strict';

// helpers
const { errorResponse, ERROR_CODES } = require('../../services/error');

// service
const service = require('./service');

module.exports = {
  V1Login,
  V1Read,
  V1Create,
  V1Update,
  V1Query,
  V1UpdatePassword,
  V1ResetPassword,
  V1ConfirmPassword,
  V1UpdateEmail,
  V1Export
};

/**
 * Login as admin
 *
 * /v1/admins/login
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
 * Read and return an admin
 *
 * /v1/admins/read
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1Read(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1Read`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Create an admin
 *
 * /v1/admins/create
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1Create(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1Create`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Update and return updated admin
 *
 * /v1/admins/update
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1Update(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
      method = `V1Update`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Query and return admins
 *
 * /v1/admins/query
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1Query(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
      method = `V1Query`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Update password of an admin
 *
 * /v1/admins/updatepassword
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1UpdatePassword(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1UpdatePassword`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Reset password of an admin
 *
 * /v1/admins/resetpassword
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
 * /v1/admins/confirmpassword
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
 * Update email of an admin
 *
 * /v1/admins/updateemail
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1UpdateEmail(req, res, next) {
  let method = null; // which service method to use

  // which method to call
  if (req.admin)
    method = `V1UpdateEmail`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}

/**
 * Export an admin
 *
 * /v1/admins/export
 *
 * Must be logged in
 * Roles: ['admin']
 */
async function V1Export(req, res, next) {
  let method = `V1Export`; // which service method to use

  // call correct method
  const result = await service[method](req).catch(err => next(err));
  return res.status(result.status).json(result);
}
