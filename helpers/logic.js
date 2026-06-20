/**
 * All logic helper functions
 */

'use strict';

// ENV variables
const {
  HOSTNAME,
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
} = process.env;

// require built-in node modules
const crypto = require('crypto');

// require third-party node modules
const jsonwebtoken = require('jsonwebtoken'); // modern JWT signing/verification with exp/iss/aud enforcement

// require custom node modules
const { TOKEN_AUDIENCE, CLIENT, CLIENTS, PLATFORM, PLATFORMS } = require('./constants');

module.exports = {
  randomString,
  createAccessToken,
  createRefreshToken,
  hashToken,
  parseDurationMs,
  getRefreshTokenExpiresAt,
  resolveClient,
  resolvePlatform,
  getTokenAudience,
  removeAllWhiteSpace,
  convertJSONStringsToJSObjects,
  getUnixTimeFromDatabaseTimestamp,
  getDirectories,
  heapsort,
  canAccess
};

/**
 * Return a random string
 *
 * @len (NUMBER - OPTIONAL) [DEFAULT - 64]: Length of the string being returned.
 * @pre (STRING - OPTIONAL) [DEFAULT - '']: String to be prepended to the string being returned.
 * @post (STRING - OPTIONAL) [DEFAULT - '']: String to be appened to the string being returned.
 * @lowercase (BOOLEAN - OPTIONAL) [DEFAULT - true]: Whether string should include lowercase characters
 * @uppercase (BOOLEAN - OPTIONAL) [DEFAULT - true]: Whether string should include uppercase characters
 * @numbers (BOOLEAN - OPTIONAL) [DEFAULT - true]: Whether string should include number characters
 * @special (BOOLEAN - OPTIONAL) [DEFAULT - true]: Whether string should include special characters
 */
function randomString({ len, pre, post, lowercase, uppercase, numbers, special } = {}) {
  const lowercaseCharacters = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const numberCharacters = '0123456789';
  const specialCharacters = '!$/%@#';

  let characters = '';
  let text = ''; // the random string

  // set defaults
  len = typeof len !== 'number' ? 64 : len;
  pre = typeof pre !== 'string' ? '' : pre;
  post = typeof post !== 'string' ? '' : post;
  lowercase = typeof lowercase !== 'boolean' ? true : lowercase;
  uppercase = typeof uppercase !== 'boolean' ? true : uppercase;
  numbers = typeof numbers !== 'boolean' ? true : numbers;
  special = typeof special !== 'boolean' ? false : special;

  // assemble what characters can be used
  if (lowercase) characters += lowercaseCharacters;
  if (uppercase) characters += uppercaseCharacters;
  if (numbers) characters += numberCharacters;
  if (special) characters += specialCharacters;

  // generate random text
  for (let i = 0; i < len; i++) text += characters.charAt(Math.floor(Math.random() * characters.length));

  return pre + text + post;
}

/**
 * Create a short-lived ACCESS TOKEN (stateless JWT).
 *
 * Signed with ACCESS_TOKEN_SECRET and expires after ACCESS_TOKEN_EXPIRES_IN (e.g. '15m').
 * issuer/audience are set as real JWT claims so the JwtStrategy can VERIFY them (not just decorate).
 * tokenVersion is embedded so bumping User/Admin.tokenVersion instantly invalidates all access tokens.
 *
 * @user - (OBJECT - REQUIRED): the authenticated record. Must have .id and .tokenVersion
 * @audience - (STRING - REQUIRED): the intended client/audience (e.g. the web host this token is for)
 * @type - (STRING - REQUIRED): the user type, matches the auth scheme suffix ('user', 'admin', ...)
 *
 * return: signed JWT string
 */
function createAccessToken(user, audience, type) {
  return jsonwebtoken.sign({
    sub: user.id,
    type, // 'user' | 'admin' | ...
    tokenVersion: user.tokenVersion ?? 0 // checked in the JwtStrategy for instant revocation (default 0 if caller passed a partial record)
  }, ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256', // pin explicitly; the verifier only accepts HS256 (see services/passport.js)
    expiresIn: ACCESS_TOKEN_EXPIRES_IN, // e.g. '15m' — jsonwebtoken sets iat & exp automatically
    issuer: HOSTNAME,
    audience
  });
} // END createAccessToken

