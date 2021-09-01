/**
 * Middleware to handle errors, MUST be the LAST middleware to be called
 *
 * Potentially add sentry or other third-party error logger
 * TODO: TEST
 */

'use strict';

const { NODE_ENV } = process.env; // get node env

// moment
const moment = require('moment-timezone');

// email
const email = require('../services/email');

module.exports = function(err, req, res, next) {
  let userType = 'Logged Out';
  let user = { id: 'N/A', email: 'logged@out.com' };

  // print out error
  console.log('---------- START: URGENT! 500 Server Error! ----------');
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
    // send error email
    email.send({
      from: email.emails.error.address,
      name: email.emails.error.name,
      subject: 'URGENT! 500 Interal Server Error!',
      template: 'ErrorRequest',
      tos: [email.emails.error.address],
      ccs: null,
      bccs: null,
      args: {
        time: moment.tz('US/Pacific').format('LLLL'),
        error: err,
        reqRoute: req.url,
        reqUserType: userType,
        reqUser: user,
        reqArgs: req.args
      }
    }, (err, result) => console.error(err)); // send error email

    return res.status(500).json({
      status: 500,
      success: false,
      error: err.name,
      message: err.message
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
      reqRoute: req.url,
      reqUserType: userType,
      reqUser: user,
      reqArgs: req.args
    });
  }
};
