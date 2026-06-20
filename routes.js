/**
 * All routes are placed in this file
 * All urls are going to be lowercase
 * All urls will not have underscore or dashes or spaces
 */

'use strict';

// env variables
const { API_VERSION } = process.env;

// require built-in node modules
const fs = require('fs');
const path = require('path');

// require third-party modules
const express = require('express');
let router = express.Router();

// models + redis — used by the readiness probe to check dependencies
const models = require('./models');
const { redisClient } = require('./services/redis'); // connected during boot by socket.get()

// variables
const APP_DIR = './app'; // app directory
const ROUTE_FILE = 'routes.js'; // the route file name

// Store all app routes here
const appRoutes = [];

// check if is directory and get directories
const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
const directories = getDirectories(path.join(__dirname, APP_DIR));

// require app routes
directories.forEach(dir => appRoutes.push(require(`${dir}/${ROUTE_FILE}`)));

module.exports = passport => {
  // Welcome
  router.all('/', (req, res) => res.status(200).send(`API ${API_VERSION} - ${req.__('GLOBAL[language]')}`));

  // Health (liveness): "is the process up?" — cheap, no dependency checks. The platform uses
  // this to decide whether to RESTART the dyno.
  router.all('/health', (req, res) => res.status(200).json({ status: 200, success: true }));

  // Readiness: "can I serve traffic right now?" — checks DB + Redis. The load balancer uses
  // this to decide whether to ROUTE traffic here. (During graceful shutdown, middleware/exit.js
  // already answers every request with 503 — which runs before these routes — so /ready and
  // /health automatically report not-ready while draining.)
  router.all('/ready', async (req, res) => {
    try {
      await models.db.authenticate(); // Postgres reachable?
      await redisClient.ping();        // Redis reachable?
      return res.status(200).json({ status: 200, success: true });
    } catch (err) {
      return res.status(503).json({ status: 503, success: false, reason: 'dependency_unavailable' });
    }
  });

  // Socket: Test that socket is working
  router.all('/socket', (req, res) => res.render('socket', { HOSTNAME: process.env.HOSTNAME, WEBSOCKET: process.env.WEBSOCKET })); // pass in env variables
  router.all('/chats', (req, res) => res.render('chats', { HOSTNAME: process.env.HOSTNAME, WEBSOCKET: process.env.WEBSOCKET })); // pass in env variables
  router.all('/login', (req, res) => res.render('login', { HOSTNAME: process.env.HOSTNAME, WEBSOCKET: process.env.WEBSOCKET })); // pass in env variables

  // All app routes are automatically inserted here
  appRoutes.forEach(r => (router = r(passport, router)));

  // 404 catch-all — must be after all routes, before error middleware
  router.use((req, res) => res.status(404).json({
    success: false,
    status: 404,
    error: 'NOT_FOUND',
    message: 'The requested resource does not exist.',
    requestId: req.requestId
  }));

  // return router
  return router;
};
