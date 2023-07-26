/**
 * Test services/email
 * 
 * JEST CHEATSHEET: https://devhints.io/jest
 */

'use strict';

// build-in node modules
const path = require('path');

// load test env
require('dotenv').config({ path: path.join(__dirname, '../../config/.env.test') });

// grab test emails
const { MAILER_HOST } = process.env;

// services
const email = require('../../services/email');
const queue = require('../../services/queue'); // process background tasks from Queue

// queues: add queues you will use in testing here
let EmailQueue = null; // initial value, will be set in beforeEach because it is async

// test email service
describe('services/email', () => {
  // send
  describe('send', () => {
    it('should send mail successfully with only required arguments passed in.', async () => {
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test',
        tos: [`to@${MAILER_HOST}`],
        ccs: null,
        bccs: null,
        args: null
      }

      // promise version
      try {
        const result = await email.send(params);
        expect(result).toHaveProperty('accepted', [`to@${MAILER_HOST}`]);
      } catch (error) {
        expect(error).toBeNull();
      }
    }); // END should send mail successfully with only required arguments passed in.

    it('should send mail successfully with all arguments passed in.', async () => {
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test', // test 2
        tos: [`to@${MAILER_HOST}`],
        ccs: [`cc@${MAILER_HOST}`, `cc1@${MAILER_HOST}`],
        bccs: [`bcc@${MAILER_HOST}`, `bcc1@${MAILER_HOST}`],
        args: { argOne: 'ARGUMENT ONE', argTwo: 'ARGUMENT TWO' }
      }

      try {
        const result = await email.send(params);
        expect(result).toHaveProperty('accepted', [`to@${MAILER_HOST}`]);
      } catch (error) {
        expect(error).toBeNull();
      }
    }); // END should send mail successfully with all arguments passed in.

    it('should send mail if ccs are duplicated with tos', async () => {
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test', // test 2
        tos: [`to@${MAILER_HOST}`],
        ccs: [`to@${MAILER_HOST}`, `cc@${MAILER_HOST}`],
        bccs: [`bcc@${MAILER_HOST}`, `bcc1@${MAILER_HOST}`],
        args: { argOne: 'ARGUMENT ONE', argTwo: 'ARGUMENT TWO' }
      }

      try {
        const result = await email.send(params);
        expect(result).toHaveProperty('accepted', [`to@${MAILER_HOST}`]);
      } catch (error) {
        expect(error).toBeNull();
      }
    }); // END should send mail if ccs are duplicated with tos

    it('should send mail if bccs are duplicated with ccs which are duplicated with tos', async () => {
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test', // test 2
        tos: [`to@${MAILER_HOST}`],
        ccs: [`to@${MAILER_HOST}`, `cc@${MAILER_HOST}`],
        bccs: [`cc@${MAILER_HOST}`, `bcc@${MAILER_HOST}`],
        args: { argOne: 'ARGUMENT ONE', argTwo: 'ARGUMENT TWO' }
      }

      try {
        const result = await email.send(params);
        expect(result).toHaveProperty('accepted', [`to@${MAILER_HOST}`]);
      } catch (error) {
        expect(error).toBeNull();
      }
    }); // END should send mail if bccs are duplicated with ccs which are duplicated with tos

    it('should send mail successfully with attachments passed in.', async () => {
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test',
        tos: [`to@${MAILER_HOST}`],
        ccs: null,
        bccs: null,
        args: null,
        attachments: [{
          filename: 'README.txt',
          path: path.join(__dirname, '../fixtures/assets/README.txt')
        }, {
          filename: 'license.txt',
          path: 'https://raw.githubusercontent.com/nodemailer/nodemailer/master/LICENSE'
        }, {
          filename: 'helloworld.txt',
          content: 'Hello World!',
          contentType: 'text/plain'
        }]
      }

      // promise version
      try {
        const result = await email.send(params);
        expect(result).toHaveProperty('accepted', [`to@${MAILER_HOST}`]);
      } catch (error) {
        expect(error).toBeNull();
      }
    }); // END should send mail successfully with attachments passed in.

    it('should fail to send mail if "from" or "name" is not specified.', async () => {
      // from is invalid
      const params1 = {
        from: null,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test', // test 1
        tos: [`to@${MAILER_HOST}`],
        ccs: null,
        bccs: null,
        args: null
      }

      try {
        const result1 = await email.send(params1);
        expect(result1).toBeNull();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe('Email must have a from, name, subject, and template in order to send.');
      }

      // name is invalid
      const params2 = {
        from: `from@${MAILER_HOST}`,
        name: null,
        subject: 'TEST EMAIL',
        template: 'Test', // test 1
        tos: [`to@${MAILER_HOST}`],
        ccs: null,
        bccs: null,
        args: null
      }

      try {
        const result2 = await email.send(params2);
        expect(result2).toBeNull();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe('Email must have a from, name, subject, and template in order to send.');
      }
    }); // END should fail to send mail if "from" or "name" is not specified.

    it('should fail to send mail if "subject" is not specified.', async () => {
      // subject is invalid
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: null,
        template: 'Test',
        tos: [`to@${MAILER_HOST}`],
        ccs: null,
        bccs: null,
        args: null
      }

      try {
        const result = await email.send(params);
        expect(result).toBeNull();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe('Email must have a from, name, subject, and template in order to send.');
      }
    }); // END should fail to send mail if "subject" is not specified.

    it('should fail to send mail if "template" is not specified.', async () => {
      // template is invalid
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: null,
        tos: [`to@${MAILER_HOST}`],
        ccs: null,
        bccs: null,
        args: null
      }

      try {
        const result = await email.send(params);
        expect(result).toBeNull();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe('Email must have a from, name, subject, and template in order to send.');
      }
    }); // END should fail to send mail if "template" is not specified.

    it('should fail to send mail if "tos" is not specified.', async () => {
      // tos is invalid
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test',
        tos: [],
        ccs: null,
        bccs: null,
        args: null
      }

      try {
        const result = await email.send(params);
        expect(result).toBeNull();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe('Email must be sent to at least one recipient.');
      }
    }); // END should fail to send mail if "tos" is not specified.
  }); // END send

  // enqueue, add email job to queue to process later
  describe('enqueue', () => {

    // beforeEach: reset fixtures, establish & empty queue connections, establish socket connections and clear database
    beforeEach(async () => {

      try {
        // create queue connections here
        EmailQueue = queue.get('EmailQueue');
        await EmailQueue.obliterate({ force: true }); // make sure queue is empty before each test runs
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    // afterAll: close all queue & socket connections, close database & app server connections
    afterAll(async () => {
      try {
        await queue.closeAll(); // close all queue connections
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    it('should enqueue mail successfully', async () => {
      const params = {
        from: `from@${MAILER_HOST}`,
        name: 'John Doe',
        subject: 'TEST EMAIL',
        template: 'Test',
        tos: [`to@${MAILER_HOST}`],
        ccs: null,
        bccs: null,
        args: null
      }

      // promise version
      try {
        const job = await email.enqueue(params);
        
        // get number of jobs
        const jobCountResult = await EmailQueue.getJobCounts();
        expect(jobCountResult.waiting).toBe(1);

        // check if job is there
        const checkJob = await EmailQueue.getJob(job.id);
        expect(typeof checkJob).toBe('object');
      } catch (error) {
        expect(error).toBeNull();
      }
    }); // END should enqueue mail successfully
  }); // END enqueue
}); // END services/email
