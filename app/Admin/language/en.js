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
  'ADMIN[Welcome]': 'Welcome',

  // V1Login
  'ADMIN[Invalid Login Credentials]': 'The email and/or password you entered is incorrect.',
  'ADMIN[Admin Account Inactive]': 'Admin account is inactive.',
  'ADMIN[Admin Account Deleted]': 'Admin account has been deleted.',

  // V1Read
  'ADMIN[Admin Account Does Not Exist]': 'Admin account does not exist.',

  // V1Create
  'ADMIN[Terms of Service Not Accepted]': 'You must agree to our Terms of Service.',
  'ADMIN[Admin Already Exists]': 'Admin user already exists.',
  'ADMIN[Invalid Time Zone]': 'Time Zone is invalid.',

  // V1ConfirmPassword
  'ADMIN[Invalid Password Reset Token]': 'Invalid password reset token or reset token has expired.',
  'ADMIN[Invalid Password Format]': 'Password must contain at least 1 lowercase letter, at least 1 uppercase letter, at least 1 number, at least one symbol (!@#$%^&*), and must be at least eight characters in length.',
  'ADMIN[Passwords Not Equal]': 'The passwords entered do not match.',

  // V1UpdateEmail
  'ADMIN[Same Email]': 'Your new email cannot be the same as your current email.',
  'ADMIN[Email Already Taken]': 'The new email you entered is already taken.',

  // V1UpdatePassword
  'ADMIN[Password Authentication Failed]': 'Original password entered is incorrect.'
};
