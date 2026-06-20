# Actions

## What is an action?

An action is a single JavaScript file that contains the business logic for one HTTP endpoint (or a closely related group of role-specific endpoints). One file equals one endpoint — or one endpoint broken into per-role variants.

The request lifecycle is:

```
HTTP Request → routes.js → controller.js → action file → return plain object → controller sends response
```

Actions are the layer where all real work happens: validate arguments, query the database, enforce business rules, emit socket events, enqueue background jobs, and return a result. Routes and controllers are thin and mechanical. Actions are where you write code.

---

## Naming convention

Every action and task name follows a strict formula:

```
V{version}{ActionName}[By{Role}][On{Device}]
```

| Segment | Required | Description |
|---|---|---|
| `V{version}` | Always | API version number. Always comes first. |
| `{ActionName}` | Always | PascalCase description of what the action does. |
| `By{Role}` | When behavior differs by role | The user type calling this method: `ByAdmin`, `ByUser`, `ByPartner`. |
| `On{Device}` | When behavior differs by device | The client platform: `OniOS`, `OnAndroid`, `OnMobile`, `OnWeb`. |

### Versioning

The version prefix lets you ship a rewritten version of an action without breaking clients that still call the old one. `V1Login` and `V2Login` can coexist in the same routes file simultaneously.

```javascript
// both can live in routes.js at the same time
router.all('/v1/users/login', controller.V1Login);
router.all('/v2/users/login', controller.V2Login);
```

Never skip the version prefix. The cost of adding it is zero. The cost of retrofitting it later is high.

### Role suffix

When an action behaves differently for different user types, create a separate method for each role rather than branching inside one method. Two separate methods are independently editable, independently testable, and independently understandable.

```
V1Create              → no role distinction, all roles do the same thing
V1CreateByAdmin       → admin-specific behavior
V1CreateByUser        → user-specific behavior
V1CreateByAdminManager → specific role within a user type
```

### Device suffix

```
OniOS      → iOS app only
OnAndroid  → Android app only
OnMobile   → iOS and Android behave identically, but differ from web
OnWeb      → web browser only
(none)     → all platforms behave the same
```

A fully qualified example combining all segments:

```
V1UpdateByAdminOnMobile
│  │      │        │
│  │      │        └─ device: iOS and Android behave the same
│  │      └─────────── role: admin only
│  └────────────────── action: updating a record
└───────────────────── version: v1
```

### Actions vs tasks

Tasks are background jobs. The naming convention is identical but tasks always append `Task`:

```
V1Create           → action  (real-time, returns a response)
V1CreateTask       → task    (background job, runs in worker)

V1ExportByAdmin    → action  (triggers the export, returns immediately)
V1ExportTaskByAdmin → task   (does the actual export work in the background)
```

### Complete naming reference

```javascript
// Actions — real-time, return a response
V1Login                          // all roles, no device distinction
V1CreateByAdmin                  // admin only, no device distinction
V1CreateByUser                   // user only, no device distinction
V1UpdateByAdminOniOS             // admin only, iOS only
V1UpdateByAdminOnAndroid         // admin only, Android only
V1UpdateByAdminOnMobile          // admin only, iOS and Android behave the same
V1UpdateByAdminOnWeb             // admin only, web only
V1UpdateByAdminManagerOnMobile   // admin with Manager role, mobile only

// Tasks — background jobs, always append Task
V1CreateTask                     // background version of V1Create
V1ExportTaskByAdmin              // background export triggered by admin
V1SyncTaskByUserOnMobile         // background sync triggered by user on mobile
```

---

## Generating action files

Never create action files by hand. Use the scaffolding generator:

```bash
# Create a new action inside an existing feature
yarn gen Order -a V1Create

# This creates:
#   app/Order/actions/V1Create.js          — full action template
#   app/Order/tests/integration/V1Create.test.js — full test template
#   Updates app/Order/actions/index.js automatically (sorted alphabetically)
```

After generating an action, you still need to manually:
1. Add the route to `app/Order/routes.js`
2. Add the controller method to `app/Order/controller.js`

