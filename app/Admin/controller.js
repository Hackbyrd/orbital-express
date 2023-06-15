/**
 * ADMIN CONTROLLER
 *
 * Defines which Admin action methods are called based on the type of user role
 */

'use strict';

// helpers
const { errorResponse, ERROR_CODES } = require('../../services/error');

 // actions
const actions = require('./actions');

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
  V1Export,

  // for testing if socket is working. This is for testing purposes only via API_URL/socket
  V1TestSocket
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
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  let method = null; // which action method to use

  // which method to call
  if (req.admin)
    method = `V1Read`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  let method = null; // which action method to use

  // which method to call
  if (req.admin)
    method = `V1Create`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  let method = null; // which action method to use

  // which method to call
  if (req.admin)
      method = `V1Update`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  let method = null; // which action method to use

  // which method to call
  if (req.admin)
      method = `V1Query`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  let method = null; // which action method to use

  // which method to call
  if (req.admin)
    method = `V1UpdatePassword`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  let method = null; // which action method to use

  // which method to call
  if (req.admin)
    method = `V1UpdateEmail`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
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
  let method = null; // which action method to use

  // which method to call
  // if (req.admin)
  if (true)
    method = `V1Export`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
}

 /**
  * Test websocket. This is for testing purposes only via API_URL/socket
  *
  * /v1/admins/testsocket
  *
  * Can be logged in or logged out
  * Roles: []
  */
async function V1TestSocket(req, res, next) {
  let method = 'V1TestSocket';

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
}