/**
 * Test logic.js Helper
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../config/.env.test') });

// helper
const logic = require('../../helpers/logic');

describe('helpers/logic.js', () => {
  // randomString
  describe('randomString', () => {
    it('should create random string successfully', () => {
      const str = logic.randomString();
      expect(str).toHaveLength(64);
    }); // END should create random string successfully

    it('should create random string with 512 characters successfully', () => {
      const str = logic.randomString({ len: 512 });
      expect(str).toHaveLength(512);
    }); // END should create random string with 512 characters successfully

    it('should create random string with pre and post successfully', () => {
      const pre = 'pre-';
      const post = '-post';
      const str = logic.randomString({ pre, post });
      expect(str).toHaveLength(64 + pre.length + post.length);
      expect(str).toContain(pre);
      expect(str).toContain(post);
    }); // END create random string with pre and post successfully

    it('should create random number string successfully', () => {
      const str = logic.randomString({ lowercase: false, uppercase: false, numbers: true });
      expect(str).toHaveLength(64);
      for (let i = 0; i < str.length; i++) expect(Number(str[i]) < 10).toBe(true);
    }); // END create random number string successfully

    it('should create random string with just special characters successfully', () => {
      const specialCharacters = '!$/%@#'.split('');
      const str = logic.randomString({ len: 512, lowercase: false, uppercase: false, numbers: false, special: true });
      expect(str).toHaveLength(512);

      for (let i = 0; i < str.length; i++) expect(specialCharacters.indexOf(str[i]) >= 0).toBe(true);
    }); // END create random number string with 512 characters successfully
  }); // END randomString

  // removeAllWhiteSpace
  describe('removeAllWhiteSpace', function () {
    it('should remove all white space, tabs and newlines successfully', () => {
      let str = '  gateway\t\n   jit  !   \t\n';
      str = logic.removeAllWhiteSpace(str);
      expect(str).toBe('gatewayjit!');
    }); // END should remove all white space, tabs and newlines successfully
  }); // END removeAllWhiteSpace
}); // END helpers/logic.js
