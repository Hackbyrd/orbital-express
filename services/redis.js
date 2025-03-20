/**
 * Socket.io wrapper
 * Write all events and rooms here
 *
 * https://socket.io/docs/
 *
 * TODO: TEST
 */

'use strict';

// ENV variables
const { NODE_ENV, REDIS_URL, REDISCLOUD_URL } = process.env;

// require third-party node modules
const { createClient } = require('redis');

const redisClient = createClient({
  url: REDIS_URL || REDISCLOUD_URL,
  // socket option is required in Heroku, https://devcenter.heroku.com/articles/connecting-heroku-redis#connecting-in-node-js
  socket: {
    tls: NODE_ENV === 'production' ? { rejectUnauthorized: false, requestCert: true } : false, // only use TLS in production, REDIS_URL='redis://localhost:6379' in development
    // rejectUnauthorized: false,
    // https://stackoverflow.com/questions/60646141/redis-tls-configuration-with-nodejs
  }
});

module.exports = {
  // main io connection object
  redisClient,
};
