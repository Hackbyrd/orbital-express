/**
 * Email Service
 *
 * Services:
 * 1. SendGrid: https://github.com/sendgrid/sendgrid-nodejs
 *
 * Use Case: https://github.com/sendgrid/sendgrid-nodejs/blob/master/use-cases/README.md#email-use-cases
 *
 * HTML/CSS Inliner: http://foundation.zurb.com/emails/inliner-v2.html
 */

'use strict';

// ENV variables
const { NODE_ENV, SENDGRID_KEY, DO_NOT_SEND_EMAIL_IN_TEST_MODE } = process.env;

// built-in node modules
const path = require('path');

// third-party
const ejs = require('ejs');
const sgMail = require('@sendgrid/mail');

// set api key
sgMail.setApiKey(SENDGRID_KEY);

// !IMPORTANT Yahoo.com has a DMARC policy in place that prevents mail with yahoo.com in the from address from being delivered if it is sent from outside Yahoo’s infrastructure.
// https://sendgrid.com/blog/yahoo-dmarc-update/
const BLOCKED_EMAILS = [
  '@yahoo.com',
  '@y7mail.com',
  '@yahoo.at',
  '@yahoo.be',
  '@yahoo.bg',
  '@yahoo.cl',
  '@yahoo.co.hu',
  '@yahoo.co.id',
  '@yahoo.co.il',
  '@yahoo.co.kr',
  '@yahoo.co.th',
  '@yahoo.co.za',
  '@yahoo.com.co',
  '@yahoo.com.hr',
  '@yahoo.com.my',
  '@yahoo.com.pe',
  '@yahoo.com.ph',
  '@yahoo.com.sg',
  '@yahoo.com.tr',
  '@yahoo.com.tw',
  '@yahoo.com.ua',
  '@yahoo.com.ve',
  '@yahoo.com.vn',
  '@yahoo.cz',
  '@yahoo.dk',
  '@yahoo.ee',
  '@yahoo.fi',
  '@yahoo.hr',
  '@yahoo.hu',
  '@yahoo.ie',
  '@yahoo.lt',
  '@yahoo.lv',
  '@yahoo.nl',
  '@yahoo.no',
  '@yahoo.pl',
  '@yahoo.pt',
  '@yahoo.rs',
  '@yahoo.se',
  '@yahoo.si',
  '@yahoo.sk',
  '@yahoogroups.co.kr',
  '@yahoogroups.com.cn',
  '@yahoogroups.com.sg',
  '@yahoogroups.com.tw',
  '@yahoogrupper.dk',
  '@yahoogruppi.it',
  '@yahooxtra.co.nz'
];

const emailObj = {
  send,
  dmarc,
  BLOCKED_EMAILS,

  // Any default emails to use
  emails: {
    support: { address: 'support@express-master-boilerplate.com', name: 'Express Master Boilerplate Support' },
    welcome: { address: 'welcome@express-master-boilerplate.com', name: 'Express Master Boilerplate Welcome' },
    storage: { address: 'storage@express-master-boilerplate.com', name: 'Express Master Boilerplate Storage' },
    errors: { address: 'errors@express-master-boilerplate.com', name: 'Express Master Boilerplate Errors' },
    doNotReply: { address: 'donotreply@express-master-boilerplate.com', name: 'Express Master Boilerplate Do Not Reply' }
  }
};

