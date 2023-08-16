/**
 * Middleware to standarized and combine req.body and req.query into req.args
 */

'use strict';

const { parseUrlQueryFilter } = require('../helpers/cruqd');

module.exports = {
  attach,
  filters
};

/**
 * Make sure for any type of request (POST or GET), the parameters are stored in req.args
 * Also check for language setting
 * !IMPORTANT: Apparently only for GET request when using the format of ?age[gte]=5&age[lt]=10, express will automatically parse it into req.query as { age: { gte: 5, lt: 10 } }. This is exactly what we do for the filters function below. However, for POST request, express will not parse it into req.body. So we have to do it manually.
 *
 * req.body store arguments from POST body and req.query store URL params
 * req.args store which ever one was used
 */
function attach(req, res, next) {
  req.args = req.method === 'GET' ? req.query : req.body; // HAVE TO SPECIFY GET because the other methods can be anything they just act like POST

  // check for language setting
  if (req.args.lang) {
    req.setLocale(req.args.lang);
    res.setLocale(req.args.lang);
    delete req.args.lang; // remove the language because we dont need it anymore
  }

  return next();
}

/**
 * Takes in req.args and returns back and modified version of it to handle filters
 * Must be called after args.attach
 * !IMPORTANT: Apparently only for GET request when using the format of ?age[gte]=5&age[lt]=10, express will automatically parse it into req.query as { age: { gte: 5, lt: 10 } }. This is exactly what we do for this filters function. However, for POST request, express will not parse it into req.body. So we have to do it manually.
 *
 * { 'age[gte]': 5, 'age[lt]': 10 } -> { age: { [Op.gte]: 5, [Op.lt]: 10 } }
 */
function filters(req, res, next) {
  req.args = parseUrlQueryFilter(req.args);
  return next();
}
