/**
 * All global constant variables in this file
 * !IMPORTANT: All variables must be in UPPER CASE with underscores
 *
 * !IMPORTANT: For Arrays and Objects
 * - Use Plural word to represent an Array. e.g. LANGUAGES
 * - Use Singular word to reprent an Object. e.g. LANGUAGE
 *                    OR
 * - Append key name with "_ARR" to represent an Array. e.g. LANGUAGE_ARR
 * - Append key name with "_OBJ" to represent an Object. e.g. LANGUAGE_OBJ
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

module.exports = {
  // Languages & Locales
  LOCALE: { en: 'en' },
  LOCALES: ['en'], // first index is the default language
  LANGUAGE: { ENGLISH: 'English' },
  LANGUAGES: ['English'], //the languages in english

  // moment.js formats
  DATE_TIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  DATE_TIME_FORMAT_Z: 'YYYY-MM-DD HH:mm:ss z',
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss',

  // Days
  DAYS_FULL: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  DAYS_HALF: ['mon', 'tues', 'wed', 'thur', 'fri', 'sat', 'sun'],
  DAYS_SHORT: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'],
  DAYS_SINGLE: ['m', 'tu', 'w', 'th', 'f', 'sa', 'su'],

  // Regex for joi validations
  LIST_INT_REGEX: /^\d+([,]\d+)*$/, // regex for a list integer 1,2,3,456,78
  LIST_INT_REGEX_EMPTY: /^$|^\d+([,]\d+)*$/, // regex for a list integer 1,2,3,456,78 or ''
  LIST_STRING_REGEX: /^(\w|\s|\&|\/)+([,](\w|\s|\&|\/)+)*$/, // regex for a list string 1,2,3,456,78
  LIST_STRING_REGEX_EMPTY: /^$|^(\w|\s)+([,](\w|\s)+)*$/, // regex for a list string 1,2,3,456,78 or ''
  LIST_STRING_AT_REGEX_EMPTY: /^$|^(\w|\s|@|\.)+([,](\w|\s|@|\.)+)*$/, // regex for a list string 1,2,3,456,@78 or ''

  // Passwords: For PCI Compliance
  PASSWORD_LENGTH_MIN: 12, // minimum of 12 characters for passwords
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{12,})/, // Password must contain at least 1 lowercase alphabetical character, at least 1 uppercase alphabetical character, at least 1 numeric character, at least one special character, and must be at least 12 characters in length.

  // Genders
  GENDER: { MALE: 'MALE', FEMALE: 'FEMALE', OTHER: 'OTHER' },
  GENDERS: ['MALE', 'FEMALE', 'OTHER']
};
