/**
 * All global constant variables in this file
 * !IMPORTANT: All variables must be in UPPER CASE with underscores. This allows us to know when we are dealing with a global constant variable.
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
  LOCALE: { EN: 'en' }, // keys are UPPER_CASE per the constant convention; values are the locale codes
  LOCALES: ['en'], // first index is the default language

  LANGUAGE: { ENGLISH: 'English' },
  LANGUAGES: ['English'], // the languages in English

  // Generic user roles — extend per project as needed
  ROLE: { ADMIN: 'admin', USER: 'user' },
  ROLES: ['admin', 'user'],

  // Generic record statuses
  STATUS: { ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending', DELETED: 'deleted' },
  STATUSES: ['active', 'inactive', 'pending', 'deleted'],

  // Client KIND — the security-relevant boundary: browser/cookie client ('web') vs native/token client ('app').
  // A native desktop app (macOS/Windows) is 'app', just like mobile. A web dashboard (even on desktop) is 'web'.
  // Signalled by the X-Client header at login; defaults to WEB if absent/unknown.
  CLIENT: { WEB: 'web', APP: 'app' },
  CLIENTS: ['web', 'app'], // valid X-Client header values

  // Platform — descriptive OS/device metadata (NOT a security boundary). Stored on the session for
  // analytics / per-platform session management. Signalled by the X-Platform header; defaults to WEB.
  PLATFORM: { WEB: 'web', IOS: 'ios', ANDROID: 'android', IPADOS: 'ipados', MACOS: 'macos', WINDOWS: 'windows' },
  PLATFORMS: ['web', 'ios', 'android', 'ipados', 'macos', 'windows'], // valid X-Platform header values

  // Access-token audience (aud claim) per user type AND client KIND. Stable app identifiers (NOT env-specific).
  // Minted in createAccessToken (one specific value) and enforced in the JWT strategies as the ARRAY of a
  // type's client audiences — so a jwt-user token from web OR app both authenticate against the user API.
  TOKEN_AUDIENCE: {
    USER: { WEB: 'user-web', APP: 'user-app' }
  },

  // Token types
  TOKEN_TYPE: { ACCESS: 'access', REFRESH: 'refresh' },
  TOKEN_TYPES: ['access', 'refresh'],

  // moment.js formats
  DATE_TIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  DATE_TIME_FORMAT_Z: 'YYYY-MM-DD HH:mm:ss z',
  DATE_TIME_FORMAT_ISO: 'YYYY-MM-DDTHH:mm:ss', // ISO 8601 format without timezone (e.g., '2025-01-15T09:00:00')
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
  LIST_STRING_UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(,\s*[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})*$/i, // regex for a comma-separated list of UUIDs v4
  DATE_FORMAT_REGEX: /^\d{4}-\d{2}-\d{2}$/, // regex for a date in YYYY-MM-DD format
  DATE_TIME_FORMAT_ISO_REGEX: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, // regex for ISO 8601 datetime without timezone (e.g., '2025-01-15T09:00:00')
  TIME_FORMAT_REGEX: /^\d{2}:\d{2}$/, // regex for a time in HH:MM format

  // Passwords: For PCI Compliance
  PASSWORD_LENGTH_MIN: 12, // minimum of 12 characters for passwords
  // bcrypt work factor (cost). Hashing time grows EXPONENTIALLY with this number — keep it a
  // deliberate value (10–12 is the common range), NEVER tie it to password length. Raising it
  // re-hashes only on the next password change; existing hashes carry their own cost.
  BCRYPT_ROUNDS: 12,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{12,})/, // Password must contain at least 1 lowercase alphabetical character, at least 1 uppercase alphabetical character, at least 1 numeric character, at least one special character, and must be at least 12 characters in length.

  // Genders
  GENDER: { MALE: 'MALE', FEMALE: 'FEMALE', OTHER: 'OTHER' },
  GENDERS: ['MALE', 'FEMALE', 'OTHER']
};
