# Errors & i18n

A complete reference for how Orbital-Express handles client errors, 500s, and internationalized messages. Read this before adding a new error code or translation key.

---

## Table of Contents

1. [Error Code Structure](#1-error-code-structure)
2. [Returning Errors from Actions](#2-returning-errors-from-actions)
3. [Errors in Tasks and Sockets](#3-errors-in-tasks-and-sockets)
4. [The Error Middleware (middleware/error.js)](#4-the-error-middleware-middlewareerrorjs)
5. [Adding a New Error Code](#5-adding-a-new-error-code)
6. [i18n — Key Naming Convention](#6-i18n--key-naming-convention)
7. [i18n in Actions](#7-i18n-in-actions)
8. [i18n in Tasks](#8-i18n-in-tasks)
9. [yarn lang](#9-yarn-lang)
10. [Testing Errors](#10-testing-errors)

---

## 1. Error Code Structure

All client error codes live in one of two places:

| File | Purpose |
|---|---|
| `services/error.js` | Global codes shared across all features (`BAD_REQUEST_INVALID_ARGUMENTS`, `UNAUTHORIZED`, etc.) |
| `app/<Feature>/error.js` | Feature-specific codes scoped to one feature (`ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS`, etc.) |

At startup, `services/error.js` automatically scans every feature folder under `app/` and merges every `error.js` file it finds into the global `ERROR_CODES` object. You never need to import a feature error file directly — just use `ERROR_CODES` from `services/error.js` everywhere.

### Shape of an error code object

```javascript
ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
  error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',  // machine-readable, used by the frontend to branch
  status: 400,                                            // HTTP status code
  messages: ['ADMIN[invalid_login_credentials]']          // i18n key(s) — index 0 is the default
}
```

- **`error`** — a dot-namespaced machine-readable string. The frontend (or mobile client) switches on this to show the right UI state. Never change it after shipping — it is part of your API contract.
- **`status`** — the HTTP status code returned by the endpoint when this error fires.
- **`messages`** — an array of i18n translation keys. Most error codes have exactly one. A second entry lets you return an alternate phrasing for the same semantic error without defining a new code.

### Global codes (services/error.js)

```javascript
const ERROR_CODES = {
  BAD_REQUEST_INVALID_ARGUMENTS: {
    error: 'BAD_REQUEST_INVALID_ARGUMENTS',
    status: 400,
    messages: ['GLOBAL[invalid_arguments]']
  },
  UNAUTHORIZED: {
    error: 'UNAUTHORIZED',
    status: 401,
    messages: ['GLOBAL[unauthorized]']
  },
  FORBIDDEN: {
    error: 'FORBIDDEN',
    status: 403,
    messages: ['GLOBAL[forbidden]']
  },
  INTERNAL_SERVER_ERROR: {
    error: 'INTERNAL_SERVER_ERROR',
    status: 500,
    messages: ['GLOBAL[internal_server_error]']
  }
};
```

### Feature codes (app/Admin/error.js)

```javascript
'use strict';

const LOCAL_ERROR_CODES = {
  // V1Login
  ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
    error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
    status: 400,
    messages: ['ADMIN[invalid_login_credentials]']
  },

  ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE: {
    error: 'ADMIN.BAD_REQUEST_ACCOUNT_INACTIVE',
    status: 400,
    messages: ['ADMIN[admin_account_inactive]']
  },

  // V1Read
  ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST: {
    error: 'ADMIN.BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST',
    status: 400,
    messages: ['ADMIN[admin_account_does_not_exist]']
  }
};

module.exports = LOCAL_ERROR_CODES;
```

**Naming rule:** Prefix every feature error code with the feature name in `SCREAMING_SNAKE_CASE` (`ADMIN_`, `USER_`, `ORDER_`). The `.error` string uses dot-namespace (`ADMIN.BAD_REQUEST_...`). This scoping prevents collisions as the codebase grows.

---

## 2. Returning Errors from Actions

HTTP actions always use `errorResponse()` to return a 4xx error. **Never** call `res.status(400).json(...)` by hand — that bypasses the standardized error shape.

### Signature

```javascript
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// Basic usage — uses messages[0] by default
return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

// Alternate phrasing — uses messages[1] (the second translation key)
return errorResponse(req, ERROR_CODES.SOME_ERROR_WITH_TWO_MESSAGES, 1);

// Custom string message — bypasses the messages array entirely (common with Joi)
return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

// Override the HTTP status code
return errorResponse(req, ERROR_CODES.SOME_ERROR, 0, 422);
```

### Return shape

`errorResponse()` returns a plain object — the action returns it, the controller writes it to the response:

```javascript
{
  success: false,
  status: 400,
  error: 'ADMIN.BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST',
  message: 'Admin account does not exist.'
}
```

### Full example inside an action

```javascript
async function V1Read(req) {
  const schema = joi.object({
    id: joi.number().min(1).default(req.admin.id).optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  req.args = value;

  try {
    const findAdmin = await models.admin.findByPk(req.args.id, {
      attributes: { exclude: models.admin.getSensitiveData() }
    });

    if (!findAdmin)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

    return {
      status: 200,
      success: true,
      admin: findAdmin.dataValues
    };
  } catch (error) {
    throw error; // propagates to next(error) in the controller → middleware/error.js
  }
} // END V1Read
```

### The controller wires next(error) for 500s

Actions throw; the controller catches and calls `next(error)`:

```javascript
async function V1Read(req, res, next) {
  let method = 'V1Read';

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error); // passes the thrown error to middleware/error.js
  }
} // END V1Read
```

**Never `return res.status(500).json(...)` manually.** If your action throws (or a Promise rejects inside the `try` block), `catch` calls `next(error)`, which hands the error to `middleware/error.js` for standardized 500 handling. Trust the middleware.

### Transactions — rollback before returning an error

When you open a Sequelize transaction and hit an error before committing, use `errorResponseRollback()` to roll back cleanly and return the standard error shape in one call:

```javascript
const { errorResponseRollback } = require('../../../services/error');

const t = await models.db.transaction();
try {
  await models.order.create({ ... }, { transaction: t });

  if (someConditionFails)
    return await errorResponseRollback(t, req, ERROR_CODES.ORDER_BAD_REQUEST_SOMETHING_WRONG);

  await t.commit();
  return { status: 201, success: true, order: newOrder };
} catch (error) {
  await t.rollback();
  throw error;
}
```

---

## 3. Errors in Tasks and Sockets

Tasks and socket handlers are **not** request/response functions — they have no `res` object and no `req` with i18n attached. The rules differ.

### Tasks — throw, never return

Inside a task, validation failures and logic errors are `throw`n. Bull's job runner catches unhandled throws and marks the job as failed. Do not return error objects.

```javascript
async function V1ExportTask(job) {
  const schema = joi.object({
    adminId: joi.number().min(1).required()
  });

  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error)); // throw validation errors

  job.data = value;

  try {
    // ... do work ...
  } catch (error) {
    throw error; // rethrow so Bull marks the job as failed
  }
} // END V1ExportTask
```

### Sockets — throw, never return

Socket action handlers follow the same pattern — throw on error; the socket wrapper handles it:

```javascript
async function V1Connect(params, socket) {
  try {
    // ... logic ...
  } catch (error) {
    throw error;
  }
} // END V1Connect
```

### i18n in tasks

Tasks that need translated strings cannot use `req.__()` (no request object). Instead, get a local i18n instance and manually set the user's locale from `job.data.locale` (which the enqueueing action is responsible for passing):

```javascript
// services
const lang = require('../../../services/language');

async function V1SomeTask(job) {
  // ...
  const i18n = lang.getLocalI18n();
  i18n.setLocale(job.data.locale || 'en'); // locale passed by the enqueueing action

  const message = i18n.__('USER[some_key]');
  // ...
} // END V1SomeTask
```

When enqueuing, always pass `locale`:

```javascript
// inside an action
await UserQueue.add('V1SomeTask', {
  userId: req.user.id,
  locale: req.getLocale() // pass current locale to the task
});
```

---

## 4. The Error Middleware (middleware/error.js)

`middleware/error.js` is the last middleware registered in the Express app. It is the single place that handles all unhandled errors (anything passed to `next(error)`).

**What it does:**

1. Emits a structured JSON log line to stdout — parseable by Heroku Papertrail, Datadog Logs, and most log aggregators.
2. Sends the error to Sentry (if configured) with `requestId` and user context attached.
3. Returns a `500` JSON response. In production, the stack trace is omitted; in dev/test, it is included.

### Structured log line

Every 500 writes one JSON line to `stderr`:

```json
{
  "level": "error",
  "requestId": "019eed95-083e-7065-83c8-7ac1bc009fae",
  "method": "POST",
  "url": "/v1/users/create",
  "userType": "loggedOut",
  "userId": null,
  "errorName": "SequelizeUniqueConstraintError",
  "errorMessage": "email must be unique"
}
```

The `requestId` ties this log line to the `X-Request-ID` response header, so you can grep logs by the ID a client reports in a bug.

### HTTP responses

```javascript
// production response
{
  status: 500,
  success: false,
  error: 'Error',
  message: 'Something went wrong',
  requestId: 'abc-123'
}

// dev / test response — includes stack and request context for debugging
{
  status: 500,
  success: false,
  error: 'Error',
  stack: 'Error: ...\n    at ...',
  message: 'Something went wrong',
  requestId: 'abc-123',
  reqRoute: '/v1/admins/read',
  reqUserType: 'admin',
  reqUserId: 'uuid-here',
  reqArgs: { id: 5 }
}
```

### Sentry integration

`services/sentry.js` is a stub (no-op) by default. To enable Sentry error tracking:

1. Select **Sentry** during `npx create-orbital-app` setup, **or** manually:
   - `yarn add @sentry/node --exact`
   - Replace `services/sentry.js` with the real implementation (see the Sentry integration in `create-orbital-app`)
2. Set `SENTRY_DSN` in your environment

When Sentry is configured, every unhandled error is sent to your Sentry project with the `requestId` as a searchable tag and the authenticated user attached. No other code changes are needed — `middleware/error.js` calls `sentry.captureException(err, req)` automatically.

**Adding new user types:** When you add a new authenticated user type, add an `else if (req.<type>)` branch to `middleware/error.js` so both the log line and Sentry event correctly identify who made the request.

---

## 5. Adding a New Error Code

Use the **`add-error-code` skill** (`/add-error-code`). It walks through all the steps below automatically. For reference, the manual steps are:

**Step 1 — Add the code to the feature's error.js**

```javascript
// app/Order/error.js
ORDER_BAD_REQUEST_ITEM_OUT_OF_STOCK: {
  error: 'ORDER.BAD_REQUEST_ITEM_OUT_OF_STOCK',
  status: 400,
  messages: ['ORDER[item_out_of_stock]']
}
```

**Step 2 — Add the translation key to the feature's language file**

```javascript
// app/Order/languages/en.js
'ORDER[item_out_of_stock]': 'That item is currently out of stock.'
```

If the string should be global (used across multiple features), add it to `languages/en.js` under a `GLOBAL[...]` key instead.

**Step 3 — Run yarn lang**

```
yarn lang
```

This compiles all language files into `locales/en.json` (and other locales if you have them) and validates that every key referenced in every `messages` array exists. The command will error loudly if a key is missing.

**Step 4 — Return it from the action and document it in the JSDoc**

```javascript
/**
 * ...
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ORDER_BAD_REQUEST_ITEM_OUT_OF_STOCK   ← add here
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Create(req) {
  // ...
  if (item.stock === 0)
    return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ITEM_OUT_OF_STOCK);
  // ...
} // END V1Create
```

**Step 5 — Write the test**

Every error code in the JSDoc must have a corresponding test. See [Testing Errors](#10-testing-errors) below.

---

## 6. i18n — Key Naming Convention

**Format:** `NAMESPACE[key_name]`

| Part | Rule | Example |
|---|---|---|
| `NAMESPACE` | ALL_CAPS. Feature name or `GLOBAL` for shared strings | `ADMIN`, `USER`, `ORDER`, `GLOBAL` |
| `key_name` | all_lowercase_with_underscores. No camelCase, no dashes | `invalid_login_credentials`, `item_out_of_stock` |

```javascript
'GLOBAL[unauthorized]'              // global shared string
'ADMIN[invalid_login_credentials]'  // Admin feature string
'USER[profile_not_found]'           // User feature string
'ORDER[item_out_of_stock]'          // Order feature string
```

### Where keys live

| Key type | File |
|---|---|
| Global keys (`GLOBAL[...]`) | `languages/en.js` |
| Feature keys (`ADMIN[...]`, `USER[...]`, etc.) | `app/<Feature>/languages/en.js` |

**Never edit `locales/en.json` directly.** That file is compiled output — it is regenerated every time you run `yarn lang`. Edit the source files (`languages/en.js` or `app/<Feature>/languages/en.js`) and run `yarn lang` to rebuild.

### Global language file (languages/en.js)

```javascript
module.exports = {
  'GLOBAL[language]': 'English',
  'GLOBAL[invalid_arguments]': 'One or more request arguments are invalid.',
  'GLOBAL[unauthorized]': 'You do not have permission to make this request.',
  'GLOBAL[forbidden]': 'You do not have the required role to perform this action.',
  'GLOBAL[internal_server_error]': 'Oops... something went wrong.',
  // ...
};
```

### Feature language file (app/Admin/languages/en.js)

```javascript
module.exports = {
  // V1Login
  'ADMIN[invalid_login_credentials]': 'The email and/or password you entered is incorrect.',
  'ADMIN[admin_account_inactive]': 'Admin account is inactive.',

  // V1Read
  'ADMIN[admin_account_does_not_exist]': 'Admin account does not exist.',

  // V1ResetPassword
  'ADMIN[reset_email_subject]': 'Your password has been changed. Please confirm.',
};
```

Use a comment above each key group to link it to the action that uses it — this makes it easy to find and audit keys as actions change.

### Adding a key for a new locale

If the app supports multiple languages, add the same key to every `app/<Feature>/languages/<locale>.js` file (and the global `languages/<locale>.js`). `yarn lang` validates that all keys exist in all locales and will error if any locale is missing a key.

---

## 7. i18n in Actions

Actions receive `req` from Express. The i18n middleware attaches `.__()` directly to `req` and `res` — so inside an action you just call `req.__('KEY')`. You do not need to `require('i18n')` or call `getLocalI18n()` in actions.

```javascript
// inside any action — req.__() is already available
const message = req.__('ADMIN[welcome]');

// res.__() works too, but req.__() is the convention
```

`errorResponse(req, ...)` calls `req.__(key)` internally — so when you pass `req` as the first argument, translation is handled for you automatically. You only need to call `req.__()` directly when you want to build a custom string outside of `errorResponse`.

### How the locale is chosen

The i18n middleware reads the `i18n-locale` cookie (set at login) or falls back to the `Accept-Language` header. You can also force a locale for a request via `?lang=es`. The active locale is determined before the action runs — all you do is call `req.__()`.

---

## 8. i18n in Tasks

Background tasks run in the worker process, outside of any HTTP request. There is no `req` object — you must get a fresh i18n instance manually using `getLocalI18n()` from `services/language.js` and set the locale yourself.

**Pattern:**

```javascript
'use strict';

// services
const lang = require('../../../services/language');
const { joiErrorsMessage } = require('../../../services/error');

module.exports = { V1WelcomeEmailTask };

/**
 * Send welcome email to new user
 *
 * @job = {
 *   @data = {
 *     @userId - (NUMBER - REQUIRED): The user id
 *     @locale - (STRING - REQUIRED): The user's locale (e.g. 'en')
 *   }
 * }
 */
async function V1WelcomeEmailTask(job) {
  const schema = joi.object({
    userId: joi.number().min(1).required(),
    locale: joi.string().required()
  });

  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error));

  job.data = value;

  // get a fresh i18n instance and set the user's locale
  const i18n = lang.getLocalI18n();
  i18n.setLocale(job.data.locale);

  try {
    const subject = i18n.__('USER[welcome_email_subject]');
    // ... send the email using the translated subject ...
  } catch (error) {
    throw error;
  }
} // END V1WelcomeEmailTask
```

**The enqueueing action is responsible for passing `locale`:**

```javascript
// inside a V1Create action
await UserQueue.add('V1WelcomeEmailTask', {
  userId: newUser.id,
  locale: req.getLocale() // always pass the current request locale
});
```

**Why `getLocalI18n()`?** Each call returns a fresh, isolated i18n instance. This prevents locale state from one job leaking into another when multiple jobs run concurrently. Never share a single i18n instance across jobs.

---

## 9. yarn lang

`yarn lang` is the i18n build and validation command. Run it **every time** you edit any language file.

```
yarn lang
```

What it does:

1. Reads every `languages/en.js` (global + all features).
2. Merges them into `locales/en.json` (and other locales).
3. Validates that every translation key referenced anywhere in the codebase exists in every locale file.
4. Errors and exits non-zero if any key is missing.

`yarn test` runs `yarn lang` first — so a missing translation key will fail CI even if you forget to run it manually.

**Never edit `locales/*.json` directly.** Your changes will be overwritten the next time `yarn lang` runs.

---

## 10. Testing Errors

### Every JSDoc error entry must have a test

The `Errors:` block in every action's JSDoc comment is your test checklist. Before an action is done, go through every error listed and confirm there is a test that:

1. Sends the request in a way that triggers that specific error.
2. Asserts the correct HTTP status code.
3. Compares the full response body against `errorResponse(i18n, ERROR_CODES.YOUR_ERROR_CODE)`.

```javascript
it('[logged-out] should fail if credentials are incorrect', async () => {
  const res = await request(app)
    .post(routeUrl)
    .send({ email: 'wrong@example.com', password: 'wrongpassword' });

  expect(res.statusCode).toBe(400);
  // compare the full body — not just the status code
  expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
});
```

Using `toEqual(errorResponse(...))` instead of `toBe(res.body.error)` ensures the entire error contract — status, error string, and translated message — is tested. If a translation key is renamed or the error code shape changes, this test catches it.

### Test who cannot do something

For every role that does NOT have access to an action, there must be a test asserting the correct rejection. At minimum, if an action requires authentication, there is always a `Role: Logged Out` test asserting a `401`:

```javascript
describe('Role: Logged Out', () => {
  it('[logged-out] should fail to read admin', async () => {
    const res = await request(app).post(routeUrl).send({});
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
  });
});
```

### Getting i18n in test files

Test files need a local i18n instance to build the expected error responses with `errorResponse(i18n, ...)`. Use `getLocalI18n()` at the top of the describe block:

```javascript
const lang = require('../../../../services/language');
const { ERROR_CODES, errorResponse } = require('../../../../services/error');

describe('Admin.V1Login', () => {
  const i18n = lang.getLocalI18n();
  // ...

  it('[logged-out] should fail with bad credentials', async () => {
    const res = await request(app).post(routeUrl).send({ email: 'x@x.com', password: 'bad' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
  });
});
```

### Testing Joi validation errors

`BAD_REQUEST_INVALID_ARGUMENTS` is returned for Joi failures. Because the message is a dynamic string from `joiErrorsMessage()`, do not compare the full body with `toEqual` — instead assert the status and error code string:

```javascript
it('[admin] should fail if id is not a number', async () => {
  const { token } = await adminLogin(app, routeVersion, request, adminFix[0]);

  const res = await request(app)
    .post(routeUrl)
    .set('authorization', `jwt-admin ${token}`)
    .send({ id: 'not-a-number' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe(ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS.error);
  expect(res.body.success).toBe(false);
});
```
