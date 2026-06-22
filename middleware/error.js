/**
 * Middleware to handle errors. MUST be the LAST middleware registered.
 *
 * Logs a structured JSON line to stdout on every 500 — parseable by Heroku Papertrail,
 * Datadog Logs, and most log aggregators. If Sentry is configured (SENTRY_DSN set),
 * the error is also sent there for deduplication and alerting.
 */

'use strict';

const { NODE_ENV } = process.env;

// services
const sentry = require('../services/sentry');

module.exports = function(err, req, res, next) {
  let userType = 'loggedOut';
  let userId = null;

  if (req.user) {
    userType = 'user';
    userId = req.user.id;
  } else if (req.admin) {
    userType = 'admin';
    userId = req.admin.id;
  } // add more user types here

  // Structured JSON log — one line per error, parseable by log aggregators
  const logEntry = {
    level: 'error',
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userType,
    userId,
    errorName: err.name,
    errorMessage: err.message,
    ...(NODE_ENV !== 'production' && { stack: err.stack }),
  };
  console.error(JSON.stringify(logEntry));

  // Send to Sentry if configured (no-op if services/sentry.js is the stub)
  sentry.captureException(err, req);

  // production — minimal response (no stack traces)
  if (NODE_ENV === 'production') {
    return res.status(500).json({
      status: 500,
      success: false,
      error: err.name,
      message: err.message,
      requestId: req.requestId,
    });
  }

  // dev + test — full debug response
  return res.status(500).json({
    status: 500,
    success: false,
    error: err.name,
    stack: err.stack,
    message: err.message,
    requestId: req.requestId,
    reqRoute: req.url,
    reqUserType: userType,
    reqUserId: userId,
    reqArgs: req.args,
  });
};
