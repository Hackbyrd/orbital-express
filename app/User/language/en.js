/**
 * User Language File: English
 *
 * This file holds all English language translations for the User feature.
 * This file is compiled by /services/language.js to generate the final English locale
 * All English translations aggregated from all features can be found in /locales/en.json
 */

'use strict';

module.exports = {
  // Global
  'USER[Welcome]': 'Welcome',

  // V1Login
  'USER[Invalid Login Credentials]': 'The email and/or password you entered is incorrect.',
  'USER[User Account Inactive]': 'User account is inactive.',
  'USER[User Account Deleted]': 'User account has been deleted.',

  // V1Read
  'USER[User Account Does Not Exist]': 'User account does not exist.',

  // V1Create
  'USER[Terms of Service Not Accepted]': 'You must agree to our Terms of Service.',
  'USER[User Already Exists]': 'User already exists.',
  'USER[Invalid Time Zone]': 'Time Zone is invalid.',

  // V1ConfirmPassword
  'USER[Invalid Password Reset Token]': 'Invalid password reset token or reset token has expired.',
  'USER[Invalid Password Format]': 'Password must contain at least 1 lowercase letter, at least 1 uppercase letter, at least 1 number, at least one symbol (!@#$%^&*), and must be at least eight characters in length.',
  'USER[Passwords Not Equal]': 'The passwords entered do not match.',

  // V1UpdateEmail
  'USER[Same Email]': 'Your new email cannot be the same as your current email.',
  'USER[Email Already Taken]': 'The new email you entered is already taken.',

  // V1UpdatePassword
  'USER[Password Authentication Failed]': 'Original password entered is incorrect.'
};