To delete an action:
```bash
yarn del Order -a V1Create
# Removes the action file, its test, and the entry from actions/index.js
```

After deleting, also remove the route from `routes.js` and the controller method from `controller.js` by hand.

---

## Anatomy of an action file

Every action file follows this exact structure, top to bottom. Do not deviate from it.

```javascript
/**
 * ORDER V1Create ACTION
 */

'use strict';

// built-in node modules (if any)
// const fs = require('fs');

// third-party node modules
const joi = require('joi'); // argument validations

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = socket;
const queue = require('../../../services/queue');

// helpers
const { isValidTimezone } = require('../../../helpers/validate');
const { SOME_CONSTANT } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// queues (queue.get() calls, right after models)
// const OrderQueue = queue.get('OrderQueue');

// module.exports MUST come before the function definitions
module.exports = {
  V1Create
};

/**
 * Create and return a new order
 *
 * GET  /v1/orders/create
 * POST /v1/orders/create
 *
 * Use req.__('') for i18n translations
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   @item    - (STRING - REQUIRED): The item name
 *   @amount  - (NUMBER - REQUIRED): The order amount in cents
 *   @notes   - (STRING - OPTIONAL): Optional order notes
 * }
 *
 * Success: Return a new order
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ORDER_BAD_REQUEST_ITEM_NOT_FOUND
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Create(req, res) {
  // 1. Define and validate the argument schema
  const schema = joi.object({
    item: joi.string().trim().min(1).required(),
    amount: joi.number().integer().min(1).required(),
    notes: joi.string().trim().optional()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // type conversion applied: '5' → 5, 'true' → true

  // 2. Early business-rule checks (before opening a transaction)
  const item = await models.item.findOne({ where: { name: req.args.item } });
  if (!item)
    return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ITEM_NOT_FOUND);

  // 3. Open a transaction for any writes
  const t = await models.db.transaction();

  try {
    // create the record
    const newOrder = await models.order.create({
      userId: req.user.id,
      itemId: item.id,
      amount: req.args.amount,
      notes: req.args.notes || null
    }, { transaction: t });

    // fetch back without sensitive fields
    const findOrder = await models.order.findByPk(newOrder.id, {
      transaction: t
    });

    // emit a real-time socket event (optional — only if the feature uses sockets)
    const io = await socket.get();
    io.to(`${SOCKET_ROOMS.USER}${req.user.id}`).emit(SOCKET_EVENTS.ORDER_CREATED, { order: findOrder });

    // commit
    await t.commit();

    // 201 because we created a new resource
    return {
      status: 201,
      success: true,
      order: findOrder
    };
  } catch (error) {
    await t.rollback();
    throw error; // let middleware/error.js handle it — never return res.status(500) manually
  }
} // END V1Create
```

### Key rules

- **`module.exports` comes before the function definitions.** As the file grows, the export block at the top is the table of contents. Anyone reading the file knows at a glance which methods are public. Never export inline (`module.exports = { V1Create: async function() {} }`) or export on the same line as the definition.
- **Close every function with `// END FunctionName`.** Required convention; makes scanning large files easy.
- **Arguments come from `req.args` only.** Never read from `req.body` or `req.query` directly. Middleware has already merged them into `req.args` for you.
- **Never call `res` directly for the final response.** Return a plain object. The controller calls `res.status(result.status).json(result)`.
- **Never `return res.status(500)`** for unhandled errors. Just `throw error` inside the catch block and let `middleware/error.js` handle it.
- **Always rollback the transaction before returning an error response mid-transaction.** Call `await t.rollback()` before every `return errorResponse(...)` that happens after a transaction was opened.

---

## The JSDoc header

Every action function has a JSDoc comment header immediately above it. This is not optional — it is the contract for the endpoint and the test checklist.

```javascript
/**
 * <Short description of what this action does>
 *
 * GET  /v1/feature/actionname
 * POST /v1/feature/actionname
 *
 * Use req.__('') or res.__('') for i18n language translations
 *
 * Must be logged in          ← or "Must be logged out" or "Can be logged in or logged out"
 * Roles: ['admin', 'user']   ← empty array [] for public endpoints
 *
 * req.params = {}
 * req.args = {
 *   @fieldName - (TYPE - REQUIRED|OPTIONAL) [DEFAULT - value]: Description
 * }
 *
 * Success: Description of the success response
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: FEATURE_BAD_REQUEST_SPECIFIC_ERROR
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
```

