/**
 * Email Service
 *
 * Services:
 * 1. SendGrid: https://github.com/sendgrid/sendgrid-nodejs
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// custom node modules
const sendgrid = require('./sendgrid');

module.exports = {
  send,

  // Any default emails to use
  emails: {
    support: sendgrid.emails.support,
    welcome: sendgrid.emails.welcome,
    storage: sendgrid.emails.storage,
    errors: sendgrid.emails.errors,
    doNotReply: sendgrid.emails.doNotReply
  }
};

/**
 * Send a custom email
 * !NOTE: ARGS must be all STRING values!!
 *
 * @params {
 *   @from - (STRING - REQUIRED): Where this email is from (email)
 *   @name - (STRING - REQUIRED): Where this email is from (name)
 *   @subjec - (STRING - REQUIRED): The subject of the email
 *   @template - (STRING - REQUIRED): The template file to send in mailers
 *   @tos - (STRING ARRAY - REQUIRED): Array of emails to send to
 *   @ccs - (STRING ARRAY - OPTIONAL): Array of emails to CC
 *   @bccs - (STRING ARRAY - OPTIONAL): Array of emails to BCC
 *   @args - (OBJECT - OPTIONAL): The variables to pass to the email template (refer to args in template using -arg- syntax). MUST BE ALL STRING VALUES
 * }
 *
 * @callback - (FUNCTION - OPTIONAL) callback(err, result) --> result.statusCode, result.body, result.headers
 */
async function send(params, callback) {
  // if there is a callback, use callback version
  if (callback) {
    return sendgrid.send(params, callback);
  }

  // if there isn't a callback, use promise version
  else {
    return new Promise(async (resolve, reject) => {
      sendgrid.send(params, (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });
  }
}
