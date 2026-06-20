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
const { NODE_ENV, ACCESS_TOKEN_SECRET, HOSTNAME } = process.env;

// require third-party node modules
const jsonwebtoken = require('jsonwebtoken'); // verify the access token on socket connect (same token used for HTTP auth)
const { Server } = require('socket.io');
const { redisClient } = require('./redis.js');
const { createAdapter } = require('@socket.io/redis-adapter');

// require models
const models = require('../models');

// require helpers
const { TOKEN_AUDIENCE } = require('../helpers/constants');

// NOTE: this is the core real-time layer only — Socket.IO server, JWT auth on connect, the Redis
// adapter, and generic rooms. The previous product's chat/presence events (conversations, messages,
// typing, online-presence) were removed with their features. Register new socket events in connect().

// the io connection that will be passed around the entire application
// !IMPORTANT: never import `io` directly from this module — use getIO() so you always get the live instance, not the null snapshot at require-time
let io = null;
let pubClient = null;
let subClient = null;

// the rooms for sockets
const SOCKET_ROOMS = {
  GLOBAL: 'GLOBAL', // a global room every connection can be placed in
  USER: 'USER', // per-user room (USER<userId>) for targeting events at a single user

  // This is for testing purposes only via API_URL/socket
  TEST: 'TEST',

  // add more rooms here
  ROOM: 'ROOM',
}

// the events the socket can emit or listen to
const SOCKET_EVENTS = {
  // This is for testing purposes only via API_URL/socket
  TEST_SOCKET_EVENT_ONE: 'TEST_SOCKET_EVENT_ONE',
  TEST_SOCKET_EVENT_TWO: 'TEST_SOCKET_EVENT_TWO',

  // add more events here
  // COMPANY_CREATED: 'COMPANY_CREATED',
}

/*
 * Convention to wrap the id in < > so that it can be used in the socket.io rooms
 *
 * @id - (STRING): the id to wrap
 *
 * return: the wrapped id
 */
function socketWrapper(id) {
  return `<${id}>`;
} // END socketWrapper

/**
 * Creates a new io connection if one does not exist already and returns the io object to use to emit events
 *
 * @newServer - (OBJECT - OPTIONAL): the newServer from server.js - http.createServer(app)
 *
 * return: io connection
 */
async function get(newServer) {
  // if io exists already, return it
  // if NODE_ENV is test, return null because we dont need to do this in test environment
  if (io) {
    return io;
  }

  // serverOptions
  const serverOptions = {
    cors: {
      origin: '*', // front end domains, can put in list/array of domains
      methods: ['GET', 'POST'],
      credentials: true, // session affinity is achieved with a cookie, you need to allow credentials for cross origin
    }
  }

  // if io doesn't exist, create it using the newServer
  io = newServer ? new Server(newServer, serverOptions) : new Server(serverOptions);

  // create the redis pub client
  pubClient = redisClient;

  // create the redis sub client by duplicating the pub client
  subClient = pubClient.duplicate();

  // handle redis pubClient error — LOG ONLY, never re-throw. node-redis emits 'error' on every
  // transient blip (idle drop, TLS renegotiation, failover); throwing here turns a recoverable
  // hiccup into an uncaught exception that destabilizes the worker AND breaks node-redis's
  // automatic reconnection — leaving the client permanently closed so later commands (e.g. the
  // OAuth-state setEx in V1GoogleAuthStart) throw "The client is closed" and return 500.
  pubClient.on('error', err => {
    console.error('Socket Pub Redis Client Error', err.message);
  });

  // handle redis subClient error — log only (same reasoning as above)
  subClient.on('error', err => {
    console.error('Socket Sub Redis Client Error', err.message);
  });

  // connect
  try {
    // establish connections on pub and sub clients
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    // only print this if not in test environment
    if (NODE_ENV !== 'test') {
      console.log(`${process.pid}: Socket.io connection established`);
    }

    // return to handle io.on('connection') event
    return io;
  } catch (error) {
    console.error(error);
    throw error;
  }
} // END get

