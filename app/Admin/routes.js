/**
 * ADMIN ROUTES
 *
 * This is where we define all the routes for the Admin feature.
 * These routes get exported to the global /routes.js file.
 */

'use strict';

// require controller
const controller = require('./controller');

// Returns a function that attaches Admin feature routes to the global router object
module.exports = (passport, router) => {

  // routes
  router.all('/v1/admins/login', controller.V1Login);
  router.all('/v1/admins/resetpassword', controller.V1ResetPassword);
  router.all('/v1/admins/confirmpassword', controller.V1ConfirmPassword);
  router.all('/v1/admins/read', controller.V1Read);
  router.all('/v1/admins/create', controller.V1Create);
  router.all('/v1/admins/update', controller.V1Update);
  router.all('/v1/admins/query', controller.V1Query);
  router.all('/v1/admins/updatepassword', controller.V1UpdatePassword);
  router.all('/v1/admins/updateemail', controller.V1UpdateEmail);
  router.all('/v1/admins/export', controller.V1Export);

  // return router
  return router;
};
