/**
 * Everything related to phone: sms text messages and calls
 *
 * MessageBird API
 * To send sms and verify the phone number
 * Docs : https://developers.messagebird.com/api/lookup/#request-an-hlr
 * testdata found here : https://www.twilio.com/docs/api/rest/test-credentials
 *
 * TODO: TEST
 */

'use strict';

// ENV variables
const {
  MESSAGE_BIRD_API_KEY,
  MESSAGE_BIRD_NUMBER,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_NUMBER
} = process.env;

// third-party
const mb = require('messagebird').initClient(MESSAGE_BIRD_API_KEY);
const twilioClient = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// services
const i18n = require('./language').getI18n();
const queue = require('./queue'); // require queue service
const { queueError } = require('./error'); // require error service

module.exports = {
  message,
  validate,

  // background job
  worker,
  enqueue
};

/**
 * Send a text message via MessageBird service
 *
 * @to (STRING - REQUIRED): The phone number to send to
 * @message (STRING - REQUIRED): The message to send
 *
 * MessageBird Response:
 * {
 *   "id": "fa9d2db543464ffab33003b672d7b9ca",
 *   "href": "https://rest.messagebird.com/messages/fa9d2db543464ffab33003b672d7b9ca",
 *   "direction": "mt",
 *   "type": "sms",
 *   "originator": "inbox",
 *   "body": "This is a test message",
 *   "reference": null,
 *   "validity": null,
 *   "gateway": 10,
 *   "typeDetails": {},
 *   "datacoding": "plain",
 *   "mclass": 1,
 *   "scheduledDatetime": null,
 *   "createdDatetime": "2020-05-22T23:08:40+00:00",
 *   "recipients": {
 *     "totalCount": 1,
 *     "totalSentCount": 1,
 *     "totalDeliveredCount": 0,
 *     "totalDeliveryFailedCount": 0,
 *     "items": [
 *       {
 *         "recipient": 12406206953,
 *         "status": "sent",
 *         "statusDatetime": "2020-05-22T23:08:40+00:00",
 *         "messagePartCount": 1
 *       }
 *     ]
 *   }
 *
 */
async function messageMessageBird(to, message) {
  return new Promise((resolve, reject) => {
    const params = {
      originator: MESSAGE_BIRD_NUMBER,
      recipients: [to], // remove all non-digit characters
      body: message,
    };

    // create message and send
    mb.messages.create(params, (err, response) => {
      if (err) return reject(err);

      return resolve(response);
    });
  });
} // END messageMessageBird

/**
 * Send a text message via Twilio service
 *
 * @to (STRING - REQUIRED): The phone number to send to
 * @message (STRING - REQUIRED): The message to send
 *
 * Twilio Response:
 * {
 *   "account_sid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
 *   "api_version": "2010-04-01",
 *   "body": "Hi there",
 *   "date_created": "Thu, 30 Jul 2015 20:12:31 +0000",
 *   "date_sent": "Thu, 30 Jul 2015 20:12:33 +0000",
 *   "date_updated": "Thu, 30 Jul 2015 20:12:33 +0000",
 *   "direction": "outbound-api",
 *   "error_code": null,
 *   "error_message": null,
 *   "from": "+14155552345",
 *   "messaging_service_sid": null,
 *   "num_media": "0",
 *   "num_segments": "1",
 *   "price": null,
 *   "price_unit": null,
 *   "sid": "SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
 *   "status": "sent",
 *   "subresource_uris": {
 *     "media": "/2010-04-01/Accounts/ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/Messages/SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/Media.json"
 *   },
 *   "to": "+14155552345",
 *   "uri": "/2010-04-01/Accounts/ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/Messages/SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.json"
 * }
 *
 */
async function message({ to, message }) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: TWILIO_NUMBER,
        to: to
      });

      // console.log(result.sid);
      return resolve(result);
    } catch (error) {
      return reject(error);
    }
  });
} // END message