/**
 * Handle JWT authentication
 *
 * @socket - (OBJECT): the socket object
 */
async function authenticate(socket, next) {
  console.log(`${process.pid}: Client socketId: ${socket.id} Authenticating...`);
  // get the token from the socket handshake
  const token = socket.handshake.auth.token;

  // if no token, return error
  if (!token) {
    console.log('no token');
    return next(new Error('Socket Authentication Error: Invalid Token'));
  }

  try {

    // verify the access token (signature + expiry + issuer + audience) — same token used for HTTP auth
    const payload = jsonwebtoken.verify(token, ACCESS_TOKEN_SECRET, { issuer: HOSTNAME, audience: Object.values(TOKEN_AUDIENCE.USER) });

    // get the user from the database
    const findUser = await models.user.findByPk(payload.sub);

    // if user does not exist, return error
    if (!findUser) {
      return next(new Error('Socket Authentication Error: User Not Found'));
    }

    // instant revocation: reject if the token's version no longer matches the user's
    if (findUser.tokenVersion !== payload.tokenVersion) {
      return next(new Error('Socket Authentication Error: Token Invalidated'));
    }

    // set the user on the socket
    socket.user = findUser;

    // call next
    console.log(`${process.pid}: Client socketId: ${socket.id} Authenticated Successfully.`);
    return next(null, socket); // pass the socket to the next middleware
  } catch (error) {
    return next(new Error('Socket Authentication Error: Invalid Token'));
  }
} // END authenticate

/**
 * Handle io.on('connection') event
 *
 * @socket - (OBJECT): the socket object
 */
async function connect(socket) {
  // only print this if not in test environment
  if (NODE_ENV !== 'test') {
    console.log(`${process.pid}: Client socketId: ${socket.id} Connecting...`);
  }

  // the user room
  const userRoomName = `${SOCKET_ROOMS.USER}${socketWrapper(socket.user.id)}`;

  console.log(`Joining Room: ${userRoomName}`);
  socket.join(userRoomName); // ex. socket.join('USER<8f1fbd57-7e71-4a9b-9ad4-3c6db06a76b2>') - only user with id 1 will receive the event
  console.log(`Joined Room: ${userRoomName} Successfully.`);

  //---------- Add more rooms here ----------/

  // disconnect event
  socket.on('disconnect', async () => {
    // only print this if not in test environment
    if (NODE_ENV !== 'test') {
      console.log(`${process.pid}: Client socketId: ${socket.id} Disconnected.`);
    }
  }); // END disconnect event

  //---------- Add more events here ----------/

  // only print this if not in test environment
  if (NODE_ENV !== 'test') {
    console.log(`${process.pid}: Client socketId: ${socket.id} Connected Successfully.`);
  }
} // END connect

/**
 * Close the socket io connection
 */
async function close() {
  try {
    // If io is null, there's nothing to close
    if (!io) {
      return true;
    }

    // Close the socket.io server
    await io.close();

    // Close Redis clients
    if (pubClient && pubClient.isOpen) {
      await pubClient.quit();
    }

    if (subClient && subClient.isOpen) {
      await subClient.quit();
    }

    // Reset the global variables
    io = null;
    pubClient = null;
    subClient = null;

    // only print this if not in test environment
    if (NODE_ENV !== 'test') {
      console.log('Socket connection closed.');
    }
    return true;
  } catch (error) {
    console.error(error);
    throw new Error('Fail to close socket io connection');
  }
} // END close

module.exports = {
  // constant variables
  SOCKET_ROOMS,
  SOCKET_EVENTS,

  // methods
  getIO,
  socketWrapper,
  get,
  authenticate,
  connect,
  close,
};

/**
 * Returns the live io instance. Always use this instead of importing io directly —
 * the module-level variable is null at require-time and only set after get() is called.
 *
 * return: io instance or null if socket server has not been initialized yet
 */
function getIO() {
  return io;
} // END getIO
