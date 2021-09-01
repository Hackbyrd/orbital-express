/**
 * All logic helper functions
 */

'use strict';

// ENV variables
const { SESSION_SECRET, HOSTNAME, USER_ORDER_CLIENT_HOST } = process.env;

// require third-party node modules
const jwt = require('jwt-simple');

module.exports = {
  randomString,
  createJwtToken,
  removeAllWhiteSpace,
  convertJSONStringsToJSObjects,
  getUnixTimeFromDatabaseTimestamp,
  heapsort
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
 * Create a JSON WEB TOKEN
 *
 * @user (USER OBJECT): the user object to extract user.id from
 *
 * Docs: https://www.npmjs.com/package/passport-jwt
 */
function createJwtToken(user, client) {
  return jwt.encode({
    sub: user.id,
    iss: HOSTNAME,
    aud: client,
    iat: new Date().getTime()
  }, SESSION_SECRET);
}

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
