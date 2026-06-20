/**
 * Middleware to handle errors, MUST be the LAST middleware to be called
 *
 * TODO: Integrate Sentry (or equivalent error monitoring service) here.
 * Replace or supplement the console logging with Sentry.captureException(err) so errors
 * are deduplicated, grouped, and rate-limited.
 *
 * TODO: TEST
 */

'use strict';

const { NODE_ENV } = process.env; // get node env

module.exports = function(err, req, res, next) {
  let userType = 'Logged Out';
  let user = { id: 'N/A', email: 'logged@out.com' };

  // print out error
  console.log('---------- START: URGENT! 500 Server Error! ----------');
  console.log('requestId:', req.requestId);
  console.log(err);
  console.log('---------- END: URGENT! 500 Server Error! ----------');

  // select user type
  if (req.user) {
    userType = 'User';
    user = req.user;
  } else if (req.admin) {
    userType = 'Admin';
    user = req.admin;
  } // add more user types here

  // production
  if (NODE_ENV === 'production') {
    return res.status(500).json({
      status: 500,
      success: false,
      error: err.name,
      message: err.message,
      requestId: req.requestId
    });
  }

  // dev and test
  else {
    return res.status(500).json({
      status: 500,
      success: false,
      error: err.name,
      stack: err.stack,
      message: err.message,
      requestId: req.requestId,
      reqRoute: req.url,
      reqUserType: userType,
      reqUser: user,
      reqArgs: req.args
    });
  }
};
