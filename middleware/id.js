'use strict';

// module.exports
module.exports = {
  requestId
};

/**
 * Attaches a unique request ID to every incoming request.
 * Exposes it as req.requestId and echoes it back in the X-Request-ID response header
 * so clients can quote it in bug reports and you can grep server logs by it.
 */
function requestId(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
} // END requestId
