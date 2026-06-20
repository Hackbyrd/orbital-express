/**
 * Main Express Application: set up express app
 */

 'use strict';

// require build-in node modules
const http = require('http');

// require third-party node modules
const express = require('express');
const RateLimit = require("express-rate-limit"); // https://www.npmjs.com/package/express-rate-limit
const RedisStore = require('rate-limit-redis'); // https://www.npmjs.com/package/rate-limit-redis
const sslRedirect = require('heroku-ssl-redirect');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const helmet = require('helmet');
const morgan = require('morgan'); // logging: https://github.com/expressjs/morgan
const i18n = require('i18n'); // defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files:
const cors = require('cors'); // handle cors
const { createClient: createRedisClient } = require('redis'); // dedicated client for the rate limiter store

// env variables
const {
  NODE_ENV,
  REDIS_URL,
  REDISCLOUD_URL,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_PER_WINDOW,
  ALLOWED_ORIGINS
} = process.env;

// services
const socket = require('./services/socket'); // require socket service to initiate socket.io
const lang = require('./services/language'); // grab i18n after we configured it

// server
async function server() {
  // require custom
  const cfgPassport = require('./services/passport'); // configuration for passport

  // require custom middleware
  const requestId = require('./middleware/id');
  const args = require('./middleware/args');
  const auth = require('./middleware/auth');
  const exit = require('./middleware/exit');
  const error = require('./middleware/error');

  // set up express app
  const app = express();
  // Disable the "Powered-By" header to prevent showing hackers what infra we use
  app.disable('x-powered-by');

  // attach a unique requestId to every request — MUST be first
  app.use(requestId.requestId);

  // create server and initiate socket.io
  const newServer = http.createServer(app);
  const io = await socket.get(newServer); // socket.io

  // enable ssl redirect in production
  app.use(sslRedirect.default()); // must be .default()

  // need to enable this in production because Heroku uses a reverse proxy
  if (NODE_ENV === 'production') {
    app.set('trust proxy', 1); // get ip address using req.ip (one proxy hop — Heroku)

  // ---- Rate limiting (brute-force / abuse protection) ----
  // Production-only (matches `trust proxy`): keeps local dev login iteration + the test suite
  // unthrottled. Prefer a Redis-backed store so limits are shared across clustered dynos; if
  // Redis is unavailable we fall back to express-rate-limit's in-memory store rather than crashing boot.
    // Connect a dedicated Redis client for the limiter. On failure, leave it null so each
    // limiter falls back to express-rate-limit's in-memory store rather than crashing boot.
    let rlClient = null;
    try {
      rlClient = createRedisClient({
        url: REDIS_URL || REDISCLOUD_URL,
        socket: { tls: NODE_ENV === 'production' ? { rejectUnauthorized: false, requestCert: true } : false }
      });
      rlClient.on('error', err => console.error('rate-limit Redis error:', err.message));
      await rlClient.connect();
    } catch (error) {
      console.error('rate-limit Redis store unavailable — falling back to in-memory store:', error.message);
      rlClient = null;
    }

    // each limiter needs its OWN store/prefix or their counts collide.
    // rate-limit-redis v3 needs a sendCommand bound to a connected client (NOT redisURL).
    const makeStore = prefix => rlClient
      ? new RedisStore({ prefix, sendCommand: (...args) => rlClient.sendCommand(args) })
      : undefined; // undefined => express-rate-limit's default in-memory store (per-process)

    // global limiter — every request, keyed by IP
    app.use(RateLimit({
      windowMs: Number(RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // default 5 minutes
      max: Number(RATE_LIMIT_MAX_PER_WINDOW) || 300,           // default 300 requests / window / IP
      standardHeaders: true,  // emit RateLimit-* headers
      legacyHeaders: false,
      // Never throttle the infra probes. They live in routes.js (mounted AFTER this limiter), so
      // without this skip they'd be counted against the same 300/5min/IP budget as real traffic.
      // That's a problem whenever many clients share one source IP — a NAT/corporate egress, a
      // mobile carrier gateway, a SNAT'd prober fleet, or a misconfigured `trust proxy` that makes
      // every request look like it came from the proxy's single IP. In those cases real traffic can
      // exhaust the budget and the probes become collateral damage: a 429 on /health or /ready reads
      // to the orchestrator as "instance unhealthy" → it stops routing or RESTARTS the dyno, which
      // can cascade. Probes are cheap, dependency-light, and not an abuse surface, so exempt them
      // entirely and keep the "probes are never throttled" guarantee we had before they moved to routes.js.
      skip: req => req.path === '/health' || req.path === '/ready',
      store: makeStore('rl:global:')
    }));

    // stricter limiter on the credential endpoints — the real brute-force / abuse surface
    // (password guessing, refresh-token guessing, SMS-code brute force, SMS-cost abuse).
    // Mounted by path prefix BEFORE the feature routes, so it runs ahead of those handlers.
    app.use([
      '/v1/users/login', '/v1/admins/login',
      '/v1/users/refresh', '/v1/admins/refresh',
      '/v1/admins/resetpassword', '/v1/admins/confirmpassword',
      '/v1/admins/updatepassword',
      '/v1/users/smssendcode', '/v1/users/smsverifycode'
    ], RateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,                  // 10 attempts / 15 min / IP on any single credential endpoint
      standardHeaders: true,
      legacyHeaders: false,
      store: makeStore('rl:auth:')
    }));
  }

  // log requests using morgan, don't log in test env
  if (NODE_ENV !== 'test')
    app.use(morgan('dev')); // combined, common, dev, short, tiny

  // add middleware and they must be in order
  app.use(compression()); // GZIP all assets

  // configure CORS to allow specific domains
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin)
        return callback(null, true);

      // Parse allowed origins from environment variable (comma-separated)
      const allowedOrigins = ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [];

      // In development, allow all origins if no ALLOWED_ORIGINS is set
      if (NODE_ENV !== 'production' && allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true // Allow cookies and authorization headers
  };

  app.use(cors(corsOptions)); // handle cors
  app.use(helmet()); // protect against vulnerabilities
  // app.use(rawBody); // adds rawBody to req object

  // you will need to use cookieParser to expose cookies to req.cookies
  app.use(cookieParser());

  // i18n init parses req for language headers, cookies, etc.
  // NOTE: If user is logged in, locale is set in verifyJWTAuth method
  i18n.configure(lang.i18nSettings()); // grab settings
  app.use(i18n.init); // then init i18n

  // save raw body
  function rawBodySaver(req, res, buf, encoding) {
    if (buf && buf.length)
      req.rawBody = buf.toString(encoding || 'utf8');
  }

  // body parser
  // Keep the global body limit small — a large limit is a trivial memory-exhaustion DoS.
  // For genuine large uploads, mount a higher-limit parser (or multer) on that specific route only.
  app.use(bodyParser.json({ limit: '5mb', verify: rawBodySaver })); // raw application/json
  app.use(bodyParser.urlencoded({ limit: '5mb', verify: rawBodySaver, extended: false })); // application/x-www-form-urlencoded

  // NOTE: take this out because it interferes with multer
  // app.use(bodyParser.raw({ limit: '32mb', verify: rawBodySaver, type: () => true }));

  // passport config, must be in this order!
  app.use(passport.initialize());
  cfgPassport(passport); // set up passport

  // custom middleware
  app.use(exit.middleware); // stops here if server is in the middle of shutting down
  app.use(args.attach); // set req.args

  // authentication middleware via passport
  app.use(auth.attachJWTAuth(passport));
  app.use(auth.JWTAuth);
  app.use(auth.verifyJWTAuth);

  // set templates engine and views directory
  // we are doing this only to test that socket.io works
  app.set('views', './views') // specify the views directory
  app.set('view engine', 'ejs'); // set ejs as the view engine

  // host public files such as js, css, images, etc..
  // How to use in HTML/.ejs file:
  // <script src="/js/example.js" />
  // <link rel="stylesheet" href="/css/example.css">
  app.use(express.static(__dirname + '/public'));

  // set up routes
  const router = require('./routes')(passport); // grab routes
  app.use('/', router); // place routes here (includes the 404 catch-all at the end)

  // error middleware MUST GO LAST
  app.use(error);

  io.use(socket.authenticate); // middleware to authenticate the socket
  io.on('connection', socket.connect); // io connection, call socket.connect

  // return newServer
  return newServer;
}

module.exports = server(); // return server app for testing
