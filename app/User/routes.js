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

  // routes - can also use router.get or router.post
  // IMPORTANT: Routes should be all lowercase, no underscores or dashes. '/v1/user/multiplewordsroute'

  // auth methods for both login and register
  router.all('/v1/users/login', controller.V1Login);
  router.all('/v1/users/logout', controller.V1Logout);
  router.all('/v1/users/logoutall', controller.V1LogoutAll);
  router.all('/v1/users/refresh', controller.V1Refresh);
  router.all('/v1/users/register', controller.V1Register);
  router.all('/v1/users/read', controller.V1Read);
  router.all('/v1/users/update', controller.V1Update);

  // "Sign in with Google" (login flow — must be logged out)
  router.all('/v1/users/googleauthstart', controller.V1GoogleAuthStart);
  router.all('/v1/users/googlelogin', controller.V1GoogleLogin);

  // onboarding
  router.all('/v1/users/completeonboarding', controller.V1CompleteOnboarding);
  router.all('/v1/users/updatemydepartments', controller.V1UpdateMyDepartments);

  // return router
  return router;
};
