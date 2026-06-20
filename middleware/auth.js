/**
 * All Authentication and Authorization middleware goes here
 *
 * To support a new authenticated user type, add ONE entry to AUTH_TYPES below — every function
 * in this file is driven by that registry, so there is a single source of truth.
 */

'use strict';

module.exports = {
  attachJWTAuth,
  JWTAuth,
  verifyJWTAuth
};

/**
 * The authenticated user types. One entry per type:
 *   scheme   - the Authorization header scheme prefix ('jwt-user <token>')
 *   strategy - the passport JWT strategy name (see services/passport.js)
 *   reqKey   - where the authenticated record is attached on req (req.user, req.admin, ...)
 */
const AUTH_TYPES = [
  { scheme: 'jwt-user',  strategy: 'JWTAuthUser',  reqKey: 'user' },
  { scheme: 'jwt-admin', strategy: 'JWTAuthAdmin', reqKey: 'admin' }
];

/**
 * Returns the AUTH_TYPES entry matching the request's Authorization scheme, or null.
 * Uses an exact scheme-prefix match ('jwt-admin ') — not a loose substring search.
 */
function getAuthType(req) {
  const header = req.headers.authorization;
  if (!header)
    return null;

  return AUTH_TYPES.find(type => header.startsWith(`${type.scheme} `)) || null;
} // END getAuthType

/**
 * Attach a passport authenticator for every auth type onto req.JWTAuth.
 */
function attachJWTAuth(passport) {
  return (req, res, next) => {
    req.JWTAuth = {};

    AUTH_TYPES.forEach(type => {
      req.JWTAuth[type.strategy] = passport.authenticate(type.strategy, { session: false });
    });

    return next();
  };
} // END attachJWTAuth

/**
 * Inspect the Authorization header and run the matching JWT strategy.
 * If no recognized scheme is present, continue (the route may be public — the controller enforces auth).
 */
function JWTAuth(req, res, next) {
  const authType = getAuthType(req);

  if (!authType)
    return next();

  return req.JWTAuth[authType.strategy](req, res, next);
} // END JWTAuth

/**
 * After the JWT strategy runs, passport sets the authenticated record on req.user by default.
 * Move it to the correct key for the matched type (e.g. req.admin) and set the locale.
 *
 * Success: Return next().
 */
function verifyJWTAuth(req, res, next) {
  // if authenticated
  if (req.user) {
    // set locale to the authenticated record's locale
    req.setLocale(req.user.locale);
    res.setLocale(req.user.locale);

    // reassign req.user to the correct key for non-user types (e.g. req.admin)
    const authType = getAuthType(req);
    if (authType && authType.reqKey !== 'user') {
      req[authType.reqKey] = req.user;
      req.user = null;
    }
  }

  // save the locale to the cookie (final step)
  // if you change cookie name, you must also change in server.js i18n.configure
  res.cookie('i18n-locale', req.getLocale(), {
    maxAge: 999999, // about 11 days
    httpOnly: true
  });

  return next();
} // END verifyJWTAuth
