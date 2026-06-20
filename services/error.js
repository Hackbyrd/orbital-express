/**
 * Client Error Service:
 *
 * For Better Client 4xx Error Handling
 */

'use strict';

// ENV variables
const { NODE_ENV, MOBILE_DEEPLINK_AUTH_CALLBACK } = process.env;

// require built-in node modules
const fs = require('fs');
const path = require('path');

// third-party node modules
const moment = require('moment-timezone');

// services
// const email = require('./email'); // removed cuz of circular dependency, email requires error, error requires email

// variables
const APP_DIR = '../app'; // app directory
const ERROR_FILE = 'error.js'; // the error file name

/**
 * Global Error Codes
 *
 * Error code object contains one error code and multiple messages because you may want to choose different messages and not always use the same one.
 * You can choose which message you want to use by passing in the message index to the errorResponse method
 * Add more custom global error codes here
 */
const ERROR_CODES = {
  BAD_REQUEST_INVALID_ARGUMENTS: {
    error: 'BAD_REQUEST_INVALID_ARGUMENTS',
    status: 400,
    messages: ['GLOBAL[invalid_arguments]']
  },

  UNAUTHORIZED: {
    error: 'UNAUTHORIZED',
    status: 401,
    messages: ['GLOBAL[unauthorized]']
  },

  FORBIDDEN: {
    error: 'FORBIDDEN',
    status: 403,
    messages: ['GLOBAL[forbidden]']
  },

  INTERNAL_SERVER_ERROR: {
    error: 'INTERNAL_SERVER_ERROR',
    status: 500,
    messages: ['GLOBAL[internal_server_error]']
  },

  SERVICE_UNAVAILABLE: {
    error: 'SERVICE_UNAVAILABLE',
    status: 503,
    messages: ['GLOBAL[service_unavailable]']
  }

  //-- ADD MORE ERROR CODES BELOW --//
};

// check if is directory and get directories
const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
const directories = getDirectories(path.join(__dirname, APP_DIR));

// add each error to models object
directories.forEach(dir => {
  fs.readdirSync(dir)
    .filter(file => file === ERROR_FILE)
    .forEach(file => {
      // read error file
      const LOCAL_ERROR_CODES = require(`${dir}/${ERROR_FILE}`);

      // add local error codes to global error codes
      Object.keys(LOCAL_ERROR_CODES).forEach(key => {
        ERROR_CODES[key] = LOCAL_ERROR_CODES[key];
      });
    });
});

// export
module.exports = {
  ERROR_CODES,
  errorResponse,
  errorResponseGoogleApiMobile,
  errorResponseRollback,
  joiErrorsMessage,
  queueError
};

/**
 * Formats a standardized error response object to return to the client.
 *
 * Returns: { success: false, status, error, message }
 *   - error:   machine-readable code (e.g. 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS') — frontend branches on this
 *   - message: human-readable translated string — frontend displays this
 *
 * @i18n - (OBJECT - REQUIRED): The language library. Pass `req` in actions (i18n middleware attaches __() to it).
 *   Pass a getLocalI18n() instance in tasks and services.
 * @errorCode - (ERROR_CODE OBJECT - REQUIRED): An entry from ERROR_CODES. Provides .error, .status, and .messages[].
 * @errorMessage - (NUMBER | STRING - OPTIONAL) [DEFAULT - 0]:
 *   NUMBER — index into errorCode.messages[] to select which translation key to use.
 *            Defaults to 0 (first message). Use a higher index when the same error code
 *            has multiple phrasings and you need an alternate one.
 *   STRING — used verbatim as the message, bypassing the messages array entirely.
 *            Use this for Joi error strings (joiErrorsMessage) or any fully-formed custom message.
 * @statusCode - (NUMBER - OPTIONAL): Overrides errorCode.status if you need a different HTTP status for the same error.
 */
function errorResponse(i18n, errorCode, errorMessage = 0, statusCode) {
  let message;
  if (typeof errorMessage === 'number') {
    const key = errorCode.messages[errorMessage];
    if (!key) throw new Error(`errorResponse: messages index ${errorMessage} out of bounds for error code "${errorCode.error}" (has ${errorCode.messages.length} message(s))`);
    message = i18n.__(key);
  } else {
    message = errorMessage;
  }

  return {
    success: false,
    status: statusCode || errorCode.status,
    error: errorCode.error,
    message
  };
}

