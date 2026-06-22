/**
 * Sentry stub — no-op when Sentry is not configured.
 *
 * To enable error tracking:
 *   1. Add @sentry/node to your dependencies
 *   2. Set SENTRY_DSN in your environment
 *   3. Replace this file with the real implementation (see the Sentry integration in create-orbital-app)
 *
 * Without Sentry, errors are still logged as structured JSON to stdout (middleware/error.js).
 * That output is parseable by Heroku Papertrail, Datadog Logs, and most log aggregators.
 */

'use strict';

module.exports = {
  init:             () => {},
  captureException: () => {},
};
