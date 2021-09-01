/**
 * All Authentication and Authorization middleware goes here
 */

'use strict';

// env variables
const { NODE_ENV } = process.env;

// require custom node modules
const models = require('../models');

module.exports = {
  attachJWTAuth,
  JWTAuth,
  verifyJWTAuth
};

/**
 * Takes in the req object and attaches the JWTAuthUser, JWTAuthAdmin, JWTAuthPartner
 *
 * ADD ANY MORE AUTHS HERE
 */
function attachJWTAuth(passport) {
  return (req, res, next) => {
    // Add Passport Authentications to req
    req.JWTAuth = {
      JWTAuthUser: passport.authenticate('JWTAuthUser', { session: false }),
      JWTAuthAdmin: passport.authenticate('JWTAuthAdmin', { session: false })
    };

    return next();
  };
}

/**
 * Looks into the request header and checks the 'authorization' header to see which auth to select
 *
 * 'authorization': 'jwt-user token' => JWTAuthUser
 * 'authorization': 'jwt-admin token' => JWTAuthAdmin
 * 'authorization': 'jwt-partner token' => JWTAuthPartner
 *
 * returns a function that will call the correct method
 *
 * ADD ANY MORE AUTHS HERE
 */
function JWTAuth(req, res, next) {
  // choose method
  if (req.headers.authorization && req.headers.authorization.indexOf('jwt-user') >= 0)
    req.JWTAuth.JWTAuthUser(req, res, next);
  else if (req.headers.authorization && req.headers.authorization.indexOf('jwt-admin') >= 0)
    req.JWTAuth.JWTAuthAdmin(req, res, next);
  else
    return next();
}

/**
 * Verify that a admin/user is active during JWT auth
 * Also attach the correct user object
 * Set user's locale
 *
 * TODO: TEST
 *
 * req.user = { id, active, company:active }
 *
 * Success: Return next().
 * Errors:
 *   401: Token is invalid, request denied.
 *   401: Your account is inactive, request denied.
 */
function verifyJWTAuth(req, res, next) {
  // if logged in
  if (req.user) {
    // if logged in, set locale to user's locale
    req.setLocale(req.user.locale);
    res.setLocale(req.user.locale);

    // use existing user
    if (req.headers.authorization && req.headers.authorization.indexOf('jwt-user') >= 0) {
      req.user = req.user;
    }

    // attach admin and remove user
    else if (req.headers.authorization && req.headers.authorization.indexOf('jwt-admin') >= 0) {
      req.admin = req.user;
      req.user = null;
    }
  }

  // save the locale to the cookie in the res.cookie (final step)
  // if you change cookie name, you must also change in server.js i18n.configure
  res.cookie('i18n-locale', req.getLocale(), {
    maxAge: 999999, // about 11 days
    httpOnly: true
  });

  return next();
}
