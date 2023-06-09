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
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

// the rooms for sockets
let io = null; // this is the io connection that will be passed around the entire application
let pubClient = null;
let subClient = null;

// the rooms for sockets
const SOCKET_ROOMS = {
  GLOBAL: 'GLOBAL', // a global room
  ADMIN: 'ADMIN-', // admin room where only admin users can join

  // add more rooms here
  ROOM: 'ROOM-', // add dash here so you can append a unique number for the room
}

// the events the socket can emit or listen to
const SOCKET_EVENTS = {
  ADMIN_CREATED: 'ADMIN_CREATED',
  ADMIN_UPDATED: 'ADMIN_UPDATED',

  // add more events here
  // COMPANY_CREATED: 'COMPANY_CREATED',
}

/**
 * Creates a new io connection if one does not exist already and returns the io object to use to emit events
 *
 * @newServer - (OBJECT - OPTIONAL): the newServer from server.js - http.createServer(app)
 *
 * return: io connection
 */
async function get(newServer) {
  // if io exists already, return it
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
  pubClient = createClient({
    url: REDIS_URL || REDISCLOUD_URL,
    // socket option is required in Heroku, https://devcenter.heroku.com/articles/connecting-heroku-redis#connecting-in-node-js
    socket: {
      tls: NODE_ENV === 'production', // only use TLS in production, REDIS_URL='redis://localhost:6379' in development
      rejectUnauthorized: false,
    }
  });

  // create the redis sub client by duplicating the pub client
  subClient = pubClient.duplicate();

  // handle redis pubClient error
  pubClient.on('error', err => {
    console.error('Socket Pub Redis Client Error', err);
    throw err;
  });

  // handle redis subClient error
  subClient.on('error', err => {
    console.error('Socket Sub Redis Client Error', err);
    throw err;
  });

  // connect
  try {
    // establish connections on pub and sub clients
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log(`${process.pid}: Socket.io connection established`);

    // return to handle io.on('connection') event
    return io;
  } catch (error) {
    console.error(error);
    throw error;
  }
} // END get

/**
 * Handle io.on('connection') event 
 * 
 * @socket - (OBJECT): the socket object
 */
function connect(socket) {
  console.log(`${process.pid}: Client socketId: ${socket.id} Connected`);

  // join the global room for application
  if (socket.handshake.query.global)
    socket.join(`${SOCKET_ROOMS.GLOBAL}`);

  // join the admin room for application
  if (socket.handshake.query.admin)
    socket.join(`${SOCKET_ROOMS.ADMIN}${socket.handshake.query.admin}`); // ex. socket.join('ADMIN-1') - only admin with id 1 will receive the event

  // add more rooms here
  // ex. join the correct room for company with a dynamic company id
  // socket.handshake.query.company is the company id so that you create a room with that company ID so that you can emit to that room and all clients who that company id will receive the event
  // if (socket.handshake.query.company)
  //   socket.join(`${SOCKET_ROOMS.COMPANY}${socket.handshake.query.company}`); // ex. socket.join('COMPANY-1');

  // add more rooms here

  socket.on('disconnect', () => {
    console.log(`${process.pid}: Client socketId: ${socket.id} Disconnected`);
  });
} // END connect

/**
 * Close the socket io connection
 */
async function close() {
  try {

    // close pubClient
    if (pubClient && pubClient.isOpen) {
      await pubClient.disconnect();
    }

    // close subClient
    if (subClient && subClient.isOpen) {
      await subClient.disconnect();
    }

    // connection successfully closed
    console.log('Socket connection closed.');
    return true;
  } catch (error) {
    console.error(error);
    throw new Error('Fail to close socket io connection');
  }
} // END close

module.exports = {
  // main io connection object
  io,
  
  // constant variables
  SOCKET_ROOMS,
  SOCKET_EVENTS,

  // methods
  get,
  connect,
  close,
};