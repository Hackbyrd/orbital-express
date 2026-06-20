# Background Jobs (Bull Queue)

## Why background jobs?

Some work takes too long to complete within a request/response cycle — generating a report, sending batched emails, calling a slow third-party API, processing an uploaded file. Rather than blocking the HTTP response waiting for that work to finish, the action hands the work off to a background job and returns immediately. The client gets a fast `202 Accepted` response with a `jobId` it can use to poll for progress or results.

**The 202 pattern:**

1. Action receives the request, validates arguments.
2. Action enqueues a job and gets back a `jobId`.
3. Action returns `{ status: 202, success: true, jobId: job.id }`.
4. Worker process picks up the job from Redis and runs the task asynchronously.

---

## Architecture

```
HTTP Request
    │
    ▼
Controller → Action
                │  validates args
                │  enqueues job → Redis (Bull queue)
                │
                └─→ return 202 + jobId
                               │
                               ▼
                        Worker Process
                               │
                        feature/worker.js
                               │
                        Queue.process('V1TaskName', task)
                               │
                        task runs business logic
                               │
                        writes DB, sends email, emits socket, etc.
```

Bull uses Redis as its backing store. The web process (`yarn s`) and the worker process (`yarn w`) share the same Redis connection — the web process writes jobs, the worker process consumes them.

---

## Creating a task

Use the generator. Never create task files by hand.

```bash
yarn gen Order -t V1ProcessTask
```

This creates `app/Order/tasks/V1ProcessTask.js` and adds it to `app/Order/tasks/index.js`. After scaffolding, delete the placeholder example task if one was generated:

```bash
yarn del Order -t V1ExampleTask
```

---

## Enqueuing from an action

Require the queue service at the top of the action file (after services, before helpers — follow the JS file structure order). Get the queue by name, add the job, and return a `202`.

```javascript
'use strict';

// services
const queue = require('../../../services/queue');

// helpers
const { errorResponse, ERROR_CODES } = require('../../../helpers/errors');

// models
const models = require('../../../models');

// queues
const OrderQueue = queue.get('OrderQueue');

module.exports = {
  V1ProcessByUser,
};

/**
 * Kick off order processing in the background
 *
 * POST /v1/orders/process
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.args = {
 *   @orderId - (NUMBER - REQUIRED): The id of the order to process
 * }
 *
 * Success: Return jobId.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1ProcessByUser(req) {
  const schema = joi.object({
    orderId: joi.number().min(1).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  req.args = value;

  try {
    // confirm the order belongs to this user
    const findOrder = await models.order.findOne({
      where: { id: req.args.orderId, userId: req.user.id }
    });

    if (!findOrder)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    // enqueue the task
    const job = await OrderQueue.add('V1ProcessTask', {
      orderId: findOrder.id,
      userId:  req.user.id,
      locale:  req.getLocale() // always pass locale so the task can set i18n
    }, {
      delay: 0 // start immediately; increase (ms) to defer
    });

    return {
      status: 202,
      success: true,
      jobId: job.id
    };
  } catch (error) {
    throw error;
  }
} // END V1ProcessByUser
```

**Queue options you can pass as the third argument to `.add()`:**

| Option | Type | Default (from queue service) | Purpose |
|---|---|---|---|
| `delay` | number (ms) | `0` | Defer execution by this many milliseconds. |
| `attempts` | number | `5` | How many times Bull will retry on failure. |
| `backoff` | object | `{ type: 'exponential', delay: 5000 }` | Retry back-off strategy. `5 → 10 → 20 → 40s`. |
| `removeOnComplete` | number | `1000` | Keep only the last N completed jobs in Redis. |
| `removeOnFail` | number | `5000` | Keep the last N failed jobs for inspection. |

The defaults are set in `services/queue.js` and apply to every job on every queue. Override per-job only when you have a specific reason (e.g. a reporting job that should try only once, or a notification that should fire after a 10-minute delay).

---

## Task file anatomy

A task file exports one or more async functions. It follows the same JS file structure as an action file (header comment → `'use strict'` → imports → `module.exports` → method definitions), with two differences: tasks receive a `job` object (not `req`/`res`), and they throw on error rather than returning an error response.