/**
 * Create a REFRESH TOKEN — an opaque, high-entropy random string (NOT a JWT).
 *
 * The raw value is returned to the caller exactly once (to send to the client). Only its
 * SHA-256 hash (via hashToken) is stored in the session table, so a DB leak never exposes
 * usable refresh tokens. Refresh tokens are revocable because they live server-side.
 *
 * return: raw refresh token string (64 hex chars / 256 bits of entropy)
 */
function createRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
} // END createRefreshToken

/**
 * Hash a token (e.g. a refresh token) for storage / lookup.
 *
 * Uses SHA-256 (fast) rather than bcrypt — refresh tokens are already high-entropy random
 * values, so a slow password hash is unnecessary. Store and compare only the hash.
 *
 * @raw - (STRING - REQUIRED): the raw token to hash
 *
 * return: hex-encoded SHA-256 hash
 */
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
} // END hashToken

/**
 * Parse a short duration string (e.g. '15m', '60d') into milliseconds.
 * Supports s (seconds), m (minutes), h (hours), d (days).
 *
 * @str - (STRING - REQUIRED): the duration, e.g. '60d'
 *
 * return: milliseconds (NUMBER)
 */
function parseDurationMs(str) {
  const match = String(str).trim().match(/^(\d+)([smhd])$/);
  if (!match)
    throw new Error(`parseDurationMs: invalid duration "${str}" (expected e.g. '15m', '60d')`);

  const amount = Number(match[1]);
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[match[2]];
  return amount * unitMs;
} // END parseDurationMs

/**
 * Compute the absolute expiry Date for a new refresh token, based on REFRESH_TOKEN_EXPIRES_IN.
 *
 * return: Date when the refresh token should expire
 */
function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + parseDurationMs(REFRESH_TOKEN_EXPIRES_IN));
} // END getRefreshTokenExpiresAt

/**
 * Resolve which client app a request is coming from, via the X-Client header.
 * Defaults to 'web' when the header is absent or not a recognized client.
 *
 * @req - (OBJECT - REQUIRED): the express request
 *
 * return: a value from CLIENTS ('web' | 'mobile')
 */
function resolveClient(req) {
  const raw = ((req && req.headers && req.headers['x-client']) || '').toString().toLowerCase().trim();
  return CLIENTS.includes(raw) ? raw : CLIENT.WEB;
} // END resolveClient

/**
 * Resolve the platform/OS a request is coming from, via the X-Platform header.
 * Descriptive metadata only (NOT a security boundary). Defaults to 'web' when absent/unknown.
 *
 * @req - (OBJECT - REQUIRED): the express request
 *
 * return: a value from PLATFORMS ('web' | 'ios' | 'android' | 'ipados' | 'macos' | 'windows')
 */
function resolvePlatform(req) {
  const raw = ((req && req.headers && req.headers['x-platform']) || '').toString().toLowerCase().trim();
  return PLATFORMS.includes(raw) ? raw : PLATFORM.WEB;
} // END resolvePlatform

/**
 * Look up the access-token audience for a user type + client.
 * Falls back to the type's WEB audience if the client is unknown.
 *
 * @type - (STRING - REQUIRED): 'user' | 'admin'
 * @client - (STRING - REQUIRED): 'web' | 'mobile'
 *
 * return: the audience string (e.g. 'user-mobile')
 */
function getTokenAudience(type, client) {
  const group = TOKEN_AUDIENCE[String(type).toUpperCase()];
  if (!group)
    throw new Error(`getTokenAudience: unknown user type "${type}"`);

  return group[String(client).toUpperCase()] || group.WEB;
} // END getTokenAudience

/**
 * Removes all white space, tabs and newlines in a string
 *
 * @str (STRING - REQUIRED): String to remove white space from
 *
 * return new string with all white spaces removed
 */
function removeAllWhiteSpace(str) {
  return str
    .replace(/ /g, '')
    .replace(/\n/g, '')
    .replace(/\t/g, '');
}

/**
 * Takes an object and selected keys to convert from JSON string to js objects
 *
 * @obj (OBJECT): the object of keys and their string values
 * @keysToConvertArray (ARRAY STRING): the name of the keys to convert from JSON string to js objects
 *
 * return { success: true, result }
 * error { success: false, error }
 *
 * TODO: TEST
 */
