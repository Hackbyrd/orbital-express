/**
 * Email Service
 *
 * Nodemailer: https://nodemailer.com/about/
 *
 * Use MailTrap or NodeMailerApp for testing
 *
 * HTML/CSS Inliner: http://foundation.zurb.com/emails/inliner-v2.html
 */

'use strict';

// ENV variables
const {
  NODE_ENV,
  MAILER_DOMAIN,
  MAILER_HOST,
  MAILER_PORT,
  MAILER_SECURE,
  MAILER_AUTH_USER,
  MAILER_AUTH_PASS
} = process.env;

// built-in
const path = require('path');

// third-party
const ejs = require('ejs');
const nodemailer = require('nodemailer'); // https://nodemailer.com/about/
const htmlToText = require('html-to-text'); // https://www.npmjs.com/package/html-to-text

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
  BLOCKED_EMAILS,

  // Any default emails to use
  emails: {
    support: { address: `support@${MAILER_DOMAIN}`, name: 'Support' },
    welcome: { address: `welcome@${MAILER_DOMAIN}`, name: 'Welcome' },
    storage: { address: `storage@${MAILER_DOMAIN}`, name: 'Storage' },
    errors: { address: `errors@${MAILER_DOMAIN}`, name: 'Errors' },
    doNotReply: { address: `donotreply@${MAILER_DOMAIN}`, name: 'Do Not Reply' }
  },

  // functions
  dmarc,
  send
};

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

/**
 * Send a custom email
 * !NOTE: ARGS must be all STRING values
 *
 * @params {
 *   @from - (STRING - REQUIRED): Where this email is from (email)
 *   @name - (STRING - REQUIRED): Where this email is from (name)
 *   @subject - (STRING - REQUIRED): The subject of the email
 *   @template - (STRING - REQUIRED): The template file to send in mailers
 *   @tos - (STRING ARRAY - REQUIRED): Array of emails to send to
 *   @ccs - (STRING ARRAY - OPTIONAL): Array of emails to CC
 *   @bccs - (STRING ARRAY - OPTIONAL): Array of emails to BCC
 *   @attachments - (OBJECT ARRAY - OPTIONAL): Any attachments. Docs: https://nodemailer.com/message/attachments/
 *   @args - (OBJECT - OPTIONAL): The variables to pass to the email template (refer to args in template using -arg- syntax). MUST BE ALL STRING VALUES
 * }
 */
async function send({ from, name, subject, template, tos, ccs, bccs, attachments, args }) {
  return new Promise((resolve, reject) => {
    // validate from, subject, template
    if (typeof from !== 'string' || typeof name !== 'string' || typeof subject !== 'string' || typeof template !== 'string') {
      return reject(new Error('Email must have a from, name, subject, and template in order to send.'));
    }

    // check to see if from field violates the DMARC policy
    let extension = dmarc(from);
    if (extension) {
      return reject(new Error(`Cannot send an email from a "${extension}" domain because it violates the DMARC policy.`));
    }

    // validate tos
    if (tos === null || tos === undefined || tos.length === 0) {
      return reject(new Error('Email must be sent to at least one recipient.'));
    }

    // set ccs to empty array if not specified
    if (ccs === null || ccs === undefined) {
      ccs = [];
    }

    // set bccs to empty array if not specified
    if (bccs === null || bccs === undefined) {
      bccs = [];
    }

    // set attachments to empty array if not specified
    if (attachments === null || attachments === undefined) {
      attachments = [];
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
    ejs.renderFile(path.join(__dirname, `../mailers/${template}/index.ejs`), args, async (err, rawHtml) => {
      if (err) {
        return reject(err);
      }

      // create message
      // Docs: https://nodemailer.com/message/addresses/
      let message = {
        from: {
          name: name,
          address: from
        },
        to: tos,
        ccs: ccs,
        bccs: bccs,
        attachments: attachments,
        subject: subject,
        text: htmlToText.convert(rawHtml), // convert the html to text
        html: rawHtml
      };

      // send email
      try {
        let transporter = nodemailer.createTransport({
          host: MAILER_HOST,
          port: MAILER_PORT,
          secure: Boolean(MAILER_SECURE), // true for 465, false for other ports
          auth: {
            user: MAILER_AUTH_USER, // generated ethereal user
            pass: MAILER_AUTH_PASS, // generated ethereal password
          }
        });

        // send mail with defined transport object
        let info = await transporter.sendMail(message);
        return resolve(info);
      } catch (error) {

        // return error
        return reject(error);
      }
    }); // END convert file
  });
} // END send

module.exports = emailObj;