/**
 * Send a custom email
 * NOTE: ARGS must be all STRING values!!
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
async function send({ from, name, subject, template, tos, ccs, bccs, args }, callback) {
    // validate from, subject, template
    if (typeof from !== 'string' || typeof name !== 'string' || typeof subject !== 'string' || typeof template !== 'string') {
      return callback(new Error('Email must have a from, name, subject, and template in order to send.'));
    }

    // check to see if from field violates the DMARC policy
    let extension = dmarc(from); //
    if (extension) {
      return callback(new Error(`Cannot send an email from a "${extension}" domain because it violates the DMARC policy.`));
    }

    // validate tos
    if (tos === null || tos === undefined || tos.length === 0) {
      return callback(new Error('Email must be sent to at least one recipient.'));
    }

    // set ccs to empty array if not specified
    if (ccs === null || ccs === undefined) {
      ccs = [];
    }

    // set bccs to empty array if not specified
    if (bccs === null || bccs === undefined) {
      bccs = [];
    }

    // set variables to empty object if not specified
    if (args === null || args === undefined) {
      args = {};
    }

    // use these variables to help detect duplicate emails
    let duplicateEmails = {};
    let tempEmailsArr = [];

    // add tos and check for duplicates
    tos.forEach(to => {
      if (!duplicateEmails[to]) {
        duplicateEmails[to] = true;
        tempEmailsArr.push(to);
      }
    });
    tos = tempEmailsArr; // set to array without duplicates
    duplicateEmails = {}; // reset
    tempEmailsArr = []; // reset

    // add ccs
    ccs.forEach(cc => {
      if (!duplicateEmails[cc]) {
        duplicateEmails[cc] = true;
        tempEmailsArr.push(cc);
      }
    });
    ccs = tempEmailsArr; // set to array without duplicates
    duplicateEmails = {}; // reset
    tempEmailsArr = []; // reset

    // Recommended if you want to store a BCC copy of all the emails that are sent out. If not, comment this out
    if (NODE_ENV === 'production') {
      let defaultBccEmail = emails.storage.address; // the default email to send all emails
      bccs.push(defaultBccEmail);
    }

    // add bccs
    bccs.forEach(bcc => {
      if (!duplicateEmails[bcc]) {
        duplicateEmails[bcc] = true;
        tempEmailsArr.push(bcc);
      }
    });
    bccs = tempEmailsArr; // set to array without duplicates

    // if node environment is not production, then add TEST EMAIL disclaimer to top of email to help you distinguish between production and development emails.
    args.isTestEmail = NODE_ENV === 'production' ? '' : 'THIS IS A TEST EMAIL';

    // convert file
    ejs.renderFile(path.join(__dirname, `../../mailers/${template}/index.ejs`), args, async (err, rawHtml) => {
      if (err) return callback(err);

      // create message
      let msg = {
        to: tos,
        ccs: ccs,
        bccs: bccs,
        subject: subject,
        from: {
          name: name,
          email: from
        },
        content: [
          {
            type: 'text/html',
            value: rawHtml
          }
        ]
      };

      // NOTE: COMMENT OR UNCOMMENT this out if you don't want to send emails
      if (DO_NOT_SEND_EMAIL_IN_TEST_MODE === 'true') {
        console.log('YOU MUST TURN ON TEST EMAILS TO SEND EMAILS IN TESTS.');
        return callback(null, true);
      }

      // send email
      try {
        await sgMail.send(msg);

        return callback(null, true);
      } catch(err) {
        let newErrorMessageArr = [];

        // compile error message
        err.response.body.errors.forEach(e => {
          newErrorMessageArr.push(e.message);
        });

        // Extract error msg and response msg
        const { message, code, response } = err;
        const { headers, body } = response;

        // return error
        return callback(new Error(newErrorMessageArr.join('. ')), false);
      }
    }); // END convert file
} // END mail

/**
 * Checks to see if the from is from a domain that has a DMARC policy in place
 * https://sendgrid.com/blog/yahoo-dmarc-update/
 *
 * @from - (STRING- REQUIRED): the from email
 *
 * returns null if does not violate the DMARC policy
 * returns the extension if it does violate the DMARC policy
 */
function dmarc(from) {
  // check to see if violates extension
  for (let i = 0; i < BLOCKED_EMAILS.length; i++) {
    let extension = BLOCKED_EMAILS[i]; // domain extention like '@yahoo.com

    // if extension is found in the from
    if (from.indexOf(extension) >= 0) {
      return extension;
    }
  }

  return null;
} // END dmarc

module.exports = emailObj;
