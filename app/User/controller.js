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
  V1Login,
  V1Logout,
  V1LogoutAll,
  V1Refresh,
  V1Register,
  V1Read,
  V1Update,
  V1GoogleAuthStart,
  V1GoogleLogin,
  V1CompleteOnboarding,
  V1UpdateMyDepartments
}

/**
 * Login as user
 *
 * /v1/users/login
 *
 * Must be logged out
 * Roles: []
 */
async function V1Login(req, res, next) {
  let method = null; // which action method to use

  // which method to call
  if (req.user)
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
  else
    method = `V1Login`;

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Login

/**
 * Logout a user
 *
 * /v1/users/logout
 *
 * Must be logged in
 */
async function V1Logout(req, res, next) {
  let method = null; // which action method to use

  // which method to call
  if (req.user)
    method = `V1Logout`;
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
 * Log a user out of ALL sessions/devices
 *
 * /v1/users/logoutall
 *
 * Must be logged in
 */
async function V1LogoutAll(req, res, next) {
  let method = null; // which action method to use

  // which method to call
  if (req.user)
    method = `V1LogoutAll`;
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1LogoutAll

/**
 * Refresh the access token using a refresh token
 *
 * /v1/users/refresh
 *
 * Can be both logged in or logged out (the access token is typically expired by the time you refresh).
 * Authentication is via the refresh token (cookie or body), not the access token.
 */
async function V1Refresh(req, res, next) {
  let method = `V1Refresh`;

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Refresh

/**
 * Register a user
 *
 * /v1/users/register
 *
 * Must be logged out
 */
async function V1Register(req, res, next) {
  let method = null; // which action method to use

  // which method to call
  if (req.user)
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
  else
    method = `V1Register`;

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
  * Read and return a user
  *
  * /v1/users/read
  *
  * Must be logged in
  * Roles: ['user']
  */
async function V1Read(req, res, next) {
  let method = null; // which action method to use

  // which method to call
  if (req.user)
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
 * Update a user
 *
 * /v1/users/update
 *
 * Must be logged in
 * Roles: ['user']
 */
async function V1Update(req, res, next) {
  let method = null;

  // which method to call
  if (req.user)
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
 * Start "Sign in with Google"
 *
 * /v1/users/googleauthstart
 *
 * Must be logged out
 */
async function V1GoogleAuthStart(req, res, next) {
  let method = null; // which action method to use

  // which method to call
  if (req.user)
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
  else
    method = `V1GoogleAuthStart`;

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1GoogleAuthStart

/**
 * Complete "Sign in with Google"
 *
 * /v1/users/googlelogin
 *
 * Must be logged out
 */
async function V1GoogleLogin(req, res, next) {
  let method = null; // which action method to use

  // which method to call
  if (req.user)
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
  else
    method = `V1GoogleLogin`;

  // call correct method
  try {
    const result = await actions[method](req, res);

    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1GoogleLogin

/**
 * Mark current user's onboarding as complete
 *
 * /v1/users/completeonboarding
 *
 * Must be logged in
 */
async function V1CompleteOnboarding(req, res, next) {
  if (!req.user)
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  try {
    const result = await actions.V1CompleteOnboarding(req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1CompleteOnboarding

/**
 * Replace current user's department memberships
 *
 * /v1/users/updatemydepartments
 *
 * Must be logged in
 */
async function V1UpdateMyDepartments(req, res, next) {
  if (!req.user)
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  try {
    const result = await actions.V1UpdateMyDepartments(req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1UpdateMyDepartments
