# JavaScript File Structure

Every `.js` file in this codebase follows the same top-to-bottom layout without exception. The order is a contract — any engineer can open any file and know exactly where to look for imports, exports, and logic.

---

## The Order (1–12)

| # | Section | Notes |
|---|---|---|
| 1 | **Header comment** | What this file is for and what its methods do |
| 2 | `'use strict'` | Always present, always second |
| 3 | **ENV variables** | Destructured from `process.env` |
| 4 | **Built-in Node modules** | `fs`, `path`, `crypto`, etc. |
| 5 | **Third-party modules** | `lodash`, `joi`, `moment-timezone`, etc. |
| 6 | **Services** | From `services/` — including the queue *service* (`services/queue.js`) |
| 7 | **Helpers** | From `helpers/`, constants, and the feature's own `helper.js` |
| 8 | **Models** | `const models = require('.../models')` |
| 9 | **Queues** | Queue *instances* via `queue.get('XQueue')` — right after models; the service itself is up in step 6 |
| 10 | **Module-level constants** | Optional; computed from imports above |
| 11 | **`module.exports`** | Declared **before** the method definitions (functions are hoisted) |
| 12 | **Method definitions** | The actual implementations |

---

## Import Ordering Within Each Group

Within every import section, order by **increasing line length**. Put plain whole-module requires before destructured requires, each sub-group also ordered by increasing length.

```javascript
// ✅ correct
const _ = require('lodash');
const joi = require('joi');
const moment = require('moment-timezone');

const lang = require('../../../services/language');
const queue = require('../../../services/queue');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// ❌ wrong — destructured before plain, and not length-ordered
const { ERROR_CODES, errorResponse } = require('../../../services/error');
const queue = require('../../../services/queue');
const _ = require('lodash');
```

---

## `module.exports` Pattern

`module.exports` is declared **before** the function definitions. This works because function declarations are hoisted. The result is a readable summary of what the file exports, right before the implementations.

```javascript
module.exports = {
  V1Login,
  V1Logout
};

async function V1Login(req, res) { ... } // END V1Login
async function V1Logout(req, res) { ... } // END V1Logout
```

For files exporting a single function:

```javascript
module.exports = {
  requestId
};

function requestId(req, res, next) { ... } // END requestId
```

---

## Function End Comment

Close every named function with `// END functionName`. This makes it easy to find the end of long functions and scan a file quickly.

```javascript
async function V1Login(req, res) {
  // ...
} // END V1Login
```

Applies to all functions: actions, tasks, helpers, services, middleware.

---

## JSDoc: Action Header

Every action file opens with a JSDoc block describing what the action does, its route, auth requirements, accepted args, success response, and all possible error codes. Every `@error` listed here must have a corresponding test.

```javascript
/**
 * Log in a user and return an access token.
 *
 * POST /v1/users/login
 *
 * Must be logged out
 *
 * req.args = {
 *   email    - (STRING - REQUIRED): The email address of the user
 *   password - (STRING - REQUIRED): The unhashed password of the user
 * }
 *
 * Success: Return logged-in user and access token.
 * Errors:
 *   400: Login failed. Incorrect email and/or password.
 *   400: Your account is inactive, cannot log in.
 *   401: Please confirm your email to log in.
 */
```

Fields in `req.args`:
- Type is ALL CAPS: `STRING`, `NUMBER`, `BOOLEAN`, `OBJECT`, `ARRAY`
- Mark every field `REQUIRED` or `OPTIONAL`
- Add `[DEFAULT - <value>]` when a default exists

Fields in `req.params` (URL segments):
```javascript
 * req.params = {
 *   id - (STRING - REQUIRED): The UUID of the user
 * }
```

---

## JSDoc: General Helper/Method Header

```javascript
/**
 * Hash a plain-text token using SHA-256.
 *
 * @token  - (STRING - REQUIRED): The raw token to hash
 *
 * return: string
 */
```

---

## Complete Annotated Action File

The example below demonstrates every rule: section order, import ordering within groups, `module.exports` before methods, function end comments, and the action JSDoc header.

```javascript
/**
 * V1Login
 * Log in a user with email + password. Returns the user and a signed access token.
 */

'use strict';

// env
const { TOKEN_SECRET, NODE_ENV } = process.env;

// third-party
const joi = require('joi');
const moment = require('moment-timezone');

// services
const lang = require('../../../services/language');
const queue = require('../../../services/queue');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { ROLES } = require('../../../helpers/constants');
const { hashToken } = require('../../../helpers/logic');

// models
const models = require('../../../models');

// queues  (instances — queue service is already required above)
const AuthQueue = queue.get('AuthQueue');

// module-level constants
const MAX_LOGIN_ATTEMPTS = 5;

module.exports = {
  V1Login
};

/**
 * Log in a user and return an access token.
 *
 * POST /v1/users/login
 *
 * Must be logged out
 *
 * req.args = {
 *   email    - (STRING - REQUIRED): The email address of the user
 *   password - (STRING - REQUIRED): The unhashed password of the user
 * }
 *
 * Success: Return logged-in user and access token.
 * Errors:
 *   400: Login failed. Incorrect email and/or password.
 *   400: Your account is inactive, cannot log in.
 *   401: Please confirm your email to log in.
 */
async function V1Login(req, res) {
  const schema = joi.object({
    email:    joi.string().email().required(),
    password: joi.string().min(8).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error) return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  const { email, password } = value;

  // find user
  const user = await models.user.scope(null).findOne({ where: { email } });
  if (!user) return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS);

  // validate password
  const valid = await models.user.validatePassword(password, user.password);
  if (!valid) return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS);

  // check account status
  if (!user.isActive) return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE);
  if (!user.isEmailConfirmed) return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_EMAIL_NOT_CONFIRMED);

  // issue token (implementation detail omitted for brevity)
  const token = 'signed-jwt-here';

  return {
    status: 200,
    success: true,
    token,
    user: user.toJSON()
  };
} // END V1Login
```

---

## Quick Reference

```
1.  header comment
2.  'use strict'
3.  env vars
4.  built-ins
5.  third-party        ← plain requires first, by length; then destructured, by length
6.  services           ← queue SERVICE here (services/queue.js)
7.  helpers
8.  models
9.  queues             ← queue INSTANCES here (queue.get('XQueue'))
10. module-level consts
11. module.exports      ← BEFORE functions
12. function defs       ← each closes with // END name
```
