/**
 * USER ROUTES
 *
 * This is where we define all the routes for the User feature.
 * These routes get exported to the global /routes.js file.
 */

'use strict';

// require controller
const controller = require('./controller');

// Returns a function that attaches User feature routes to the global router object
module.exports = (passport, router) => {

  // routes
  router.all('/v1/users/login', controller.V1Login);
  router.all('/v1/users/resetpassword', controller.V1ResetPassword);
  router.all('/v1/users/confirmpassword', controller.V1ConfirmPassword);
  router.all('/v1/users/read', controller.V1Read);
  router.all('/v1/users/register', controller.V1Register);
  router.all('/v1/users/update', controller.V1Update);
  router.all('/v1/users/query', controller.V1Query);
  router.all('/v1/users/updatepassword', controller.V1UpdatePassword);
  router.all('/v1/users/updateemail', controller.V1UpdateEmail);

  // return router
  return router;
};
