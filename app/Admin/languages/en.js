/**
 * Admin Language File: English
 *
 * This file holds all English language translations for the Admin feature.
 * This file is compiled by /services/language.js to generate the final English locale
 * All English translations aggregated from all features can be found in /locales/en.json
 */

'use strict';

module.exports = {
  // Global
  'ADMIN[welcome]': 'Welcome',

  // V1Login
  'ADMIN[invalid_login_credentials]': 'The email and/or password you entered is incorrect.',
  'ADMIN[admin_account_inactive]': 'Admin account is inactive.',
  'ADMIN[admin_account_deleted]': 'Admin account has been deleted.',

  // V1Read
  'ADMIN[admin_account_does_not_exist]': 'Admin account does not exist.',

  // V1Create
  'ADMIN[terms_of_service_not_accepted]': 'You must agree to our Terms of Service.',
  'ADMIN[admin_already_exists]': 'Admin user already exists.',
  'ADMIN[invalid_time_zone]': 'Time Zone is invalid.',

  // V1ResetPassword
  'ADMIN[reset_email_subject]': 'Your password has been changed. Please confirm.',
  'ADMIN[reset_email_success_message]': 'An email has been sent to {{email}}. Please check your email to confirm your new password change.',

  // V1ConfirmPassword
  'ADMIN[invalid_password_reset_token]': 'Invalid password reset token or reset token has expired.',
  'ADMIN[invalid_password_format]': 'Password must contain at least 1 lowercase letter, at least 1 uppercase letter, at least 1 number, at least one symbol (!@#$%^&*), and must be at least eight characters in length.',
  'ADMIN[passwords_not_equal]': 'The passwords entered do not match.',

  // V1UpdateEmail
  'ADMIN[same_email]': 'Your new email cannot be the same as your current email.',
  'ADMIN[email_already_taken]': 'The new email you entered is already taken.',

  // V1UpdatePassword
  'ADMIN[password_authentication_failed]': 'Original password entered is incorrect.'
};
