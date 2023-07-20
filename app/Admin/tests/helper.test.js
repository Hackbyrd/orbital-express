/**
 * TEST ADMIN Helper methods
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// test helper methods
describe('admin/helper.js', () => {
  it('test helper method here', async () => {
    expect(true).toBe(true);
  }); // END test helper method here
}); // END describe('admin/helper.js')