function convertJSONStringsToJSObjects(obj, keysToConvertArray) {
  // go through each key and convert
  for (let i = 0; i < keysToConvertArray.length; i++) {
    // must be a string in the first place before we can convert, if undefined, then skip
    if (typeof obj[keysToConvertArray[i]] === 'string') {
      try {
        obj[keysToConvertArray[i]] = JSON.parse(obj[keysToConvertArray[i]]);
      } catch (error) {
        return {
          success: false,
          error: new Error(keysToConvertArray[i] + ' is not in a valid JSON string format.')
        }
      }
    }
  }

  return {
    success: true,
    result: obj
  };
}

// takes in a data obj timestamp from the database and returns the unix timestamp
function getUnixTimeFromDatabaseTimestamp(dateObjFromDatabase) {
  if (!Date.prototype.getUnixTime)
    Date.prototype.getUnixTime = function() {
      return (this.getTime() / 1000) | 0;
    };

  return new Date(dateObjFromDatabase).getUnixTime();
}

/**
 * Get all directories in a path
 * @path (STRING - REQUIRED): the path to get all directories from
 *
 * return array of directories
 *
 * TODO: TEST
 */
function getDirectories(path) {
  // check if path is a directory
  const isDirectory = source => fs.lstatSync(source).isDirectory();
  // get all directories in a path
  const getDirectoriesFn = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);

  // return an array of directories
  return getDirectoriesFn(path);
}

/**
 * Heapsort an array from least to greatest
 *
 * @array (ARRAY OBJECTS): Array of objects to sort
 * @comparator(a, b) (FUNCTION OBJECT): that takes in two objects to compare. a < b = -1, a === b = 0, a > b = 1
 *
 * return new sorted array
 */
function heapsort(array, comparator) {
  let arrayLength; // used in buildHeap and heapify

  function buildHeap(arr) {
    arrayLength = arr.length;

    for (let i = Math.floor(arrayLength / 2); i >= 0; i -= 1)
      heapify(arr, i);
  }

  function heapify(arr, i) {
    let left = 2 * i + 1;
    let right = 2 * i + 2;
    let largest = i;

    if (left < arrayLength && comparator(arr[left], arr[largest]) > 0)
      largest = left;

    if (right < arrayLength && comparator(arr[right], arr[largest]) > 0)
      largest = right;

    if (largest != i) {
      swap(arr, i, largest);
      heapify(arr, largest);
    }
  }

  function swap(arr, a, b) {
    let temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
  }

  function heapSortHelper(arr) {
    buildHeap(arr);

    for (let i = arr.length - 1; i > 0; i--) {
      swap(arr, 0, i);
      arrayLength--;
      heapify(arr, 0);
    }
  }

  heapSortHelper(array);
  return array;
}

/**
 * Check if a user has access to a specific row in a table
 *
 * This is a generic helper to verify that a row belongs to a user before
 * allowing operations like update, delete, or setting as default.
 *
 * @param {String} modelName - The camelCase singular model name (e.g., 'userSession')
 * @param {String} id - The UUID of the row to check access for
 * @param {String} userId - The UUID of the user requesting access
 * @param {String} userColumnName - The column name that contains the user reference (default: 'userId')
 *
 * @returns {Promise<Boolean>} - Returns true if user has access, false otherwise
 *
 * @example
 * Check if a row owned via the default 'userId' column belongs to the user
 * const hasAccess = await canAccess('userSession', sessionId, req.user.id);
 *
 * @example
 * Check ownership via a custom owner column name
 * const hasAccess = await canAccess('someModel', rowId, req.user.id, 'ownerUserId');
 */
async function canAccess(modelName, id, userId, userColumnName = 'userId') {
  try {
    // Lazy load models to avoid circular dependency issues
    const models = require('../models');

    // Check if the model exists
    if (!models[modelName]) {
      console.error(`canAccess: Model "${modelName}" does not exist`);
      return false;
    }

    // Query the table to check if the row exists and belongs to the user
    const record = await models[modelName].findOne({
      where: {
        id: id,
        [userColumnName]: userId
      }
    });

    // Return true if record exists, false otherwise
    return !!record;
  } catch (error) {
    console.error(`canAccess error for model "${modelName}":`, error);
    return false;
  }
}