**Every `ERROR_CODE` listed in the Errors section must have a corresponding test.** The JSDoc is your test checklist. An action is not finished until every listed error has a test that triggers it and asserts the exact error response.

---

## Validation with Joi

All argument validation uses the Joi library. The pattern is always:

```javascript
const schema = joi.object({
  // required string
  name: joi.string().trim().min(1).required(),

  // optional string with a default
  status: joi.string().valid('active', 'inactive').default('active').optional(),

  // required number
  amount: joi.number().integer().min(0).required(),

  // optional boolean
  active: joi.boolean().optional(),

  // optional email
  email: joi.string().trim().lowercase().email().optional(),

  // custom error message for a field (useful for password complexity)
  password: joi.string().min(8).regex(PASSWORD_REGEX).required()
    .error(new Error(req.__('ADMIN[invalid_password_format]'))),

  // UUID
  orderId: joi.string().guid({ version: 'uuidv4' }).required()
});

const { error, value } = schema.validate(req.args);
if (error)
  return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

// Always reassign — Joi performs type coercions ('5' → 5, 'true' → true)
// and applies defaults. The coerced values are in `value`, not in `req.args`.
req.args = value;
```

After `req.args = value`, use `req.args.fieldName` everywhere below. Never read `req.args` before this line.

Joi is the only validation layer. Do not add manual type checks for things Joi already validates.

---

## The controller — thin routing layer

The controller's only job is to inspect the request, decide which action to call based on role and device, call it, and return the result. No business logic lives here.

### Actions aggregator

Every controller imports all actions through the feature's `actions/index.js`:

```javascript
const actions = require('./actions');
```

`actions/index.js` is auto-managed by `yarn gen` and `yarn del`. Never edit it by hand.

### Controller method naming

Controller methods use only the version and action name — no role or device suffix. Those belong on the action methods:

```
Controller method:   V1Update
Action methods:      V1UpdateByAdmin, V1UpdateByUser, V1UpdateByAdminOnMobile
```

### The method body

```javascript
/**
 * Update and return updated user
 *
 * /v1/users/update
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1Update(req, res, next) {
  let method = null;

  // determine which action to call based on role
  if (req.admin)
    method = 'V1UpdateByAdmin';
  else if (req.user)
    method = 'V1UpdateByUser';
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call the action and return the result
  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error); // passes unhandled errors to middleware/error.js
  }
} // END V1Update
```

For public endpoints with no auth check:

```javascript
async function V1Login(req, res, next) {
  let method = 'V1Login'; // public — no role check needed

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Login
```

Three things to remember:

1. **Auth rejection happens in the controller, before the action is called.** If the user type does not have access, return `401` immediately.
2. **The action returns a plain object.** The controller calls `res.status(result.status).json(result)`. The action never touches `res` directly for the final response.
3. **`next(error)` is how unhandled errors reach the error middleware.** Never `return res.status(500)` — just let it propagate.

---

## Success response shape

Every action returns a plain object. The shape is always flat:

```javascript
return {
  status: 200,       // HTTP status code — always required
  success: true,     // always true for success — always required
  order: { ... },    // the payload — name it after what you're returning
  token: 'abc123'    // additional fields at the same level if needed
};
```

**Which status code to use:**

| Code | When |
|---|---|
| `200` | Default — reads, updates, logins, anything that doesn't fit below. |
| `201` | The action **creates a new resource** (inserts a new database record). |
| `202` | The action hands work off to a **background job** and returns just an acknowledgement. |

```javascript
// 201 — created a new record
return { status: 201, success: true, order: newOrder };

// 202 — accepted, background task will do the real work
return { status: 202, success: true, jobId: job.id };

// 200 — everything else
return { status: 200, success: true, user: foundUser };
```

**Why flat, not nested under `data`?**

