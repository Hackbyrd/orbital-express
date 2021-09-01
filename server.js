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
const cors = require('cors'); // handle cors
const i18n = require('i18n'); // set up language

// env variables
const {
  NODE_ENV,
  REDIS_URL,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_PER_WINDOW
} = process.env;

// helpers
const { LOCALES } = require('./helpers/constants');

// server
function server() {
  // require custom
  const cfgPassport = require('./services/passport'); // configuration for passport

  // require custom middleware
  const args = require('./middleware/args');
  const auth = require('./middleware/auth');
  const exit = require('./middleware/exit');
  const error = require('./middleware/error');

  // set up express app
  const app = express();
  const newServer = http.createServer(app);
  const io = require('socket.io')(newServer); // socket.io

  // set up redis with socket
  const redis = require('socket.io-redis');
  const socket = require('./services/socket'); // require socket service to initiate socket.io
  io.adapter(redis(REDIS_URL));

  // enable ssl redirect in production
  app.use(sslRedirect.default()); // !! dont know why we need a default here

  // need to enable this in production because Heroku uses a reverse proxy
  if (NODE_ENV === 'production')
    app.set('trust proxy', 1); // get ip address using req.ip

  // set a rate limit for incoming requests
  const limiter = RateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS, // 5 minutes
    max: RATE_LIMIT_MAX_PER_WINDOW, // limit each IP to 300 requests per windowMs
    store: new RedisStore({
      redisURL: REDIS_URL
    })
  });

  // set rate limiter
  app.use(limiter);

  // log requests using morgan, don't log in test env
  if (NODE_ENV !== 'test')
    app.use(morgan('dev')); // combined, common, dev, short, tiny

  // add middleware and they must be in order
  app.use(compression()); // GZIP all assets
  app.use(cors()); // handle cors
  app.use(helmet()); // protect against vulnerabilities
  // app.use(rawBody); // adds rawBody to req object

  // set up language
  i18n.configure({
    locales: LOCALES, // set the languages here
    defaultLocale: LOCALES[0], // default is the first index
    queryParameter: 'lang', // query parameter to switch locale (ie. /home?lang=ch) - defaults to NULL
    cookie: 'i18n-locale', // if you change cookie name, you must also change in verifyJWTAuth res.cookie
    directory: __dirname + '/locales'
    // objectNotation: true // hierarchical translation catalogs. To enable this feature, be sure to set objectNotation to true
  });

  // you will need to use cookieParser to expose cookies to req.cookies
  app.use(cookieParser());

  // i18n init parses req for language headers, cookies, etc.
  // NOTE: If user is logged in, locale is set in verifyJWTAuth method
  app.use(i18n.init);

  // save raw body
  function rawBodySaver(req, res, buf, encoding) {
    if (buf && buf.length)
      req.rawBody = buf.toString(encoding || 'utf8');
  }

  // body parser
  app.use(bodyParser.json({ limit: '32mb', verify: rawBodySaver })); // raw application/json
  app.use(bodyParser.urlencoded({ limit: '32mb', verify: rawBodySaver, extended: false })); // application/x-www-form-urlencoded

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

  // host public files
  // app.use(express.static(__dirname + '/public'));

  // set up routes
  const router = require('./routes')(passport); // grab routes
  app.use('/', router); // place routes here

  // error middleware MUST GO LAST
  app.use(error);

  // io connection, call socket.connect
  io.on('connection', socket.connect);

  // return newServer
  return newServer;
}

module.exports = server(); // return server app for testing
