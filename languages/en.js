/**
 * Global Language File: English
 *
 * This file holds all English language messages for all features globally.
 * services/language.js compiles all locales from each individual feature and places
 * the file locale for each language in the locales folder.
 */

'use strict';

module.exports = {
  'GLOBAL[language]': 'English',
  'GLOBAL[welcome]': 'Welcome',

  'GLOBAL[invalid_arguments]': 'One or more request arguments are invalid.',
  'GLOBAL[unauthorized]': 'You do not have permission to make this request.',
  'GLOBAL[forbidden]': 'You do not have the required role to perform this action.',
  'GLOBAL[not_found]': 'The requested resource could not be found.',
  'GLOBAL[internal_server_error]': 'Oops... something went wrong.',
  'GLOBAL[service_unavailable]': 'Server is in the process of shutting down or restarting.',
  'GLOBAL[validation_error]': 'Validation failed. Please check your input and try again.',
  'GLOBAL[too_many_requests]': 'Too many requests. Please slow down and try again later.',
  'GLOBAL[conflict]': 'A conflict occurred with the current state of the resource.',

  'USER[login_success]': 'Logged in successfully.',
  'USER[login_invalid]': 'Invalid email or password.',
  'USER[logout_success]': 'Logged out successfully.',
  'USER[token_invalid]': 'Your session token is invalid or has expired.',
  'USER[token_refreshed]': 'Session token refreshed successfully.',
  'USER[account_not_found]': 'No account was found with that email address.',
  'USER[account_already_exists]': 'An account with that email address already exists.',
  'USER[account_inactive]': 'This account is inactive. Please contact support.',
  'USER[password_changed]': 'Password changed successfully.',
  'USER[password_incorrect]': 'The current password you entered is incorrect.',

  'ADMIN[login_success]': 'Logged in successfully.',
  'ADMIN[login_invalid]': 'Invalid email or password.',
  'ADMIN[logout_success]': 'Logged out successfully.',
  'ADMIN[token_invalid]': 'Your session token is invalid or has expired.',
  'ADMIN[token_refreshed]': 'Session token refreshed successfully.',
  'ADMIN[account_not_found]': 'No account was found with that email address.',
  'ADMIN[account_already_exists]': 'An account with that email address already exists.',
  'ADMIN[account_inactive]': 'This account is inactive.',
  'ADMIN[password_changed]': 'Password changed successfully.',
  'ADMIN[password_incorrect]': 'The current password you entered is incorrect.'
};