Every action returns semantically different keys (`admin`, `user`, `token`, `order`). The client already has to know which key to expect for each endpoint. Wrapping in a `data` envelope adds one extra destructuring level everywhere without solving that inconsistency. Flat is simpler.

---

## Common patterns

### Create (201)

```javascript
async function V1Create(req, res) {
  const schema = joi.object({
    name: joi.string().trim().min(1).required(),
    amount: joi.number().integer().min(0).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  const t = await models.db.transaction();

  try {
    const newRecord = await models.order.create({
      userId: req.user.id,
      name: req.args.name,
      amount: req.args.amount
    }, { transaction: t });

    const findRecord = await models.order.findByPk(newRecord.id, { transaction: t });

    await t.commit();

    return {
      status: 201,
      success: true,
      order: findRecord
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
} // END V1Create
```

### Read (200)

```javascript
async function V1Read(req, res) {
  const schema = joi.object({
    orderId: joi.string().guid({ version: 'uuidv4' }).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    const order = await models.order.findOne({
      where: {
        id: req.args.orderId,
        userId: req.user.id // always scope to the authenticated user
      }
    });

    if (!order)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    return {
      status: 200,
      success: true,
      order
    };
  } catch (error) {
    throw error;
  }
} // END V1Read
```

### Update (200)

```javascript
async function V1Update(req, res) {
  const schema = joi.object({
    orderId: joi.string().guid({ version: 'uuidv4' }).required(),
    notes: joi.string().trim().optional(),
    status: joi.string().valid('pending', 'complete').optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    // find the record first to verify ownership
    const order = await models.order.findOne({
      where: { id: req.args.orderId, userId: req.user.id }
    });

    if (!order)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    // apply only the fields that were actually sent
    await models.order.update({
      ...(req.args.notes !== undefined && { notes: req.args.notes }),
      ...(req.args.status !== undefined && { status: req.args.status })
    }, {
      where: { id: order.id }
    });

    // fetch the updated record to return
    const updatedOrder = await models.order.findByPk(order.id);

    return {
      status: 200,
      success: true,
      order: updatedOrder
    };
  } catch (error) {
    throw error;
  }
} // END V1Update
```

### Soft delete (200)

```javascript
async function V1Delete(req, res) {
  const schema = joi.object({
    orderId: joi.string().guid({ version: 'uuidv4' }).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    const order = await models.order.findOne({
      where: { id: req.args.orderId, userId: req.user.id }
    });

    if (!order)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    // paranoid: true models use destroy() for soft delete — sets deletedAt instead of issuing DELETE
    await order.destroy();

    return {
      status: 200,
      success: true
    };
  } catch (error) {
    throw error;
  }
} // END V1Delete
```

### Query / list (200)

For list and search endpoints, see the `add-query-action` skill — it covers pagination, filtering, and sorting via `cruqd.js`.

---

## Role-based actions: per-role methods

When an action behaves differently for different user types, create a separate method for each role. Do not use if/else branching inside a single method.

```javascript
module.exports = {
  V1CreateByUser,
  V1CreateByAdmin
};

// PUBLIC: user entry point
async function V1CreateByUser(req, res) {
  // user-specific validation or defaults
  req.args.userId = req.user.id;
  req.args.status = 'pending'; // users always start as pending
  return V1Create(req, { isAdmin: false });
} // END V1CreateByUser

// PUBLIC: admin entry point
async function V1CreateByAdmin(req, res) {
  // admin can set status directly and target any user
  return V1Create(req, { isAdmin: true });
} // END V1CreateByAdmin

// PRIVATE: shared bulk logic — NOT in module.exports, NOT called by controller
async function V1Create(req, { isAdmin }) {
  const schema = joi.object({
    userId: joi.string().guid({ version: 'uuidv4' }).required(),
    item: joi.string().trim().min(1).required(),
    amount: joi.number().integer().min(0).required(),
    status: isAdmin
      ? joi.string().valid('pending', 'active', 'cancelled').default('pending').optional()
      : joi.string().valid('pending').default('pending').optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  const t = await models.db.transaction();

  try {
    const newOrder = await models.order.create({
      userId: req.args.userId,
      item: req.args.item,
      amount: req.args.amount,
      status: req.args.status
    }, { transaction: t });

    const findOrder = await models.order.findByPk(newOrder.id, { transaction: t });

    await t.commit();

    return {
      status: 201,
      success: true,
      order: findOrder
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
} // END V1Create (private)
```

