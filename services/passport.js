/**
 * passport.js configuration
 *
 * Two kinds of strategies per user type:
 *   - Local strategy ('JWT<Type>Login')  — verifies email+password at login time.
 *   - JWT strategy   ('JWTAuth<Type>')    — verifies the ACCESS TOKEN on every request.
 *
 * Access tokens are signed with ACCESS_TOKEN_SECRET (see helpers/logic.createAccessToken),
 * carry `sub`, `type`, `tokenVersion`, and have `exp`/`iss` enforced here. A token whose
 * tokenVersion no longer matches the user's current tokenVersion is rejected (instant revocation).
 */

'use strict';

// require third-party node modules
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');

// require custom node modules
const models = require('../models');
const { TOKEN_AUDIENCE } = require('../helpers/constants');

// extract env variables
const { ACCESS_TOKEN_SECRET, HOSTNAME } = process.env;

// A throwaway bcrypt hash used to equalize timing when an account is not found, so an attacker
// cannot distinguish "no such email" (fast) from "wrong password" (slow) and enumerate accounts.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('not-a-real-password', 10);

// set up passport
module.exports = async passport => {
  /**********************************************/
  /******************** USER ********************/
  /**********************************************/

  /**
   * Local login strategy — verify a user's email + password.
   */
  passport.use('JWTUserLogin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, email, password, done) => {
    email = email.toLowerCase().trim();

    try {
      const getUser = await models.user.scope(null).findOne({
        paranoid: false, // also retrieve soft-deleted records (the action decides what to do with them)
        where: { email }
      });

      // not found — still run a bcrypt compare against a dummy hash to keep timing constant
      if (!getUser) {
        await models.user.validatePassword(password, DUMMY_BCRYPT_HASH).catch(() => false);
        return done(null, false);
      }

      // verify password
      const isValid = await models.user.validatePassword(password, getUser.password);
      if (!isValid)
        return done(null, false);

      return done(null, getUser);
    } catch (error) {
      return done(error, false);
    }
  }));

  /**
   * JWT access-token strategy — authenticate a user on each request.
   *
   * @payload (OBJECT): { sub: user.id, type: 'user', tokenVersion, iat, exp, iss }
   *
   * curl -v -H "Authorization: jwt-user <access-token>"
   */
  passport.use('JWTAuthUser', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt-user'), // must be the auth header (works over HTTPS)
    secretOrKey: ACCESS_TOKEN_SECRET,
    algorithms: ['HS256'], // pin the accepted algorithm — defense against alg-confusion attacks
    issuer: HOSTNAME, // enforced (no longer decorative); exp is enforced by default
    audience: Object.values(TOKEN_AUDIENCE.USER) // accept any user client (user-web, user-mobile)
  }, async (payload, done) => {
    try {
      const findUser = await models.user.findOne({ where: { id: payload.sub } });
      if (!findUser)
        return done(null, false);

      // instant revocation: a stale tokenVersion means this access token has been invalidated
      if (findUser.tokenVersion !== payload.tokenVersion)
        return done(null, false);

      return done(null, findUser);
    } catch (error) {
      return done(error, false);
    }
  }));

  /***********************************************/
  /******************** ADMIN ********************/
  /***********************************************/

  /**
   * Local login strategy — verify an admin's email + password.
   */
  passport.use('JWTAdminLogin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, email, password, done) => {
    email = email.toLowerCase().trim();

    try {
      const admin = await models.admin.scope(null).findOne({
        paranoid: false, // also retrieve soft-deleted records (the action decides what to do with them)
        where: { email }
      });

      // not found — still run a bcrypt compare against a dummy hash to keep timing constant
      if (!admin) {
        await models.admin.validatePassword(password, DUMMY_BCRYPT_HASH).catch(() => false);
        return done(null, false);
      }

      // verify password
      const isValid = await models.admin.validatePassword(password, admin.password);
      if (!isValid)
        return done(null, false);

      return done(null, admin);
    } catch (error) {
      return done(error, false);
    }
  }));

  /**
   * JWT access-token strategy — authenticate an admin on each request.
   *
   * @payload (OBJECT): { sub: admin.id, type: 'admin', tokenVersion, iat, exp, iss }
   *
   * curl -v -H "Authorization: jwt-admin <access-token>"
   */
  passport.use('JWTAuthAdmin', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt-admin'), // must be the auth header (works over HTTPS)
    secretOrKey: ACCESS_TOKEN_SECRET,
    algorithms: ['HS256'], // pin the accepted algorithm — defense against alg-confusion attacks
    issuer: HOSTNAME, // enforced (no longer decorative); exp is enforced by default
    audience: Object.values(TOKEN_AUDIENCE.ADMIN) // accept any admin client (admin-web, admin-mobile)
  }, async (payload, done) => {
    try {
      const findAdmin = await models.admin.findOne({ where: { id: payload.sub } });
      if (!findAdmin)
        return done(null, false);

      // instant revocation: a stale tokenVersion means this access token has been invalidated
      if (findAdmin.tokenVersion !== payload.tokenVersion)
        return done(null, false);

      return done(null, findAdmin);
    } catch (error) {
      return done(error, false);
    }
  }));
};