/**
 *
 * @number (STRING - REQUIRED): The phone number to validate
 *
 * MessageBird Success Response:
 * {
 *   'href': 'https://rest.messagebird.com/lookup/31612345678',
 *   'countryCode': 'NL',
 *   'countryPrefix': 31,
 *   'phoneNumber': 31612345678,
 *   'type': 'mobile',
 *   'formats': {
 *     'e164': '+31612345678',
 *     'international': '+31 6 12345678',
 *     'national': '06 12345678',
 *     'rfc3966': 'tel: +31-6-12345678'
 *   }
 * }
 *
 * MessageBird Error Response: {
 *   statusCode: 400,
 *   errors: [
 *     {
 *       code: 21,
 *       description: 'Bad request (phone number has unknown format)',
 *       parameter: 'phone_number'
 *     }
 *   ]
 * }
 *
 * return { formattedPhone: response.formats.e164 }
 * return { errorMessage: 'Invalid phone number.', errorDetails: errorDetailsArr.join(' ')}
 */
async function validate(number) {
  return new Promise((resolve, reject) => {
    const sanitizedNumber = number.replace(/\D/g, ''); // strip out all non-digit integers

    // messagebird.lookup.read({ phoneNumber: newNumber, countryCode: 'US' }
    mb.lookup.read(sanitizedNumber, 'US', (err, response) => {
      if (err) {
        if (err.statusCode >= 500) {
          return reject(err);
        } else {
          let errorDetailsArr = []; // to store errors

          // store errors
          err.errors.forEach(e => {
            errorDetailsArr.push(`Code ${e.code}: ${e.description}.`);
          });

          return resolve({ errorMessage: i18n.__('GLOBAL[invalid_phone_number]'), errorDetails: errorDetailsArr.join(' ') });
        }
      }

      // return formatted phone number
      return resolve({ formattedPhone: response.formats.e164 });
    });
  }); // END Promise
} // END validate

/**
 * Add a new send text message job to the PhoneQueue to be sent
 *
 * @data {
 *   @to - (STRING - REQUIRED): phone number to send to
 *   @message - (STRING - REQUIRED): message to send
 * }
 *
 * returns job = { id }
 */
async function enqueue(data) {
  try {
    // grab phone queue
    const PhoneQueue = await queue.get('PhoneQueue');

    // create sending text message job job
    const job = await PhoneQueue.add('V1SendTextMessageTask', data, {
      priority: 1, // Highest priority so the worker will process this first
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: true,
    });

    // return job
    return job; // { id }
  } catch (error) {
    console.log('Enqueue failed', error);
    throw error;
  }
} // END enqueue

/**
 * Worker function to process jobs in the PhoneQueue
 */
async function worker() {
  // grab email queue
  const PhoneQueue = await queue.get('PhoneQueue');

   // Process Phone Feature Background Tasks
   PhoneQueue.process('V1SendTextMessageTask', V1SendTextMessageTask); // task below
   PhoneQueue.on('failed', async (job, error) => queueError(error, PhoneQueue, job));
   PhoneQueue.on('stalled', async job => queueError(new Error('Queue Stalled.'), PhoneQueue, job));
   PhoneQueue.on('error', async error => queueError(error, PhoneQueue));
} // END worker

/**
 * Background job to send a text message
 *
 * @job {
 *   @id - (NUMBER - REQUIRED): The id of the background job (automatically when creating a job)
 *   @data {
 *     @to - (STRING - REQUIRED): phone number to send to
 *     @message - (STRING - REQUIRED): message to send
 *   }
 * }
 */
async function V1SendTextMessageTask(job) {
  console.log(`V1SendTextMessageTask - ${job.id}`);

  // Send text
  try {
    return await message(job.data);
  } catch (error) {
    console.log(`V1SendTextMessageTask - ${job.id} - ERROR: ${error}\n${JSON.stringify(job.data)}`);
    throw error;
  }
} // END V1SendTextMessageTask