**When to use the private shared function vs `helper.js`:**

- **Private function in the action file** — when the shared piece is the *majority* of the action body. This keeps the logic where you'd look for it.
- **`helper.js`** — for small, pure, reusable bits: a calculation, a formatter, a validation utility. Things worth unit-testing in isolation that do not make HTTP calls or database writes.

---

## Calling other actions

Actions are just exported functions, so one action can `require` and call another to reuse logic instead of duplicating it:

```javascript
// app/Order/actions/V1Fulfill.js
const { V1Create } = require('./V1Create');

async function V1Fulfill(req, res) {
  // ... validate and prepare req.args ...

  // delegate to the create action
  return V1Create(req, res);
} // END V1Fulfill
```

**Caveat:** if the action being called reaches deep into `req`/`res` (reading `req.user`, calling `res.cookie`, etc.), extract the shared business logic into a helper that both call instead of shimming a fake `req`. Actions expecting a real request object should stay coupled to real requests.

---

## Enqueuing background tasks (202 response)

When an action's real work is expensive or time-consuming, the action validates the request, adds a job to the queue, and returns immediately with a `202`. The task file does the actual work.

```javascript
// app/Order/actions/V1Export.js
'use strict';

const joi = require('joi');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const queue = require('../../../services/queue');

module.exports = {
  V1Export
};

/**
 * Enqueue a background export job
 *
 * POST /v1/orders/export
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.args = {
 *   @status - (STRING - OPTIONAL): Filter by order status
 * }
 *
 * Success: Return a jobId
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Export(req, res) {
  const schema = joi.object({
    status: joi.string().valid('pending', 'active', 'complete').optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    const OrderQueue = queue.get('OrderQueue');

    // add the job — the task name matches the task file: V1ExportTask
    const job = await OrderQueue.add('V1ExportTask', {
      adminId: req.admin.id,
      status: req.args.status || null
    });

    // 202: accepted for background processing
    return {
      status: 202,
      success: true,
      jobId: job.id
    };
  } catch (error) {
    throw error;
  }
} // END V1Export
```

The corresponding task (`V1ExportTask`) does the actual work and notifies the user when complete — typically via email or a socket push.

---

## Routes

Routes wire URLs to controller methods. Every route uses `router.all()` and follows this pattern:

```javascript
router.all('/v1/orders/create', controller.V1Create);
```

URL convention: lowercase, no separators, no dashes, no underscores. The URL is the action name lowercased and stripped of the version prefix:

```
V1Create        → /v1/orders/create
V1UpdateByAdmin → /v1/orders/update      ← role suffix stays on action, not URL
V1LogoutAll     → /v1/users/logoutall    ← multi-word runs together
```

The path mirrors the action name lowercased. There is no bikeshedding about hyphen vs underscore — the convention is always run together.

All feature routes are registered in the global `routes.js` at the project root. After adding a route to a feature's `routes.js`, add the feature registration to the global file as well.

---

## Testing actions

Every action must have a corresponding integration test at `app/Feature/tests/integration/V1ActionName.test.js`.

Tests must cover:

- **Every `ERROR_CODE` listed in the JSDoc.** The Errors section is your test checklist. If it's listed, it's tested.
- **Every role that does NOT have access.** If an action requires authentication, there is always a `Role: Logged Out` test asserting a `401`. If a `User` cannot call an Admin action, that is tested too.
- **The database state after writes.** After a create or update, query the database directly to confirm the change actually landed. Never trust the response alone.
- **Queue state if a job was enqueued.** Assert that the correct job was added with the correct data.

See the [Testing Patterns](/testing/patterns) and [Test Architecture](/testing/overview) pages for full test patterns, fixture setup, authentication helpers, and third-party API mocking.
