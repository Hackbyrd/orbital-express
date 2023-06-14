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
  router.all('/v1/users/example', controller.V1Example);

  // return router
  return router;
};
