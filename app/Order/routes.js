/**
 * ORDER ROUTES
 *
 * This is where we define all the routes for the Order feature.
 * These routes get exported to the global /routes.js file.
 */

'use strict';

// require controller
const controller = require('./controller');

// Returns a function that attaches Order feature routes to the global router object
module.exports = (passport, router) => {

  // routes
  router.all('/v1/orders/example', controller.V1Example);

  // return router
  return router;
};