```javascript
/**
 * ORDER V1ProcessTask
 */

'use strict';

// services
const language = require('../../../services/language');

// helpers
const { queueError } = require('../../../services/error');

// models
const models = require('../../../models');

module.exports = {
  V1ProcessTask,
};

/**
 * Process an order asynchronously
 *
 * Queue: OrderQueue
 *
 * job.data = {
 *   @orderId - (NUMBER - REQUIRED): The id of the order to process
 *   @userId  - (NUMBER - REQUIRED): The id of the user who owns the order
 *   @locale  - (STRING - REQUIRED): The locale to use for i18n (e.g. 'en')
 * }
 *
 * Success: Updates order status to 'processed'.
 * Errors:
 *   Throws on any unexpected error — Bull retries per queue backoff config.
 */
async function V1ProcessTask(job) {
  const { orderId, userId, locale } = job.data;

  // always set locale from job data — tasks have no req/res context
  const i18n = language.getLocalI18n();
  i18n.setLocale(locale);

  try {
    const findOrder = await models.order.findOne({
      where: { id: orderId, userId }
    });

    if (!findOrder)
      throw new Error(`Order ${orderId} not found for user ${userId}.`);

    // run business logic
    await findOrder.update({ status: 'processed', processedAt: new Date() });

    // tasks can also call other actions, emit sockets, send emails, etc.

  } catch (error) {
    throw error; // re-throw — Bull catches this, records failure, and retries
  }
} // END V1ProcessTask
```

---

## Registering in worker.js

Every feature that has tasks needs a `worker.js` inside its folder. This file exports a single function that gets called once when the worker process boots. It gets the queue, registers task processors, and attaches error listeners.

**`app/Order/worker.js`:**

```javascript
/**
 * ORDER BACKGROUND WORKER
 */

'use strict';

// services
const queue = require('../../services/queue');
const { queueError } = require('../../services/error');

// tasks
const tasks = require('./tasks');

module.exports = () => {

  const OrderQueue = queue.get('OrderQueue');

  // register task processors
  OrderQueue.process('V1ProcessTask', tasks.V1ProcessTask);

  // attach error listeners — always include these three
  OrderQueue.on('failed',  async (job, error) => queueError(error, OrderQueue, job));
  OrderQueue.on('stalled', async job          => queueError(new Error('Queue Stalled.'), OrderQueue, job));
  OrderQueue.on('error',   async error        => queueError(error, OrderQueue));

}; // END worker.js
```

The global **`worker.js`** at the project root automatically discovers and loads every feature's `worker.js` at boot — no manual registration needed:

```javascript
// worker.js (project root) — simplified excerpt
const directories = getDirectories(path.join(__dirname, APP_DIR));
directories.forEach(dir => workerRoutes.push(require(`${dir}/worker.js`)));

async function startWorker(processId) {
  // ...
  workerRoutes.forEach(worker => worker()); // calls each feature's exported function
}
```

When you generate a new feature with `yarn gen`, its `worker.js` is created automatically and picked up on the next worker restart.

---

## i18n in tasks

Tasks run outside the HTTP request cycle — there is no `req` object, so there is no `req.__()` i18n helper. You must set the locale manually using the language service.

**Always pass `locale` in the job data when enqueueing:**

```javascript
// in the action
const job = await OrderQueue.add('V1ProcessTask', {
  orderId: findOrder.id,
  userId:  req.user.id,
  locale:  req.getLocale() // captures the user's preferred locale from the request
});
```

**Always set locale at the top of the task:**

```javascript
async function V1ProcessTask(job) {
  const { orderId, userId, locale } = job.data;

  const i18n = language.getLocalI18n();
  i18n.setLocale(locale); // set before any translated string is needed

  // now use i18n.__('KEY') for translated strings in emails, logs, etc.
}
```

---

## Error handling in tasks

Tasks **throw** on error — they do not return error responses. Bull intercepts the thrown error, marks the job as failed, and schedules a retry according to the queue's backoff configuration.

```javascript
async function V1ProcessTask(job) {
  try {
    // ... work ...
  } catch (error) {
    throw error; // Bull retries up to `attempts` times with exponential backoff
  }
} // END V1ProcessTask
```

The `queueError()` helper (attached to the `'failed'` listener in `worker.js`) handles structured logging of failures. You do not call it inside the task — it fires automatically when Bull marks the job failed.

```javascript
// in worker.js — this runs automatically on each failure
OrderQueue.on('failed', async (job, error) => queueError(error, OrderQueue, job));
```

If a job exhausts all retry attempts without succeeding, it lands in Bull's failed job set. Failed jobs are kept for `removeOnFail` count (default: 5000) for manual inspection and replay via the Bull dashboard or Redis directly.

---

## Queue naming convention

Queue names follow the pattern `<Feature>Queue`, where `<Feature>` is the singular PascalCase feature name — the same as the feature folder.

```
OrderQueue
UserQueue
DocumentQueue
ProductQueue
```

The `queue.get('OrderQueue')` call is idempotent — it creates the queue on first call and returns the same instance on subsequent calls. This means it is safe to call `queue.get('OrderQueue')` in both the action file (to enqueue) and the feature's `worker.js` (to process) — they reference the same Bull queue backed by the same Redis connection.

Always declare queue instances after models in the JS file structure:

```javascript
// models
const models = require('../../../models');

// queues
const OrderQueue = queue.get('OrderQueue');
```