/**
 * Rolls back an open database transaction, then returns the same standardized error response as errorResponse().
 * Use this any time you open a Sequelize transaction and hit an error before the commit.
 *
 * Returns: { success: false, status, error, message }
 *
 * @databaseTransaction - (OBJECT - REQUIRED): The open Sequelize transaction to roll back.
 * @i18n - (OBJECT - REQUIRED): The language library. Pass `req` in actions, getLocalI18n() in tasks/services.
 * @errorCode - (ERROR_CODE OBJECT - REQUIRED): An entry from ERROR_CODES. Provides .error, .status, and .messages[].
 * @errorMessage - (NUMBER | STRING - OPTIONAL) [DEFAULT - 0]:
 *   NUMBER — index into errorCode.messages[] to select which translation key to use.
 *   STRING — used verbatim as the message, bypassing the messages array entirely.
 * @statusCode - (NUMBER - OPTIONAL): Overrides errorCode.status if you need a different HTTP status for the same error.
 *
 * TODO: Test
 */
async function errorResponseRollback(databaseTransaction, i18n, errorCode, errorMessage = 0, statusCode) {
  try {
    // rollback database transaction passed in
    await databaseTransaction.rollback();

    // return error response
    return errorResponse(i18n, errorCode, errorMessage, statusCode);
  } catch (error) {
    throw error;
  }
}

/**
 * For Google API error response on mobile, returns an object with redirect to mobile app deep link
 *
 * @i18n - (OBJECT - REQUIRED): the language library
 * @errorCode - (ERROR_CODE OBJECT - REQUIRED): the error code to use
 * @errorMessage - (STRING/NUMBER - OPTIONAL) [DEFAULT - 0]: A custom message to override default message. SHOULD NOT have i18n language wrapper because it should be called outside of this function. If int, then use the messages array to get the correct error message
 * @statusCode - (NUMBER - OPTIONAL): the http status code, 400, to override the default
 *
 * return { status, redirect }
 *
 * TODO: Test
 */
async function errorResponseGoogleApiMobile(i18n, errorCode, errorMessage = 0, statusCode) {
  const success = false;
  const status = statusCode || errorCode.status;
  const error = errorCode.error;
  const message = typeof errorMessage === 'number' ? i18n.__(errorCode.messages[errorMessage]) : errorMessage;
  const encodedMessage = encodeURIComponent(message);

  return {
    status: 302, // for redirect
    redirect: `${MOBILE_DEEPLINK_AUTH_CALLBACK}?success=${success}&status=${status}&error=${error}&message=${encodedMessage}`
  };
} // END errorResponseGoogleApiMobile

/**
 * Combine error messages into one string from joi errors object
 *
 * @errors (ARRAY OBJECTS - REQUIRED): The error message ex. { details: [{ message: '' }, { message: '' }] }
 *
 * return combined message
 * return null if no errors
 *
 * TODO: Test
 */
function joiErrorsMessage(errors) {
  if (!errors)
    return null;

  // if joi's error message object
  if (errors.details)
    return errors.details.map(e => e.message).join(', ');

  // our custom message
  else
    return errors.message;
}

/**
 * Executes when any queue runs into an error
 *
 * @error (ERROR OBJECT - REQUIRED): The error message
 * @queue (OBJECT - REQUIRED): The queue object: queue.name
 * @job (OBJECT - REQUIRED): The job object: job.id, job.data, job.name
 *
 * TODO: Test
 */
async function queueError(error, queue, job) {
  // Distinguish a RETRYABLE failure (Bull will retry per defaultJobOptions.attempts) from a
  // FINAL failure (all attempts exhausted). Only the final failure is genuinely lost work — so
  // that's the one worth alerting/paging on. (A 'stalled'/'error' event passes no job → treat as final.)
  const attempts = (job && job.opts && job.opts.attempts) || 1;
  const isFinalFailure = job ? job.attemptsMade >= attempts : true;

  console.error(
    `[queue] ${(queue && queue.name) || 'unknown'} job ${(job && job.id) || 'n/a'} ` +
    (isFinalFailure ? 'FINAL FAILURE' : `failed (attempt ${job.attemptsMade}/${attempts}, will retry)`) + ':',
    error
  );

  // Escalate ONLY on final failure. This is the single place to wire error monitoring for the
  // whole worker fleet (every feature's failed/stalled/error handlers route here).
  if (isFinalFailure) {
    // TODO (Sentry): Sentry.captureException(error, {
    //   extra: { queue: queue && queue.name, jobId: job && job.id, jobData: job && job.data, attemptsMade: job && job.attemptsMade }
    // });

    // send email in production (until Sentry is wired)
    // if (NODE_ENV === 'production') {
    //   await email.send({
    //     from: email.emails.error.address,
    //     name: email.emails.error.name,
    //     subject: 'URGENT! Background job FINAL FAILURE',
    //     template: 'ErrorQueue',
    //     tos: [email.emails.error.address],
    //     ccs: null,
    //     bccs: null,
    //     args: { time: moment.tz('US/Pacific').format('LLLL'), error, queue, job }
    //   }).catch(err => console.error(err));
    // }
  }

  return Promise.resolve();
}
