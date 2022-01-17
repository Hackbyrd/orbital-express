/**
 * Middleware for gracefully exiting server and database connection
 */

'use strict';

const { NODE_ENV } = process.env; // get node env

// services
const { ERROR_CODES } = require('../services/error');

// whether server is shutting down or not
let isShuttingDown = false;

/**
 * Make sure for any type of request (POST or GET), the parameters are stored in req.args
 * req.body store arguments from POST body and req.query store URL params
 * req.args store which ever one was used
 */
module.exports = {
  gracefulExit,
  middleware
};

/**
 * Gracefully exits / shuts down app
 * !NOTE: Database (Sequelize connection) gracefully shutsdown automatically on process.exit
 */
function gracefulExit(server) {
  // if not already shutting down
  if (!isShuttingDown) {
    isShuttingDown = true;
    console.log('Received kill signal (SIGTERM), shutting down...');

    // force close after 30 seconds
    setTimeout(() => {
      console.log('Could not close connections in time, forcefully shutting down...');
      process.exit(1);
    }, 30000);

    // close all remaining connections
    server.close(() => {
      console.log('Closed all remaining connections.');
      process.exit(0);
    });
  } // END if not already shutting down
} // END gracefulExit

/**
 * Stops new incoming requests while the server is shutting down
 */
function middleware(req, res, next) {
  // if not shutting down, continue
  if (!isShuttingDown)
    return next();

  res.set('Connection', 'close');
  return res.status(503).json(errorResponse(req, ERROR_CODES.SERVICE_UNAVAILABLE));
} // END middleware
