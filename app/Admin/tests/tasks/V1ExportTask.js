/**
 * TEST ADMIN V1ExportTask METHOD
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// ENV variables
const { REDIS_URL } = process.env;

// third party
const Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean

// assertion library
const { expect } = require('chai');

// tasks
const { V1ExportTask } = require('../../../../app/Admin/tasks');

// helpers
const {reset, populate } = require('../../../../helpers/tests');

// queues
const AdminQueue = new Queue('AdminQueue', REDIS_URL);

describe('Admin.V1ExportTask', async () => {
  // grab fixtures here
  const adminFix = require('../../../../test/fixtures/fix1/admin');

  // clear database, populate database with fixtures and empty queues
  beforeEach(async () => {
    await reset();
    await populate('fix1');
    await AdminQueue.empty();
  });

  it('should export successfully', async () => {
    const admin1 = adminFix[0]; // get admin

    try {
      const result = await V1ExportTask({
        id: 1,
        data: {
          adminId: admin1.id
        }
      });

      expect(result).to.equal(`1 - ${admin1.id}`);
    }catch (error) {
      throw error;
    }
  }); // END should export successfully
}); // END Admin.V1ExportTask
