/**
 * ADMIN V1ResetPassword ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV, ADMIN_WEB_HOSTNAME } = process.env;

// third-party node modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md
const moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/

// services
const email = require('../../../services/email');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { randomString } = require('../../../helpers/logic');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1ResetPassword
}

/**
 * Reset Password
 *
 * GET  /v1/admins/resetpassword
 * POST /v1/admins/resetpassword
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 *
 * Must be logged out
 * Roles: []
 *
 * req.params = {}
 * req.args = {
 *   @email - (STRING - REQUIRED): The email of the user
 * }
 *
 * Success: Return true
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1ResetPassword(req, res) {
  const schema = joi.object({
    email: joi.string().trim().lowercase().min(3).email().required(),
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // grab admin with this email
  try {
    const findAdmin = await models.admin.findOne({
      where: {
        email: req.args.email
      }
    });

    // if admin cannot be found
    if (!findAdmin)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

    // update the locale since it was updated in the auth middleware because this route is called while being logged out
    req.setLocale(findAdmin.locale);
    res.setLocale(findAdmin.locale);

    // preparing for reset
    const passwordResetToken = randomString();
    const passwordResetExpire = moment.tz('UTC').add(6, 'hours'); // add 6 hours from now

    // update admin
    await models.admin.update({
      passwordResetToken: passwordResetToken,
      passwordResetExpire: passwordResetExpire
    }, {
      fields: ['passwordResetToken', 'passwordResetExpire'], // only these fields
      where: {
        email: req.args.email
      }
    });

    // create reset URL using front end url
    const resetLink = `${ADMIN_WEB_HOSTNAME}/confirm-password?passwordResetToken=${passwordResetToken}`;

    // add email notification to email queue to send email
    await email.enqueue({
      from: email.EMAILS.SUPPORT.address,
      name: email.EMAILS.SUPPORT.name,
      subject: req.__('ADMIN[reset_email_subject]'), // reset email subject
      template: 'Admin.AdminResetPassword', // must prepend with 'Admin.' since this is an admin email template
      tos: [req.args.email],
      ccs: null,
      bccs: null,
      args: {
        i18n: req.__, // this is i18n function for templates to use for language translations
        resetPasswordConfirmationLink: resetLink,
        expires: '6 hours'
      }
    });

    // return success
    return {
      status: 200,
      success: true,
      message: req.__('ADMIN[reset_email_success_message]', { email: req.args.email }),
      resetLink: NODE_ENV === 'production' ? null : resetLink // In production, DO NOT return reset link. Only return reset link in dev and test env for testing purposes.
    };
  } catch (error) {
    throw error;
  }
} // END V1ResetPassword
